//! Cross-Platform Native Audio Input/Output via CPAL & G.711 Encoding/Decoding

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use parking_lot::Mutex;
use std::collections::VecDeque;
use std::time::Duration;

#[derive(Clone)]
pub struct AudioEngine {
    is_muted: Arc<AtomicBool>,
    speaker_buffer: Arc<Mutex<VecDeque<i16>>>,
    mic_buffer: Arc<Mutex<VecDeque<i16>>>,
    running: Arc<AtomicBool>,
}

impl AudioEngine {
    pub fn new() -> Self {
        Self {
            is_muted: Arc::new(AtomicBool::new(false)),
            speaker_buffer: Arc::new(Mutex::new(VecDeque::with_capacity(16000))),
            mic_buffer: Arc::new(Mutex::new(VecDeque::with_capacity(16000))),
            running: Arc::new(AtomicBool::new(true)),
        }
    }

    pub fn set_muted(&self, muted: bool) {
        self.is_muted.store(muted, Ordering::SeqCst);
    }

    pub fn is_muted(&self) -> bool {
        self.is_muted.load(Ordering::SeqCst)
    }

    pub fn is_running(&self) -> bool {
        self.running.load(Ordering::SeqCst)
    }

    /// Push incoming PCM samples from RTP into speaker playback queue
    pub fn push_speaker_pcm(&self, samples: &[i16]) {
        let mut buf = self.speaker_buffer.lock();
        if buf.len() > 4800 {
            buf.drain(..2400);
        }
        buf.extend(samples);
    }

    /// Pop a 20ms frame (160 samples at 8kHz) from mic buffer for outgoing RTP
    pub fn pop_mic_frame(&self) -> Option<Vec<i16>> {
        let mut buf = self.mic_buffer.lock();
        if buf.len() >= 160 {
            let frame: Vec<i16> = buf.drain(..160).collect();
            if self.is_muted() {
                Some(vec![0; 160])
            } else {
                Some(frame)
            }
        } else {
            None
        }
    }

    /// Spawn background thread managing CPAL streams on Windows/macOS/Linux
    pub fn spawn_audio_thread(&self) {
        let engine = self.clone();

        std::thread::spawn(move || {
            let host = cpal::default_host();

            let output_device = match host.default_output_device() {
                Some(d) => d,
                None => return,
            };
            let output_config = match output_device.default_output_config() {
                Ok(c) => c,
                Err(_) => return,
            };

            let input_device = match host.default_input_device() {
                Some(d) => d,
                None => return,
            };
            let input_config = match input_device.default_input_config() {
                Ok(c) => c,
                Err(_) => return,
            };

            let speaker_buf = engine.speaker_buffer.clone();
            let out_channels = output_config.channels() as usize;

            let out_stream = match output_config.sample_format() {
                cpal::SampleFormat::F32 => output_device.build_output_stream(
                    &output_config.into(),
                    move |data: &mut [f32], _: &cpal::OutputCallbackInfo| {
                        let mut buf = speaker_buf.lock();
                        for frame in data.chunks_mut(out_channels) {
                            let sample_i16 = buf.pop_front().unwrap_or(0);
                            let sample_f32 = sample_i16 as f32 / 32768.0;
                            for sample in frame.iter_mut() {
                                *sample = sample_f32;
                            }
                        }
                    },
                    |err| eprintln!("Audio output stream error: {}", err),
                    None,
                ).ok(),
                cpal::SampleFormat::I16 => output_device.build_output_stream(
                    &output_config.into(),
                    move |data: &mut [i16], _: &cpal::OutputCallbackInfo| {
                        let mut buf = speaker_buf.lock();
                        for frame in data.chunks_mut(out_channels) {
                            let sample_i16 = buf.pop_front().unwrap_or(0);
                            for sample in frame.iter_mut() {
                                *sample = sample_i16;
                            }
                        }
                    },
                    |err| eprintln!("Audio output stream error: {}", err),
                    None,
                ).ok(),
                _ => None,
            };

            let mic_buf = engine.mic_buffer.clone();
            let in_channels = input_config.channels() as usize;
            let in_sample_rate = input_config.sample_rate().0 as f32;
            let step = (in_sample_rate / 8000.0).max(1.0);

            let in_stream = match input_config.sample_format() {
                cpal::SampleFormat::F32 => {
                    let mut accum: f32 = 0.0;
                    input_device.build_input_stream(
                        &input_config.into(),
                        move |data: &[f32], _: &cpal::InputCallbackInfo| {
                            let mut buf = mic_buf.lock();
                            for frame in data.chunks(in_channels) {
                                accum += 1.0;
                                if accum >= step {
                                    accum -= step;
                                    let mono = frame[0];
                                    let sample_i16 = (mono * 32767.0).clamp(-32768.0, 32767.0) as i16;
                                    if buf.len() < 8000 {
                                        buf.push_back(sample_i16);
                                    }
                                }
                            }
                        },
                        |err| eprintln!("Audio input stream error: {}", err),
                        None,
                    ).ok()
                }
                cpal::SampleFormat::I16 => {
                    let mut accum: f32 = 0.0;
                    input_device.build_input_stream(
                        &input_config.into(),
                        move |data: &[i16], _: &cpal::InputCallbackInfo| {
                            let mut buf = mic_buf.lock();
                            for frame in data.chunks(in_channels) {
                                accum += 1.0;
                                if accum >= step {
                                    accum -= step;
                                    if buf.len() < 8000 {
                                        buf.push_back(frame[0]);
                                    }
                                }
                            }
                        },
                        |err| eprintln!("Audio input stream error: {}", err),
                        None,
                    ).ok()
                }
                _ => None,
            };

            if let Some(s) = &out_stream {
                let _ = s.play();
            }
            if let Some(s) = &in_stream {
                let _ = s.play();
            }

            while engine.is_running() {
                std::thread::sleep(Duration::from_millis(200));
            }
        });
    }
}
