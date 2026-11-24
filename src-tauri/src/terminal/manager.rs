use super::utf8::Utf8Stream;
use portable_pty::{native_pty_system, ChildKiller, CommandBuilder, MasterPty, PtySize};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::{Arc, Mutex};
use tauri::ipc::Channel;

#[derive(Debug, thiserror::Error)]
pub enum PtyError {
    #[error("terminal session {0} not found")]
    NotFound(u32),
    #[error("{0}")]
    Pty(String),
}

impl Serialize for PtyError {
    fn serialize<S: serde::Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        s.serialize_str(&self.to_string())
    }
}

fn pty_err(e: impl std::fmt::Display) -> PtyError {
    PtyError::Pty(e.to_string())
}

/// Streamed to the frontend over a per-session channel.
#[derive(Serialize, Clone)]
#[serde(tag = "event", content = "data", rename_all = "camelCase")]
pub enum PtyEvent {
    Output(String),
    Exit { code: Option<u32> },
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpawnOptions {
    pub program: String,
    #[serde(default)]
    pub args: Vec<String>,
    pub cwd: Option<String>,
    #[serde(default)]
    pub env: HashMap<String, String>,
    pub cols: u16,
    pub rows: u16,
}

struct Session {
    master: Box<dyn MasterPty + Send>,
    writer: Box<dyn Write + Send>,
    killer: Box<dyn ChildKiller + Send + Sync>,
}

#[derive(Default, Clone)]
pub struct PtyManager {
    sessions: Arc<Mutex<HashMap<u32, Session>>>,
    next_id: Arc<AtomicU32>,
}

impl PtyManager {
    pub fn spawn(&self, opts: SpawnOptions, channel: Channel<PtyEvent>) -> Result<(u32, Option<u32>), PtyError> {
        let pair = native_pty_system()
            .openpty(PtySize { rows: opts.rows.max(1), cols: opts.cols.max(1), pixel_width: 0, pixel_height: 0 })
            .map_err(pty_err)?;

        let mut cmd = CommandBuilder::new(&opts.program);
        cmd.args(&opts.args);
        if let Some(cwd) = opts.cwd.filter(|c| std::path::Path::new(c).is_dir()) {
            cmd.cwd(cwd);
        } else if let Some(home) = std::env::var_os(if cfg!(windows) { "USERPROFILE" } else { "HOME" }) {
            cmd.cwd(home);
        }
        cmd.env("TERM", "xterm-256color");
        cmd.env("COLORTERM", "truecolor");
        cmd.env("TERM_PROGRAM", "Orbitr");
        for (k, v) in &opts.env {
            cmd.env(k, v);
        }

        let mut child = pair.slave.spawn_command(cmd).map_err(pty_err)?;
        // The child owns the slave side now; holding it would keep the PTY open after exit.
        drop(pair.slave);

        let pid = child.process_id();
        let killer = child.clone_killer();
        let mut reader = pair.master.try_clone_reader().map_err(pty_err)?;
        let writer = pair.master.take_writer().map_err(pty_err)?;

        let id = self.next_id.fetch_add(1, Ordering::Relaxed) + 1;
        self.sessions.lock().unwrap().insert(id, Session { master: pair.master, writer, killer });

        // PTY reads are blocking: run them on a dedicated blocking thread, never the main thread.
        let sessions = self.sessions.clone();
        tauri::async_runtime::spawn_blocking(move || {
            let mut buf = [0u8; 16 * 1024];
            let mut decoder = Utf8Stream::default();
            loop {
                match reader.read(&mut buf) {
                    Ok(0) | Err(_) => break,
                    Ok(n) => {
                        let text = decoder.push(&buf[..n]);
                        if !text.is_empty() && channel.send(PtyEvent::Output(text)).is_err() {
                            break; // frontend went away
                        }
                    }
                }
            }
            let code = child.wait().ok().map(|s| s.exit_code());
            sessions.lock().unwrap().remove(&id);
            let _ = channel.send(PtyEvent::Exit { code });
        });

        Ok((id, pid))
    }

    fn with<T>(&self, id: u32, f: impl FnOnce(&mut Session) -> Result<T, PtyError>) -> Result<T, PtyError> {
        let mut map = self.sessions.lock().unwrap();
        f(map.get_mut(&id).ok_or(PtyError::NotFound(id))?)
    }

    pub fn write(&self, id: u32, data: &str) -> Result<(), PtyError> {
        self.with(id, |s| {
            s.writer.write_all(data.as_bytes()).map_err(pty_err)?;
            s.writer.flush().map_err(pty_err)
        })
    }

    pub fn resize(&self, id: u32, cols: u16, rows: u16) -> Result<(), PtyError> {
        self.with(id, |s| {
            s.master
                .resize(PtySize { rows: rows.max(1), cols: cols.max(1), pixel_width: 0, pixel_height: 0 })
                .map_err(pty_err)
        })
    }

    /// Terminates the process. The reader thread observes EOF, reaps the child and emits `Exit`.
    pub fn kill(&self, id: u32) -> Result<(), PtyError> {
        self.with(id, |s| s.killer.kill().map_err(pty_err))
    }

    pub fn kill_all(&self) {
        for (_, mut s) in self.sessions.lock().unwrap().drain() {
            let _ = s.killer.kill();
        }
    }
}

#[cfg(all(test, unix))]
mod tests {
    use super::*;
    use std::sync::mpsc;
    use std::time::Duration;
    use tauri::ipc::InvokeResponseBody;

    fn channel() -> (Channel<PtyEvent>, mpsc::Receiver<String>) {
        let (tx, rx) = mpsc::channel();
        let ch = Channel::new(move |body| {
            if let InvokeResponseBody::Json(s) = body {
                let _ = tx.send(s);
            }
            Ok(())
        });
        (ch, rx)
    }

    fn opts(program: &str, args: &[&str]) -> SpawnOptions {
        SpawnOptions {
            program: program.into(),
            args: args.iter().map(|s| s.to_string()).collect(),
            cwd: None,
            env: HashMap::new(),
            cols: 80,
            rows: 24,
        }
    }

    fn collect_until_exit(rx: &mpsc::Receiver<String>) -> (String, String) {
        let mut out = String::new();
        loop {
            let msg = rx.recv_timeout(Duration::from_secs(10)).expect("pty timed out");
            if msg.contains("\"exit\"") {
                return (out, msg);
            }
            out.push_str(&msg);
        }
    }

    #[test]
    fn runs_process_and_reports_exit() {
        let m = PtyManager::default();
        let (ch, rx) = channel();
        m.spawn(opts("/bin/sh", &["-c", "echo orbitr-$((40+2)); exit 3"]), ch).unwrap();
        let (out, exit) = collect_until_exit(&rx);
        assert!(out.contains("orbitr-42"), "output: {out}");
        assert!(exit.contains("\"code\":3"), "exit: {exit}");
        assert!(m.sessions.lock().unwrap().is_empty(), "session not cleaned up");
    }

    #[test]
    fn interactive_input_resize_and_kill() {
        let m = PtyManager::default();
        let (ch, rx) = channel();
        let (id, _) = m.spawn(opts("/bin/sh", &[]), ch).unwrap();
        m.resize(id, 120, 40).unwrap();
        m.write(id, "stty size; echo ok-$((1+1))\n").unwrap();
        let mut out = String::new();
        while !(out.contains("40 120") && out.contains("ok-2")) {
            out.push_str(&rx.recv_timeout(Duration::from_secs(10)).expect("no output"));
        }
        m.kill(id).unwrap();
        let (_, exit) = collect_until_exit(&rx);
        assert!(exit.contains("exit"));
        assert!(matches!(m.write(id, "x"), Err(PtyError::NotFound(_))));
    }
}
