use crate::claude_agent::manager::{ClaudeSessionManager, RunningSessionInfo};
use crate::claude_agent::process::provider_profile_dir;
use crate::database::models::{PermissionMode, ProviderType, Session};
use crate::database::repositories::{
    AgentRepository, MessageRepository, ProviderRepository, SessionRepository,
};
use crate::database::AppState;
use crate::secure_storage::SecureStorage;
use serde::Deserialize;
use std::path::Path;
use std::sync::Arc;
use tauri::{AppHandle, Manager, State};

pub const PROVIDER_KEY_SERVICE: &str = "provider_keys";

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartSessionInput {
    pub agent_id: String,
    pub cwd: String,
    pub permission_mode: PermissionMode,
    pub name: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SendMessageInput {
    pub session_id: String,
    pub text: String,
    /// Each entry is a content block already in Anthropic API shape
    /// (e.g. `{"type":"image","source":{"type":"base64","media_type":"...","data":"..."}}`).
    /// The frontend assembles these from the media picker.
    #[serde(default)]
    pub attachments: Vec<serde_json::Value>,
}

fn load_provider_api_key(app: &AppHandle, provider_id: &str) -> Result<Option<String>, String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let storage = SecureStorage::with_base_dir(PROVIDER_KEY_SERVICE.to_string(), app_data_dir);
    storage.get(provider_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn start_session(
    input: StartSessionInput,
    state: State<'_, AppState>,
    manager: State<'_, Arc<ClaudeSessionManager>>,
    app: AppHandle,
) -> Result<Session, String> {
    let agent_repo = AgentRepository::new(state.db_pool.clone());
    let agent = agent_repo
        .get(&input.agent_id)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("agent {} not found", input.agent_id))?;

    let provider_repo = ProviderRepository::new(state.db_pool.clone());
    let provider = provider_repo
        .get(&agent.provider_id)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("provider {} not found", agent.provider_id))?;

    if !Path::new(&input.cwd).is_dir() {
        return Err(format!(
            "working directory does not exist or is not a directory: {}",
            input.cwd
        ));
    }

    // Enforce at most one session per (agent, cwd). Surface the existing id with
    // a structured prefix so the frontend can navigate to it instead of erroring.
    let session_repo = SessionRepository::new(state.db_pool.clone());
    if let Some(existing) = session_repo
        .find_by_agent_and_cwd(&agent.id, &input.cwd)
        .await
        .map_err(|e| e.to_string())?
    {
        return Err(format!("DUPLICATE_SESSION:{}", existing.id));
    }

    let api_key = if matches!(provider.type_, ProviderType::Api) {
        match load_provider_api_key(&app, &provider.id)? {
            Some(k) if !k.is_empty() => Some(k),
            _ => {
                return Err(format!(
                    "no API key stored for provider '{}' — set one in Settings → Providers",
                    provider.name
                ))
            }
        }
    } else {
        None
    };

    let now = chrono::Utc::now().timestamp_millis();
    let session = Session {
        id: uuid::Uuid::new_v4().to_string(),
        agent_id: agent.id.clone(),
        name: input.name,
        cwd: input.cwd,
        permission_mode: input.permission_mode,
        favorite: false,
        created_at: now,
        updated_at: now,
        visited_at: now,
        claude_session_id: uuid::Uuid::new_v4().to_string(),
    };

    let session = session_repo
        .create(session)
        .await
        .map_err(|e| e.to_string())?;

    // Spawn the subprocess in the background so the frontend can navigate to the
    // new session immediately without waiting for claude CLI bootstrap.
    let manager_clone = manager.inner().clone();
    let session_clone = session.clone();
    let provider_clone = provider.clone();
    let config_clone = agent.config.clone();
    let api_key_owned = api_key.map(|s| s.to_string());
    let pool_clone = state.db_pool.clone();
    let app_clone = app.clone();
    tauri::async_runtime::spawn(async move {
        if let Err(e) = manager_clone
            .start(
                &session_clone,
                &provider_clone,
                &config_clone,
                api_key_owned.as_deref(),
                false,
                pool_clone,
                app_clone,
            )
            .await
        {
            log::error!(
                "failed to spawn claude subprocess for session {}: {e}",
                session_clone.id
            );
        }
    });

    Ok(session)
}

#[tauri::command]
pub async fn resume_session(
    session_id: String,
    state: State<'_, AppState>,
    manager: State<'_, Arc<ClaudeSessionManager>>,
    app: AppHandle,
) -> Result<(), String> {
    if manager.get(&session_id).is_some() {
        return Ok(());
    }

    let session_repo = SessionRepository::new(state.db_pool.clone());
    let session = session_repo
        .get(&session_id)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("session {} not found", session_id))?;

    let agent_repo = AgentRepository::new(state.db_pool.clone());
    let agent = agent_repo
        .get(&session.agent_id)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("agent {} not found", session.agent_id))?;

    let provider_repo = ProviderRepository::new(state.db_pool.clone());
    let provider = provider_repo
        .get(&agent.provider_id)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("provider {} not found", agent.provider_id))?;

    let api_key = if matches!(provider.type_, ProviderType::Api) {
        load_provider_api_key(&app, &provider.id)?
    } else {
        None
    };

    manager
        .start(
            &session,
            &provider,
            &agent.config,
            api_key.as_deref(),
            true,
            state.db_pool.clone(),
            app.clone(),
        )
        .await
        .map_err(|e| e.to_string())?;

    session_repo
        .update_visited(&session_id)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn stop_session(
    session_id: String,
    manager: State<'_, Arc<ClaudeSessionManager>>,
) -> Result<(), String> {
    manager.stop(&session_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn send_user_message(
    input: SendMessageInput,
    state: State<'_, AppState>,
    manager: State<'_, Arc<ClaudeSessionManager>>,
    app: AppHandle,
) -> Result<(), String> {
    let process = manager
        .get(&input.session_id)
        .ok_or_else(|| format!("session {} is not running", input.session_id))?;
    process
        .send_user_message(input.text, input.attachments, state.db_pool.clone(), app)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn cancel_query(
    session_id: String,
    manager: State<'_, Arc<ClaudeSessionManager>>,
) -> Result<(), String> {
    let process = manager
        .get(&session_id)
        .ok_or_else(|| format!("session {} is not running", session_id))?;
    process.cancel().await.map_err(|e| e.to_string())
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RespondToPermissionInput {
    pub session_id: String,
    pub request_id: String,
    /// Inner `response` value from the SDK control protocol.
    /// For can_use_tool: `{behavior:"allow", updatedInput:{...}, updatedPermissions:[...]}`
    /// or `{behavior:"deny", message:"...", interrupt:false}`.
    pub response: serde_json::Value,
}

/// Send the user's decision for a pending `can_use_tool` (or other) control_request
/// back to the claude subprocess via stdin, and mirror it into the message log.
#[tauri::command]
pub async fn respond_to_permission(
    input: RespondToPermissionInput,
    state: State<'_, AppState>,
    manager: State<'_, Arc<ClaudeSessionManager>>,
    app: AppHandle,
) -> Result<(), String> {
    let process = manager
        .get(&input.session_id)
        .ok_or_else(|| format!("session {} is not running", input.session_id))?;
    process
        .send_control_response(input.request_id, input.response, state.db_pool.clone(), app)
        .await
        .map_err(|e| e.to_string())
}

/// /clear: kill the subprocess, drop persisted messages, rotate the underlying
/// claude session UUID, and respawn so the conversation starts truly empty.
#[tauri::command]
pub async fn clear_session(
    session_id: String,
    state: State<'_, AppState>,
    manager: State<'_, Arc<ClaudeSessionManager>>,
    app: AppHandle,
) -> Result<(), String> {
    // 1. stop any running process for this session
    manager
        .stop(&session_id)
        .await
        .map_err(|e| e.to_string())?;

    // 2. rotate the claude session id + delete persisted messages
    let session_repo = SessionRepository::new(state.db_pool.clone());
    let new_uuid = uuid::Uuid::new_v4().to_string();
    session_repo
        .rotate_claude_session_id(&session_id, &new_uuid)
        .await
        .map_err(|e| e.to_string())?;
    let message_repo = MessageRepository::new(state.db_pool.clone());
    message_repo
        .delete_by_session(&session_id)
        .await
        .map_err(|e| e.to_string())?;

    // 3. restart with the rotated id (resume=false → fresh conversation)
    let session = session_repo
        .get(&session_id)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("session {} not found", session_id))?;
    let agent_repo = AgentRepository::new(state.db_pool.clone());
    let agent = agent_repo
        .get(&session.agent_id)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("agent {} not found", session.agent_id))?;
    let provider_repo = ProviderRepository::new(state.db_pool.clone());
    let provider = provider_repo
        .get(&agent.provider_id)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("provider {} not found", agent.provider_id))?;
    let api_key = if matches!(provider.type_, ProviderType::Api) {
        load_provider_api_key(&app, &provider.id)?
    } else {
        None
    };
    manager
        .start(
            &session,
            &provider,
            &agent.config,
            api_key.as_deref(),
            false,
            state.db_pool.clone(),
            app,
        )
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn list_running_sessions(
    manager: State<'_, Arc<ClaudeSessionManager>>,
) -> Result<Vec<RunningSessionInfo>, String> {
    Ok(manager.snapshot().await)
}

#[tauri::command]
pub async fn set_provider_api_key(
    provider_id: String,
    api_key: String,
    app: AppHandle,
) -> Result<(), String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let storage = SecureStorage::with_base_dir(PROVIDER_KEY_SERVICE.to_string(), app_data_dir);
    if api_key.is_empty() {
        storage.delete(&provider_id).map_err(|e| e.to_string())
    } else {
        storage.set(&provider_id, &api_key).map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub async fn has_provider_api_key(provider_id: String, app: AppHandle) -> Result<bool, String> {
    Ok(load_provider_api_key(&app, &provider_id)?.is_some())
}

/// Open a terminal window running `claude /login` against the provider's
/// isolated `CLAUDE_CONFIG_DIR`. Subscription providers need this once per
/// provider so OAuth tokens land in the right profile dir.
#[tauri::command]
pub async fn sign_in_provider(
    provider_id: String,
    state: State<'_, AppState>,
    app: AppHandle,
) -> Result<(), String> {
    let provider = ProviderRepository::new(state.db_pool.clone())
        .get(&provider_id)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("provider {} not found", provider_id))?;

    if !matches!(provider.type_, ProviderType::Subscription) {
        return Err("Sign-in only applies to subscription providers".into());
    }

    let profile_dir = provider_profile_dir(&app, &provider.id).map_err(|e| e.to_string())?;
    open_login_terminal(&profile_dir).map_err(|e| e.to_string())
}

#[cfg(target_os = "macos")]
fn open_login_terminal(profile_dir: &Path) -> Result<(), String> {
    // Escape both backslashes and double quotes for the AppleScript string.
    let dir_quoted = profile_dir
        .display()
        .to_string()
        .replace('\\', "\\\\")
        .replace('"', "\\\"");
    let script = format!(
        "tell application \"Terminal\" to do script \"export CLAUDE_CONFIG_DIR=\\\"{}\\\"; claude /login\"",
        dir_quoted
    );
    std::process::Command::new("osascript")
        .arg("-e")
        .arg(script)
        .arg("-e")
        .arg("tell application \"Terminal\" to activate")
        .spawn()
        .map_err(|e| format!("could not open Terminal: {e}"))?;
    Ok(())
}

#[cfg(target_os = "windows")]
fn open_login_terminal(profile_dir: &Path) -> Result<(), String> {
    let cmdline = format!(
        "set CLAUDE_CONFIG_DIR={} && claude /login && pause",
        profile_dir.display()
    );
    std::process::Command::new("cmd.exe")
        .args(["/C", "start", "", "cmd.exe", "/K", &cmdline])
        .spawn()
        .map_err(|e| format!("could not open cmd.exe: {e}"))?;
    Ok(())
}

#[cfg(all(unix, not(target_os = "macos")))]
fn open_login_terminal(profile_dir: &Path) -> Result<(), String> {
    let dir_str = profile_dir.display().to_string();
    let inner = format!(
        "export CLAUDE_CONFIG_DIR=\"{}\"; claude /login; echo; read -p 'Press enter to close…'",
        dir_str
    );
    let candidates: &[(&str, &[&str])] = &[
        ("x-terminal-emulator", &["-e", "bash", "-c"]),
        ("gnome-terminal", &["--", "bash", "-c"]),
        ("konsole", &["-e", "bash", "-c"]),
        ("xterm", &["-e", "bash", "-c"]),
    ];
    let mut last_err: Option<String> = None;
    for (term, args) in candidates {
        let mut cmd = std::process::Command::new(term);
        cmd.args(*args).arg(&inner);
        match cmd.spawn() {
            Ok(_) => return Ok(()),
            Err(e) => last_err = Some(format!("{term}: {e}")),
        }
    }
    Err(format!(
        "no supported terminal emulator found ({})",
        last_err.unwrap_or_else(|| "tried x-terminal-emulator, gnome-terminal, konsole, xterm".into())
    ))
}

