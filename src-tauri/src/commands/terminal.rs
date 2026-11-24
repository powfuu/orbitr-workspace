use crate::terminal::{available_shells, PtyEvent, PtyManager, SpawnOptions};
use serde::Serialize;
use tauri::{ipc::Channel, State};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Spawned {
    id: u32,
    pid: Option<u32>,
}

#[tauri::command]
pub fn pty_spawn(
    manager: State<'_, PtyManager>,
    options: SpawnOptions,
    on_event: Channel<PtyEvent>,
) -> Result<Spawned, crate::terminal::PtyError> {
    let (id, pid) = manager.spawn(options, on_event)?;
    Ok(Spawned { id, pid })
}

#[tauri::command]
pub fn pty_write(manager: State<'_, PtyManager>, id: u32, data: String) -> Result<(), crate::terminal::PtyError> {
    manager.write(id, &data)
}

#[tauri::command]
pub fn pty_resize(manager: State<'_, PtyManager>, id: u32, cols: u16, rows: u16) -> Result<(), crate::terminal::PtyError> {
    manager.resize(id, cols, rows)
}

#[tauri::command]
pub fn pty_kill(manager: State<'_, PtyManager>, id: u32) -> Result<(), crate::terminal::PtyError> {
    manager.kill(id)
}

#[tauri::command]
pub fn list_shells() -> Vec<crate::terminal::ShellInfo> {
    available_shells()
}
