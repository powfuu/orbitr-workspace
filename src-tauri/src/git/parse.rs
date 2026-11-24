use serde::Serialize;

#[derive(Serialize, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct GitStatus {
    pub branch: Option<String>,
    pub upstream: Option<String>,
    pub ahead: u32,
    pub behind: u32,
    pub files: Vec<FileChange>,
    pub last_commit: Option<Commit>,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct FileChange {
    pub path: String,
    /// Original path for renames.
    pub from: Option<String>,
    /// One-letter codes from porcelain v2 (M, A, D, R, C, U, .).
    pub index: char,
    pub worktree: char,
    pub staged: bool,
    pub unstaged: bool,
    pub untracked: bool,
    pub conflicted: bool,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Commit {
    pub hash: String,
    pub short: String,
    pub author: String,
    pub time: u64,
    pub subject: String,
}

/// Parses `git status --porcelain=v2 --branch -z`.
pub fn parse_status(raw: &str) -> GitStatus {
    let mut s = GitStatus::default();
    let mut entries = raw.split('\0').peekable();
    while let Some(e) = entries.next() {
        if let Some(rest) = e.strip_prefix("# branch.head ") {
            s.branch = (rest != "(detached)").then(|| rest.to_string());
        } else if let Some(rest) = e.strip_prefix("# branch.upstream ") {
            s.upstream = Some(rest.to_string());
        } else if let Some(rest) = e.strip_prefix("# branch.ab ") {
            for part in rest.split_whitespace() {
                if let Some(n) = part.strip_prefix('+') {
                    s.ahead = n.parse().unwrap_or(0);
                } else if let Some(n) = part.strip_prefix('-') {
                    s.behind = n.parse().unwrap_or(0);
                }
            }
        } else if let Some(path) = e.strip_prefix("? ") {
            s.files.push(FileChange { path: path.into(), from: None, index: '?', worktree: '?', staged: false, unstaged: false, untracked: true, conflicted: false });
        } else if e.starts_with("1 ") || e.starts_with("2 ") || e.starts_with("u ") {
            let kind = &e[..1];
            // Fields: 1 XY sub mH mI mW hH hI path | 2 XY sub mH mI mW hH hI Xscore path (+ \0 origPath) | u XY sub m1 m2 m3 mW h1 h2 h3 path
            let n = match kind { "1" => 8, "2" => 9, _ => 10 };
            let mut parts = e.splitn(n + 1, ' ');
            let xy: Vec<char> = parts.nth(1).unwrap_or("..").chars().collect();
            let path = parts.nth(n - 2).unwrap_or("").to_string();
            let from = if kind == "2" { entries.next().map(String::from) } else { None };
            let (x, y) = (xy.first().copied().unwrap_or('.'), xy.get(1).copied().unwrap_or('.'));
            s.files.push(FileChange {
                path,
                from,
                index: x,
                worktree: y,
                staged: kind != "u" && x != '.',
                unstaged: kind != "u" && y != '.',
                untracked: false,
                conflicted: kind == "u",
            });
        }
    }
    s
}

pub fn parse_log(raw: &str) -> Vec<Commit> {
    raw.split('\u{1e}')
        .filter_map(|rec| {
            let f: Vec<&str> = rec.trim_matches('\n').split('\u{1f}').collect();
            (f.len() == 5).then(|| Commit {
                hash: f[0].into(),
                short: f[1].into(),
                author: f[2].into(),
                time: f[3].parse::<u64>().unwrap_or(0) * 1000,
                subject: f[4].into(),
            })
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_branch_files_rename_and_conflict() {
        let raw = [
            "# branch.oid abc",
            "# branch.head feature/x",
            "# branch.upstream origin/feature/x",
            "# branch.ab +2 -1",
            "1 M. N... 100644 100644 100644 aaa bbb src/a.ts",
            "1 .M N... 100644 100644 100644 aaa bbb src/b file.ts",
            "2 R. N... 100644 100644 100644 aaa bbb R100 new.ts",
            "old.ts",
            "u UU N... 100644 100644 100644 100644 a b c conflict.ts",
            "? notes.md",
            "",
        ]
        .join("\0");
        let s = parse_status(&raw);
        assert_eq!(s.branch.as_deref(), Some("feature/x"));
        assert_eq!((s.ahead, s.behind), (2, 1));
        assert_eq!(s.files.len(), 5);
        assert!(s.files[0].staged && !s.files[0].unstaged);
        assert_eq!(s.files[1].path, "src/b file.ts");
        assert!(s.files[1].unstaged);
        assert_eq!(s.files[2].from.as_deref(), Some("old.ts"));
        assert!(s.files[3].conflicted);
        assert!(s.files[4].untracked);
    }
}
