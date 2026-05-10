use crate::claude_agent::manager::{ClaudeSessionManager, RunningSessionInfo};
use crate::database::models::{PermissionMode, ProviderType, Session};
use crate::database::repositories::{AgentRepository, ProviderRepository, SessionRepository};
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
    };

    let session_repo = SessionRepository::new(state.db_pool.clone());
    let session = session_repo
        .create(session)
        .await
        .map_err(|e| e.to_string())?;

    manager
        .start(
            &session,
            &provider,
            api_key.as_deref(),
            false,
            state.db_pool.clone(),
            app.clone(),
        )
        .await
        .map_err(|e| e.to_string())?;

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
