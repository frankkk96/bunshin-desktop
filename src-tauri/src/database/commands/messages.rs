use crate::database::models::Message;
use crate::database::repositories::MessageRepository;
use tauri::State;

pub struct AppState {
    pub db_pool: sqlx::SqlitePool,
}

#[tauri::command]
pub async fn get_messages_by_session(
    session_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<Message>, String> {
    let repo = MessageRepository::new(state.db_pool.clone());
    repo.list_by_session(&session_id)
        .await
        .map_err(|e| e.to_string())
}
