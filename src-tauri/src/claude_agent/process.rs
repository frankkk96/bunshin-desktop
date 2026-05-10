use crate::claude_agent::protocol::{
    build_interrupt, build_user_message, ClaudeStreamEvent,
};
use crate::database::models::{Provider, ProviderType, Session};
use crate::database::repositories::MessageRepository;
use anyhow::{anyhow, Context, Result};
use serde::Serialize;
use sqlx::SqlitePool;
use std::process::Stdio;
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::Command;
use tokio::sync::{mpsc, oneshot, Mutex, RwLock};

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ProcessStatus {
    Running,
    Stopped,
    Crashed,
}

/// One running `claude` subprocess.
pub struct ClaudeProcess {
    pub session_id: String,
    pub status: Arc<RwLock<ProcessStatus>>,
    stdin_tx: mpsc::Sender<String>,
    kill_tx: Mutex<Option<oneshot::Sender<()>>>,
}

pub struct SpawnConfig<'a> {
    pub session: &'a Session,
    pub provider: &'a Provider,
    pub api_key: Option<&'a str>,
    pub resume: bool,
}

impl ClaudeProcess {
    pub async fn spawn(
        cfg: SpawnConfig<'_>,
        pool: SqlitePool,
        app: AppHandle,
    ) -> Result<Arc<Self>> {
        let session = cfg.session;
        let provider = cfg.provider;

        let mut cmd = Command::new("claude");
        cmd.arg("-p")
            .arg("--input-format")
            .arg("stream-json")
            .arg("--output-format")
            .arg("stream-json")
            .arg("--include-partial-messages")
            .arg("--verbose");

        if cfg.resume {
            cmd.arg("--resume").arg(&session.id);
        } else {
            cmd.arg("--session-id").arg(&session.id);
        }

        cmd.arg("--add-dir")
            .arg(&session.cwd)
            .arg("--permission-mode")
            .arg(session.permission_mode.as_cli_flag());

        cmd.current_dir(&session.cwd);

        match provider.type_ {
            ProviderType::Subscription => {
                // Trust the system claude CLI's existing OAuth login. Nothing to do.
            }
            ProviderType::Api => {
                if let Some(base_url) = provider.base_url.as_deref() {
                    cmd.env("ANTHROPIC_BASE_URL", base_url);
                }
                if let Some(key) = cfg.api_key {
                    cmd.env("ANTHROPIC_API_KEY", key);
                }
            }
        }

        cmd.stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::piped());

        #[cfg(target_os = "windows")]
        {
            use std::os::windows::process::CommandExt;
            const CREATE_NO_WINDOW: u32 = 0x08000000;
            cmd.creation_flags(CREATE_NO_WINDOW);
        }

        let mut child = cmd
            .spawn()
            .context("failed to spawn `claude` subprocess — is the CLI installed and on PATH?")?;

        let stdin = child
            .stdin
            .take()
            .ok_or_else(|| anyhow!("failed to capture child stdin"))?;
        let stdout = child
            .stdout
            .take()
            .ok_or_else(|| anyhow!("failed to capture child stdout"))?;
        let stderr = child
            .stderr
            .take()
            .ok_or_else(|| anyhow!("failed to capture child stderr"))?;

        let status = Arc::new(RwLock::new(ProcessStatus::Running));
        let (stdin_tx, mut stdin_rx) = mpsc::channel::<String>(64);
        let (kill_tx, mut kill_rx) = oneshot::channel::<()>();

        // Writer task: drain channel into child stdin.
        let session_id_writer = session.id.clone();
        let mut stdin_writer = stdin;
        tokio::spawn(async move {
            while let Some(line) = stdin_rx.recv().await {
                if let Err(e) = stdin_writer.write_all(line.as_bytes()).await {
                    log::warn!("[claude {}] stdin write failed: {e}", session_id_writer);
                    break;
                }
                if !line.ends_with('\n') {
                    if let Err(e) = stdin_writer.write_all(b"\n").await {
                        log::warn!(
                            "[claude {}] stdin newline failed: {e}",
                            session_id_writer
                        );
                        break;
                    }
                }
                if let Err(e) = stdin_writer.flush().await {
                    log::warn!("[claude {}] stdin flush failed: {e}", session_id_writer);
                    break;
                }
            }
        });

        // Stdout reader: parse line-by-line, persist + emit.
        let session_id_stdout = session.id.clone();
        let pool_stdout = pool.clone();
        let app_stdout = app.clone();
        tokio::spawn(async move {
            let repo = MessageRepository::new(pool_stdout);
            let event_topic = format!("session:{}:event", session_id_stdout);
            let mut reader = BufReader::new(stdout).lines();
            loop {
                match reader.next_line().await {
                    Ok(Some(line)) => {
                        let trimmed = line.trim();
                        if trimmed.is_empty() {
                            continue;
                        }
                        let parsed: ClaudeStreamEvent = match serde_json::from_str(trimmed) {
                            Ok(v) => v,
                            Err(e) => {
                                log::warn!(
                                    "[claude {}] non-JSON stdout line: {e}: {trimmed}",
                                    session_id_stdout
                                );
                                ClaudeStreamEvent::Other(serde_json::json!({
                                    "raw": trimmed,
                                    "parse_error": e.to_string(),
                                }))
                            }
                        };
                        let kind = parsed.kind().to_string();
                        let payload = parsed.into_payload();
                        match repo.append(&session_id_stdout, &kind, &payload).await {
                            Ok(message) => {
                                if let Err(e) = app_stdout.emit(&event_topic, &message) {
                                    log::warn!(
                                        "[claude {}] emit failed: {e}",
                                        session_id_stdout
                                    );
                                }
                            }
                            Err(e) => log::warn!(
                                "[claude {}] persist message failed: {e}",
                                session_id_stdout
                            ),
                        }
                    }
                    Ok(None) => break,
                    Err(e) => {
                        log::warn!("[claude {}] stdout read error: {e}", session_id_stdout);
                        break;
                    }
                }
            }
        });

        // Stderr reader: log + keep last bytes for crash diagnosis.
        let session_id_stderr = session.id.clone();
        let stderr_buf: Arc<Mutex<String>> = Arc::new(Mutex::new(String::new()));
        let stderr_buf_for_reader = stderr_buf.clone();
        tokio::spawn(async move {
            let mut reader = BufReader::new(stderr).lines();
            while let Ok(Some(line)) = reader.next_line().await {
                log::warn!("[claude {} stderr] {line}", session_id_stderr);
                let mut buf = stderr_buf_for_reader.lock().await;
                if buf.len() > 8192 {
                    buf.clear();
                }
                buf.push_str(&line);
                buf.push('\n');
            }
        });

        // Wait + kill task: owns the child handle. Watches both child.wait() and
        // an external kill signal in a select; if killed, marks status Stopped
        // (clean shutdown), otherwise reads the exit code to decide Stopped/Crashed.
        let session_id_wait = session.id.clone();
        let pool_wait = pool.clone();
        let app_wait = app.clone();
        let status_wait = status.clone();
        let stderr_for_wait = stderr_buf.clone();
        tokio::spawn(async move {
            let mut killed = false;
            let exit = tokio::select! {
                exit = child.wait() => exit,
                _ = &mut kill_rx => {
                    killed = true;
                    let _ = child.start_kill();
                    child.wait().await
                }
            };
            let (code_opt, success) = match &exit {
                Ok(s) => (s.code(), s.success()),
                Err(_) => (None, false),
            };
            let new_status = if killed || success {
                ProcessStatus::Stopped
            } else {
                ProcessStatus::Crashed
            };
            *status_wait.write().await = new_status;

            let stderr_tail = stderr_for_wait.lock().await.clone();
            let payload = serde_json::json!({
                "type": "process_exit",
                "code": code_opt,
                "killed": killed,
                "status": match new_status {
                    ProcessStatus::Stopped => "stopped",
                    ProcessStatus::Crashed => "crashed",
                    ProcessStatus::Running => "running",
                },
                "stderr_tail": stderr_tail,
            });
            let repo = MessageRepository::new(pool_wait);
            if let Ok(message) = repo
                .append(&session_id_wait, "process_exit", &payload)
                .await
            {
                let _ = app_wait
                    .emit(&format!("session:{}:event", session_id_wait), &message);
            }
            log::info!(
                "[claude {}] subprocess exited code={:?} killed={killed}",
                session_id_wait,
                code_opt,
            );
        });

        Ok(Arc::new(Self {
            session_id: session.id.clone(),
            status,
            stdin_tx,
            kill_tx: Mutex::new(Some(kill_tx)),
        }))
    }

    pub async fn send_user_message(
        &self,
        text: String,
        attachments: Vec<serde_json::Value>,
        pool: SqlitePool,
        app: AppHandle,
    ) -> Result<()> {
        let mut content: Vec<serde_json::Value> = Vec::with_capacity(1 + attachments.len());
        if !text.is_empty() {
            content.push(serde_json::json!({"type": "text", "text": text}));
        }
        content.extend(attachments.iter().cloned());
        if content.is_empty() {
            return Err(anyhow!("empty message"));
        }
        let msg = build_user_message(content.clone());
        let line = serde_json::to_string(&msg)?;
        self.stdin_tx
            .send(line)
            .await
            .map_err(|_| anyhow!("subprocess stdin closed"))?;

        // Mirror the message into the persisted log so the chat shows it before
        // the child echoes anything back.
        let repo = MessageRepository::new(pool);
        let payload = serde_json::json!({
            "type": "local_user",
            "text": text,
            "attachments": attachments,
            "content": content,
        });
        let stored = repo
            .append(&self.session_id, "local_user", &payload)
            .await?;
        let _ = app.emit(&format!("session:{}:event", self.session_id), &stored);
        Ok(())
    }

    pub async fn cancel(&self) -> Result<()> {
        let msg = build_interrupt();
        let line = serde_json::to_string(&msg)?;
        self.stdin_tx
            .send(line)
            .await
            .map_err(|_| anyhow!("subprocess stdin closed"))?;
        Ok(())
    }

    pub async fn stop(&self) -> Result<()> {
        if let Some(tx) = self.kill_tx.lock().await.take() {
            let _ = tx.send(());
        }
        Ok(())
    }

    pub async fn current_status(&self) -> ProcessStatus {
        *self.status.read().await
    }
}
