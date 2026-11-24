use futures_util::StreamExt;
use serde::Serialize;
use std::io::Write;
use std::path::PathBuf;
use tauri::{AppHandle, Emitter, Manager};

/// Multilingual base model (~148 MB): good Spanish/English accuracy, fast on CPU/Metal.
const MODEL_FILE: &str = "ggml-base.bin";
const MODEL_URL: &str = "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin";

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ModelStatus {
    pub ready: bool,
    pub path: String,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct Progress {
    downloaded: u64,
    total: Option<u64>,
}

pub fn model_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(app.path().app_data_dir().map_err(|e| e.to_string())?.join("models").join(MODEL_FILE))
}

/// Streams the model to disk (temp file + rename), emitting `voice://download` progress.
pub async fn download_model(app: &AppHandle) -> Result<ModelStatus, String> {
    let path = model_path(app)?;
    if path.exists() {
        return Ok(ModelStatus { ready: true, path: path.display().to_string() });
    }
    std::fs::create_dir_all(path.parent().unwrap()).map_err(|e| e.to_string())?;
    let res = reqwest::get(MODEL_URL).await.map_err(|e| e.to_string())?;
    if !res.status().is_success() {
        return Err(format!("model download failed: HTTP {}", res.status()));
    }
    let total = res.content_length();
    let tmp = path.with_extension("part");
    let mut file = std::fs::File::create(&tmp).map_err(|e| e.to_string())?;
    let mut stream = res.bytes_stream();
    let (mut downloaded, mut last_emit) = (0u64, 0u64);
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| e.to_string())?;
        file.write_all(&chunk).map_err(|e| e.to_string())?;
        downloaded += chunk.len() as u64;
        if downloaded - last_emit > 512 * 1024 {
            last_emit = downloaded;
            let _ = app.emit("voice://download", Progress { downloaded, total });
        }
    }
    file.sync_all().map_err(|e| e.to_string())?;
    if total.is_some_and(|t| t != downloaded) {
        let _ = std::fs::remove_file(&tmp);
        return Err("model download was incomplete".into());
    }
    std::fs::rename(&tmp, &path).map_err(|e| e.to_string())?;
    Ok(ModelStatus { ready: true, path: path.display().to_string() })
}
