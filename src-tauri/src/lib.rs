mod agents;
mod commands;
mod persistence;
mod terminal;

use tauri::Manager;
use terminal::PtyManager;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .manage(PtyManager::default())
        .invoke_handler(tauri::generate_handler![
            commands::system::platform_info,
            commands::terminal::pty_spawn,
            commands::terminal::pty_write,
            commands::terminal::pty_resize,
            commands::terminal::pty_kill,
            commands::terminal::list_shells,
            commands::agents::resolve_executable,
            commands::agents::list_agent_chats,
            commands::state::state_load,
            commands::state::state_save,
            commands::state::state_remove,
        ])
        .build(tauri::generate_context!())
        .expect("error while building Orbitr")
        .run(|app, event| {
            // Child processes must not outlive the app.
            if let tauri::RunEvent::Exit = event {
                app.state::<PtyManager>().kill_all();
            }
        });
}
