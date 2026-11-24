//! Reads conversation transcripts that agent CLIs keep on disk so past chats can be
//! listed and resumed. Read-only; formats are parsed defensively (unknown lines skipped).
use serde::Serialize;
use serde_json::Value;
use std::fs::{self, File};
use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ChatSummary {
    pub id: String,
    pub title: String,
    pub updated_at: u64,
    pub messages: u32,
}

const LIMIT: usize = 40;

fn home() -> Option<PathBuf> {
    std::env::var_os(if cfg!(windows) { "USERPROFILE" } else { "HOME" }).map(PathBuf::from)
}

fn mtime_ms(p: &Path) -> u64 {
    fs::metadata(p)
        .and_then(|m| m.modified())
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

fn clean_title(s: &str) -> Option<String> {
    let line = s.lines().map(str::trim).find(|l| !l.is_empty())?;
    if line.starts_with('<') {
        return None; // command/system wrappers, not a human prompt
    }
    Some(line.chars().take(120).collect())
}

/// Claude Code: ~/.claude/projects/<cwd with non-alphanumerics as '-'>/<session-id>.jsonl
pub fn claude_dir(cwd: &str) -> Option<PathBuf> {
    let encoded: String = cwd.chars().map(|c| if c.is_ascii_alphanumeric() { c } else { '-' }).collect();
    Some(home()?.join(".claude").join("projects").join(encoded))
}

fn parse_claude(path: &Path) -> Option<ChatSummary> {
    let id = path.file_stem()?.to_string_lossy().into_owned();
    let (mut custom, mut first, mut messages) = (None, None, 0u32);
    for line in BufReader::new(File::open(path).ok()?).lines().map_while(Result::ok) {
        let Ok(v) = serde_json::from_str::<Value>(&line) else { continue };
        match v["type"].as_str() {
            Some("custom-title") => custom = v["customTitle"].as_str().map(String::from),
            Some("user") => {
                if let Some(text) = v["message"]["content"].as_str() {
                    messages += 1;
                    if first.is_none() {
                        first = clean_title(text);
                    }
                }
            }
            _ => {}
        }
    }
    if messages == 0 {
        return None;
    }
    Some(ChatSummary { id, title: custom.or(first).unwrap_or_else(|| "Untitled chat".into()), updated_at: mtime_ms(path), messages })
}

fn claude_chats(cwd: &str) -> Vec<ChatSummary> {
    let Some(dir) = claude_dir(cwd) else { return vec![] };
    let Ok(rd) = fs::read_dir(dir) else { return vec![] };
    let mut files: Vec<PathBuf> = rd.flatten().map(|e| e.path()).filter(|p| p.extension().is_some_and(|e| e == "jsonl")).collect();
    files.sort_by_key(|p| std::cmp::Reverse(mtime_ms(p)));
    files.iter().filter_map(|p| parse_claude(p)).take(LIMIT).collect()
}

/// Codex: ~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl, first line `session_meta` has id + cwd.
fn codex_chats(cwd: &str) -> Vec<ChatSummary> {
    let Some(root) = home().map(|h| h.join(".codex").join("sessions")) else { return vec![] };
    let mut files = vec![];
    let mut stack = vec![root];
    while let Some(dir) = stack.pop() {
        for e in fs::read_dir(dir).into_iter().flatten().flatten() {
            let p = e.path();
            if p.is_dir() {
                stack.push(p);
            } else if p.extension().is_some_and(|e| e == "jsonl") {
                files.push(p);
            }
        }
    }
    files.sort_by_key(|p| std::cmp::Reverse(mtime_ms(p)));
    files
        .iter()
        .filter_map(|p| {
            let mut lines = BufReader::new(File::open(p).ok()?).lines().map_while(Result::ok);
            let meta: Value = serde_json::from_str(&lines.next()?).ok()?;
            let payload = &meta["payload"];
            if payload["cwd"].as_str()? != cwd {
                return None;
            }
            let id = payload["id"].as_str()?.to_string();
            let (mut first, mut messages) = (None, 0u32);
            for line in lines {
                let Ok(v) = serde_json::from_str::<Value>(&line) else { continue };
                let item = &v["payload"];
                if item["type"] == "message" && item["role"] == "user" {
                    if let Some(text) = item["content"][0]["text"].as_str() {
                        if let Some(t) = clean_title(text) {
                            messages += 1;
                            first.get_or_insert(t);
                        }
                    }
                }
            }
            (messages > 0).then(|| ChatSummary { id, title: first.unwrap_or_default(), updated_at: mtime_ms(p), messages })
        })
        .take(LIMIT)
        .collect()
}

pub fn list_chats(kind: &str, cwd: &str) -> Vec<ChatSummary> {
    match kind {
        "claude-code" => claude_chats(cwd),
        "codex" => codex_chats(cwd),
        _ => vec![],
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_claude_transcript() {
        let dir = std::env::temp_dir().join(format!("orbitr-chats-{}", std::process::id()));
        fs::create_dir_all(&dir).unwrap();
        let f = dir.join("abc-123.jsonl");
        fs::write(
            &f,
            [
                r#"{"type":"user","message":{"role":"user","content":"<command-name>/init</command-name>"}}"#,
                r#"{"type":"user","message":{"role":"user","content":"Fix the login bug\nplease"}}"#,
                r#"{"type":"user","message":{"role":"user","content":[{"type":"tool_result"}]}}"#,
                "garbage line",
            ]
            .join("\n"),
        )
        .unwrap();
        let s = parse_claude(&f).unwrap();
        assert_eq!(s.id, "abc-123");
        assert_eq!(s.title, "Fix the login bug");
        assert_eq!(s.messages, 2);
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn encodes_claude_dir() {
        let d = claude_dir("/Users/a/my.app").unwrap();
        assert!(d.ends_with("-Users-a-my-app"));
    }
}
