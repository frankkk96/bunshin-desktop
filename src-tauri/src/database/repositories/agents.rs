use crate::database::models::{Agent, DbAgent};
use crate::error::{AppError, AppResult};
use sqlx::SqlitePool;

pub struct AgentRepository {
    pool: SqlitePool,
}

impl AgentRepository {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn list(&self) -> AppResult<Vec<Agent>> {
        let rows = sqlx::query_as::<_, DbAgent>(
            "SELECT * FROM agents ORDER BY pinned DESC, created_at DESC",
        )
        .fetch_all(&self.pool)
        .await?;
        Ok(rows.into_iter().map(Agent::from).collect())
    }

    pub async fn get(&self, id: &str) -> AppResult<Option<Agent>> {
        let row = sqlx::query_as::<_, DbAgent>("SELECT * FROM agents WHERE id = ?")
            .bind(id)
            .fetch_optional(&self.pool)
            .await?;
        Ok(row.map(Agent::from))
    }

    pub async fn create(&self, agent: Agent) -> AppResult<Agent> {
        sqlx::query(
            r#"
            INSERT INTO agents (id, alias, description, avatar, pinned, provider_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&agent.id)
        .bind(&agent.alias)
        .bind(agent.description.as_deref())
        .bind(agent.avatar.as_deref())
        .bind(if agent.pinned { 1i64 } else { 0i64 })
        .bind(&agent.provider_id)
        .bind(agent.created_at)
        .bind(agent.updated_at)
        .execute(&self.pool)
        .await?;
        Ok(agent)
    }

    /// Update an agent. Provider is intentionally immutable: callers are expected to
    /// pass the original `provider_id`; if it differs from what's stored we reject.
    pub async fn update(&self, agent: Agent) -> AppResult<Agent> {
        let existing = self
            .get(&agent.id)
            .await?
            .ok_or_else(|| AppError::NotFound(format!("agent {}", agent.id)))?;
        if existing.provider_id != agent.provider_id {
            return Err(AppError::InvalidInput(
                "agent provider cannot be changed after creation".to_string(),
            ));
        }
        sqlx::query(
            r#"
            UPDATE agents
            SET alias = ?, description = ?, avatar = ?, pinned = ?, updated_at = ?
            WHERE id = ?
            "#,
        )
        .bind(&agent.alias)
        .bind(agent.description.as_deref())
        .bind(agent.avatar.as_deref())
        .bind(if agent.pinned { 1i64 } else { 0i64 })
        .bind(agent.updated_at)
        .bind(&agent.id)
        .execute(&self.pool)
        .await?;
        Ok(agent)
    }

    pub async fn delete(&self, id: &str) -> AppResult<()> {
        let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM sessions WHERE agent_id = ?")
            .bind(id)
            .fetch_one(&self.pool)
            .await?;
        if count.0 > 0 {
            return Err(AppError::InvalidInput(format!(
                "{} session(s) still belong to this agent",
                count.0
            )));
        }
        sqlx::query("DELETE FROM agents WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }
}
