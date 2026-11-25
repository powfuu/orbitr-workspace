//! History, commit details, branch management, stash and git-flow on top of `git()`.
use super::{git, status};
use serde::Serialize;

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct CommitFile {
    pub path: String,
    /// A, M, D, R, C, T…
    pub status: String,
    pub additions: Option<u32>,
    pub deletions: Option<u32>,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct CommitDetail {
    pub hash: String,
    pub short: String,
    pub author: String,
    pub email: String,
    pub time: u64,
    pub parents: Vec<String>,
    pub subject: String,
    pub body: String,
    pub refs: String,
    pub files: Vec<CommitFile>,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Stash {
    pub index: u32,
    pub message: String,
    pub time: u64,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct FlowConfig {
    pub main: String,
    pub develop: Option<String>,
}

fn validate_hash(h: &str) -> Result<(), String> {
    if (4..=40).contains(&h.len()) && h.bytes().all(|b| b.is_ascii_hexdigit()) {
        Ok(())
    } else {
        Err(format!("invalid commit: {h}"))
    }
}

/// A branch, remote branch or tag name; never something that reads as an option.
pub(crate) fn validate_ref(repo: &str, r: &str) -> Result<(), String> {
    if r.is_empty() || r.starts_with('-') {
        return Err(format!("invalid ref: {r}"));
    }
    git(repo, &["rev-parse", "--verify", "--quiet", &format!("{r}^{{commit}}")]).map(|_| ()).map_err(|_| format!("unknown ref: {r}"))
}

fn validate_new_branch(repo: &str, name: &str) -> Result<(), String> {
    if name.is_empty() || name.starts_with('-') {
        return Err(format!("invalid branch name: {name}"));
    }
    git(repo, &["check-ref-format", "--branch", name]).map(|_| ()).map_err(|_| format!("invalid branch name: {name}"))
}

fn exists(repo: &str, branch: &str) -> bool {
    git(repo, &["show-ref", "--verify", "--quiet", &format!("refs/heads/{branch}")]).is_ok()
}

fn require_clean(repo: &str) -> Result<(), String> {
    match status(repo)? {
        Some(s) if s.files.iter().any(|f| !f.untracked) => Err("commit or stash your changes first".into()),
        _ => Ok(()),
    }
}

pub fn commit_detail(repo: &str, hash: &str) -> Result<CommitDetail, String> {
    validate_hash(hash)?;
    let head = git(repo, &["show", "-s", "--format=%H%x1f%h%x1f%an%x1f%ae%x1f%at%x1f%P%x1f%s%x1f%D%x1f%b", hash])?;
    let f: Vec<&str> = head.splitn(9, '\u{1f}').collect();
    if f.len() < 9 {
        return Err("unexpected git show output".into());
    }
    // First parent for merges, so the file list matches what the merge brought in.
    let names = git(repo, &["show", "--format=", "--name-status", "-M", "--first-parent", "-m", hash])?;
    let nums = git(repo, &["show", "--format=", "--numstat", "-M", "--first-parent", "-m", hash])?;
    let counts: Vec<(Option<u32>, Option<u32>)> = nums
        .lines()
        .filter(|l| !l.is_empty())
        .map(|l| {
            let mut p = l.split('\t');
            (p.next().and_then(|a| a.parse().ok()), p.next().and_then(|d| d.parse().ok()))
        })
        .collect();
    let files = names
        .lines()
        .filter(|l| !l.is_empty())
        .enumerate()
        .map(|(i, l)| {
            let parts: Vec<&str> = l.split('\t').collect();
            let (additions, deletions) = counts.get(i).copied().unwrap_or((None, None));
            CommitFile {
                status: parts[0].chars().next().map(String::from).unwrap_or_default(),
                path: parts.last().copied().unwrap_or_default().to_string(),
                additions,
                deletions,
            }
        })
        .collect();
    Ok(CommitDetail {
        hash: f[0].into(),
        short: f[1].into(),
        author: f[2].into(),
        email: f[3].into(),
        time: f[4].parse::<u64>().unwrap_or(0) * 1000,
        parents: f[5].split_whitespace().map(String::from).collect(),
        subject: f[6].into(),
        refs: f[7].into(),
        body: f[8].trim().to_string(),
        files,
    })
}

/// Diff of one file in a commit (against its first parent).
pub fn commit_diff(repo: &str, hash: &str, file: &str) -> Result<String, String> {
    validate_hash(hash)?;
    let mut out = git(repo, &["show", "--no-color", "--format=", "-M", "--first-parent", "-m", hash, "--", file])?;
    if out.len() > 256 * 1024 {
        out.truncate(out.floor_char_boundary(256 * 1024));
        out.push_str("\n… diff truncated …\n");
    }
    Ok(out)
}

pub fn remote_branches(repo: &str) -> Result<Vec<String>, String> {
    let raw = git(repo, &["for-each-ref", "--sort=-committerdate", "--format=%(refname:short)", "refs/remotes"])?;
    Ok(raw.lines().filter(|l| !l.ends_with("/HEAD") && l.contains('/')).map(String::from).collect())
}

/// New branch from `base` (default HEAD); switches to it when `checkout`.
pub fn branch_create(repo: &str, name: &str, base: Option<&str>, checkout: bool) -> Result<(), String> {
    validate_new_branch(repo, name)?;
    let base = base.filter(|b| !b.is_empty());
    if let Some(b) = base {
        validate_ref(repo, b)?;
    }
    let mut args = if checkout { vec!["switch", "-c", name] } else { vec!["branch", name] };
    if let Some(b) = base {
        args.push(b);
    }
    git(repo, &args).map(|_| ())
}

/// Local branch tracking a remote one (origin/x → x).
pub fn checkout_remote(repo: &str, remote_ref: &str) -> Result<String, String> {
    validate_ref(repo, remote_ref)?;
    let local = remote_ref.split_once('/').map(|(_, b)| b).unwrap_or(remote_ref);
    if exists(repo, local) {
        git(repo, &["switch", local])?;
    } else {
        git(repo, &["switch", "--track", remote_ref])?;
    }
    Ok(local.to_string())
}

pub fn branch_delete(repo: &str, name: &str, force: bool) -> Result<(), String> {
    if !exists(repo, name) {
        return Err(format!("no branch {name}"));
    }
    git(repo, &["branch", if force { "-D" } else { "-d" }, name]).map(|_| ())
}

pub fn branch_rename(repo: &str, old: &str, new: &str) -> Result<(), String> {
    if !exists(repo, old) {
        return Err(format!("no branch {old}"));
    }
    validate_new_branch(repo, new)?;
    git(repo, &["branch", "-m", old, new]).map(|_| ())
}

/// Merges `branch` into the current branch.
pub fn merge(repo: &str, branch: &str, no_ff: bool) -> Result<String, String> {
    validate_ref(repo, branch)?;
    let mut args = vec!["merge"];
    if no_ff {
        args.push("--no-ff");
    }
    args.push("--no-edit");
    args.push(branch);
    git(repo, &args)
}

fn upstream_of(repo: &str, branch: &str) -> Result<(String, String), String> {
    let up = git(repo, &["rev-parse", "--abbrev-ref", &format!("{branch}@{{upstream}}")]).map_err(|_| format!("{branch} has no upstream branch"))?;
    let up = up.trim();
    let (remote, name) = up.split_once('/').ok_or_else(|| format!("unexpected upstream: {up}"))?;
    Ok((remote.to_string(), name.to_string()))
}

/// Pulls any local branch. The current one: `pull --ff-only`. Others: fast-forward them
/// from their upstream without switching (`fetch origin x:x`), like Sourcetree.
pub fn pull_branch(repo: &str, branch: &str) -> Result<String, String> {
    if !exists(repo, branch) {
        return Err(format!("no branch {branch}"));
    }
    let current = git(repo, &["rev-parse", "--abbrev-ref", "HEAD"])?;
    if current.trim() == branch {
        return git(repo, &["pull", "--ff-only"]);
    }
    let (remote, name) = upstream_of(repo, branch)?;
    git(repo, &["fetch", &remote, &format!("{name}:{branch}")]).map_err(|e| {
        if e.contains("non-fast-forward") || e.contains("rejected") { format!("{branch} has local commits that aren't on {remote}/{name}: switch to it and pull/merge") } else { e }
    })
}

/// Pushes any local branch to its upstream (or publishes it to origin).
pub fn push_branch(repo: &str, branch: &str) -> Result<String, String> {
    if !exists(repo, branch) {
        return Err(format!("no branch {branch}"));
    }
    match upstream_of(repo, branch) {
        Ok((remote, name)) => git(repo, &["push", &remote, &format!("{branch}:{name}")]),
        Err(_) => git(repo, &["push", "-u", "origin", branch]),
    }
}

pub fn merge_abort(repo: &str) -> Result<(), String> {
    git(repo, &["merge", "--abort"]).map(|_| ())
}

pub fn fetch(repo: &str) -> Result<String, String> {
    git(repo, &["fetch", "--all", "--prune"])
}

pub fn cherry_pick(repo: &str, hash: &str) -> Result<String, String> {
    validate_hash(hash)?;
    git(repo, &["cherry-pick", hash])
}

pub fn revert(repo: &str, hash: &str) -> Result<String, String> {
    validate_hash(hash)?;
    git(repo, &["revert", "--no-edit", hash])
}

pub fn tag_create(repo: &str, name: &str, hash: Option<&str>) -> Result<(), String> {
    if name.is_empty() || name.starts_with('-') || git(repo, &["check-ref-format", &format!("refs/tags/{name}")]).is_err() {
        return Err(format!("invalid tag: {name}"));
    }
    let mut args = vec!["tag", name];
    if let Some(h) = hash {
        validate_hash(h)?;
        args.push(h);
    }
    git(repo, &args).map(|_| ())
}

pub fn stash_list(repo: &str) -> Result<Vec<Stash>, String> {
    let raw = git(repo, &["stash", "list", "--format=%gd%x1f%ct%x1f%gs"])?;
    Ok(raw
        .lines()
        .filter_map(|l| {
            let f: Vec<&str> = l.splitn(3, '\u{1f}').collect();
            let index = f.first()?.trim_start_matches("stash@{").trim_end_matches('}').parse().ok()?;
            Some(Stash { index, time: f.get(1)?.parse::<u64>().unwrap_or(0) * 1000, message: f.get(2)?.to_string() })
        })
        .collect())
}

pub fn stash_push(repo: &str, message: &str, untracked: bool) -> Result<(), String> {
    let mut args = vec!["stash", "push"];
    if untracked {
        args.push("--include-untracked");
    }
    if !message.trim().is_empty() {
        args.extend(["-m", message]);
    }
    git(repo, &args).map(|_| ())
}

/// apply / pop / drop one stash entry.
pub fn stash_op(repo: &str, op: &str, index: u32) -> Result<(), String> {
    if !matches!(op, "apply" | "pop" | "drop") {
        return Err(format!("unknown stash op: {op}"));
    }
    git(repo, &["stash", op, &format!("stash@{{{index}}}")]).map(|_| ())
}

/* ── git flow (feature / bugfix / release / hotfix) ─────────────────────── */

pub fn flow_config(repo: &str) -> Result<FlowConfig, String> {
    let main = ["main", "master"].into_iter().find(|b| exists(repo, b)).unwrap_or("main").to_string();
    let develop = ["develop", "dev"].into_iter().find(|b| exists(repo, b)).map(String::from);
    Ok(FlowConfig { main, develop })
}

/// Creates `develop` from the main branch if it's missing.
pub fn flow_init(repo: &str) -> Result<FlowConfig, String> {
    let cfg = flow_config(repo)?;
    if cfg.develop.is_none() {
        git(repo, &["branch", "develop", &cfg.main])?;
    }
    flow_config(repo)
}

const KINDS: [&str; 4] = ["feature", "bugfix", "release", "hotfix"];

/// `kind/name` from develop (feature, bugfix, release) or main (hotfix), and switches to it.
pub fn flow_start(repo: &str, kind: &str, name: &str) -> Result<String, String> {
    if !KINDS.contains(&kind) {
        return Err(format!("unknown flow type: {kind}"));
    }
    let cfg = flow_init(repo)?;
    let base = if kind == "hotfix" { cfg.main.clone() } else { cfg.develop.clone().unwrap_or(cfg.main.clone()) };
    let branch = format!("{kind}/{}", name.trim());
    branch_create(repo, &branch, Some(&base), true)?;
    Ok(branch)
}

/// Finishes a flow branch: merges it (--no-ff) where git-flow would, tags releases/hotfixes,
/// deletes it and leaves you on the branch it was merged into last.
pub fn flow_finish(repo: &str, branch: &str, tag: bool) -> Result<String, String> {
    let (kind, name) = branch.split_once('/').ok_or("not a flow branch (feature/…, bugfix/…, release/…, hotfix/…)")?;
    if !KINDS.contains(&kind) || !exists(repo, branch) {
        return Err(format!("not a flow branch: {branch}"));
    }
    require_clean(repo)?;
    let cfg = flow_init(repo)?;
    let develop = cfg.develop.clone().unwrap_or(cfg.main.clone());
    let targets: Vec<String> = match kind {
        "release" | "hotfix" => vec![cfg.main.clone(), develop],
        _ => vec![develop],
    };
    for (i, target) in targets.iter().enumerate() {
        git(repo, &["switch", target])?;
        git(repo, &["merge", "--no-ff", "--no-edit", branch]).map_err(|e| format!("merge into {target} stopped: {e}"))?;
        if i == 0 && tag && (kind == "release" || kind == "hotfix") {
            tag_create(repo, name, None)?;
        }
    }
    git(repo, &["branch", "-d", branch])?;
    Ok(targets.last().cloned().unwrap_or_default())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pulls_and_pushes_a_branch_you_are_not_on() {
        let base = std::env::temp_dir().join(format!("orbitr-git-sync-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&base);
        std::fs::create_dir_all(&base).unwrap();
        let b = base.to_str().unwrap();
        git(b, &["init", "-q", "--bare", "-b", "main", "remote.git"]).unwrap();
        let cfg = |r: &str| {
            git(r, &["config", "user.email", "t@example.com"]).unwrap();
            git(r, &["config", "user.name", "T"]).unwrap();
        };
        git(b, &["clone", "-q", "remote.git", "a"]).unwrap();
        let a = base.join("a");
        let a = a.to_str().unwrap();
        cfg(a);
        std::fs::write(base.join("a/f.txt"), "1\n").unwrap();
        git(a, &["add", "-A"]).unwrap();
        git(a, &["commit", "-qm", "one"]).unwrap();
        git(a, &["push", "-q", "-u", "origin", "main"]).unwrap();
        git(b, &["clone", "-q", "remote.git", "other"]).unwrap();
        let o = base.join("other");
        let o = o.to_str().unwrap();
        cfg(o);
        std::fs::write(base.join("other/f.txt"), "1\n2\n").unwrap();
        git(o, &["commit", "-qam", "two"]).unwrap();
        git(o, &["push", "-q"]).unwrap();

        // In `a`, sit on another branch and update main without switching.
        git(a, &["switch", "-q", "-c", "topic"]).unwrap();
        git(a, &["fetch", "-q"]).unwrap();
        pull_branch(a, "main").unwrap();
        assert_eq!(git(a, &["log", "-1", "--format=%s", "main"]).unwrap().trim(), "two");
        // Publish the new branch.
        push_branch(a, "topic").unwrap();
        assert!(git(a, &["ls-remote", "--heads", "origin", "topic"]).unwrap().contains("topic"));
        let _ = std::fs::remove_dir_all(base);
    }

    #[test]
    fn history_branches_stash_and_flow() {
        let dir = std::env::temp_dir().join(format!("orbitr-git-extra-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        let repo = dir.to_str().unwrap();
        git(repo, &["init", "-q", "-b", "main"]).unwrap();
        git(repo, &["config", "user.email", "t@example.com"]).unwrap();
        git(repo, &["config", "user.name", "T"]).unwrap();
        std::fs::write(dir.join("a.txt"), "1\n").unwrap();
        git(repo, &["add", "-A"]).unwrap();
        git(repo, &["commit", "-qm", "one"]).unwrap();

        // flow: feature from develop, finish back into develop
        let b = flow_start(repo, "feature", "login").unwrap();
        assert_eq!(b, "feature/login");
        std::fs::write(dir.join("a.txt"), "1\n2\n").unwrap();
        git(repo, &["commit", "-qam", "two"]).unwrap();
        assert_eq!(flow_finish(repo, &b, true).unwrap(), "develop");
        assert!(!exists(repo, &b));

        let log = super::super::log_page(repo, 0, 10, None).unwrap();
        assert!(log[0].subject.starts_with("Merge branch"));
        assert_eq!(super::super::log_page(repo, 1, 5, None).unwrap().len(), log.len() - 1); // paging
        let two = log.iter().find(|c| c.subject == "two").unwrap();
        let d = commit_detail(repo, &two.hash).unwrap();
        assert_eq!(d.files[0].path, "a.txt");
        assert_eq!(d.files[0].additions, Some(1));
        assert!(commit_diff(repo, &two.hash, "a.txt").unwrap().contains("+2"));

        // stash round trip
        std::fs::write(dir.join("a.txt"), "dirty\n").unwrap();
        stash_push(repo, "wip", false).unwrap();
        assert_eq!(stash_list(repo).unwrap()[0].message, "On develop: wip");
        stash_op(repo, "pop", 0).unwrap();
        assert!(stash_list(repo).unwrap().is_empty());
        git(repo, &["checkout", "--", "a.txt"]).unwrap();

        // branches
        branch_create(repo, "topic", Some("main"), false).unwrap();
        branch_rename(repo, "topic", "topic2").unwrap();
        branch_delete(repo, "topic2", false).unwrap();
        assert!(validate_ref(repo, "--help").is_err());
        assert!(commit_detail(repo, "--all").is_err());
        let _ = std::fs::remove_dir_all(dir);
    }
}
