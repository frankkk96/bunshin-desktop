use crate::database::models::agent::{Agent, DbAgent};
use crate::error::{AppError, AppResult};
use sqlx::SqlitePool;

pub struct AgentRepository {
    pool: SqlitePool,
}

impl AgentRepository {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    /// Get all agents
    pub async fn get_all_agents(&self) -> AppResult<Vec<Agent>> {
        let db_agents =
            sqlx::query_as::<_, DbAgent>("SELECT * FROM custom_agents ORDER BY created_at DESC")
                .fetch_all(&self.pool)
                .await?;

        db_agents
            .into_iter()
            .map(|db_agent| db_agent.to_agent().map_err(|e| AppError::Serialization(e)))
            .collect()
    }

    /// Get agent by ID
    pub async fn get_agent_by_id(&self, agent_id: &str) -> AppResult<Option<Agent>> {
        let result = sqlx::query_as::<_, DbAgent>("SELECT * FROM custom_agents WHERE id = ?")
            .bind(agent_id)
            .fetch_optional(&self.pool)
            .await?;

        match result {
            Some(db_agent) => Ok(Some(
                db_agent
                    .to_agent()
                    .map_err(|e| AppError::Serialization(e))?,
            )),
            None => Ok(None),
        }
    }

    /// Create a new agent
    pub async fn create_agent(&self, agent: Agent) -> AppResult<Agent> {
        let db_agent = agent
            .clone()
            .to_db_agent()
            .map_err(|e| AppError::Serialization(e))?;

        sqlx::query(
            r#"
            INSERT INTO custom_agents (
                id, alias, description, pinned, provider, model,
                prompts, extensions, extra_configs, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&db_agent.id)
        .bind(&db_agent.alias)
        .bind(&db_agent.description)
        .bind(db_agent.pinned)
        .bind(&db_agent.provider)
        .bind(&db_agent.model)
        .bind(&db_agent.prompts)
        .bind(&db_agent.extensions)
        .bind(&db_agent.extra_configs)
        .bind(db_agent.created_at)
        .bind(db_agent.updated_at)
        .execute(&self.pool)
        .await?;

        Ok(agent)
    }

    /// Update an existing agent
    pub async fn update_agent(&self, agent: Agent) -> AppResult<Agent> {
        let db_agent = agent
            .clone()
            .to_db_agent()
            .map_err(|e| AppError::Serialization(e))?;

        sqlx::query(
            r#"
            UPDATE custom_agents
            SET alias = ?, description = ?, pinned = ?, provider = ?,
                model = ?, prompts = ?, extensions = ?, extra_configs = ?, updated_at = ?
            WHERE id = ?
            "#,
        )
        .bind(&db_agent.alias)
        .bind(&db_agent.description)
        .bind(db_agent.pinned)
        .bind(&db_agent.provider)
        .bind(&db_agent.model)
        .bind(&db_agent.prompts)
        .bind(&db_agent.extensions)
        .bind(&db_agent.extra_configs)
        .bind(db_agent.updated_at)
        .bind(&db_agent.id)
        .execute(&self.pool)
        .await?;

        Ok(agent)
    }

    /// Delete agent by ID
    pub async fn delete_agent_by_id(&self, agent_id: &str) -> AppResult<()> {
        sqlx::query("DELETE FROM custom_agents WHERE id = ?")
            .bind(agent_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }
}
