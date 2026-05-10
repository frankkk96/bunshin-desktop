use crate::database::models::Agent;
use crate::database::repositories::{AgentRepository, GroupRepository};
use crate::database::AppState;
use tauri::State;

#[tauri::command]
pub async fn get_all_agents(state: State<'_, AppState>) -> Result<Vec<Agent>, String> {
    let repository = AgentRepository::new(state.db_pool.clone());
    repository.get_all_agents().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_agent_by_id(
    agent_id: String,
    state: State<'_, AppState>,
) -> Result<Option<Agent>, String> {
    let repository = AgentRepository::new(state.db_pool.clone());
    repository
        .get_agent_by_id(&agent_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_agent(agent: Agent, state: State<'_, AppState>) -> Result<Agent, String> {
    let repository = AgentRepository::new(state.db_pool.clone());
    repository
        .create_agent(agent)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_agent(agent: Agent, state: State<'_, AppState>) -> Result<Agent, String> {
    let repository = AgentRepository::new(state.db_pool.clone());
    repository
        .update_agent(agent)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_agent_by_id(
    agent_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let agent_repository = AgentRepository::new(state.db_pool.clone());
    let group_repository = GroupRepository::new(state.db_pool.clone());

    // Get all groups containing this agent
    let groups_with_agent = group_repository
        .get_groups_containing_agent(&agent_id)
        .await
        .map_err(|e| e.to_string())?;

    // Remove agent from each group, delete group if it becomes empty
    for group in groups_with_agent {
        if group.agents.len() == 1 {
            // This is the last member, delete the group
            group_repository
                .delete_group_by_id(&group.id)
                .await
                .map_err(|e| e.to_string())?;
        } else {
            // Remove agent from group
            group_repository
                .remove_agent_from_group(&group.id, &agent_id)
                .await
                .map_err(|e| e.to_string())?;
        }
    }

    // Delete the agent
    agent_repository
        .delete_agent_by_id(&agent_id)
        .await
        .map_err(|e| e.to_string())
}
