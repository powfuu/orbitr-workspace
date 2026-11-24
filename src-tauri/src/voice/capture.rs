use super::segmenter::{Event, Resampler, Segmenter};
use super::Transcriber;
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use serde::Serialize;
use std::sync::mpsc;
use std::thread;
use tauri::{AppHandle, Emitter};

#[derive(Serialize, Clone)]
#[serde(tag = "state", rename_all = "camelCase")]
pub enum VoiceEvent {
    Listening,
    Speaking,
    Transcribing,
    Transcript { text: String },
    Error { message: String },
}

/// A running microphone session. Dropping it (or calling `stop`) releases the mic.
pub struct VoiceSession {
    stop_tx: mpsc::Sender<()>,
}

impl VoiceSession {
    pub fn start(app: AppHandle, transcriber: Transcriber, language: Option<String>) -> Result<Self, String> {
        let (stop_tx, stop_rx) = mpsc::channel::<()>();
        let (ready_tx, ready_rx) = mpsc::channel::<Result<(), String>>();

        // cpal streams are !Send on some platforms: own the stream on its own thread.
        thread::spawn(move || {
            let host = cpal::default_host();
            let Some(device) = host.default_input_device() else {
                let _ = ready_tx.send(Err("No microphone found".into()));
                return;
            };
            let config = match device.default_input_config() {
                Ok(c) => c,
                Err(e) => {
                    let _ = ready_tx.send(Err(format!("Microphone unavailable: {e}")));
                    return;
                }
            };
            let channels = config.channels() as usize;
            let rate = config.sample_rate();
            let (audio_tx, audio_rx) = mpsc::channel::<Vec<f32>>();

            let err_app = app.clone();
            let on_err = move |e: cpal::Error| {
                let _ = err_app.emit("voice://event", VoiceEvent::Error { message: e.to_string() });
            };
            let mono = move |data: &[f32]| -> Vec<f32> {
                data.chunks(channels).map(|f| f.iter().sum::<f32>() / channels as f32).collect()
            };
            let stream = match config.sample_format() {
                cpal::SampleFormat::F32 => {
                    let tx = audio_tx.clone();
                    device.build_input_stream(config.config(), move |d: &[f32], _| { let _ = tx.send(mono(d)); }, on_err, None)
                }
                cpal::SampleFormat::I16 => {
                    let tx = audio_tx.clone();
                    device.build_input_stream(
                        config.config(),
                        move |d: &[i16], _| {
                            let f: Vec<f32> = d.iter().map(|s| *s as f32 / i16::MAX as f32).collect();
                            let _ = tx.send(mono(&f));
                        },
                        on_err,
                        None,
                    )
                }
                other => {
                    let _ = ready_tx.send(Err(format!("Unsupported microphone format {other:?}")));
                    return;
                }
            };
            let stream = match stream.map_err(|e| e.to_string()).and_then(|s| s.play().map(|_| s).map_err(|e| e.to_string())) {
                Ok(s) => s,
                Err(e) => {
                    let _ = ready_tx.send(Err(format!("Could not open microphone: {e}")));
                    return;
                }
            };
            let _ = ready_tx.send(Ok(()));
            let _ = app.emit("voice://event", VoiceEvent::Listening);

            // Segmentation + transcription run here; transcription of one utterance
            // happens on a worker so listening never pauses.
            let (utt_tx, utt_rx) = mpsc::channel::<Vec<f32>>();
            let worker_app = app.clone();
            thread::spawn(move || {
                for audio in utt_rx {
                    let _ = worker_app.emit("voice://event", VoiceEvent::Transcribing);
                    let event = match transcriber.transcribe(&audio, language.as_deref()) {
                        Ok(text) if !text.is_empty() => VoiceEvent::Transcript { text },
                        Ok(_) => VoiceEvent::Listening,
                        Err(message) => VoiceEvent::Error { message },
                    };
                    let _ = worker_app.emit("voice://event", event);
                }
            });

            let mut resampler = Resampler::new(u32::from(rate));
            let mut segmenter = Segmenter::default();
            let mut buf = Vec::new();
            let mut level_tick = 0u32;
            loop {
                if stop_rx.try_recv().is_ok() {
                    break;
                }
                let Ok(chunk) = audio_rx.recv_timeout(std::time::Duration::from_millis(100)) else { continue };
                buf.clear();
                resampler.process(&chunk, &mut buf);
                segmenter.push(&buf, |e| match e {
                    Event::Level(l) => {
                        level_tick += 1;
                        if level_tick % 3 == 0 {
                            let _ = app.emit("voice://level", l);
                        }
                    }
                    Event::SpeechStart => {
                        let _ = app.emit("voice://event", VoiceEvent::Speaking);
                    }
                    Event::Utterance(audio) => {
                        let _ = utt_tx.send(audio);
                    }
                    Event::Discarded => {
                        let _ = app.emit("voice://event", VoiceEvent::Listening);
                    }
                });
            }
            drop(stream); // releases the microphone
        });

        ready_rx.recv().map_err(|_| "voice thread exited".to_string())??;
        Ok(Self { stop_tx })
    }

    pub fn stop(self) {
        let _ = self.stop_tx.send(());
    }
}
