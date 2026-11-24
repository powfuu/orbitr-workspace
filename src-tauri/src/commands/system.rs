use serde::Serialize;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlatformInfo {
    os: &'static str,
    default_shell: String,
    home_dir: Option<String>,
}

/// Reports host platform details so the UI can adapt shortcuts and shell defaults.
#[tauri::command]
pub fn platform_info() -> PlatformInfo {
    let home_dir = std::env::var(if cfg!(windows) { "USERPROFILE" } else { "HOME" }).ok();
    PlatformInfo { os: std::env::consts::OS, default_shell: crate::terminal::default_shell(), home_dir }
}
