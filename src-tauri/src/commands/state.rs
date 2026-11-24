use tauri::{AppHandle, Manager};

fn dir(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    app.path().app_data_dir().map(|d| d.join("state")).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn state_load(app: AppHandle, key: String) -> Result<Option<String>, String> {
    crate::persistence::load(&dir(&app)?, &key)
}

#[tauri::command]
pub fn state_save(app: AppHandle, key: String, value: String) -> Result<(), String> {
    crate::persistence::save(&dir(&app)?, &key, &value)
}

#[tauri::command]
pub fn state_remove(app: AppHandle, key: String) -> Result<(), String> {
    crate::persistence::remove(&dir(&app)?, &key)
}
