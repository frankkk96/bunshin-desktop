use crate::database::models::{DbSessionMetadata, SessionMetadata};
use crate::error::AppResult;
use sqlx::SqlitePool;

pub struct SessionRepository {
    pool: SqlitePool,
}

impl SessionRepository {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    /// 获取所有会话
    pub async fn get_all_sessions(&self) -> AppResult<Vec<SessionMetadata>> {
        let sessions = sqlx::query_as::<_, DbSessionMetadata>(
            "SELECT * FROM session_metadata_view ORDER BY updated_at DESC",
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(sessions.into_iter().map(SessionMetadata::from).collect())
    }

    /// 按 ID 获取单个会话
    pub async fn get_session_by_id(&self, session_id: &str) -> AppResult<Option<SessionMetadata>> {
        let session = sqlx::query_as::<_, DbSessionMetadata>(
            "SELECT * FROM session_metadata_view WHERE id = ?",
        )
        .bind(session_id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(session.map(SessionMetadata::from))
    }

    /// 创建新会话
    pub async fn create_session(&self, session_id: &str, contact_id: &str) -> AppResult<()> {
        let now = chrono::Utc::now().timestamp_millis();

        // 检查 session 是否已存在
        let existing: Option<(String,)> = sqlx::query_as("SELECT id FROM sessions WHERE id = ?")
            .bind(session_id)
            .fetch_optional(&self.pool)
            .await?;

        if existing.is_some() {
            return Ok(()); // 已存在，跳过创建
        }

        sqlx::query(
            "INSERT INTO sessions (id, contact_id, favorite, visited_at, created_at, updated_at)
             VALUES (?, ?, 0, ?, ?, ?)",
        )
        .bind(session_id)
        .bind(contact_id)
        .bind(now)
        .bind(now)
        .bind(now)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// 更新会话收藏状态
    pub async fn update_session_favorite(&self, session_id: &str, favorite: bool) -> AppResult<()> {
        let now = chrono::Utc::now().timestamp_millis();
        let favorite_value = if favorite { 1 } else { 0 };

        sqlx::query(
            "INSERT OR REPLACE INTO sessions (id, contact_id, favorite, visited_at, created_at, updated_at)
             VALUES (
               ?,
               COALESCE((SELECT contact_id FROM sessions WHERE id = ?), (SELECT DISTINCT contact_id FROM messages WHERE session_id = ? LIMIT 1)),
               ?,
               COALESCE((SELECT visited_at FROM sessions WHERE id = ?), NULL),
               COALESCE((SELECT created_at FROM sessions WHERE id = ?), ?),
               ?
             )",
        )
        .bind(session_id)
        .bind(session_id)
        .bind(session_id)
        .bind(favorite_value)
        .bind(session_id)
        .bind(session_id)
        .bind(now)
        .bind(now)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// 更新会话最近访问时间
    pub async fn update_session_visited(&self, session_id: &str) -> AppResult<()> {
        let now = chrono::Utc::now().timestamp_millis();

        let result = sqlx::query("UPDATE sessions SET visited_at = ?, updated_at = ? WHERE id = ?")
            .bind(now)
            .bind(now)
            .bind(session_id)
            .execute(&self.pool)
            .await?;

        // 如果会话不存在就静默返回，避免因缺少 contact_id 触发 NOT NULL 错误
        if result.rows_affected() == 0 {
            return Ok(());
        }

        Ok(())
    }
}
