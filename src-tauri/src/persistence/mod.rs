use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};

/// Keys map to file names, so only a strict alphabet is allowed.
fn is_valid_key(key: &str) -> bool {
    !key.is_empty() && key.len() <= 64 && key.chars().all(|c| c.is_ascii_alphanumeric() || c == '.' || c == '-')
        && !key.starts_with('.')
}

fn path_for(dir: &Path, key: &str) -> Result<PathBuf, String> {
    if !is_valid_key(key) {
        return Err(format!("invalid state key: {key}"));
    }
    Ok(dir.join(format!("{key}.json")))
}

pub fn load(dir: &Path, key: &str) -> Result<Option<String>, String> {
    match fs::read_to_string(path_for(dir, key)?) {
        Ok(s) => Ok(Some(s)),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

/// Writes atomically (temp file + rename) so a crash never leaves a half-written file.
pub fn save(dir: &Path, key: &str, value: &str) -> Result<(), String> {
    let target = path_for(dir, key)?;
    fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    let tmp = target.with_extension("json.tmp");
    let mut f = fs::File::create(&tmp).map_err(|e| e.to_string())?;
    f.write_all(value.as_bytes()).map_err(|e| e.to_string())?;
    f.sync_all().map_err(|e| e.to_string())?;
    fs::rename(&tmp, &target).map_err(|e| e.to_string())
}

pub fn remove(dir: &Path, key: &str) -> Result<(), String> {
    match fs::remove_file(path_for(dir, key)?) {
        Err(e) if e.kind() != std::io::ErrorKind::NotFound => Err(e.to_string()),
        _ => Ok(()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn roundtrip_and_validation() {
        let dir = std::env::temp_dir().join(format!("orbitr-test-{}", std::process::id()));
        assert_eq!(load(&dir, "orbitr.tabs").unwrap(), None);
        save(&dir, "orbitr.tabs", "{\"a\":1}").unwrap();
        assert_eq!(load(&dir, "orbitr.tabs").unwrap().as_deref(), Some("{\"a\":1}"));
        remove(&dir, "orbitr.tabs").unwrap();
        assert_eq!(load(&dir, "orbitr.tabs").unwrap(), None);
        assert!(save(&dir, "../evil", "x").is_err());
        assert!(save(&dir, "a/b", "x").is_err());
        let _ = fs::remove_dir_all(dir);
    }
}
