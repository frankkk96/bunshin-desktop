use crate::database::models::agent::{Agent, DbAgent};
use crate::database::models::group::{DbGroup, Group};
use crate::error::{AppError, AppResult};
use sqlx::SqlitePool;

pub struct GroupRepository {
    pool: SqlitePool,
}

impl GroupRepository {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    /// Get all groups
    pub async fn get_all_groups(&self) -> AppResult<Vec<Group>> {
        // 先查询所有agents
        let db_agents = sqlx::query_as::<_, DbAgent>("SELECT * FROM custom_agents")
            .fetch_all(&self.pool)
            .await?;

        let all_agents: Vec<Agent> = db_agents
            .into_iter()
            .filter_map(|db_agent| db_agent.to_agent().ok())
            .collect();

        // 查询所有groups
        let db_groups =
            sqlx::query_as::<_, DbGroup>("SELECT * FROM groups ORDER BY created_at DESC")
                .fetch_all(&self.pool)
                .await?;

        // 转换时传入all_agents
        db_groups
            .into_iter()
            .map(|db_group| {
                db_group
                    .to_group(&all_agents)
                    .map_err(|e| AppError::Serialization(e))
            })
            .collect()
    }

    /// Get group by ID
    pub async fn get_group_by_id(&self, group_id: &str) -> AppResult<Option<Group>> {
        // 先查询所有agents
        let db_agents = sqlx::query_as::<_, DbAgent>("SELECT * FROM custom_agents")
            .fetch_all(&self.pool)
            .await?;

        let all_agents: Vec<Agent> = db_agents
            .into_iter()
            .filter_map(|db_agent| db_agent.to_agent().ok())
            .collect();

        let result = sqlx::query_as::<_, DbGroup>("SELECT * FROM groups WHERE id = ?")
            .bind(group_id)
            .fetch_optional(&self.pool)
            .await?;

        match result {
            Some(db_group) => Ok(Some(
                db_group
                    .to_group(&all_agents)
                    .map_err(|e| AppError::Serialization(e))?,
            )),
            None => Ok(None),
        }
    }

    /// Create a new group
    pub async fn create_group(&self, group: Group) -> AppResult<Group> {
        let db_group = group
            .clone()
            .to_db_group()
            .map_err(|e| AppError::Serialization(e))?;

        sqlx::query(
            r#"
            INSERT INTO groups (
                id, alias, description, agents, pinned, config, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&db_group.id)
        .bind(&db_group.alias)
        .bind(&db_group.description)
        .bind(&db_group.agents)
        .bind(db_group.pinned)
        .bind(&db_group.config)
        .bind(db_group.created_at)
        .bind(db_group.updated_at)
        .execute(&self.pool)
        .await?;

        Ok(group)
    }

    /// Update an existing group
    pub async fn update_group(&self, group: Group) -> AppResult<Group> {
        let db_group = group
            .clone()
            .to_db_group()
            .map_err(|e| AppError::Serialization(e))?;

        sqlx::query(
            r#"
            UPDATE groups
            SET alias = ?, description = ?, agents = ?, pinned = ?, config = ?, updated_at = ?
            WHERE id = ?
            "#,
        )
        .bind(&db_group.alias)
        .bind(&db_group.description)
        .bind(&db_group.agents)
        .bind(db_group.pinned)
        .bind(&db_group.config)
        .bind(db_group.updated_at)
        .bind(&db_group.id)
        .execute(&self.pool)
        .await?;

        Ok(group)
    }

    /// Remove agent from group
    pub async fn remove_agent_from_group(&self, group_id: &str, agent_id: &str) -> AppResult<()> {
        let group = self
            .get_group_by_id(group_id)
            .await?
            .ok_or_else(|| AppError::NotFound(format!("Group not found: {}", group_id)))?;

        // 从Agent对象中提取ID，过滤掉要删除的agent
        let agent_ids: Vec<String> = group
            .agents
            .into_iter()
            .map(|a| a.id)
            .filter(|id| id != agent_id)
            .collect();

        let agents_json =
            serde_json::to_string(&agent_ids).map_err(|e| AppError::Serialization(e))?;
        let now = chrono::Utc::now().timestamp_millis();

        sqlx::query("UPDATE groups SET agents = ?, updated_at = ? WHERE id = ?")
            .bind(agents_json)
            .bind(now)
            .bind(group_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    /// Get all groups containing an agent
    pub async fn get_groups_containing_agent(&self, agent_id: &str) -> AppResult<Vec<Group>> {
        let groups = self.get_all_groups().await?;

        Ok(groups
            .into_iter()
            .filter(|group| group.agents.iter().any(|a| a.id == agent_id))
            .collect())
    }

    /// Delete group by ID
    pub async fn delete_group_by_id(&self, group_id: &str) -> AppResult<()> {
        sqlx::query("DELETE FROM groups WHERE id = ?")
            .bind(group_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }
}
