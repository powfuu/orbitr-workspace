//! Every file edit an agent made, grouped under the prompt that caused it — read from the
//! Claude Code transcript (Edit / MultiEdit / Write / NotebookEdit tool calls). Read-only.
use serde::Serialize;
use serde_json::Value;
use std::collections::HashMap;
use std::fs::File;
use std::io::{BufRead, BufReader};

const MAX_TEXT: usize = 64 * 1024;

#[derive(Serialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FileEdit {
    pub at: String,
    pub tool: String,
    pub path: String,
    /// Text replaced ("" for a new file / full write).
    pub old: String,
    /// Text written.
    pub new: String,
    /// Whole-file write (Write) rather than a replacement.
    pub full: bool,
    /// The tool call failed, so this change was not applied.
    pub error: bool,
    pub truncated: bool,
}

#[derive(Serialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PromptChanges {
    pub at: String,
    pub prompt: String,
    pub edits: Vec<FileEdit>,
}

fn clip(s: &str, truncated: &mut bool) -> String {
    if s.len() > MAX_TEXT {
        *truncated = true;
        s[..s.floor_char_boundary(MAX_TEXT)].to_string()
    } else {
        s.to_string()
    }
}

fn prompt_text(content: &Value) -> Option<String> {
    let text = match content {
        Value::String(s) => s.trim().to_string(),
        Value::Array(blocks) => {
            if blocks.iter().any(|b| b["type"] == "tool_result") {
                return None;
            }
            blocks.iter().filter(|b| b["type"] == "text").filter_map(|b| b["text"].as_str()).collect::<Vec<_>>().join(" ").trim().to_string()
        }
        _ => return None,
    };
    (!text.is_empty() && !text.starts_with('<') && !text.starts_with("[Image: source:")).then_some(text)
}

pub fn parse_changes(lines: impl Iterator<Item = String>) -> Vec<PromptChanges> {
    let mut out: Vec<PromptChanges> = vec![];
    let mut by_tool: HashMap<String, Vec<(usize, usize)>> = HashMap::new();
    for line in lines {
        let Ok(v) = serde_json::from_str::<Value>(&line) else { continue };
        let at = v["timestamp"].as_str().unwrap_or("").to_string();
        let content = &v["message"]["content"];
        match v["type"].as_str() {
            Some("user") => {
                if v["isMeta"].as_bool() == Some(true) {
                    continue;
                }
                if let Some(text) = prompt_text(content) {
                    out.push(PromptChanges { at, prompt: text, edits: vec![] });
                } else if let Some(blocks) = content.as_array() {
                    for b in blocks.iter().filter(|b| b["type"] == "tool_result" && b["is_error"].as_bool() == Some(true)) {
                        for &(p, e) in by_tool.get(b["tool_use_id"].as_str().unwrap_or("")).into_iter().flatten() {
                            if let Some(edit) = out.get_mut(p).and_then(|g| g.edits.get_mut(e)) {
                                edit.error = true;
                            }
                        }
                    }
                }
            }
            Some("assistant") => {
                for b in content.as_array().into_iter().flatten().filter(|b| b["type"] == "tool_use") {
                    let tool = b["name"].as_str().unwrap_or("");
                    let input = &b["input"];
                    let path = input["file_path"].as_str().or(input["notebook_path"].as_str()).unwrap_or("").to_string();
                    let pieces: Vec<(String, String, bool)> = match tool {
                        "Edit" => vec![(input["old_string"].as_str().unwrap_or("").into(), input["new_string"].as_str().unwrap_or("").into(), false)],
                        "MultiEdit" => input["edits"]
                            .as_array()
                            .into_iter()
                            .flatten()
                            .map(|e| (e["old_string"].as_str().unwrap_or("").into(), e["new_string"].as_str().unwrap_or("").into(), false))
                            .collect(),
                        "Write" => vec![(String::new(), input["content"].as_str().unwrap_or("").into(), true)],
                        "NotebookEdit" => vec![(String::new(), input["new_source"].as_str().unwrap_or("").into(), false)],
                        _ => continue,
                    };
                    if path.is_empty() {
                        continue;
                    }
                    if out.is_empty() {
                        out.push(PromptChanges { at: at.clone(), prompt: "(before the first prompt)".into(), edits: vec![] });
                    }
                    let gi = out.len() - 1;
                    for (old, new, full) in pieces {
                        let mut truncated = false;
                        let edit = FileEdit { at: at.clone(), tool: tool.into(), path: path.clone(), old: clip(&old, &mut truncated), new: clip(&new, &mut truncated), full, error: false, truncated };
                        out[gi].edits.push(edit);
                        if let Some(id) = b["id"].as_str() {
                            by_tool.entry(id.to_string()).or_default().push((gi, out[gi].edits.len() - 1));
                        }
                    }
                }
            }
            _ => {}
        }
    }
    out
}

pub fn session_changes(cwd: &str, session_id: &str) -> Result<Vec<PromptChanges>, String> {
    if session_id.is_empty() || !session_id.chars().all(|c| c.is_ascii_alphanumeric() || c == '-') {
        return Err("invalid session id".into());
    }
    let dir = super::chats::claude_dir(cwd).ok_or("no home directory")?;
    let f = File::open(dir.join(format!("{session_id}.jsonl"))).map_err(|e| e.to_string())?;
    Ok(parse_changes(BufReader::new(f).lines().map_while(Result::ok)))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn groups_edits_under_their_prompt() {
        let lines = [
            r#"{"type":"user","timestamp":"t1","message":{"content":"make buttons white"}}"#,
            r#"{"type":"assistant","timestamp":"t2","message":{"content":[{"type":"text","text":"ok"},{"type":"tool_use","id":"a","name":"Edit","input":{"file_path":"/p/a.scss","old_string":"bg: grey;","new_string":"bg: white;"}}]}}"#,
            r#"{"type":"assistant","timestamp":"t3","message":{"content":[{"type":"tool_use","id":"b","name":"Write","input":{"file_path":"/p/new.ts","content":"export {}\n"}}]}}"#,
            r#"{"type":"user","timestamp":"t4","message":{"content":[{"type":"tool_result","tool_use_id":"b","is_error":true,"content":"denied"}]}}"#,
            r#"{"type":"user","isMeta":true,"timestamp":"t4","message":{"content":[{"type":"text","text":"[Image: source: /x.png]"}]}}"#,
            r#"{"type":"user","timestamp":"t5","message":{"content":"now the labels"}}"#,
            r#"{"type":"assistant","timestamp":"t6","message":{"content":[{"type":"tool_use","id":"c","name":"MultiEdit","input":{"file_path":"/p/a.html","edits":[{"old_string":"A","new_string":"B"},{"old_string":"C","new_string":"D"}]}}]}}"#,
            r#"{"type":"assistant","timestamp":"t7","message":{"content":[{"type":"tool_use","id":"d","name":"Read","input":{"file_path":"/p/a.html"}}]}}"#,
        ];
        let c = parse_changes(lines.iter().map(|s| s.to_string()));
        assert_eq!(c.len(), 2);
        assert_eq!(c[0].prompt, "make buttons white");
        assert_eq!(c[0].edits.len(), 2);
        assert_eq!((c[0].edits[0].old.as_str(), c[0].edits[0].new.as_str()), ("bg: grey;", "bg: white;"));
        assert!(c[0].edits[1].full && c[0].edits[1].error, "failed write is flagged");
        assert_eq!(c[1].edits.len(), 2, "MultiEdit expands, Read is ignored");
    }
}
