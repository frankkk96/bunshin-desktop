use crate::claude_agent::commands::AGENT_KEY_SERVICE;
use crate::claude_agent::process::agent_profile_dir;
use crate::database::models::{Agent, AgentConfig, PermissionMode};
use crate::database::repositories::AgentRepository;
use crate::database::AppState;
use crate::secure_storage::SecureStorage;
use serde::Deserialize;
use std::path::Path;
use tauri::{AppHandle, Manager, State};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateAgentInput {
    pub alias: String,
    pub description: Option<String>,
    pub avatar: Option<String>,
    pub base_url: Option<String>,
    /// Working directory for the agent's conversations.
    pub cwd: String,
    #[serde(default = "default_permission_mode")]
    pub permission_mode: PermissionMode,
    /// Anthropic-compatible API key — stored encrypted, keyed by the new agent id.
    pub api_key: Option<String>,
    #[serde(default)]
    pub config: Option<AgentConfig>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateAgentInput {
    pub id: String,
    pub alias: String,
    pub description: Option<String>,
    pub avatar: Option<String>,
    pub base_url: Option<String>,
    pub cwd: String,
    pub permission_mode: PermissionMode,
    /// Empty/None leaves the stored key untouched; a value replaces it.
    pub api_key: Option<String>,
    #[serde(default)]
    pub config: Option<AgentConfig>,
}

fn default_permission_mode() -> PermissionMode {
    PermissionMode::Default
}

fn key_storage(app: &AppHandle) -> Result<SecureStorage, String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    Ok(SecureStorage::with_base_dir(
        AGENT_KEY_SERVICE.to_string(),
        app_data_dir,
    ))
}

fn copy_dir_all(src: &Path, dst: &Path) -> std::io::Result<()> {
    std::fs::create_dir_all(dst)?;
    for entry in std::fs::read_dir(src)? {
        let entry = entry?;
        let path = entry.path();
        let target = dst.join(entry.file_name());
        if path.is_dir() {
            copy_dir_all(&path, &target)?;
        } else {
            std::fs::copy(&path, &target)?;
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn list_agents(state: State<'_, AppState>) -> Result<Vec<Agent>, String> {
    let repo = AgentRepository::new(state.db_pool.clone());
    repo.list().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_agent(id: String, state: State<'_, AppState>) -> Result<Option<Agent>, String> {
    let repo = AgentRepository::new(state.db_pool.clone());
    repo.get(&id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_agent(
    input: CreateAgentInput,
    state: State<'_, AppState>,
    app: AppHandle,
) -> Result<Agent, String> {
    if !Path::new(&input.cwd).is_dir() {
        return Err(format!("working directory does not exist: {}", input.cwd));
    }

    let now = chrono::Utc::now().timestamp_millis();
    let agent = Agent {
        id: uuid::Uuid::new_v4().to_string(),
        alias: input.alias,
        description: input.description,
        avatar: input.avatar,
        base_url: input.base_url,
        cwd: input.cwd,
        permission_mode: input.permission_mode,
        config: input.config.unwrap_or_default(),
        created_at: now,
        updated_at: now,
    };

    // Stash the API key (if any) before persisting the row.
    if let Some(key) = input.api_key.filter(|k| !k.is_empty()) {
        key_storage(&app)?
            .set(&agent.id, &key)
            .map_err(|e| e.to_string())?;
    }

    let repo = AgentRepository::new(state.db_pool.clone());
    repo.create(agent).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_agent(
    input: UpdateAgentInput,
    state: State<'_, AppState>,
    app: AppHandle,
) -> Result<Agent, String> {
    let repo = AgentRepository::new(state.db_pool.clone());
    let existing = repo
        .get(&input.id)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("agent {} not found", input.id))?;

    if let Some(key) = input.api_key.filter(|k| !k.is_empty()) {
        key_storage(&app)?
            .set(&existing.id, &key)
            .map_err(|e| e.to_string())?;
    }

    if !Path::new(&input.cwd).is_dir() {
        return Err(format!("working directory does not exist: {}", input.cwd));
    }

    let now = chrono::Utc::now().timestamp_millis();
    let agent = Agent {
        id: existing.id,
        alias: input.alias,
        description: input.description,
        avatar: input.avatar,
        base_url: input.base_url,
        cwd: input.cwd,
        permission_mode: input.permission_mode,
        config: input.config.unwrap_or(existing.config),
        created_at: existing.created_at,
        updated_at: now,
    };
    repo.update(agent).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_agent(
    id: String,
    state: State<'_, AppState>,
    app: AppHandle,
) -> Result<(), String> {
    let repo = AgentRepository::new(state.db_pool.clone());
    repo.delete(&id).await.map_err(|e| e.to_string())?;

    // Best-effort side-channel cleanup once the row is gone.
    if let Ok(storage) = key_storage(&app) {
        let _ = storage.delete(&id);
    }
    if let Ok(dir) = agent_profile_dir(&app, &id) {
        if dir.exists() {
            let _ = std::fs::remove_dir_all(&dir);
        }
    }
    Ok(())
}

/// Clone an agent into a new one — config and base URL are copied, along with the
/// encrypted API key, so the copy works out of the box.
#[tauri::command]
pub async fn duplicate_agent(
    id: String,
    state: State<'_, AppState>,
    app: AppHandle,
) -> Result<Agent, String> {
    let repo = AgentRepository::new(state.db_pool.clone());
    let src = repo
        .get(&id)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("agent {} not found", id))?;

    let now = chrono::Utc::now().timestamp_millis();
    let new_id = uuid::Uuid::new_v4().to_string();
    let copy = Agent {
        id: new_id.clone(),
        alias: format!("{} copy", src.alias),
        description: src.description.clone(),
        avatar: src.avatar.clone(),
        base_url: src.base_url.clone(),
        cwd: src.cwd.clone(),
        permission_mode: src.permission_mode,
        config: src.config.clone(),
        created_at: now,
        updated_at: now,
    };

    // Carry over the encrypted API key and any isolated CLI state so the clone is
    // immediately usable.
    if let Ok(storage) = key_storage(&app) {
        if let Ok(Some(k)) = storage.get(&src.id) {
            let _ = storage.set(&new_id, &k);
        }
    }
    if let (Ok(src_dir), Ok(dst_dir)) =
        (agent_profile_dir(&app, &src.id), agent_profile_dir(&app, &new_id))
    {
        if src_dir.exists() {
            if let Err(e) = copy_dir_all(&src_dir, &dst_dir) {
                log::warn!("duplicate_agent: failed to copy profile dir: {e}");
            }
        }
    }

    repo.create(copy).await.map_err(|e| e.to_string())
}
