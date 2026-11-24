mod agents;
mod commands;
mod fonts;
mod git;
mod persistence;
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
            commands::agents::claude_sessions_since,
            commands::state::state_load,
            commands::state::state_save,
            commands::state::state_remove,
            commands::voice::voice_model_status,
            commands::voice::voice_download_model,
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
