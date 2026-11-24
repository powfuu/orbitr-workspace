use std::path::Path;
use std::sync::Arc;
use whisper_rs::{FullParams, SamplingStrategy, WhisperContext, WhisperContextParameters};

/// Loaded Whisper model. Loading takes ~0.5 s, so it is created once and shared.
#[derive(Clone)]
pub struct Transcriber {
    ctx: Arc<WhisperContext>,
}

impl Transcriber {
    pub fn load(path: &Path) -> Result<Self, String> {
        let ctx = WhisperContext::new_with_params(path.to_str().ok_or("bad model path")?, WhisperContextParameters::default())
            .map_err(|e| format!("failed to load speech model: {e}"))?;
        Ok(Self { ctx: Arc::new(ctx) })
    }

    /// `language`: ISO code ("es", "en") or None for auto-detect.
    pub fn transcribe(&self, audio: &[f32], language: Option<&str>) -> Result<String, String> {
        let mut state = self.ctx.create_state().map_err(|e| e.to_string())?;
        let mut params = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });
        params.set_language(Some(language.unwrap_or("auto")));
        params.set_n_threads(std::thread::available_parallelism().map(|n| n.get().min(8) as i32).unwrap_or(4));
        params.set_no_context(true);
        params.set_single_segment(true);
        params.set_suppress_blank(true);
        params.set_suppress_nst(true);
        params.set_print_special(false);
        params.set_print_progress(false);
        params.set_print_realtime(false);
        params.set_print_timestamps(false);
        // Biases recognition toward developer vocabulary (agent names, git, tests…).
        params.set_initial_prompt("Claude, Claude Code, Codex, Gemini, OpenCode, Cursor, Copilot. Git, commit, push, pull request, branch, merge, tests, build, deploy, refactor, bug, endpoint, TypeScript, Rust, React, npm.");
        state.full(params, audio).map_err(|e| e.to_string())?;
        let text: String = state
            .as_iter()
            .filter_map(|s| s.to_str_lossy().ok().map(|t| t.into_owned()))
            .collect::<Vec<_>>()
            .join(" ");
        Ok(clean(&text))
    }
}

/// Removes Whisper's non-speech annotations ("[BLANK_AUDIO]", "(music)") and known
/// silence hallucinations so they never get typed into a terminal.
pub fn clean(text: &str) -> String {
    let mut out = String::new();
    let mut depth = 0;
    for c in text.chars() {
        match c {
            '[' | '(' => depth += 1,
            ']' | ')' if depth > 0 => depth -= 1,
            _ if depth == 0 => out.push(c),
            _ => {}
        }
    }
    let out = out.split_whitespace().collect::<Vec<_>>().join(" ");
    let lower = out.to_lowercase();
    const HALLUCINATIONS: [&str; 4] = ["subtítulos realizados por", "gracias por ver", "thanks for watching", "amara.org"];
    if HALLUCINATIONS.iter().any(|h| lower.contains(h)) {
        return String::new();
    }
    out
}

#[cfg(test)]
mod tests {
    use super::clean;

    #[test]
    fn strips_annotations_and_hallucinations() {
        assert_eq!(clean(" [BLANK_AUDIO] "), "");
        assert_eq!(clean(" (música) Hola  mundo "), "Hola mundo");
        assert_eq!(clean("Subtítulos realizados por la comunidad de Amara.org"), "");
    }
}

/// End-to-end check against a real model + WAV (16 kHz mono s16le).
/// Run: ORBITR_MODEL=… ORBITR_WAV=… cargo test -- --ignored transcribes_wav --nocapture
#[cfg(test)]
mod e2e {
    #[test]
    #[ignore]
    fn transcribes_wav() {
        let model = std::env::var("ORBITR_MODEL").expect("ORBITR_MODEL");
        let wav = std::fs::read(std::env::var("ORBITR_WAV").expect("ORBITR_WAV")).unwrap();
        let data = wav.windows(4).position(|w| w == b"data").expect("no data chunk") + 8;
        let audio: Vec<f32> = wav[data..].chunks_exact(2).map(|b| i16::from_le_bytes([b[0], b[1]]) as f32 / 32768.0).collect();
        let t = super::Transcriber::load(std::path::Path::new(&model)).unwrap();
        let start = std::time::Instant::now();
        let text = t.transcribe(&audio, Some("es")).unwrap();
        println!("TRANSCRIPT: {text:?} in {:?}", start.elapsed());
        assert!(!text.is_empty());
    }
}
