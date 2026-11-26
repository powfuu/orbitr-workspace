pub mod changes;
pub mod chats;
pub mod timeline;
pub mod usage;


/// Only plain executable names are accepted; this value is interpolated into a shell command.
fn is_safe_name(name: &str) -> bool {
    !name.is_empty() && name.len() < 64 && name.chars().all(|c| c.is_ascii_alphanumeric() || "._-".contains(c))
}

/// Resolves an executable through the user's login shell so PATH matches what a terminal sees
/// (GUI apps on macOS launch with a minimal PATH).
pub fn resolve_executable(name: &str) -> Option<String> {
    if !is_safe_name(name) {
        return None;
    }
    let output = if cfg!(windows) {
        crate::process::command("where.exe").arg(name).output().ok()?
    } else {
        crate::process::command(crate::terminal::default_shell())
            .args(["-l", "-c", &format!("command -v {name}")])
            .output()
            .ok()?
    };
    if !output.status.success() {
        return None;
    }
    String::from_utf8_lossy(&output.stdout)
        .lines()
        .map(str::trim)
        .find(|l| !l.is_empty())
        .map(String::from)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_injection() {
        assert!(resolve_executable("ls; rm -rf /").is_none());
        assert!(resolve_executable("$(id)").is_none());
    }

    #[cfg(unix)]
    #[test]
    fn finds_sh() {
        assert!(resolve_executable("sh").is_some());
        assert!(resolve_executable("definitely-not-a-real-binary-xyz").is_none());
    }
}
