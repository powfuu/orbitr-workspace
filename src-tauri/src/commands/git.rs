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

#[tauri::command]
pub async fn list_files(repo: String) -> Result<Vec<String>, String> {
    run(move || git::list_files(&repo)).await
}

/* ── history, branches, stash, git flow ─────────────────────────────────── */

#[tauri::command]
pub async fn git_log_page(repo: String, skip: u32, limit: u32, rev: Option<String>) -> Result<Vec<Commit>, String> {
    run(move || git::log_page(&repo, skip, limit, rev.as_deref())).await
}

#[tauri::command]
pub async fn git_commit_detail(repo: String, hash: String) -> Result<git::CommitDetail, String> {
    run(move || git::commit_detail(&repo, &hash)).await
}

#[tauri::command]
pub async fn git_commit_diff(repo: String, hash: String, file: String) -> Result<String, String> {
    run(move || git::commit_diff(&repo, &hash, &file)).await
}

#[tauri::command]
pub async fn git_remote_branches(repo: String) -> Result<Vec<String>, String> {
    run(move || git::remote_branches(&repo)).await
}

#[tauri::command]
pub async fn git_branch_create(repo: String, name: String, base: Option<String>, checkout: bool) -> Result<(), String> {
    run(move || git::branch_create(&repo, &name, base.as_deref(), checkout)).await
}

#[tauri::command]
pub async fn git_checkout_remote(repo: String, remote: String) -> Result<String, String> {
    run(move || git::checkout_remote(&repo, &remote)).await
}

#[tauri::command]
pub async fn git_branch_delete(repo: String, name: String, force: bool) -> Result<(), String> {
    run(move || git::branch_delete(&repo, &name, force)).await
}

#[tauri::command]
pub async fn git_branch_rename(repo: String, old: String, new: String) -> Result<(), String> {
    run(move || git::branch_rename(&repo, &old, &new)).await
}

#[tauri::command]
pub async fn git_merge(repo: String, branch: String, no_ff: bool) -> Result<String, String> {
    run(move || git::merge(&repo, &branch, no_ff)).await
}

#[tauri::command]
pub async fn git_merge_abort(repo: String) -> Result<(), String> {
    run(move || git::merge_abort(&repo)).await
}

#[tauri::command]
pub async fn git_fetch(repo: String) -> Result<String, String> {
    run(move || git::fetch(&repo)).await
}

#[tauri::command]
pub async fn git_cherry_pick(repo: String, hash: String) -> Result<String, String> {
    run(move || git::cherry_pick(&repo, &hash)).await
}

#[tauri::command]
pub async fn git_revert(repo: String, hash: String) -> Result<String, String> {
    run(move || git::revert(&repo, &hash)).await
}

#[tauri::command]
pub async fn git_tag_create(repo: String, name: String, hash: Option<String>) -> Result<(), String> {
    run(move || git::tag_create(&repo, &name, hash.as_deref())).await
}

#[tauri::command]
pub async fn git_stash_list(repo: String) -> Result<Vec<git::Stash>, String> {
    run(move || git::stash_list(&repo)).await
}

#[tauri::command]
pub async fn git_stash_push(repo: String, message: String, untracked: bool) -> Result<(), String> {
    run(move || git::stash_push(&repo, &message, untracked)).await
}

#[tauri::command]
pub async fn git_stash_op(repo: String, op: String, index: u32) -> Result<(), String> {
    run(move || git::stash_op(&repo, &op, index)).await
}

#[tauri::command]
pub async fn git_flow_config(repo: String) -> Result<git::FlowConfig, String> {
    run(move || git::flow_config(&repo)).await
}

#[tauri::command]
pub async fn git_flow_start(repo: String, kind: String, name: String) -> Result<String, String> {
    run(move || git::flow_start(&repo, &kind, &name)).await
}

#[tauri::command]
pub async fn git_flow_finish(repo: String, branch: String, tag: bool) -> Result<String, String> {
    run(move || git::flow_finish(&repo, &branch, tag)).await
}

/* ── remotes & credentials ──────────────────────────────────────────────── */

#[tauri::command]
pub async fn git_remotes(repo: String) -> Result<Vec<git::Remote>, String> {
    run(move || git::remotes(&repo)).await
}

#[tauri::command]
pub async fn git_remote_set_url(repo: String, name: String, url: String) -> Result<(), String> {
    run(move || git::remote_set_url(&repo, &name, &url)).await
}

#[tauri::command]
pub async fn git_remote_add(repo: String, name: String, url: String) -> Result<(), String> {
    run(move || git::remote_add(&repo, &name, &url)).await
}

#[tauri::command]
pub async fn git_remote_remove(repo: String, name: String) -> Result<(), String> {
    run(move || git::remote_remove(&repo, &name)).await
}

#[tauri::command]
pub async fn git_store_credential(repo: String, url: String, username: String, password: String) -> Result<(), String> {
    run(move || git::store_credential(&repo, &url, &username, &password)).await
}

#[tauri::command]
pub async fn git_gcm_installed() -> bool {
    git::gcm_path().is_some()
}

#[tauri::command]
pub async fn git_browser_login(repo: String, remote: String) -> Result<(), String> {
    run(move || git::browser_login(&repo, &remote)).await
}

#[tauri::command]
pub async fn git_remote_signed_in(repo: String, name: String) -> bool {
    tauri::async_runtime::spawn_blocking(move || git::remote_signed_in(&repo, &name)).await.unwrap_or(false)
}
