use serde::Serialize;
use std::path::Path;

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ShellInfo {
    pub name: String,
    pub path: String,
}

pub fn default_shell() -> String {
    if cfg!(windows) {
        "powershell.exe".into()
    } else {
        std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".into())
    }
}

fn info(path: &str) -> ShellInfo {
    let name = Path::new(path)
        .file_stem()
        .map(|s| s.to_string_lossy().into_owned())
        .unwrap_or_else(|| path.into());
    ShellInfo { name, path: path.into() }
}

/// Shells installed on this machine, default first.
pub fn available_shells() -> Vec<ShellInfo> {
    let default = default_shell();
    let mut paths: Vec<String> = if cfg!(windows) {
        ["powershell.exe", "pwsh.exe", "cmd.exe"]
            .iter()
            .filter(|exe| which_on_path(exe))
            .map(|s| s.to_string())
            .collect()
    } else {
        std::fs::read_to_string("/etc/shells")
            .unwrap_or_default()
            .lines()
            .map(str::trim)
            .filter(|l| l.starts_with('/') && Path::new(l).exists())
            .map(String::from)
            .collect()
    };
    paths.retain(|p| p != &default);
    paths.insert(0, default);
    paths.dedup();
    paths.iter().map(|p| info(p)).collect()
}

#[cfg(windows)]
fn which_on_path(exe: &str) -> bool {
    std::env::var_os("PATH")
        .map(|p| std::env::split_paths(&p).any(|dir| dir.join(exe).is_file()))
        .unwrap_or(false)
}

#[cfg(not(windows))]
fn which_on_path(_: &str) -> bool {
    false
}
