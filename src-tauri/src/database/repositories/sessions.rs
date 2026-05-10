use crate::database::models::{DbSession, Session};
use crate::error::AppResult;
use sqlx::SqlitePool;

const SELECT_COLS: &str = "id, agent_id, name, cwd, permission_mode, favorite, created_at, \
                           updated_at, visited_at, claude_session_id";

pub struct SessionRepository {
    pool: SqlitePool,
}

impl SessionRepository {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn list(&self) -> AppResult<Vec<Session>> {
        let sql = format!(
            "SELECT {SELECT_COLS} FROM sessions ORDER BY favorite DESC, visited_at DESC"
        );
        let rows = sqlx::query_as::<_, DbSession>(&sql)
            .fetch_all(&self.pool)
            .await?;
        Ok(rows.into_iter().map(Session::from).collect())
    }

    pub async fn get(&self, id: &str) -> AppResult<Option<Session>> {
        let sql = format!("SELECT {SELECT_COLS} FROM sessions WHERE id = ?");
        let row = sqlx::query_as::<_, DbSession>(&sql)
            .bind(id)
            .fetch_optional(&self.pool)
            .await?;
        Ok(row.map(Session::from))
    }

    /// Find an existing session for the same (agent, cwd) pair so the start flow
    /// can short-circuit with the "session already exists" UX.
    pub async fn find_by_agent_and_cwd(
        &self,
        agent_id: &str,
        cwd: &str,
    ) -> AppResult<Option<Session>> {
        let sql = format!(
            "SELECT {SELECT_COLS} FROM sessions WHERE agent_id = ? AND cwd = ? LIMIT 1"
        );
        let row = sqlx::query_as::<_, DbSession>(&sql)
            .bind(agent_id)
            .bind(cwd)
            .fetch_optional(&self.pool)
            .await?;
        Ok(row.map(Session::from))
    }

    pub async fn create(&self, session: Session) -> AppResult<Session> {
        sqlx::query(
            r#"
            INSERT INTO sessions
              (id, agent_id, name, cwd, permission_mode, favorite,
               created_at, updated_at, visited_at, claude_session_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&session.id)
        .bind(&session.agent_id)
        .bind(session.name.as_deref())
        .bind(&session.cwd)
        .bind(session.permission_mode.as_cli_flag())
        .bind(if session.favorite { 1i64 } else { 0i64 })
        .bind(session.created_at)
        .bind(session.updated_at)
        .bind(session.visited_at)
        .bind(&session.claude_session_id)
        .execute(&self.pool)
        .await?;
        Ok(session)
    }

    pub async fn delete(&self, id: &str) -> AppResult<()> {
        // messages cascade via FK ON DELETE CASCADE.
        sqlx::query("DELETE FROM sessions WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn update_favorite(&self, id: &str, favorite: bool) -> AppResult<()> {
        let now = chrono::Utc::now().timestamp_millis();
        sqlx::query("UPDATE sessions SET favorite = ?, updated_at = ? WHERE id = ?")
            .bind(if favorite { 1i64 } else { 0i64 })
            .bind(now)
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn update_visited(&self, id: &str) -> AppResult<()> {
        let now = chrono::Utc::now().timestamp_millis();
        sqlx::query("UPDATE sessions SET visited_at = ?, updated_at = ? WHERE id = ?")
            .bind(now)
            .bind(now)
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn rename(&self, id: &str, name: Option<String>) -> AppResult<()> {
        let now = chrono::Utc::now().timestamp_millis();
        sqlx::query("UPDATE sessions SET name = ?, updated_at = ? WHERE id = ?")
            .bind(name.as_deref())
            .bind(now)
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    /// Rotate the underlying claude session UUID. Used by the Clear action so
    /// the next subprocess starts with a truly empty conversation.
    pub async fn rotate_claude_session_id(&self, id: &str, new_uuid: &str) -> AppResult<()> {
        let now = chrono::Utc::now().timestamp_millis();
        sqlx::query(
            "UPDATE sessions SET claude_session_id = ?, updated_at = ? WHERE id = ?",
        )
        .bind(new_uuid)
        .bind(now)
        .bind(id)
        .execute(&self.pool)
        .await?;
        Ok(())
    }
}
