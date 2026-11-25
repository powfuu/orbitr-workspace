//! Thin, safe wrapper over the system `git` CLI. No shell is involved: arguments are
//! passed directly and user-supplied paths always follow `--`.
mod branches;
mod extra;
mod parse;
mod remote;

pub use remote::*;

pub use extra::*;

pub use branches::{add_worktree, branches, create as create_branch, remove_worktree, switch as switch_branch, worktrees, Branch, Worktree};

use parse::{parse_log, parse_status};
pub use parse::{Commit, GitStatus};
use std::path::Path;
use std::process::Command;

const MAX_DIFF: usize = 256 * 1024;

pub(crate) fn git(repo: &str, args: &[&str]) -> Result<String, String> {
    if !Path::new(repo).is_dir() {
        return Err(format!("not a folder: {repo}"));
    }
    let mut cmd = Command::new("git");
    cmd.arg("-C").arg(repo);
    // With Git Credential Manager installed, add it as a helper so browser sign-ins are used.
    if let Some(gcm) = remote::gcm_path() {
        cmd.arg("-c").arg(format!("credential.helper={}", gcm.display()));
    }
    let out = cmd
        .args(args)
        // Never block on an interactive credential prompt; the UI reports the error instead.
        .env("GIT_TERMINAL_PROMPT", "0")
        .env("GIT_OPTIONAL_LOCKS", "0")
        .output()
        .map_err(|e| format!("git not available: {e}"))?;
    if out.status.success() {
        Ok(String::from_utf8_lossy(&out.stdout).into_owned())
    } else {
        let err = String::from_utf8_lossy(&out.stderr).trim().to_string();
        Err(if err.is_empty() { format!("git {} failed", args.first().unwrap_or(&"")) } else { err })
    }
}

pub fn status(repo: &str) -> Result<Option<GitStatus>, String> {
    let raw = match git(repo, &["status", "--porcelain=v2", "--branch", "-z", "--untracked-files=all"]) {
        Ok(r) => r,
        Err(e) if e.contains("not a git repository") => return Ok(None),
        Err(e) => return Err(e),
    };
    let mut s = parse_status(&raw);
    s.last_commit = log(repo, 1).ok().and_then(|mut v| v.pop());
    Ok(Some(s))
}

pub fn log(repo: &str, n: u32) -> Result<Vec<Commit>, String> {
    log_page(repo, 0, n, None)
}

/// One page of history (`skip` for "load more"), optionally of another branch/ref.
pub fn log_page(repo: &str, skip: u32, n: u32, rev: Option<&str>) -> Result<Vec<Commit>, String> {
    let n = n.clamp(1, 500).to_string();
    let skip = format!("--skip={skip}");
    let mut args = vec!["log", "-n", &n, &skip, "--format=%H%x1f%h%x1f%an%x1f%at%x1f%s%x1f%D%x1e"];
    if let Some(r) = rev {
        extra::validate_ref(repo, r)?;
        args.push(r);
    }
    match git(repo, &args) {
        Ok(raw) => Ok(parse_log(&raw)),
        // Fresh repo without commits.
        Err(e) if e.contains("does not have any commits") => Ok(vec![]),
        Err(e) => Err(e),
    }
}

pub fn diff(repo: &str, file: &str, staged: bool, untracked: bool) -> Result<String, String> {
    let mut out = if untracked {
        let null = if cfg!(windows) { "NUL" } else { "/dev/null" };
        // `--no-index` exits 1 when files differ, which is the normal case here.
        let o = Command::new("git")
            .arg("-C")
            .arg(repo)
            .args(["diff", "--no-color", "--no-index", "--", null, file])
            .output()
            .map_err(|e| e.to_string())?;
        String::from_utf8_lossy(&o.stdout).into_owned()
    } else if staged {
        git(repo, &["diff", "--no-color", "--cached", "--", file])?
    } else {
        git(repo, &["diff", "--no-color", "--", file])?
    };
    if out.len() > MAX_DIFF {
        out.truncate(out.floor_char_boundary(MAX_DIFF));
        out.push_str("\n… diff truncated …\n");
    }
    Ok(out)
}

pub fn stage(repo: &str, files: &[String]) -> Result<(), String> {
    let mut args = vec!["add", "-A", "--"];
    args.extend(files.iter().map(String::as_str));
    git(repo, &args).map(|_| ())
}

pub fn unstage(repo: &str, files: &[String]) -> Result<(), String> {
    let mut args = vec!["restore", "--staged", "--"];
    args.extend(files.iter().map(String::as_str));
    git(repo, &args).map(|_| ())
}

pub fn commit(repo: &str, message: &str) -> Result<(), String> {
    if message.trim().is_empty() {
        return Err("commit message is empty".into());
    }
    git(repo, &["commit", "-m", message]).map(|_| ())
}

pub fn push(repo: &str) -> Result<String, String> {
    // First push of a new branch: set upstream to origin automatically.
    match git(repo, &["push"]) {
        Err(e) if e.contains("has no upstream branch") => {
            let branch = git(repo, &["rev-parse", "--abbrev-ref", "HEAD"])?;
            git(repo, &["push", "-u", "origin", branch.trim()])
        }
        r => r,
    }
}

pub fn pull(repo: &str) -> Result<String, String> {
    git(repo, &["pull", "--ff-only"])
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn end_to_end_in_temp_repo() {
        let dir = std::env::temp_dir().join(format!("orbitr-git-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        let repo = dir.to_str().unwrap();
        git(repo, &["init", "-q", "-b", "main"]).unwrap();
        git(repo, &["config", "user.email", "t@example.com"]).unwrap();
        git(repo, &["config", "user.name", "T"]).unwrap();

        std::fs::write(dir.join("a.txt"), "hello\n").unwrap();
        let s = status(repo).unwrap().unwrap();
        assert_eq!(s.branch.as_deref(), Some("main"));
        assert_eq!(s.files.len(), 1);
        assert!(s.files[0].untracked);
        assert!(diff(repo, "a.txt", false, true).unwrap().contains("+hello"));

        stage(repo, &["a.txt".into()]).unwrap();
        assert!(status(repo).unwrap().unwrap().files[0].staged);
        commit(repo, "first").unwrap();
        let s = status(repo).unwrap().unwrap();
        assert!(s.files.is_empty());
        assert_eq!(s.last_commit.unwrap().subject, "first");

        std::fs::write(dir.join("a.txt"), "hello\nworld\n").unwrap();
        assert!(diff(repo, "a.txt", false, false).unwrap().contains("+world"));
        // A filename that looks like an option is treated as a path, not a flag.
        assert!(stage(repo, &["--version".into()]).is_err());
        let _ = std::fs::remove_dir_all(dir);
    }
}

const MAX_FILES: usize = 50_000;
const SKIP_DIRS: [&str; 9] = [".git", "node_modules", "target", "dist", "build", ".next", ".venv", "Pods", ".gradle"];

/// Project files for quick-open: tracked + untracked-not-ignored in a git repo,
/// otherwise a bounded walk that skips dependency/build folders. Paths are relative.
pub fn list_files(repo: &str) -> Result<Vec<String>, String> {
    if let Ok(raw) = git(repo, &["ls-files", "--cached", "--others", "--exclude-standard", "-z"]) {
        let mut v: Vec<String> = raw.split('\0').filter(|s| !s.is_empty()).take(MAX_FILES).map(String::from).collect();
        v.sort();
        v.dedup();
        return Ok(v);
    }
    let root = Path::new(repo);
    if !root.is_dir() {
        return Err(format!("not a folder: {repo}"));
    }
    let mut out = vec![];
    let mut stack = vec![root.to_path_buf()];
    while let Some(dir) = stack.pop() {
        for e in std::fs::read_dir(&dir).into_iter().flatten().flatten() {
            let p = e.path();
            let name = e.file_name().to_string_lossy().into_owned();
            if p.is_dir() {
                if !SKIP_DIRS.contains(&name.as_str()) && !name.starts_with('.') {
                    stack.push(p);
                }
            } else if let Ok(rel) = p.strip_prefix(root) {
                out.push(rel.to_string_lossy().replace('\\', "/"));
                if out.len() >= MAX_FILES {
                    return Ok(out);
                }
            }
        }
    }
    out.sort();
    Ok(out)
}

#[cfg(test)]
mod list_files_tests {
    use super::*;

    #[test]
    fn lists_without_git_and_skips_deps() {
        let d = std::env::temp_dir().join(format!("orbitr-ls-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&d);
        std::fs::create_dir_all(d.join("src")).unwrap();
        std::fs::create_dir_all(d.join("node_modules/x")).unwrap();
        std::fs::write(d.join("src/a.ts"), "").unwrap();
        std::fs::write(d.join("node_modules/x/i.js"), "").unwrap();
        std::fs::write(d.join("README.md"), "").unwrap();
        assert_eq!(list_files(d.to_str().unwrap()).unwrap(), vec!["README.md", "src/a.ts"]);
        let _ = std::fs::remove_dir_all(d);
    }
}
