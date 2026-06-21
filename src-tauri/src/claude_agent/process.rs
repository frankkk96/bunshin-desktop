use crate::claude_agent::protocol::{
    build_control_success, build_initialize, build_interrupt, build_user_message,
    ClaudeStreamEvent,
};
use crate::database::models::{Provider, ProviderType, Session};
use crate::database::repositories::MessageRepository;
use anyhow::{anyhow, Context, Result};
use serde::Serialize;
use sqlx::SqlitePool;
use std::process::Stdio;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager};
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

/// Resolve the per-provider config directory used as `CLAUDE_CONFIG_DIR`.
/// Creates it on first use so the `claude` CLI can write its OAuth tokens,
/// settings, etc. without polluting the user's `~/.claude/`.
pub fn provider_profile_dir(app: &AppHandle, provider_id: &str) -> Result<std::path::PathBuf> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| anyhow!("could not resolve app data dir: {e}"))?
        .join("claude-profiles")
        .join(provider_id);
    std::fs::create_dir_all(&dir)
        .with_context(|| format!("could not create provider profile dir at {}", dir.display()))?;
    Ok(dir)
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

        let profile_dir = provider_profile_dir(&app, &provider.id)?;

        let mut cmd = Command::new("claude");

        // Don't let the user's shell `ANTHROPIC_*` / `CLAUDE_*` env leak into the
        // subprocess — those would silently override per-provider config (e.g. an
        // exported `ANTHROPIC_API_KEY` would hijack a subscription session).
        for (k, _) in std::env::vars() {
            if k.starts_with("ANTHROPIC_") || k.starts_with("CLAUDE_") {
                cmd.env_remove(&k);
            }
        }

        // Each provider gets its own ~/.claude/ — keeps OAuth tokens, settings,
        // hooks and CLAUDE.md isolated per provider and from the user's terminal.
        cmd.env("CLAUDE_CONFIG_DIR", &profile_dir);

        cmd.arg("-p")
            .arg("--input-format")
            .arg("stream-json")
            .arg("--output-format")
            .arg("stream-json")
            .arg("--include-partial-messages")
            .arg("--verbose");

        if cfg.resume {
            cmd.arg("--resume").arg(&session.claude_session_id);
        } else {
            cmd.arg("--session-id").arg(&session.claude_session_id);
        }

        cmd.arg("--add-dir")
            .arg(&session.cwd)
            .arg("--permission-mode")
            .arg(session.permission_mode.as_cli_flag());

        cmd.current_dir(&session.cwd);

        match provider.type_ {
            ProviderType::Subscription => {
                // OAuth lives in `profile_dir/.credentials.json`; user must run
                // sign-in once per provider (Settings → Provider → Sign in).
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

        let provider_id_for_exit = provider.id.clone();
        let provider_type_for_exit = provider.type_;

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

        // Open the SDK control channel. Without this handshake the CLI runs in
        // non-interactive mode and auto-denies any tool that needs permission,
        // making `can_use_tool` invisible to us. Sending it through stdin_tx
        // here means it'll be the first line the child reads.
        let init = build_initialize();
        let init_line = serde_json::to_string(&init)
            .context("failed to serialize initialize control_request")?;
        if stdin_tx.send(init_line).await.is_err() {
            return Err(anyhow!("subprocess stdin closed before initialize"));
        }

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
        let stdin_tx_for_reader = stdin_tx.clone();
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

                        // The CLI confirms our `initialize` and `respond_to_permission`
                        // writes by emitting `control_response` back at us. It's just
                        // handshake noise — log it but don't clutter the chat history.
                        if kind == "control_response" {
                            log::debug!(
                                "[claude {}] control_response from CLI: {}",
                                session_id_stdout,
                                payload,
                            );
                            continue;
                        }

                        // `control_request` covers three subtypes:
                        //   - can_use_tool         → user must decide; render in UI
                        //   - hook_callback        → only fires if we register hooks
                        //                            (we don't, so this is unexpected,
                        //                            but auto-respond defensively to
                        //                            avoid deadlocking the subprocess)
                        //   - mcp_message          → only fires if we host an MCP
                        //                            server via the SDK (we don't)
                        if kind == "control_request" {
                            let subtype = payload
                                .get("request")
                                .and_then(|r| r.get("subtype"))
                                .and_then(|s| s.as_str())
                                .unwrap_or("");
                            if subtype == "hook_callback" || subtype == "mcp_message" {
                                if let Some(req_id) = payload
                                    .get("request_id")
                                    .and_then(|v| v.as_str())
                                {
                                    let auto = if subtype == "hook_callback" {
                                        serde_json::json!({ "continue": true })
                                    } else {
                                        serde_json::json!({})
                                    };
                                    let line = build_control_success(req_id, auto).to_string();
                                    let _ = stdin_tx_for_reader.send(line).await;
                                }
                                continue;
                            }
                            // Otherwise (can_use_tool, or any new subtype we don't know):
                            // fall through to persist + emit so the UI can render it.
                        }

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
            // Detect "claude needs you to sign in" so the UI can offer a one-click
            // sign-in button instead of just dumping stderr to the chat.
            // Subscription providers print "Please run /login" / "Not logged in"
            // when their OAuth tokens are missing or expired.
            let needs_login = matches!(provider_type_for_exit, ProviderType::Subscription)
                && (stderr_tail.contains("Please run /login")
                    || stderr_tail.contains("Not logged in")
                    || stderr_tail.contains("Invalid API key"));
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
                "needs_login": needs_login,
                "provider_id": provider_id_for_exit,
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

    /// Reply to a pending `control_request` (e.g. tool permission, AskUserQuestion,
    /// ExitPlanMode). Persists a `local_control_response` mirror so the UI can
    /// match it to the original request via `request_id` and collapse the card.
    pub async fn send_control_response(
        &self,
        request_id: String,
        response: serde_json::Value,
        pool: SqlitePool,
        app: AppHandle,
    ) -> Result<()> {
        let envelope = build_control_success(&request_id, response.clone());
        let line = envelope.to_string();
        self.stdin_tx
            .send(line)
            .await
            .map_err(|_| anyhow!("subprocess stdin closed"))?;

        let repo = MessageRepository::new(pool);
        let mirror = serde_json::json!({
            "type": "local_control_response",
            "request_id": request_id,
            "response": response,
        });
        let stored = repo
            .append(&self.session_id, "local_control_response", &mirror)
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
