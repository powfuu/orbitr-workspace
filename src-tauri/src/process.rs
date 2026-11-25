//! Background child processes (git, where.exe, ...). On Windows a GUI app that spawns a
//! console program gets a console window flashing up for every call; `CREATE_NO_WINDOW`
//! keeps them hidden. Every non-PTY process should be created through [`command`].
use std::ffi::OsStr;
use std::process::Command;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

pub fn command(program: impl AsRef<OsStr>) -> Command {
    #[allow(unused_mut)]
    let mut cmd = Command::new(program);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(CREATE_NO_WINDOW);
        if let Some(path) = fresh_path() {
            cmd.env("PATH", path);
        }
    }
    cmd
}

/// The PATH a newly opened terminal would get: re-read from the registry (machine + user), so
/// tools installed while Orbitr is running (winget install Neovim, npm -g, ...) are found without
/// restarting the app. Entries only in Orbitr's own PATH are kept at the end.
#[cfg(windows)]
pub fn fresh_path() -> Option<String> {
    use winreg::enums::{HKEY_CURRENT_USER, HKEY_LOCAL_MACHINE};
    use winreg::RegKey;
    let read = |root, key: &str| RegKey::predef(root).open_subkey(key).ok()?.get_value::<String, _>("Path").ok();
    let machine = read(HKEY_LOCAL_MACHINE, r"SYSTEM\CurrentControlSet\Control\Session Manager\Environment").unwrap_or_default();
    let user = read(HKEY_CURRENT_USER, "Environment").unwrap_or_default();
    if machine.is_empty() && user.is_empty() {
        return None;
    }
    let mut parts: Vec<String> = Vec::new();
    let current = std::env::var("PATH").unwrap_or_default();
    for p in machine.split(';').chain(user.split(';')).map(expand_env).chain(current.split(';').map(String::from)) {
        let p = p.trim().to_string();
        if !p.is_empty() && !parts.iter().any(|q| q.eq_ignore_ascii_case(&p)) {
            parts.push(p);
        }
    }
    Some(parts.join(";"))
}

/// Expands `%VAR%` references (registry PATH values are REG_EXPAND_SZ).
#[cfg(windows)]
fn expand_env(s: &str) -> String {
    let mut out = String::new();
    let mut rest = s;
    while let Some(start) = rest.find('%') {
        out.push_str(&rest[..start]);
        let after = &rest[start + 1..];
        match after.find('%') {
            Some(end) => {
                let name = &after[..end];
                match std::env::var(name) {
                    Ok(v) if !name.is_empty() => out.push_str(&v),
                    _ => {
                        out.push('%');
                        out.push_str(name);
                        out.push('%');
                    }
                }
                rest = &after[end + 1..];
            }
            None => {
                out.push_str(&rest[start..]);
                rest = "";
            }
        }
    }
    out.push_str(rest);
    out
}

#[cfg(all(test, windows))]
mod tests {
    #[test]
    fn expands_known_vars_and_keeps_unknown() {
        std::env::set_var("ORBITR_TEST_DIR", r"C:\x");
        assert_eq!(super::expand_env(r"%ORBITR_TEST_DIR%\bin"), r"C:\x\bin");
        assert_eq!(super::expand_env(r"%NOPE_ORBITR%\bin"), r"%NOPE_ORBITR%\bin");
        assert_eq!(super::expand_env("plain"), "plain");
    }
}
