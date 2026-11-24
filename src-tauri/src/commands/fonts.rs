use tauri::ipc::Response;

#[tauri::command]
pub async fn nerd_fonts() -> Vec<crate::fonts::NerdFont> {
    tauri::async_runtime::spawn_blocking(crate::fonts::list).await.unwrap_or_default()
}

/// Raw font bytes (binary IPC response, no JSON/base64 overhead).
#[tauri::command]
pub async fn read_font(path: String) -> Result<Response, String> {
    let bytes = tauri::async_runtime::spawn_blocking(move || crate::fonts::read(&path)).await.map_err(|e| e.to_string())??;
    Ok(Response::new(bytes))
}
