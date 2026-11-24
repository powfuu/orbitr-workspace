//! On-device voice input: microphone capture (cpal) → energy-based utterance
//! detection → Whisper (whisper.cpp) transcription. Nothing leaves the machine.
mod capture;
mod model;
mod segmenter;
mod transcribe;

pub use capture::VoiceSession;
pub use model::{download_model, model_path, ModelStatus};
pub use transcribe::Transcriber;
