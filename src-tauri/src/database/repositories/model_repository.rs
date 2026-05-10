use crate::database::models::model::{DbModel, Model};
use crate::error::{AppError, AppResult};
use sqlx::SqlitePool;
use std::time::{SystemTime, UNIX_EPOCH};

pub struct ModelRepository {
    pool: SqlitePool,
}

impl ModelRepository {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    fn now() -> i64 {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis() as i64
    }

    /// Get models by provider (sorted by last_updated DESC, newest first)
    pub async fn get_by_provider(&self, provider: &str) -> AppResult<Vec<Model>> {
        let db_models = sqlx::query_as::<_, DbModel>(
            "SELECT * FROM models WHERE provider = ? ORDER BY last_updated DESC, id",
        )
        .bind(provider)
        .fetch_all(&self.pool)
        .await?;

        db_models
            .into_iter()
            .map(|db_model| db_model.to_model().map_err(AppError::Serialization))
            .collect()
    }

    /// Get model by id and provider
    pub async fn get_by_id(&self, id: &str, provider: &str) -> AppResult<Option<Model>> {
        let result =
            sqlx::query_as::<_, DbModel>("SELECT * FROM models WHERE id = ? AND provider = ?")
                .bind(id)
                .bind(provider)
                .fetch_optional(&self.pool)
                .await?;

        match result {
            Some(db_model) => Ok(Some(db_model.to_model().map_err(AppError::Serialization)?)),
            None => Ok(None),
        }
    }

    /// Create a new model
    pub async fn create(&self, model: Model, provider: &str) -> AppResult<Model> {
        let now = Self::now();
        let db_model = model
            .clone()
            .to_db_model(provider, now)
            .map_err(AppError::Serialization)?;

        sqlx::query(
            r#"
            INSERT INTO models (
                id, provider, name, attachment, reasoning, tool_call, temperature,
                knowledge, release_date, last_updated, modalities_input, modalities_output,
                open_weights, cost_input, cost_output, limit_context, limit_output,
                config_schema, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&db_model.id)
        .bind(&db_model.provider)
        .bind(&db_model.name)
        .bind(db_model.attachment)
        .bind(db_model.reasoning)
        .bind(db_model.tool_call)
        .bind(db_model.temperature)
        .bind(&db_model.knowledge)
        .bind(&db_model.release_date)
        .bind(&db_model.last_updated)
        .bind(&db_model.modalities_input)
        .bind(&db_model.modalities_output)
        .bind(db_model.open_weights)
        .bind(db_model.cost_input)
        .bind(db_model.cost_output)
        .bind(db_model.limit_context)
        .bind(db_model.limit_output)
        .bind(&db_model.config_schema)
        .bind(db_model.created_at)
        .bind(db_model.updated_at)
        .execute(&self.pool)
        .await?;

        Ok(model)
    }

    /// Update an existing model
    pub async fn update(&self, model: Model, provider: &str) -> AppResult<Model> {
        let now = Self::now();
        let db_model = model
            .clone()
            .to_db_model(provider, now)
            .map_err(AppError::Serialization)?;

        sqlx::query(
            r#"
            UPDATE models
            SET name = ?, attachment = ?, reasoning = ?, tool_call = ?, temperature = ?,
                knowledge = ?, release_date = ?, last_updated = ?,
                modalities_input = ?, modalities_output = ?, open_weights = ?,
                cost_input = ?, cost_output = ?, limit_context = ?, limit_output = ?,
                config_schema = ?, updated_at = ?
            WHERE id = ? AND provider = ?
            "#,
        )
        .bind(&db_model.name)
        .bind(db_model.attachment)
        .bind(db_model.reasoning)
        .bind(db_model.tool_call)
        .bind(db_model.temperature)
        .bind(&db_model.knowledge)
        .bind(&db_model.release_date)
        .bind(&db_model.last_updated)
        .bind(&db_model.modalities_input)
        .bind(&db_model.modalities_output)
        .bind(db_model.open_weights)
        .bind(db_model.cost_input)
        .bind(db_model.cost_output)
        .bind(db_model.limit_context)
        .bind(db_model.limit_output)
        .bind(&db_model.config_schema)
        .bind(db_model.updated_at)
        .bind(&db_model.id)
        .bind(&db_model.provider)
        .execute(&self.pool)
        .await?;

        Ok(model)
    }

    /// Upsert model (insert or update)
    /// Uses (provider, id) as the unique key
    pub async fn upsert(&self, model: Model, provider: &str) -> AppResult<()> {
        let existing = self.get_by_id(&model.id, provider).await?;

        match existing {
            None => {
                self.create(model, provider).await?;
            }
            Some(_) => {
                self.update(model, provider).await?;
            }
        }

        Ok(())
    }

    /// Delete model by id and provider
    pub async fn delete(&self, id: &str, provider: &str) -> AppResult<()> {
        sqlx::query("DELETE FROM models WHERE id = ? AND provider = ?")
            .bind(id)
            .bind(provider)
            .execute(&self.pool)
            .await?;
        Ok(())
    }
}
