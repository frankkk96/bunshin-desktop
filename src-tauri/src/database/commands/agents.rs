use crate::database::models::Agent;
use crate::database::repositories::{AgentRepository, ProviderRepository};
use crate::database::AppState;
use serde::Deserialize;
use tauri::State;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateAgentInput {
    pub alias: String,
    pub description: Option<String>,
    pub avatar: Option<String>,
    pub provider_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateAgentInput {
    pub id: String,
    pub alias: String,
    pub description: Option<String>,
    pub avatar: Option<String>,
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
) -> Result<Agent, String> {
    let provider_repo = ProviderRepository::new(state.db_pool.clone());
    if provider_repo
        .get(&input.provider_id)
        .await
        .map_err(|e| e.to_string())?
        .is_none()
    {
        return Err(format!("provider {} not found", input.provider_id));
    }

    let now = chrono::Utc::now().timestamp_millis();
    let agent = Agent {
        id: uuid::Uuid::new_v4().to_string(),
        alias: input.alias,
        description: input.description,
        avatar: input.avatar,
        provider_id: input.provider_id,
        created_at: now,
        updated_at: now,
    };
    let repo = AgentRepository::new(state.db_pool.clone());
    repo.create(agent).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_agent(
    input: UpdateAgentInput,
    state: State<'_, AppState>,
) -> Result<Agent, String> {
    let repo = AgentRepository::new(state.db_pool.clone());
    let existing = repo
        .get(&input.id)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("agent {} not found", input.id))?;
    let now = chrono::Utc::now().timestamp_millis();
    let agent = Agent {
        id: existing.id,
        alias: input.alias,
        description: input.description,
        avatar: input.avatar,
        provider_id: existing.provider_id,
        created_at: existing.created_at,
        updated_at: now,
    };
    repo.update(agent).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_agent(id: String, state: State<'_, AppState>) -> Result<(), String> {
    let repo = AgentRepository::new(state.db_pool.clone());
    repo.delete(&id).await.map_err(|e| e.to_string())
}
