//! Installed Nerd Fonts. WebKit doesn't expose user-installed fonts to web content, so
//! the webview can't use them by name; instead we locate the files and hand their bytes
//! to the frontend, which registers them with the FontFace API.
use serde::Serialize;
use std::path::{Path, PathBuf};

#[derive(Serialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct NerdFont {
    /// Family name as it should be registered, e.g. "JetBrainsMono Nerd Font Mono".
    pub family: String,
    pub regular: String,
    pub bold: Option<String>,
}

fn font_dirs() -> Vec<PathBuf> {
    let mut dirs = vec![];
    if cfg!(target_os = "macos") {
        if let Some(h) = std::env::var_os("HOME") {
            dirs.push(PathBuf::from(h).join("Library/Fonts"));
        }
        dirs.push("/Library/Fonts".into());
    } else if cfg!(windows) {
        if let Some(l) = std::env::var_os("LOCALAPPDATA") {
            dirs.push(PathBuf::from(l).join("Microsoft\\Windows\\Fonts"));
        }
        if let Some(w) = std::env::var_os("WINDIR") {
            dirs.push(PathBuf::from(w).join("Fonts"));
        }
    } else if let Some(h) = std::env::var_os("HOME") {
        dirs.push(PathBuf::from(h).join(".local/share/fonts"));
        dirs.push("/usr/share/fonts".into());
    }
    dirs
}

/// "JetBrainsMonoNerdFontMono-Regular.ttf" → ("JetBrainsMono Nerd Font Mono", "Regular")
pub fn parse_file_name(name: &str) -> Option<(String, String)> {
    let stem = name.strip_suffix(".ttf").or_else(|| name.strip_suffix(".otf"))?;
    let (base, style) = stem.rsplit_once('-')?;
    let i = base.find("NerdFont")?;
    let (prefix, rest) = base.split_at(i);
    let variant = &rest["NerdFont".len()..]; // "", "Mono" or "Propo"
    let family = match variant {
        "" => format!("{prefix} Nerd Font"),
        v => format!("{prefix} Nerd Font {v}"),
    };
    Some((family, style.to_string()))
}

/// Mono variants first (one glyph per cell suits terminals), then by name.
pub fn list() -> Vec<NerdFont> {
    let mut map: std::collections::BTreeMap<String, NerdFont> = Default::default();
    for dir in font_dirs() {
        for e in std::fs::read_dir(&dir).into_iter().flatten().flatten() {
            let name = e.file_name().to_string_lossy().into_owned();
            let Some((family, style)) = parse_file_name(&name) else { continue };
            let path = e.path().to_string_lossy().into_owned();
            let entry = map.entry(family.clone()).or_insert(NerdFont { family, regular: String::new(), bold: None });
            match style.as_str() {
                "Regular" => entry.regular = path,
                "Bold" => entry.bold = Some(path),
                _ => {}
            }
        }
    }
    let mut v: Vec<NerdFont> = map.into_values().filter(|f| !f.regular.is_empty()).collect();
    v.sort_by_key(|f| (!f.family.ends_with("Mono"), f.family.clone()));
    v
}

/// Reads a font file, only from the system font folders.
pub fn read(path: &str) -> Result<Vec<u8>, String> {
    let p = Path::new(path).canonicalize().map_err(|e| e.to_string())?;
    let allowed = font_dirs().iter().filter_map(|d| d.canonicalize().ok()).any(|d| p.starts_with(d));
    let ext_ok = p.extension().is_some_and(|e| e.eq_ignore_ascii_case("ttf") || e.eq_ignore_ascii_case("otf"));
    if !allowed || !ext_ok {
        return Err("not a font in a system font folder".into());
    }
    std::fs::read(p).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_nerd_font_file_names() {
        assert_eq!(parse_file_name("JetBrainsMonoNerdFontMono-Regular.ttf"), Some(("JetBrainsMono Nerd Font Mono".into(), "Regular".into())));
        assert_eq!(parse_file_name("HackNerdFont-Bold.ttf"), Some(("Hack Nerd Font".into(), "Bold".into())));
        assert_eq!(parse_file_name("FiraCodeNerdFontPropo-Retina.ttf").unwrap().0, "FiraCode Nerd Font Propo");
        assert_eq!(parse_file_name("Inter-Regular.ttf"), None);
    }

    #[test]
    fn refuses_files_outside_font_dirs() {
        assert!(read("/etc/passwd").is_err());
        assert!(read("/does/not/exist.ttf").is_err());
    }
}
