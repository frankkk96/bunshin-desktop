use crate::database::models::Group;
use crate::database::repositories::GroupRepository;
use crate::database::AppState;
use tauri::State;

#[tauri::command]
pub async fn get_all_groups(state: State<'_, AppState>) -> Result<Vec<Group>, String> {
    let repository = GroupRepository::new(state.db_pool.clone());
    repository.get_all_groups().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_group_by_id(
    group_id: String,
    state: State<'_, AppState>,
) -> Result<Option<Group>, String> {
    let repository = GroupRepository::new(state.db_pool.clone());
    repository
        .get_group_by_id(&group_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_group(group: Group, state: State<'_, AppState>) -> Result<Group, String> {
    let repository = GroupRepository::new(state.db_pool.clone());
    repository
        .create_group(group)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_group(group: Group, state: State<'_, AppState>) -> Result<Group, String> {
    let repository = GroupRepository::new(state.db_pool.clone());
    repository
        .update_group(group)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_group_by_id(
    group_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let repository = GroupRepository::new(state.db_pool.clone());
    repository
        .delete_group_by_id(&group_id)
        .await
        .map_err(|e| e.to_string())
}
