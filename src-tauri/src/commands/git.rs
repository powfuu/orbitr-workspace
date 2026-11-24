use crate::git::{self, Commit, GitStatus};

/// Runs blocking git work off the main thread.
async fn run<T: Send + 'static>(f: impl FnOnce() -> Result<T, String> + Send + 'static) -> Result<T, String> {
    tauri::async_runtime::spawn_blocking(f).await.map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn git_status(repo: String) -> Result<Option<GitStatus>, String> {
    run(move || git::status(&repo)).await
}

#[tauri::command]
pub async fn git_log(repo: String, limit: u32) -> Result<Vec<Commit>, String> {
    run(move || git::log(&repo, limit)).await
}

#[tauri::command]
pub async fn git_diff(repo: String, file: String, staged: bool, untracked: bool) -> Result<String, String> {
    run(move || git::diff(&repo, &file, staged, untracked)).await
}

#[tauri::command]
pub async fn git_stage(repo: String, files: Vec<String>) -> Result<(), String> {
    run(move || git::stage(&repo, &files)).await
}

#[tauri::command]
pub async fn git_unstage(repo: String, files: Vec<String>) -> Result<(), String> {
    run(move || git::unstage(&repo, &files)).await
}

#[tauri::command]
pub async fn git_commit(repo: String, message: String) -> Result<(), String> {
    run(move || git::commit(&repo, &message)).await
}

#[tauri::command]
pub async fn git_push(repo: String) -> Result<String, String> {
    run(move || git::push(&repo)).await
}

#[tauri::command]
pub async fn git_pull(repo: String) -> Result<String, String> {
    run(move || git::pull(&repo)).await
}

#[tauri::command]
pub async fn git_branches(repo: String) -> Result<Vec<git::Branch>, String> {
    run(move || git::branches(&repo)).await
}

#[tauri::command]
pub async fn git_switch(repo: String, branch: String) -> Result<(), String> {
    run(move || git::switch_branch(&repo, &branch)).await
}

#[tauri::command]
pub async fn git_create_branch(repo: String, branch: String) -> Result<(), String> {
    run(move || git::create_branch(&repo, &branch)).await
}

#[tauri::command]
pub async fn git_worktrees(repo: String) -> Result<Vec<git::Worktree>, String> {
    run(move || git::worktrees(&repo)).await
}

#[tauri::command]
pub async fn git_add_worktree(repo: String, branch: String, create: bool) -> Result<String, String> {
    run(move || git::add_worktree(&repo, &branch, create)).await
}

#[tauri::command]
pub async fn git_remove_worktree(repo: String, path: String, force: bool) -> Result<(), String> {
    run(move || git::remove_worktree(&repo, &path, force)).await
}
