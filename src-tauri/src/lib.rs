mod agents;
mod commands;
mod fonts;
mod git;
mod persistence;
mod process;
mod terminal;
mod voice;

use tauri::Manager;
use terminal::PtyManager;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .manage(PtyManager::default())
        .manage(commands::voice::VoiceState::default())
        .invoke_handler(tauri::generate_handler![
            commands::system::platform_info,
            commands::terminal::pty_spawn,
            commands::terminal::pty_write,
            commands::terminal::pty_resize,
            commands::terminal::pty_kill,
            commands::terminal::list_shells,
            commands::agents::resolve_executable,
            commands::agents::list_agent_chats,
            commands::agents::usage_project,
            commands::agents::usage_overview,
            commands::agents::agent_timeline,
            commands::agents::agent_changes,
            commands::agents::claude_sessions_since,
            commands::agents::claude_session_with_prompt,
            commands::agents::claude_cached_image,
            commands::state::state_load,
            commands::state::state_save,
            commands::state::state_remove,
            commands::voice::voice_model_status,
            commands::voice::voice_download_model,
            commands::voice::voice_cancel_download,
            commands::voice::voice_start,
            commands::voice::voice_stop,
            commands::git::git_status,
            commands::git::git_log,
            commands::git::git_diff,
            commands::git::git_stage,
            commands::git::git_unstage,
            commands::git::git_commit,
            commands::git::git_push,
            commands::git::git_pull,
            commands::git::git_branches,
            commands::git::git_switch,
            commands::git::git_create_branch,
            commands::git::git_worktrees,
            commands::git::git_add_worktree,
            commands::git::git_remove_worktree,
            commands::git::list_files,
            commands::git::git_log_page,
            commands::git::git_commit_detail,
            commands::git::git_commit_diff,
            commands::git::git_remote_branches,
            commands::git::git_branch_create,
            commands::git::git_checkout_remote,
            commands::git::git_branch_delete,
            commands::git::git_branch_rename,
            commands::git::git_merge,
            commands::git::git_merge_abort,
            commands::git::git_fetch,
            commands::git::git_cherry_pick,
            commands::git::git_revert,
            commands::git::git_tag_create,
            commands::git::git_stash_list,
            commands::git::git_stash_push,
            commands::git::git_stash_op,
            commands::git::git_flow_config,
            commands::git::git_flow_start,
            commands::git::git_flow_finish,
            commands::git::git_remotes,
            commands::git::git_remote_set_url,
            commands::git::git_remote_add,
            commands::git::git_remote_remove,
            commands::git::git_store_credential,
            commands::git::git_gcm_installed,
            commands::git::git_browser_login,
            commands::git::git_remote_signed_in,
            commands::git::git_pull_branch,
            commands::git::git_push_branch,
            commands::git::git_merge_state,
            commands::git::git_merge_continue,
            commands::git::git_stage_resolved,
            commands::fonts::nerd_fonts,
            commands::fonts::read_font,
        ])
        .build(tauri::generate_context!())
        .expect("error while building Orbitr")
        .run(|app, event| {
            // Child processes must not outlive the app.
            if let tauri::RunEvent::Exit = event {
                app.state::<PtyManager>().kill_all();
                app.state::<commands::voice::VoiceState>().shutdown();
            }
        });
}
