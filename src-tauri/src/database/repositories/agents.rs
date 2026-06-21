use crate::database::models::{Agent, DbAgent};
use crate::error::{AppError, AppResult};
use sqlx::SqlitePool;

const SELECT_COLS: &str =
    "id, alias, description, avatar, provider_id, config, created_at, updated_at";

pub struct AgentRepository {
    pool: SqlitePool,
}

impl AgentRepository {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn list(&self) -> AppResult<Vec<Agent>> {
        let sql = format!("SELECT {SELECT_COLS} FROM agents ORDER BY created_at DESC");
        let rows = sqlx::query_as::<_, DbAgent>(&sql)
            .fetch_all(&self.pool)
            .await?;
        Ok(rows.into_iter().map(Agent::from).collect())
    }

    pub async fn get(&self, id: &str) -> AppResult<Option<Agent>> {
        let sql = format!("SELECT {SELECT_COLS} FROM agents WHERE id = ?");
        let row = sqlx::query_as::<_, DbAgent>(&sql)
            .bind(id)
            .fetch_optional(&self.pool)
            .await?;
        Ok(row.map(Agent::from))
    }

    pub async fn create(&self, agent: Agent) -> AppResult<Agent> {
        sqlx::query(
            r#"
            INSERT INTO agents (id, alias, description, avatar, provider_id, config, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&agent.id)
        .bind(&agent.alias)
        .bind(agent.description.as_deref())
        .bind(agent.avatar.as_deref())
        .bind(&agent.provider_id)
        .bind(agent.config.to_json())
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
            SET alias = ?, description = ?, avatar = ?, config = ?, updated_at = ?
            WHERE id = ?
            "#,
        )
        .bind(&agent.alias)
        .bind(agent.description.as_deref())
        .bind(agent.avatar.as_deref())
        .bind(agent.config.to_json())
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
