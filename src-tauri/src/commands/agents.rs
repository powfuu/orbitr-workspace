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
