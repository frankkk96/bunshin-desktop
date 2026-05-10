//! Read-only session CRUD. Session creation is handled by `claude_agent::commands::start_session`
//! because it has to atomically write a row AND spawn a subprocess.

use crate::database::models::Session;
use crate::database::repositories::SessionRepository;
use crate::database::AppState;
use tauri::State;

#[tauri::command]
pub async fn list_sessions(state: State<'_, AppState>) -> Result<Vec<Session>, String> {
    let repo = SessionRepository::new(state.db_pool.clone());
    repo.list().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_session(
    id: String,
    state: State<'_, AppState>,
) -> Result<Option<Session>, String> {
    let repo = SessionRepository::new(state.db_pool.clone());
    repo.get(&id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_session(id: String, state: State<'_, AppState>) -> Result<(), String> {
    let repo = SessionRepository::new(state.db_pool.clone());
    repo.delete(&id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_session_favorite(
    id: String,
    favorite: bool,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let repo = SessionRepository::new(state.db_pool.clone());
    repo.update_favorite(&id, favorite)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_session_visited(
    id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let repo = SessionRepository::new(state.db_pool.clone());
    repo.update_visited(&id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn rename_session(
    id: String,
    name: Option<String>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let repo = SessionRepository::new(state.db_pool.clone());
    repo.rename(&id, name).await.map_err(|e| e.to_string())
}
