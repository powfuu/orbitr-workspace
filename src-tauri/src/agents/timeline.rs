//! What a Claude Code session did, from its transcript: prompts, tool calls (commands,
//! file edits/reads, searches, subagents), replies, and failed tool calls. Read-only.
use serde::Serialize;
use serde_json::Value;
use std::collections::HashMap;
use std::fs::{self, File};
use std::io::{BufRead, BufReader};
use std::path::Path;

#[derive(Serialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum EventKind {
    Prompt,
    Command,
    Edit,
    Read,
    Search,
    Agent,
    Tool,
    Reply,
}

#[derive(Serialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TimelineEvent {
    pub at: String,
    pub kind: EventKind,
    /// Tool name for tool events.
    pub tool: Option<String>,
    pub title: String,
    pub detail: Option<String>,
    /// File path for edits/reads.
    pub path: Option<String>,
    pub error: bool,
    /// Pasted images still in Claude's local cache (~/.claude/image-cache); missing ones are left out.
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub images: Vec<String>,
}

/// "[Image: source: /path]" lines Claude Code writes after a prompt with pasted images.
fn image_source(text: &str) -> Option<&str> {
    text.trim().strip_prefix("[Image: source: ")?.strip_suffix(']').map(str::trim)
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SessionStart {
    pub id: String,
    pub first_at: String,
}

const MAX_EVENTS: usize = 600;

fn first_line(s: &str, max: usize) -> String {
    let l = s.lines().map(str::trim).find(|l| !l.is_empty()).unwrap_or("");
    let mut out: String = l.chars().take(max).collect();
    if l.chars().count() > max {
        out.push('…');
    }
    out
}

fn tool_event(name: &str, input: &Value, at: &str) -> TimelineEvent {
    let s = |k: &str| input[k].as_str().unwrap_or("").to_string();
    let (kind, title, detail, path) = match name {
        "Bash" => (EventKind::Command, first_line(&s("command"), 160), Some(s("description")).filter(|d| !d.is_empty()), None),
        "Edit" | "MultiEdit" | "Write" | "NotebookEdit" => {
            let p = if input["notebook_path"].is_string() { s("notebook_path") } else { s("file_path") };
            (EventKind::Edit, p.clone(), Some(if name == "Write" { "created / overwritten".into() } else { "edited".into() }), Some(p))
        }
        "Read" | "NotebookRead" => (EventKind::Read, s("file_path"), None, Some(s("file_path"))),
        "Grep" | "Glob" => (EventKind::Search, s("pattern"), Some(s("path")).filter(|p| !p.is_empty()), None),
        "WebSearch" => (EventKind::Search, s("query"), Some("web search".into()), None),
        "WebFetch" => (EventKind::Search, s("url"), Some("web fetch".into()), None),
        "Agent" | "Task" => (EventKind::Agent, s("description"), Some(s("subagent_type")).filter(|d| !d.is_empty()), None),
        "TodoWrite" => (EventKind::Tool, "Updated the task list".into(), None, None),
        "AskUserQuestion" => (EventKind::Tool, input["questions"][0]["question"].as_str().map(|q| first_line(q, 160)).unwrap_or_else(|| "Asked you a question".into()), Some("asked you".into()), None),
        other => {
            let short = other.rsplit("__").next().unwrap_or(other).to_string();
            (EventKind::Tool, short, None, None)
        }
    };
    TimelineEvent { at: at.into(), kind, tool: Some(name.into()), title, detail, path, error: false, images: vec![] }
}

pub fn parse_timeline(lines: impl Iterator<Item = String>) -> Vec<TimelineEvent> {
    let mut events: Vec<TimelineEvent> = vec![];
    let mut by_tool_id: HashMap<String, usize> = HashMap::new();
    for line in lines {
        let Ok(v) = serde_json::from_str::<Value>(&line) else { continue };
        let at = v["timestamp"].as_str().unwrap_or("").to_string();
        let content = &v["message"]["content"];
        match v["type"].as_str() {
            Some("user") => {
                if let Some(text) = content.as_str() {
                    let t = text.trim();
                    if let Some(src) = image_source(t) {
                        if let Some(prompt) = events.iter_mut().rev().find(|e| e.kind == EventKind::Prompt) {
                            if Path::new(src).is_file() {
                                prompt.images.push(src.to_string());
                            }
                        }
                    } else if !t.is_empty() && !t.starts_with('<') {
                        events.push(TimelineEvent { at, kind: EventKind::Prompt, tool: None, title: first_line(t, 240), detail: None, path: None, error: false, images: vec![] });
                    }
                } else if let Some(blocks) = content.as_array() {
                    // Image references follow the prompt as separate meta entries: attach them to it.
                    let texts: Vec<&str> = blocks.iter().filter(|b| b["type"] == "text").filter_map(|b| b["text"].as_str()).collect();
                    let sources: Vec<&str> = texts.iter().filter_map(|t| image_source(t)).collect();
                    if !sources.is_empty() {
                        if let Some(prompt) = events.iter_mut().rev().find(|e| e.kind == EventKind::Prompt) {
                            prompt.images.extend(sources.iter().filter(|p| Path::new(p).is_file()).map(|p| p.to_string()));
                        }
                        continue;
                    }
                    // Prompts with images arrive as blocks: [image, text "…"].
                    let text: Vec<&str> = texts.iter().map(|t| t.trim()).filter(|t| !t.is_empty() && !t.starts_with('<')).collect();
                    if !text.is_empty() && !blocks.iter().any(|b| b["type"] == "tool_result") {
                        events.push(TimelineEvent { at: at.clone(), kind: EventKind::Prompt, tool: None, title: first_line(&text.join(" "), 240), detail: None, path: None, error: false, images: vec![] });
                    }
                    for b in blocks {
                        if b["type"] == "tool_result" && b["is_error"].as_bool() == Some(true) {
                            if let Some(&i) = b["tool_use_id"].as_str().and_then(|id| by_tool_id.get(id)) {
                                events[i].error = true;
                            }
                        }
                    }
                }
            }
            Some("assistant") => {
                for b in content.as_array().into_iter().flatten() {
                    match b["type"].as_str() {
                        Some("tool_use") => {
                            let name = b["name"].as_str().unwrap_or("tool");
                            if let Some(id) = b["id"].as_str() {
                                by_tool_id.insert(id.to_string(), events.len());
                            }
                            events.push(tool_event(name, &b["input"], &at));
                        }
                        Some("text") => {
                            let t = b["text"].as_str().unwrap_or("").trim();
                            if !t.is_empty() {
                                events.push(TimelineEvent { at: at.clone(), kind: EventKind::Reply, tool: None, title: first_line(t, 200), detail: None, path: None, error: false, images: vec![] });
                            }
                        }
                        _ => {}
                    }
                }
            }
            _ => {}
        }
    }
    let skip = events.len().saturating_sub(MAX_EVENTS);
    events.into_iter().skip(skip).collect()
}

fn valid_id(id: &str) -> bool {
    !id.is_empty() && id.len() <= 64 && id.chars().all(|c| c.is_ascii_alphanumeric() || c == '-')
}

pub fn timeline(cwd: &str, session_id: &str) -> Result<Vec<TimelineEvent>, String> {
    if !valid_id(session_id) {
        return Err("invalid session id".into());
    }
    let dir = super::chats::claude_dir(cwd).ok_or("no home directory")?;
    let f = File::open(dir.join(format!("{session_id}.jsonl"))).map_err(|e| e.to_string())?;
    Ok(parse_timeline(BufReader::new(f).lines().map_while(Result::ok)))
}

/// Sessions in the folder whose first entry is at or after `since` (RFC3339), oldest first.
/// Used to bind a freshly launched agent to the transcript it creates.
pub fn sessions_since(cwd: &str, since: &str) -> Vec<SessionStart> {
    let Some(dir) = super::chats::claude_dir(cwd) else { return vec![] };
    let mut out: Vec<SessionStart> = fs::read_dir(&dir)
        .into_iter()
        .flatten()
        .flatten()
        .filter_map(|e| {
            let p = e.path();
            if p.extension()? != "jsonl" {
                return None;
            }
            let id = p.file_stem()?.to_string_lossy().into_owned();
            let first_at = first_timestamp(&p)?;
            (first_at.as_str() >= since).then_some(SessionStart { id, first_at })
        })
        .collect();
    out.sort_by(|a, b| a.first_at.cmp(&b.first_at));
    out
}

/// The transcript (modified at or after `since_ms`, newest first) that contains a user prompt
/// starting like `typed`. Lets an agent follow the conversation you're actually typing into,
/// even after /clear, a resume or another Claude running in the same folder.
pub fn session_with_prompt(cwd: &str, since_ms: u64, typed: &str) -> Option<String> {
    let needle: String = typed.split_whitespace().collect::<Vec<_>>().join(" ").chars().take(40).collect();
    if needle.chars().count() < 3 {
        return None;
    }
    let dir = super::chats::claude_dir(cwd)?;
    let since = std::time::UNIX_EPOCH + std::time::Duration::from_millis(since_ms);
    let mut files: Vec<(std::time::SystemTime, std::path::PathBuf)> = fs::read_dir(&dir)
        .ok()?
        .flatten()
        .filter_map(|e| {
            let p = e.path();
            let m = e.metadata().ok()?.modified().ok()?;
            (p.extension()? == "jsonl" && m >= since).then_some((m, p))
        })
        .collect();
    files.sort_by(|a, b| b.0.cmp(&a.0));
    files.into_iter().take(20).find_map(|(_, p)| {
        let hit = BufReader::new(File::open(&p).ok()?).lines().map_while(Result::ok).any(|l| {
            l.contains("\"type\":\"user\"")
                && serde_json::from_str::<Value>(&l).ok().is_some_and(|v| {
                    let c = &v["message"]["content"];
                    let text = c.as_str().map(String::from).unwrap_or_else(|| {
                        c.as_array().into_iter().flatten().filter(|b| b["type"] == "text").filter_map(|b| b["text"].as_str()).collect::<Vec<_>>().join(" ")
                    });
                    text.split_whitespace().collect::<Vec<_>>().join(" ").contains(&needle)
                })
        });
        if hit { p.file_stem().map(|s| s.to_string_lossy().into_owned()) } else { None }
    })
}

/// Transcripts in the folder written to at or after `since_ms`, most recently written first.
/// Catches conversations that were *continued* (they started before the agent launched).
pub fn sessions_touched_since(cwd: &str, since_ms: u64) -> Vec<String> {
    let Some(dir) = super::chats::claude_dir(cwd) else { return vec![] };
    let since = std::time::UNIX_EPOCH + std::time::Duration::from_millis(since_ms);
    let mut files: Vec<(std::time::SystemTime, String)> = fs::read_dir(&dir)
        .into_iter()
        .flatten()
        .flatten()
        .filter_map(|e| {
            let p = e.path();
            let m = e.metadata().ok()?.modified().ok()?;
            let id = p.file_stem()?.to_string_lossy().into_owned();
            (p.extension()? == "jsonl" && m >= since).then_some((m, id))
        })
        .collect();
    files.sort_by(|a, b| b.0.cmp(&a.0));
    files.into_iter().map(|(_, id)| id).collect()
}

fn first_timestamp(p: &Path) -> Option<String> {
    BufReader::new(File::open(p).ok()?)
        .lines()
        .map_while(Result::ok)
        .take(50)
        .find_map(|l| serde_json::from_str::<Value>(&l).ok()?["timestamp"].as_str().map(String::from))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn builds_events_and_marks_failed_tools() {
        let lines = [
            r#"{"type":"user","timestamp":"t1","message":{"content":"<command-name>/clear</command-name>"}}"#,
            r#"{"type":"user","timestamp":"t2","message":{"content":"Fix the login bug\nthanks"}}"#,
            r#"{"type":"assistant","timestamp":"t3","message":{"content":[{"type":"text","text":"Looking at it."},{"type":"tool_use","id":"a","name":"Read","input":{"file_path":"/app/login.ts"}}]}}"#,
            r#"{"type":"assistant","timestamp":"t4","message":{"content":[{"type":"tool_use","id":"b","name":"Bash","input":{"command":"npm test\n--watch","description":"Run tests"}}]}}"#,
            r#"{"type":"user","timestamp":"t5","message":{"content":[{"type":"tool_result","tool_use_id":"b","is_error":true,"content":"1 failing"}]}}"#,
            r#"{"type":"assistant","timestamp":"t6","message":{"content":[{"type":"tool_use","id":"c","name":"Edit","input":{"file_path":"/app/login.ts"}},{"type":"tool_use","id":"d","name":"mcp__github__create_pr","input":{}}]}}"#,
            "not json",
            r#"{"type":"user","timestamp":"t7","message":{"content":[{"type":"text","text":"[Image #2] nowrap please"},{"type":"image","source":{}}]}}"#,
        ];
        let e = parse_timeline(lines.iter().map(|s| s.to_string()));
        assert_eq!(e.last().map(|x| (x.kind.clone(), x.title.as_str())), Some((EventKind::Prompt, "[Image #2] nowrap please")));
        let e: Vec<_> = e[..e.len() - 1].to_vec();
        let kinds: Vec<_> = e.iter().map(|x| x.kind.clone()).collect();
        assert_eq!(kinds, vec![EventKind::Prompt, EventKind::Reply, EventKind::Read, EventKind::Command, EventKind::Edit, EventKind::Tool]);
        assert_eq!(e[0].title, "Fix the login bug");
        assert_eq!(e[3].title, "npm test");
        assert_eq!(e[3].detail.as_deref(), Some("Run tests"));
        assert!(e[3].error, "failed tool result marks the command");
        assert!(!e[2].error);
        assert_eq!(e[4].path.as_deref(), Some("/app/login.ts"));
        assert_eq!(e[5].title, "create_pr");
    }

    #[test]
    fn attaches_cached_images_and_guards_reads() {
        let img = std::env::temp_dir().join(format!("orbitr-img-{}.png", std::process::id()));
        std::fs::write(&img, b"x").unwrap();
        let src = img.to_string_lossy();
        let lines = [
            r#"{"type":"user","timestamp":"t1","message":{"content":"fix the buttons"}}"#.to_string(),
            format!(r#"{{"type":"user","isMeta":true,"timestamp":"t1","message":{{"content":[{{"type":"text","text":"[Image: source: {src}]"}}]}}}}"#),
            r#"{"type":"user","isMeta":true,"timestamp":"t1","message":{"content":[{"type":"text","text":"[Image: source: /nope/gone.png]"}]}}"#.to_string(),
        ];
        let e = parse_timeline(lines.into_iter());
        assert_eq!(e.len(), 1, "image refs are not prompts of their own");
        assert_eq!(e[0].images, vec![src.to_string()], "only images that still exist");
        // Reads outside ~/.claude/image-cache are refused.
        assert!(cached_image(&src).is_err());
        assert!(cached_image("/etc/passwd").is_err());
        let _ = std::fs::remove_file(img);
    }

    #[test]
    fn rejects_path_like_ids() {
        assert!(timeline("/tmp", "../../etc/passwd").is_err());
        assert!(valid_id("7b0001da-3f2c-48a1-8c16-3ffd64f6aea1"));
    }
}

/// `ORBITR_CWD=… cargo test -- --ignored timeline_real --nocapture`
#[cfg(test)]
mod real {
    #[test]
    #[ignore]
    fn timeline_real() {
        let cwd = std::env::var("ORBITR_CWD").unwrap();
        let s = super::sessions_since(&cwd, "2026-11-20");
        println!("{} sessions since 2026-11-20", s.len());
        let last = s.last().expect("a session");
        let e = super::timeline(&cwd, &last.id).unwrap();
        let mut counts = std::collections::BTreeMap::new();
        for x in &e {
            *counts.entry(format!("{:?}", x.kind)).or_insert(0) += 1;
        }
        println!("{} events {:?}; errors {}", e.len(), counts, e.iter().filter(|x| x.error).count());
        for x in e.iter().filter(|x| !matches!(x.kind, super::EventKind::Reply)).take(8) {
            println!("  {:?} {}", x.kind, x.title.chars().take(70).collect::<String>());
        }
    }
}

/// A pasted image from Claude's cache: (mime, bytes). Only files inside ~/.claude/image-cache
/// (no `..` tricks, image types only, ≤ 20 MB) — nothing else on disk can be read this way.
pub fn cached_image(path: &str) -> Result<(&'static str, Vec<u8>), String> {
    let cache = super::chats::home().ok_or("no home folder")?.join(".claude").join("image-cache");
    let cache = fs::canonicalize(&cache).map_err(|_| "no image cache".to_string())?;
    let real = fs::canonicalize(path).map_err(|_| "image no longer in cache".to_string())?;
    if !real.starts_with(&cache) {
        return Err("not a cached image".into());
    }
    let mime = match real.extension().and_then(|e| e.to_str()).map(str::to_ascii_lowercase).as_deref() {
        Some("png") => "image/png",
        Some("jpg" | "jpeg") => "image/jpeg",
        Some("gif") => "image/gif",
        Some("webp") => "image/webp",
        _ => return Err("not an image".into()),
    };
    if fs::metadata(&real).map_err(|e| e.to_string())?.len() > 20 * 1024 * 1024 {
        return Err("image too large".into());
    }
    Ok((mime, fs::read(&real).map_err(|e| e.to_string())?))
}
