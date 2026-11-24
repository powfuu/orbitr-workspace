//! Token usage and API-equivalent cost from Claude Code transcripts
//! (~/.claude/projects/<cwd>/<session>.jsonl). Read-only.
//!
//! Each assistant message carries `message.usage`; a message is written once per content
//! block, so usage is counted once per `message.id`. Files are cached by (mtime, size).
use serde::Serialize;
use serde_json::Value;
use std::collections::{BTreeMap, HashMap, HashSet};
use std::fs::{self, File};
use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::UNIX_EPOCH;

#[derive(Serialize, Clone, Copy, Default, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Tokens {
    pub input: u64,
    pub output: u64,
    pub cache_read: u64,
    pub cache_write_5m: u64,
    pub cache_write_1h: u64,
}

impl Tokens {
    fn add(&mut self, o: &Tokens) {
        self.input += o.input;
        self.output += o.output;
        self.cache_read += o.cache_read;
        self.cache_write_5m += o.cache_write_5m;
        self.cache_write_1h += o.cache_write_1h;
    }
}

/// USD per million tokens. Source: Anthropic API pricing (input/output per model;
/// cache writes 1.25x input for 5m and 2x for 1h; cache reads 0.1x unless the model
/// has its own rate). `None` = unknown model: tokens are counted, cost is not.
struct Price {
    input: f64,
    output: f64,
    cache_read: f64,
}

fn price(model: &str, fast: bool, prompt_tokens: u64) -> Option<Price> {
    let p = |input: f64, output: f64, read: Option<f64>| Price { input, output, cache_read: read.unwrap_or(input * 0.1) };
    let base = match model {
        m if m.starts_with("claude-fable-5-2") || m.starts_with("claude-mythos-5-2") => p(8.0, 40.0, Some(0.20)),
        m if m.starts_with("claude-fable-5-1") || m.starts_with("claude-mythos-5-1") => p(10.0, 50.0, Some(0.25)),
        m if m.starts_with("claude-fable-5") || m.starts_with("claude-mythos-5") => p(10.0, 50.0, Some(1.0)),
        m if m.starts_with("claude-opus-5-5") => p(4.0, 20.0, Some(0.20)),
        m if m.starts_with("claude-opus-5") || m.starts_with("claude-opus-4-8") || m.starts_with("claude-opus-4-7") || m.starts_with("claude-opus-4-6") => p(5.0, 25.0, None),
        m if m.starts_with("claude-sonnet-5-5") => p(2.0, 10.0, Some(0.10)),
        m if m.starts_with("claude-sonnet-5") => p(2.0, 10.0, None),
        m if m.starts_with("claude-sonnet-4-6") => p(3.0, 15.0, None),
        // Haiku 5.5 is tiered by prompt size.
        m if m.starts_with("claude-haiku-5-5") => if prompt_tokens > 100_000 { p(0.50, 2.50, None) } else { p(0.10, 0.50, None) },
        m if m.starts_with("claude-haiku-4-5") => p(1.0, 5.0, None),
        _ => return None,
    };
    // Fast mode is billed at 2x standard on Claude Opus 5.5.
    Some(if fast && model.starts_with("claude-opus-5-5") { Price { input: base.input * 2.0, output: base.output * 2.0, cache_read: base.cache_read * 2.0 } } else { base })
}

pub fn cost(model: &str, t: &Tokens, fast: bool) -> Option<f64> {
    let prompt = t.input + t.cache_read + t.cache_write_5m + t.cache_write_1h;
    let p = price(model, fast, prompt)?;
    Some(
        (t.input as f64 * p.input
            + t.output as f64 * p.output
            + t.cache_read as f64 * p.cache_read
            + t.cache_write_5m as f64 * p.input * 1.25
            + t.cache_write_1h as f64 * p.input * 2.0)
            / 1_000_000.0,
    )
}

/// One billed message.
#[derive(Clone, Debug)]
struct Record {
    session: String,
    model: String,
    day: String,
    time: String,
    tokens: Tokens,
    cost: Option<f64>,
}

fn tokens_from(usage: &Value) -> Tokens {
    let g = |v: &Value, k: &str| v[k].as_u64().unwrap_or(0);
    let one = |u: &Value| {
        let w1h = g(&u["cache_creation"], "ephemeral_1h_input_tokens");
        let total_write = g(u, "cache_creation_input_tokens");
        Tokens {
            input: g(u, "input_tokens"),
            output: g(u, "output_tokens"),
            cache_read: g(u, "cache_read_input_tokens"),
            cache_write_1h: w1h,
            cache_write_5m: total_write.saturating_sub(w1h),
        }
    };
    // Server-side steps (e.g. compaction) are itemised in `iterations`: sum them when present.
    match usage["iterations"].as_array() {
        Some(its) if its.len() > 1 => its.iter().fold(Tokens::default(), |mut acc, it| {
            acc.add(&one(it));
            acc
        }),
        _ => one(usage),
    }
}

fn parse_file(path: &Path) -> Vec<Record> {
    let Ok(f) = File::open(path) else { return vec![] };
    let mut seen = HashSet::new();
    let mut out = vec![];
    for line in BufReader::new(f).lines().map_while(Result::ok) {
        // Cheap prefilter: most lines are tool results / user turns without usage.
        if !line.contains("\"usage\"") || !line.contains("\"assistant\"") {
            continue;
        }
        let Ok(v) = serde_json::from_str::<Value>(&line) else { continue };
        let msg = &v["message"];
        let model = msg["model"].as_str().unwrap_or("");
        if model.is_empty() || model.starts_with('<') {
            continue; // "<synthetic>" placeholders are not billed
        }
        let id = msg["id"].as_str().or(v["requestId"].as_str()).unwrap_or("").to_string();
        if id.is_empty() || !seen.insert(id) {
            continue;
        }
        let tokens = tokens_from(&msg["usage"]);
        let fast = msg["usage"]["speed"].as_str() == Some("fast");
        let time = v["timestamp"].as_str().unwrap_or("").to_string();
        out.push(Record {
            session: v["sessionId"].as_str().unwrap_or("").to_string(),
            model: model.to_string(),
            day: time.get(..10).unwrap_or("").to_string(),
            cost: cost(model, &tokens, fast),
            tokens,
            time,
        });
    }
    out
}

type CacheKey = (u64, u64);
static CACHE: Mutex<Option<HashMap<PathBuf, (CacheKey, Vec<Record>)>>> = Mutex::new(None);

fn records(path: &Path) -> Vec<Record> {
    let Ok(meta) = fs::metadata(path) else { return vec![] };
    let mtime = meta.modified().ok().and_then(|t| t.duration_since(UNIX_EPOCH).ok()).map(|d| d.as_millis() as u64).unwrap_or(0);
    let key = (mtime, meta.len());
    if let Some((k, r)) = CACHE.lock().unwrap().get_or_insert_with(HashMap::new).get(path) {
        if *k == key {
            return r.clone();
        }
    }
    let r = parse_file(path);
    CACHE.lock().unwrap().get_or_insert_with(HashMap::new).insert(path.to_path_buf(), (key, r.clone()));
    r
}

#[derive(Serialize, Default, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Bucket {
    pub key: String,
    pub tokens: Tokens,
    /// API-equivalent USD; excludes messages from models with unknown pricing.
    pub cost: f64,
    pub messages: u32,
    pub unpriced: u32,
    pub last_at: String,
}

impl Bucket {
    fn add(&mut self, r: &Record) {
        self.tokens.add(&r.tokens);
        self.messages += 1;
        match r.cost {
            Some(c) => self.cost += c,
            None => self.unpriced += 1,
        }
        if r.time > self.last_at {
            self.last_at = r.time.clone();
        }
    }
}

#[derive(Serialize, Default, Debug)]
#[serde(rename_all = "camelCase")]
pub struct UsageReport {
    pub total: Bucket,
    pub by_day: Vec<Bucket>,
    pub by_model: Vec<Bucket>,
    pub by_session: Vec<Bucket>,
    /// Only in the all-projects overview: per transcript folder.
    pub by_project: Vec<Bucket>,
}

fn aggregate(groups: Vec<(String, Vec<Record>)>, since_day: &str, with_projects: bool) -> UsageReport {
    let mut rep = UsageReport::default();
    let (mut days, mut models, mut sessions, mut projects) = (BTreeMap::new(), BTreeMap::new(), BTreeMap::new(), BTreeMap::new());
    for (project, recs) in groups {
        for r in recs.iter().filter(|r| r.day.as_str() >= since_day) {
            rep.total.add(r);
            days.entry(r.day.clone()).or_insert_with(|| Bucket { key: r.day.clone(), ..Default::default() }).add(r);
            models.entry(r.model.clone()).or_insert_with(|| Bucket { key: r.model.clone(), ..Default::default() }).add(r);
            sessions.entry(r.session.clone()).or_insert_with(|| Bucket { key: r.session.clone(), ..Default::default() }).add(r);
            if with_projects {
                projects.entry(project.clone()).or_insert_with(|| Bucket { key: project.clone(), ..Default::default() }).add(r);
            }
        }
    }
    rep.by_day = days.into_values().collect();
    let by_cost = |m: BTreeMap<String, Bucket>| {
        let mut v: Vec<Bucket> = m.into_values().collect();
        v.sort_by(|a, b| b.cost.partial_cmp(&a.cost).unwrap_or(std::cmp::Ordering::Equal));
        v
    };
    rep.by_model = by_cost(models);
    let mut s: Vec<Bucket> = sessions.into_values().collect();
    s.sort_by(|a, b| b.last_at.cmp(&a.last_at));
    rep.by_session = s;
    rep.by_project = by_cost(projects);
    rep
}

fn jsonl_in(dir: &Path) -> Vec<PathBuf> {
    fs::read_dir(dir)
        .into_iter()
        .flatten()
        .flatten()
        .map(|e| e.path())
        .filter(|p| p.extension().is_some_and(|e| e == "jsonl"))
        .collect()
}

fn projects_root() -> Option<PathBuf> {
    std::env::var_os(if cfg!(windows) { "USERPROFILE" } else { "HOME" }).map(|h| PathBuf::from(h).join(".claude").join("projects"))
}

/// Usage for one project folder since `since_day` (YYYY-MM-DD).
pub fn project_usage(cwd: &str, since_day: &str) -> UsageReport {
    let Some(dir) = super::chats::claude_dir(cwd) else { return UsageReport::default() };
    let recs = jsonl_in(&dir).iter().flat_map(|p| records(p)).collect();
    aggregate(vec![(cwd.to_string(), recs)], since_day, false)
}

/// Usage across every Claude Code project since `since_day`. Project keys are transcript folder names.
pub fn overview(since_day: &str) -> UsageReport {
    let Some(root) = projects_root() else { return UsageReport::default() };
    let groups = fs::read_dir(root)
        .into_iter()
        .flatten()
        .flatten()
        .filter(|e| e.path().is_dir())
        .map(|e| (e.file_name().to_string_lossy().into_owned(), jsonl_in(&e.path()).iter().flat_map(|p| records(p)).collect()))
        .collect();
    aggregate(groups, since_day, true)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn prices_and_cache_rates() {
        let t = Tokens { input: 1_000_000, output: 1_000_000, cache_read: 1_000_000, cache_write_5m: 1_000_000, cache_write_1h: 1_000_000 };
        // Opus 5.5: 4 + 20 + 0.20 + 5 + 8
        assert!((cost("claude-opus-5-5", &t, false).unwrap() - 37.2).abs() < 1e-9);
        assert!((cost("claude-opus-5-5", &t, true).unwrap() - 74.4).abs() < 1e-9);
        // Opus 4.8: 5 + 25 + 0.5 + 6.25 + 10
        assert!((cost("claude-opus-4-8", &t, false).unwrap() - 46.75).abs() < 1e-9);
        // Sonnet 5.5 read is $0.10
        let read = Tokens { cache_read: 1_000_000, ..Default::default() };
        assert!((cost("claude-sonnet-5-5", &read, false).unwrap() - 0.10).abs() < 1e-9);
        // Haiku 5.5 tiers on prompt size
        let small = Tokens { input: 50_000, ..Default::default() };
        let big = Tokens { input: 200_000, ..Default::default() };
        assert!((cost("claude-haiku-5-5", &small, false).unwrap() - 0.005).abs() < 1e-9);
        assert!((cost("claude-haiku-5-5", &big, false).unwrap() - 0.10).abs() < 1e-9);
        assert_eq!(cost("opus", &t, false), None);
    }

    #[test]
    fn dedupes_messages_and_splits_cache_ttl() {
        let dir = std::env::temp_dir().join(format!("orbitr-usage-{}", std::process::id()));
        fs::create_dir_all(&dir).unwrap();
        let f = dir.join("s.jsonl");
        let line = |id: &str, ts: &str| {
            format!(
                r#"{{"type":"assistant","sessionId":"S1","timestamp":"{ts}","message":{{"id":"{id}","model":"claude-opus-4-8","usage":{{"input_tokens":100,"output_tokens":10,"cache_read_input_tokens":1000,"cache_creation_input_tokens":500,"cache_creation":{{"ephemeral_1h_input_tokens":200,"ephemeral_5m_input_tokens":300}}}}}}}}"#
            )
        };
        fs::write(
            &f,
            [
                line("m1", "2026-11-23T10:00:00Z"),
                line("m1", "2026-11-23T10:00:01Z"), // same message, second content block
                line("m2", "2026-11-24T09:00:00Z"),
                r#"{"type":"assistant","message":{"id":"x","model":"<synthetic>","usage":{"input_tokens":5}}}"#.into(),
                r#"{"type":"user","message":{"content":"hi"}}"#.into(),
            ]
            .join("\n"),
        )
        .unwrap();
        let recs = parse_file(&f);
        assert_eq!(recs.len(), 2);
        assert_eq!(recs[0].tokens, Tokens { input: 100, output: 10, cache_read: 1000, cache_write_5m: 300, cache_write_1h: 200 });
        let rep = aggregate(vec![("p".into(), recs)], "2026-11-24", false);
        assert_eq!(rep.total.messages, 1, "since filter keeps only the 24th");
        assert_eq!(rep.by_day.len(), 1);
        assert_eq!(rep.by_session[0].key, "S1");
        let _ = fs::remove_dir_all(dir);
    }
}

/// Real-data smoke test: `cargo test --release -- --ignored usage_overview_real --nocapture`
#[cfg(test)]
mod real {
    #[test]
    #[ignore]
    fn usage_overview_real() {
        for round in ["cold", "warm"] {
            let t = std::time::Instant::now();
            let r = super::overview("2026-11-01");
            println!(
                "{round}: {:?} · {} msgs · ${:.2} · {} unpriced · {} models · {} projects",
                t.elapsed(), r.total.messages, r.total.cost, r.total.unpriced, r.by_model.len(), r.by_project.len()
            );
        }
        let r = super::overview("2026-11-01");
        for m in r.by_model.iter().take(6) {
            println!("  {:<28} {:>6} msgs  ${:>8.2}  unpriced {}", m.key, m.messages, m.cost, m.unpriced);
        }
    }
}
