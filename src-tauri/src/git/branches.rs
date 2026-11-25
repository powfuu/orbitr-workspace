use super::git;
use serde::Serialize;
use std::path::{Path, PathBuf};

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Branch {
    pub name: String,
    pub current: bool,
    pub upstream: Option<String>,
    pub updated_at: u64,
    /// Commits to push / to pull against the upstream (as of the last fetch).
    pub ahead: u32,
    pub behind: u32,
    /// The upstream branch was deleted on the remote.
    pub gone: bool,
}

/// `%(upstream:track,nobracket)`: "ahead 1, behind 2", "behind 3", "gone" or "".
fn parse_track(t: &str) -> (u32, u32, bool) {
    let num = |key: &str| t.split(", ").find_map(|p| p.strip_prefix(key)).and_then(|n| n.trim().parse().ok()).unwrap_or(0);
    (num("ahead "), num("behind "), t.trim() == "gone")
}

#[derive(Serialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Worktree {
    pub path: String,
    pub branch: Option<String>,
    pub head: String,
    /// The repository's main working tree.
    pub main: bool,
    pub locked: bool,
}

/// Rejects names git wouldn't accept or that could be read as options.
fn validate_branch(repo: &str, name: &str) -> Result<(), String> {
    if name.is_empty() || name.starts_with('-') {
        return Err(format!("invalid branch name: {name}"));
    }
    git(repo, &["check-ref-format", "--branch", name]).map(|_| ()).map_err(|_| format!("invalid branch name: {name}"))
}

pub fn branches(repo: &str) -> Result<Vec<Branch>, String> {
    let raw = git(repo, &["for-each-ref", "--sort=-committerdate", "--format=%(refname:short)%1f%(HEAD)%1f%(upstream:short)%1f%(committerdate:unix)%1f%(upstream:track,nobracket)", "refs/heads"])?;
    Ok(raw
        .lines()
        .filter_map(|l| {
            let f: Vec<&str> = l.split('\u{1f}').collect();
            let (ahead, behind, gone) = parse_track(f.get(4).copied().unwrap_or(""));
            (f.len() >= 4).then(|| Branch {
                name: f[0].into(),
                current: f[1] == "*",
                upstream: (!f[2].is_empty()).then(|| f[2].into()),
                updated_at: f[3].parse::<u64>().unwrap_or(0) * 1000,
                ahead,
                behind,
                gone,
            })
        })
        .collect())
}

pub fn switch(repo: &str, name: &str) -> Result<(), String> {
    validate_branch(repo, name)?;
    git(repo, &["switch", name]).map(|_| ())
}

pub fn create(repo: &str, name: &str) -> Result<(), String> {
    validate_branch(repo, name)?;
    git(repo, &["switch", "-c", name]).map(|_| ())
}

pub fn parse_worktrees(raw: &str) -> Vec<Worktree> {
    raw.split("\n\n")
        .filter(|b| !b.trim().is_empty())
        .enumerate()
        .filter_map(|(i, block)| {
            let mut wt = Worktree { path: String::new(), branch: None, head: String::new(), main: i == 0, locked: false };
            for line in block.lines() {
                if let Some(p) = line.strip_prefix("worktree ") {
                    wt.path = p.into();
                } else if let Some(h) = line.strip_prefix("HEAD ") {
                    wt.head = h.chars().take(7).collect();
                } else if let Some(b) = line.strip_prefix("branch ") {
                    wt.branch = Some(b.trim_start_matches("refs/heads/").into());
                } else if line.starts_with("locked") {
                    wt.locked = true;
                }
            }
            (!wt.path.is_empty()).then_some(wt)
        })
        .collect()
}

pub fn worktrees(repo: &str) -> Result<Vec<Worktree>, String> {
    Ok(parse_worktrees(&git(repo, &["worktree", "list", "--porcelain"])?))
}

/// Where Orbitr puts worktrees: `<parent>/<repo>.worktrees/<branch with / → ->`.
pub fn worktree_dir(repo: &str, branch: &str) -> PathBuf {
    let repo = Path::new(repo);
    let name = repo.file_name().map(|n| n.to_string_lossy().into_owned()).unwrap_or_else(|| "repo".into());
    repo.parent().unwrap_or(repo).join(format!("{name}.worktrees")).join(branch.replace(['/', '\\'], "-"))
}

/// Creates a worktree on `branch` (a new branch from HEAD when `create` is true). Returns its path.
pub fn add_worktree(repo: &str, branch: &str, create: bool) -> Result<String, String> {
    validate_branch(repo, branch)?;
    let dir = worktree_dir(repo, branch);
    if dir.exists() {
        return Err(format!("{} already exists", dir.display()));
    }
    std::fs::create_dir_all(dir.parent().unwrap()).map_err(|e| e.to_string())?;
    let path = dir.to_string_lossy().into_owned();
    if create {
        git(repo, &["worktree", "add", "-b", branch, "--", &path])?;
    } else {
        git(repo, &["worktree", "add", "--", &path, branch])?;
    }
    Ok(path)
}

pub fn remove_worktree(repo: &str, path: &str, force: bool) -> Result<(), String> {
    let mut args = vec!["worktree", "remove"];
    if force {
        args.push("--force");
    }
    args.extend(["--", path]);
    git(repo, &args).map(|_| ())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_upstream_tracking() {
        assert_eq!(parse_track("ahead 1, behind 2"), (1, 2, false));
        assert_eq!(parse_track("behind 14"), (0, 14, false));
        assert_eq!(parse_track("gone"), (0, 0, true));
        assert_eq!(parse_track(""), (0, 0, false));
    }

    #[test]
    fn parses_worktree_list() {
        let raw = "worktree /r\nHEAD 1234567890\nbranch refs/heads/main\n\nworktree /r.worktrees/feat-x\nHEAD abcdef0123\nbranch refs/heads/feat/x\nlocked\n\nworktree /tmp/d\nHEAD ffffff1111\ndetached\n";
        let w = parse_worktrees(raw);
        assert_eq!(w.len(), 3);
        assert!(w[0].main && w[0].branch.as_deref() == Some("main"));
        assert_eq!(w[1].branch.as_deref(), Some("feat/x"));
        assert!(w[1].locked);
        assert_eq!(w[2].branch, None);
        assert_eq!(w[2].head, "ffffff1");
    }

    #[test]
    fn branches_and_worktrees_end_to_end() {
        let root = std::env::temp_dir().join(format!("orbitr-wt-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        let dir = root.join("app");
        std::fs::create_dir_all(&dir).unwrap();
        let repo = dir.to_str().unwrap();
        for args in [&["init", "-q", "-b", "main"][..], &["config", "user.email", "t@e.com"], &["config", "user.name", "T"]] {
            git(repo, args).unwrap();
        }
        std::fs::write(dir.join("f"), "x").unwrap();
        git(repo, &["add", "."]).unwrap();
        git(repo, &["commit", "-qm", "init"]).unwrap();

        create(repo, "feature/a").unwrap();
        switch(repo, "main").unwrap();
        let b = branches(repo).unwrap();
        assert!(b.iter().any(|x| x.name == "main" && x.current));
        assert!(b.iter().any(|x| x.name == "feature/a" && !x.current));
        assert!(switch(repo, "--orphan").is_err());

        let path = add_worktree(repo, "orbitr/claude-1", true).unwrap();
        assert!(path.ends_with("app.worktrees/orbitr-claude-1"));
        assert!(Path::new(&path).join("f").exists());
        let w = worktrees(repo).unwrap();
        assert_eq!(w.len(), 2);
        assert_eq!(w[1].branch.as_deref(), Some("orbitr/claude-1"));

        std::fs::write(Path::new(&path).join("dirty"), "y").unwrap();
        assert!(remove_worktree(repo, &path, false).is_err(), "dirty worktree needs force");
        remove_worktree(repo, &path, true).unwrap();
        assert_eq!(worktrees(repo).unwrap().len(), 1);
        let _ = std::fs::remove_dir_all(root);
    }
}
