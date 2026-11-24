/// Splits a 16 kHz mono stream into utterances using an adaptive energy gate:
/// speech starts when frame RMS rises well above the noise floor and ends after
/// a stretch of silence. Pure logic so it is unit-testable.
pub const SAMPLE_RATE: usize = 16_000;
const FRAME: usize = SAMPLE_RATE / 50; // 20 ms
const END_SILENCE_FRAMES: usize = 40; // 800 ms
const MIN_SPEECH_FRAMES: usize = 12; // 240 ms
const MAX_UTTERANCE: usize = SAMPLE_RATE * 30;
const PRE_ROLL_FRAMES: usize = 10; // keep 200 ms before onset

pub enum Event {
    Level(f32),
    SpeechStart,
    Utterance(Vec<f32>),
    /// Speech burst too short to be words (cough, click) — discarded.
    Discarded,
}

pub struct Segmenter {
    pending: Vec<f32>,
    noise_floor: f32,
    in_speech: bool,
    speech: Vec<f32>,
    speech_frames: usize,
    silence_frames: usize,
    pre_roll: std::collections::VecDeque<Vec<f32>>,
}

impl Default for Segmenter {
    fn default() -> Self {
        Self {
            pending: Vec::new(),
            noise_floor: 0.005,
            in_speech: false,
            speech: Vec::new(),
            speech_frames: 0,
            silence_frames: 0,
            pre_roll: Default::default(),
        }
    }
}

fn rms(frame: &[f32]) -> f32 {
    (frame.iter().map(|s| s * s).sum::<f32>() / frame.len() as f32).sqrt()
}

impl Segmenter {
    pub fn push(&mut self, samples: &[f32], mut emit: impl FnMut(Event)) {
        self.pending.extend_from_slice(samples);
        while self.pending.len() >= FRAME {
            let frame: Vec<f32> = self.pending.drain(..FRAME).collect();
            let level = rms(&frame);
            emit(Event::Level(level));
            let threshold = (self.noise_floor * 3.0).max(0.012);
            let loud = level > threshold;

            if !self.in_speech {
                // Track background noise only while nobody is talking.
                self.noise_floor = self.noise_floor * 0.95 + level.min(0.05) * 0.05;
                self.pre_roll.push_back(frame.clone());
                if self.pre_roll.len() > PRE_ROLL_FRAMES {
                    self.pre_roll.pop_front();
                }
                if loud {
                    self.in_speech = true;
                    self.speech = self.pre_roll.drain(..).flatten().collect();
                    self.speech_frames = 1;
                    self.silence_frames = 0;
                    emit(Event::SpeechStart);
                }
                continue;
            }

            self.speech.extend_from_slice(&frame);
            if loud {
                self.speech_frames += 1;
                self.silence_frames = 0;
            } else {
                self.silence_frames += 1;
            }
            if self.silence_frames >= END_SILENCE_FRAMES || self.speech.len() >= MAX_UTTERANCE {
                self.in_speech = false;
                let audio = std::mem::take(&mut self.speech);
                if self.speech_frames >= MIN_SPEECH_FRAMES {
                    emit(Event::Utterance(audio));
                } else {
                    emit(Event::Discarded);
                }
            }
        }
    }
}

/// Linear resampler from the device rate to 16 kHz.
pub struct Resampler {
    step: f64,
    pos: f64,
    last: f32,
}

impl Resampler {
    pub fn new(from_rate: u32) -> Self {
        Self { step: from_rate as f64 / SAMPLE_RATE as f64, pos: 0.0, last: 0.0 }
    }

    pub fn process(&mut self, input: &[f32], out: &mut Vec<f32>) {
        while self.pos < input.len() as f64 {
            let i = self.pos.floor() as usize;
            let frac = (self.pos - i as f64) as f32;
            let a = if i == 0 { self.last } else { input[i - 1] };
            let b = input[i];
            out.push(a + (b - a) * frac);
            self.pos += self.step;
        }
        self.pos -= input.len() as f64;
        if let Some(&l) = input.last() {
            self.last = l;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn tone(secs: f32, amp: f32) -> Vec<f32> {
        (0..(secs * SAMPLE_RATE as f32) as usize).map(|i| (i as f32 * 0.05).sin() * amp).collect()
    }

    #[test]
    fn detects_one_utterance_after_silence() {
        let mut s = Segmenter::default();
        let mut utterances = 0;
        let mut feed = |v: Vec<f32>, s: &mut Segmenter| s.push(&v, |e| if let Event::Utterance(_) = e { utterances += 1 });
        feed(tone(1.0, 0.001), &mut s); // quiet room
        feed(tone(1.0, 0.3), &mut s); // speech
        feed(tone(1.0, 0.001), &mut s); // silence → end
        assert_eq!(utterances, 1);
    }

    #[test]
    fn ignores_short_clicks() {
        let mut s = Segmenter::default();
        let mut got = (0, 0);
        let mut feed = |v: Vec<f32>, s: &mut Segmenter| {
            s.push(&v, |e| match e {
                Event::Utterance(_) => got.0 += 1,
                Event::Discarded => got.1 += 1,
                _ => {}
            })
        };
        feed(tone(1.0, 0.001), &mut s);
        feed(tone(0.06, 0.3), &mut s);
        feed(tone(1.0, 0.001), &mut s);
        assert_eq!(got, (0, 1));
    }

    #[test]
    fn resamples_48k_to_16k() {
        let mut r = Resampler::new(48_000);
        let mut out = vec![];
        r.process(&vec![0.5; 48_000], &mut out);
        assert!((out.len() as i64 - 16_000).abs() <= 1);
    }
}
