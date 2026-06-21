use crate::claude_agent::manager::{ClaudeSessionManager, RunningSessionInfo};
use crate::database::models::{PermissionMode, Session};
use crate::database::repositories::{AgentRepository, MessageRepository, SessionRepository};
use crate::database::AppState;
use crate::secure_storage::SecureStorage;
use serde::Deserialize;
use std::path::Path;
use std::sync::Arc;
use tauri::{AppHandle, Manager, State};

/// Secure-storage namespace for per-agent API keys (keyed by agent id).
pub const AGENT_KEY_SERVICE: &str = "agent_keys";

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

fn load_agent_api_key(app: &AppHandle, agent_id: &str) -> Result<Option<String>, String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let storage = SecureStorage::with_base_dir(AGENT_KEY_SERVICE.to_string(), app_data_dir);
    storage.get(agent_id).map_err(|e| e.to_string())
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

    let api_key = match load_agent_api_key(&app, &agent.id)? {
        Some(k) if !k.is_empty() => Some(k),
        _ => {
            return Err(format!(
                "no API key set for agent '{}' — add one in Settings → Agents",
                agent.alias
            ))
        }
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
    let agent_clone = agent.clone();
    let api_key_owned = api_key.map(|s| s.to_string());
    let pool_clone = state.db_pool.clone();
    let app_clone = app.clone();
    tauri::async_runtime::spawn(async move {
        if let Err(e) = manager_clone
            .start(
                &session_clone,
                &agent_clone,
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

    let api_key = load_agent_api_key(&app, &agent.id)?;

    manager
        .start(
            &session,
            &agent,
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
    let api_key = load_agent_api_key(&app, &agent.id)?;
    manager
        .start(
            &session,
            &agent,
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
pub async fn set_agent_api_key(
    agent_id: String,
    api_key: String,
    app: AppHandle,
) -> Result<(), String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let storage = SecureStorage::with_base_dir(AGENT_KEY_SERVICE.to_string(), app_data_dir);
    if api_key.is_empty() {
        storage.delete(&agent_id).map_err(|e| e.to_string())
    } else {
        storage.set(&agent_id, &api_key).map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub async fn has_agent_api_key(agent_id: String, app: AppHandle) -> Result<bool, String> {
    Ok(load_agent_api_key(&app, &agent_id)?.is_some())
}

