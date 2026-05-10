use crate::database::models::{Query, Response, SessionMetadata};
use crate::database::repositories::MessageRepository;
use serde::{Deserialize, Serialize};
use tauri::State;

/// Tauri 应用状态
pub struct AppState {
    pub db_pool: sqlx::SqlitePool,
}

// ==================== Query Commands ====================

/// 插入或更新 Query
#[tauri::command]
pub async fn upsert_query(query: Query, state: State<'_, AppState>) -> Result<(), String> {
    let repository = MessageRepository::new(state.db_pool.clone());
    repository
        .upsert_query(query)
        .await
        .map_err(|e| e.to_string())
}

/// 获取指定 session 的所有 queries
#[tauri::command]
pub async fn get_queries_by_session(
    session_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<Query>, String> {
    let repository = MessageRepository::new(state.db_pool.clone());
    repository
        .get_queries_by_session(&session_id)
        .await
        .map_err(|e| e.to_string())
}

/// 根据 ID 获取 Query
#[tauri::command]
pub async fn get_query_by_id(
    id: String,
    state: State<'_, AppState>,
) -> Result<Option<Query>, String> {
    let repository = MessageRepository::new(state.db_pool.clone());
    repository
        .get_query_by_id(&id)
        .await
        .map_err(|e| e.to_string())
}

/// 删除 Query
#[tauri::command]
pub async fn delete_query(id: String, state: State<'_, AppState>) -> Result<(), String> {
    let repository = MessageRepository::new(state.db_pool.clone());
    repository
        .delete_query(&id)
        .await
        .map_err(|e| e.to_string())
}

// ==================== Response Commands ====================

/// 插入或更新 Response
#[tauri::command]
pub async fn upsert_response(response: Response, state: State<'_, AppState>) -> Result<(), String> {
    let repository = MessageRepository::new(state.db_pool.clone());
    repository
        .upsert_response(response)
        .await
        .map_err(|e| e.to_string())
}

/// 获取指定 session 的所有 responses
#[tauri::command]
pub async fn get_responses_by_session(
    session_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<Response>, String> {
    let repository = MessageRepository::new(state.db_pool.clone());
    repository
        .get_responses_by_session(&session_id)
        .await
        .map_err(|e| e.to_string())
}

/// 根据 query_id 获取 responses
#[tauri::command]
pub async fn get_responses_by_query(
    session_id: String,
    query_id: i64,
    state: State<'_, AppState>,
) -> Result<Vec<Response>, String> {
    let repository = MessageRepository::new(state.db_pool.clone());
    repository
        .get_responses_by_query(&session_id, query_id)
        .await
        .map_err(|e| e.to_string())
}

/// 根据 ID 获取 Response
#[tauri::command]
pub async fn get_response_by_id(
    id: String,
    state: State<'_, AppState>,
) -> Result<Option<Response>, String> {
    let repository = MessageRepository::new(state.db_pool.clone());
    repository
        .get_response_by_id(&id)
        .await
        .map_err(|e| e.to_string())
}

/// 删除 Response
#[tauri::command]
pub async fn delete_response(id: String, state: State<'_, AppState>) -> Result<(), String> {
    let repository = MessageRepository::new(state.db_pool.clone());
    repository
        .delete_response(&id)
        .await
        .map_err(|e| e.to_string())
}

// ==================== Cleanup Commands ====================

/// 按 Session ID 删除所有消息
#[tauri::command]
pub async fn delete_messages_by_session_id(
    session_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let repository = MessageRepository::new(state.db_pool.clone());
    repository
        .delete_messages_by_session_id(&session_id)
        .await
        .map_err(|e| e.to_string())
}

/// 删除所有消息
#[tauri::command]
pub async fn delete_all_messages(state: State<'_, AppState>) -> Result<(), String> {
    let repository = MessageRepository::new(state.db_pool.clone());
    repository
        .delete_all_messages()
        .await
        .map_err(|e| e.to_string())
}

/// 删除消息（Query 及其关联的 Responses）
#[tauri::command]
pub async fn delete_message(id: String, state: State<'_, AppState>) -> Result<(), String> {
    let repository = MessageRepository::new(state.db_pool.clone());
    repository
        .delete_message(&id)
        .await
        .map_err(|e| e.to_string())
}

// ==================== Search Commands ====================

use crate::database::repositories::message_repository::SearchedMessage;

/// 消息搜索结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessageSearchResult {
    pub message: serde_json::Value,
    pub session: Option<SessionMetadata>,
}

/// 搜索消息
#[tauri::command]
pub async fn search_messages(
    query: String,
    contact_id: Option<String>,
    state: State<'_, AppState>,
) -> Result<Vec<MessageSearchResult>, String> {
    let repository = MessageRepository::new(state.db_pool.clone());
    let results = repository
        .search_messages(&query, contact_id.as_deref())
        .await
        .map_err(|e| e.to_string())?;

    Ok(results
        .into_iter()
        .map(|(message, session)| {
            let message_value = match message {
                SearchedMessage::Query(q) => serde_json::to_value(q).unwrap_or_default(),
                SearchedMessage::Response(r) => serde_json::to_value(r).unwrap_or_default(),
            };
            MessageSearchResult {
                message: message_value,
                session,
            }
        })
        .collect())
}
