use crate::database::models::{DbMessage, Message};
use crate::error::AppResult;
use sqlx::SqlitePool;

pub struct MessageRepository {
    pool: SqlitePool,
}

impl MessageRepository {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn list_by_session(&self, session_id: &str) -> AppResult<Vec<Message>> {
        let rows = sqlx::query_as::<_, DbMessage>(
            "SELECT * FROM messages WHERE session_id = ? ORDER BY seq ASC",
        )
        .bind(session_id)
        .fetch_all(&self.pool)
        .await?;
        Ok(rows.into_iter().map(Message::from).collect())
    }

    pub async fn next_seq(&self, session_id: &str) -> AppResult<i64> {
        let row: (Option<i64>,) =
            sqlx::query_as("SELECT MAX(seq) FROM messages WHERE session_id = ?")
                .bind(session_id)
                .fetch_one(&self.pool)
                .await?;
        Ok(row.0.unwrap_or(0) + 1)
    }

    pub async fn delete_by_session(&self, session_id: &str) -> AppResult<()> {
        sqlx::query("DELETE FROM messages WHERE session_id = ?")
            .bind(session_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn append(
        &self,
        session_id: &str,
        kind: &str,
        payload: &serde_json::Value,
    ) -> AppResult<Message> {
        let seq = self.next_seq(session_id).await?;
        let id = uuid::Uuid::new_v4().to_string();
        let timestamp = chrono::Utc::now().timestamp_millis();
        let payload_str = serde_json::to_string(payload)?;
        sqlx::query(
            r#"
            INSERT INTO messages (id, session_id, seq, kind, payload, timestamp)
            VALUES (?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&id)
        .bind(session_id)
        .bind(seq)
        .bind(kind)
        .bind(&payload_str)
        .bind(timestamp)
        .execute(&self.pool)
        .await?;
        Ok(Message {
            id,
            session_id: session_id.to_string(),
            seq,
            kind: kind.to_string(),
            payload: payload.clone(),
            timestamp,
        })
    }
}
