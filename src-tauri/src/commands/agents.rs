/// Returns the absolute path of an agent CLI, or None when it is not installed.
#[tauri::command]
pub async fn resolve_executable(name: String) -> Option<String> {
    tauri::async_runtime::spawn_blocking(move || crate::agents::resolve_executable(&name))
        .await
        .ok()
        .flatten()
}

/// Past conversations an agent CLI stored for a project folder, newest first.
#[tauri::command]
pub async fn list_agent_chats(kind: String, cwd: String) -> Vec<crate::agents::chats::ChatSummary> {
    tauri::async_runtime::spawn_blocking(move || crate::agents::chats::list_chats(&kind, &cwd))
        .await
        .unwrap_or_default()
}

/// Claude Code usage for one project folder since `since` (YYYY-MM-DD).
#[tauri::command]
pub async fn usage_project(cwd: String, since: String) -> crate::agents::usage::UsageReport {
    tauri::async_runtime::spawn_blocking(move || crate::agents::usage::project_usage(&cwd, &since)).await.unwrap_or_default()
}

/// Claude Code usage across all projects since `since` (YYYY-MM-DD).
#[tauri::command]
pub async fn usage_overview(since: String) -> crate::agents::usage::UsageReport {
    tauri::async_runtime::spawn_blocking(move || crate::agents::usage::overview(&since)).await.unwrap_or_default()
}

/// Events of one Claude Code session (prompts, tool calls, replies).
#[tauri::command]
pub async fn agent_timeline(cwd: String, session_id: String) -> Result<Vec<crate::agents::timeline::TimelineEvent>, String> {
    tauri::async_runtime::spawn_blocking(move || crate::agents::timeline::timeline(&cwd, &session_id)).await.map_err(|e| e.to_string())?
}

/// Claude Code sessions started in `cwd` at or after `since` (RFC3339).
#[tauri::command]
pub async fn claude_sessions_since(cwd: String, since: String) -> Vec<crate::agents::timeline::SessionStart> {
    tauri::async_runtime::spawn_blocking(move || crate::agents::timeline::sessions_since(&cwd, &since)).await.unwrap_or_default()
}

/// Transcript in `cwd` (touched since `since_ms`) containing a prompt like `typed`.
#[tauri::command]
pub async fn claude_session_with_prompt(cwd: String, since_ms: u64, typed: String) -> Option<String> {
    tauri::async_runtime::spawn_blocking(move || crate::agents::timeline::session_with_prompt(&cwd, since_ms, &typed)).await.ok().flatten()
}

/// A pasted image Claude Code still has cached, as raw bytes (the UI makes a blob URL).
#[tauri::command]
pub async fn claude_cached_image(path: String) -> Result<tauri::ipc::Response, String> {
    let (_mime, bytes) = tauri::async_runtime::spawn_blocking(move || crate::agents::timeline::cached_image(&path)).await.map_err(|e| e.to_string())??;
    Ok(tauri::ipc::Response::new(bytes))
}

/// Every file edit of a Claude Code session, grouped under the prompt that caused it.
#[tauri::command]
pub async fn agent_changes(cwd: String, session_id: String) -> Result<Vec<crate::agents::changes::PromptChanges>, String> {
    tauri::async_runtime::spawn_blocking(move || crate::agents::changes::session_changes(&cwd, &session_id)).await.map_err(|e| e.to_string())?
}

/// Claude Code transcripts in `cwd` written since `since_ms`, newest first.
#[tauri::command]
pub async fn claude_sessions_touched(cwd: String, since_ms: u64) -> Vec<String> {
    tauri::async_runtime::spawn_blocking(move || crate::agents::timeline::sessions_touched_since(&cwd, since_ms)).await.unwrap_or_default()
}

/* ── agent news: versions and changelogs ─────────────────────────────────── */

/// Fetches public release info. Only these hosts are allowed, so the app can't be made to
/// request arbitrary URLs.
const NEWS_HOSTS: [&str; 4] = ["https://registry.npmjs.org/", "https://api.github.com/repos/", "https://raw.githubusercontent.com/", "https://openrouter.ai/api/v1/models"];

#[tauri::command]
pub async fn agent_news_fetch(url: String) -> Result<String, String> {
    if !NEWS_HOSTS.iter().any(|h| url.starts_with(h)) || url.contains("..") {
        return Err("host not allowed".into());
    }
    let res = reqwest::Client::new()
        .get(&url)
        .header("User-Agent", "orbitr-workspace")
        .header("Accept", "application/vnd.github+json, application/json, text/plain")
        .timeout(std::time::Duration::from_secs(12))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !res.status().is_success() {
        return Err(format!("{} for {url}", res.status()));
    }
    let text = res.text().await.map_err(|e| e.to_string())?;
    Ok(text.chars().take(3_000_000).collect())
}

/// `<cli> --version` through the login shell (so nvm/Homebrew PATHs apply). Name is checked.
#[tauri::command]
pub async fn agent_cli_version(executable: String) -> Result<String, String> {
    if executable.is_empty() || !executable.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_') {
        return Err("invalid executable".into());
    }
    tauri::async_runtime::spawn_blocking(move || {
        let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".into());
        let out = std::process::Command::new(shell)
            .args(["-l", "-c", &format!("{executable} --version")])
            .stdin(std::process::Stdio::null())
            .output()
            .map_err(|e| e.to_string())?;
        let text = String::from_utf8_lossy(&out.stdout).to_string() + &String::from_utf8_lossy(&out.stderr);
        // First "1.2.3"-like token in the output.
        text.split(|c: char| !(c.is_ascii_digit() || c == '.'))
            .find(|t| t.matches('.').count() >= 1 && t.split('.').all(|p| !p.is_empty()))
            .map(String::from)
            .ok_or_else(|| "no version".into())
    })
    .await
    .map_err(|e| e.to_string())?
}
