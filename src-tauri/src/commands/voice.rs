use crate::voice::{download_model, model_path, ModelStatus, Transcriber, VoiceSession};
use std::sync::Mutex;
use tauri::{AppHandle, State};

#[derive(Default)]
pub struct VoiceState {
    session: Mutex<Option<VoiceSession>>,
    transcriber: Mutex<Option<Transcriber>>,
}

#[tauri::command]
pub fn voice_model_status(app: AppHandle) -> Result<ModelStatus, String> {
    let path = model_path(&app)?;
    Ok(ModelStatus { ready: path.exists(), path: path.display().to_string() })
}

#[tauri::command]
pub async fn voice_download_model(app: AppHandle) -> Result<ModelStatus, String> {
    download_model(&app).await
}

/// Starts listening. Loads the model on first use (off the main thread).
#[tauri::command]
pub async fn voice_start(app: AppHandle, state: State<'_, VoiceState>, language: Option<String>) -> Result<(), String> {
    if state.session.lock().unwrap().is_some() {
        return Ok(());
    }
    let existing = state.transcriber.lock().unwrap().clone();
    let transcriber = match existing {
        Some(t) => t,
        None => {
            let path = model_path(&app)?;
            if !path.exists() {
                return Err("Speech model not downloaded".into());
            }
            let t = tauri::async_runtime::spawn_blocking(move || Transcriber::load(&path))
                .await
                .map_err(|e| e.to_string())??;
            *state.transcriber.lock().unwrap() = Some(t.clone());
            t
        }
    };
    let lang = language.filter(|l| l != "auto");
    let session = tauri::async_runtime::spawn_blocking(move || VoiceSession::start(app, transcriber, lang))
        .await
        .map_err(|e| e.to_string())??;
    *state.session.lock().unwrap() = Some(session);
    Ok(())
}

#[tauri::command]
pub fn voice_stop(state: State<'_, VoiceState>) {
    if let Some(s) = state.session.lock().unwrap().take() {
        s.stop();
    }
}
