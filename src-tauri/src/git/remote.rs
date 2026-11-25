//! Remotes and HTTPS credentials. Passwords go straight to git's credential helper
//! (the macOS keychain via `osxkeychain`), never to Orbitr's own storage.
use super::git;
use serde::Serialize;
use std::io::Write;
use std::process::{Command, Stdio};

#[derive(Serialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Remote {
    pub name: String,
    pub url: String,
}

pub fn remotes(repo: &str) -> Result<Vec<Remote>, String> {
    let raw = git(repo, &["remote", "-v"])?;
    let mut out: Vec<Remote> = vec![];
    for l in raw.lines().filter(|l| l.ends_with("(fetch)")) {
        let mut p = l.split_whitespace();
        if let (Some(name), Some(url)) = (p.next(), p.next()) {
            out.push(Remote { name: name.into(), url: url.into() });
        }
    }
    Ok(out)
}

fn valid_name(name: &str) -> Result<(), String> {
    if name.is_empty() || name.starts_with('-') || !name.chars().all(|c| c.is_ascii_alphanumeric() || "-_.".contains(c)) {
        return Err(format!("invalid remote name: {name}"));
    }
    Ok(())
}

fn valid_url(url: &str) -> Result<(), String> {
    let ok = url.starts_with("https://") || url.starts_with("http://") || url.starts_with("ssh://") || url.starts_with("git@") || url.starts_with("file://");
    if !ok || url.chars().any(char::is_whitespace) {
        return Err(format!("invalid remote URL: {url}"));
    }
    Ok(())
}

pub fn remote_set_url(repo: &str, name: &str, url: &str) -> Result<(), String> {
    valid_name(name)?;
    valid_url(url)?;
    git(repo, &["remote", "set-url", name, url]).map(|_| ())
}

pub fn remote_add(repo: &str, name: &str, url: &str) -> Result<(), String> {
    valid_name(name)?;
    valid_url(url)?;
    git(repo, &["remote", "add", name, url]).map(|_| ())
}

pub fn remote_remove(repo: &str, name: &str) -> Result<(), String> {
    valid_name(name)?;
    git(repo, &["remote", "remove", name]).map(|_| ())
}

/// Git Credential Manager (browser sign-in for Bitbucket, GitHub, GitLab, Azure), if installed.
pub fn gcm_path() -> Option<std::path::PathBuf> {
    ["/usr/local/share/gcm-core/git-credential-manager", "/opt/homebrew/bin/git-credential-manager", "/usr/local/bin/git-credential-manager"]
        .iter()
        .map(std::path::PathBuf::from)
        .find(|p| p.is_file())
}

/// Signs in to the remote's host through the browser: asks git for access with GCM as the
/// helper, which opens the provider's login page and saves the token in the keychain.
pub fn browser_login(repo: &str, remote: &str) -> Result<(), String> {
    let gcm = gcm_path().ok_or("Git Credential Manager is not installed")?;
    if remote.is_empty() || remote.starts_with('-') {
        return Err("invalid remote".into());
    }
    let out = Command::new("git")
        .arg("-C")
        .arg(repo)
        .arg("-c")
        .arg(format!("credential.helper={}", gcm.display()))
        .args(["ls-remote", "--heads", remote])
        .env("GIT_TERMINAL_PROMPT", "0")
        .env("GCM_INTERACTIVE", "always")
        .stdin(Stdio::null())
        .output()
        .map_err(|e| format!("git not available: {e}"))?;
    if out.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&out.stderr).trim().to_string())
    }
}

/// Splits an HTTPS remote into what `git credential` expects.
fn credential_fields(url: &str) -> Option<(String, String, Option<String>)> {
    let (protocol, rest) = url.split_once("://")?;
    if protocol != "https" && protocol != "http" {
        return None;
    }
    let authority = rest.split('/').next().unwrap_or(rest);
    let host = authority.rsplit('@').next()?.to_string();
    let user = authority.split_once('@').map(|(u, _)| u.split(':').next().unwrap_or(u).to_string());
    Some((protocol.to_string(), host, user))
}

/// Saves a username/password (or app password/token) for the remote's host in git's credential
/// helper, so this and every later git command (also in a terminal) can authenticate.
pub fn store_credential(repo: &str, remote_url: &str, username: &str, password: &str) -> Result<(), String> {
    let (protocol, host, _) = credential_fields(remote_url).ok_or("only HTTPS remotes use a password (SSH uses your keys)")?;
    if username.is_empty() || password.is_empty() || username.contains('\n') || password.contains('\n') {
        return Err("username and password are required".into());
    }
    let mut child = Command::new("git")
        .arg("-C")
        .arg(repo)
        .args(["credential", "approve"])
        .env("GIT_TERMINAL_PROMPT", "0")
        .stdin(Stdio::piped())
        .stdout(Stdio::null())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("git not available: {e}"))?;
    child
        .stdin
        .take()
        .ok_or("no stdin")?
        .write_all(format!("protocol={protocol}\nhost={host}\nusername={username}\npassword={password}\n\n").as_bytes())
        .map_err(|e| e.to_string())?;
    let out = child.wait_with_output().map_err(|e| e.to_string())?;
    if out.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&out.stderr).trim().to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_https_remotes_and_auth_errors() {
        assert_eq!(credential_fields("https://emolero1@bitbucket.org/mutuamm/app.git"), Some(("https".into(), "bitbucket.org".into(), Some("emolero1".into()))));
        assert_eq!(credential_fields("https://github.com/a/b.git"), Some(("https".into(), "github.com".into(), None)));
        assert_eq!(credential_fields("git@github.com:a/b.git"), None);
        assert!(valid_url("https://x y").is_err());
        assert!(valid_name("--upload-pack").is_err());
    }
}
