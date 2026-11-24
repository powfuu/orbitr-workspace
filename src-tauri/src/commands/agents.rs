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
