use crate::database::commands::message_commands::AppState;
use crate::database::models::SessionMetadata;
use crate::database::repositories::SessionRepository;
use tauri::State;

/// 获取所有会话
#[tauri::command]
pub async fn get_all_sessions(state: State<'_, AppState>) -> Result<Vec<SessionMetadata>, String> {
    let repository = SessionRepository::new(state.db_pool.clone());

    repository
        .get_all_sessions()
        .await
        .map_err(|e| e.to_string())
}

/// 按 ID 获取单个会话
#[tauri::command]
pub async fn get_session_by_id(
    session_id: String,
    state: State<'_, AppState>,
) -> Result<Option<SessionMetadata>, String> {
    let repository = SessionRepository::new(state.db_pool.clone());

    repository
        .get_session_by_id(&session_id)
        .await
        .map_err(|e| e.to_string())
}

/// 创建新会话
#[tauri::command]
pub async fn create_session(
    session_id: String,
    contact_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let repository = SessionRepository::new(state.db_pool.clone());

    repository
        .create_session(&session_id, &contact_id)
        .await
        .map_err(|e| e.to_string())
}

/// 更新会话收藏状态
#[tauri::command]
pub async fn update_session_favorite(
    session_id: String,
    favorite: bool,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let repository = SessionRepository::new(state.db_pool.clone());

    repository
        .update_session_favorite(&session_id, favorite)
        .await
        .map_err(|e| e.to_string())
}

/// 更新会话访问时间
#[tauri::command]
pub async fn update_session_visited(
    session_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let repository = SessionRepository::new(state.db_pool.clone());

    repository
        .update_session_visited(&session_id)
        .await
        .map_err(|e| e.to_string())
}
