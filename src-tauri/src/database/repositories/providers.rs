use crate::database::models::{DbProvider, Provider, ProviderType};
use crate::error::{AppError, AppResult};
use sqlx::SqlitePool;

pub struct ProviderRepository {
    pool: SqlitePool,
}

impl ProviderRepository {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn list(&self) -> AppResult<Vec<Provider>> {
        let rows =
            sqlx::query_as::<_, DbProvider>("SELECT * FROM providers ORDER BY created_at DESC")
                .fetch_all(&self.pool)
                .await?;
        Ok(rows.into_iter().map(Provider::from).collect())
    }

    pub async fn get(&self, id: &str) -> AppResult<Option<Provider>> {
        let row = sqlx::query_as::<_, DbProvider>("SELECT * FROM providers WHERE id = ?")
            .bind(id)
            .fetch_optional(&self.pool)
            .await?;
        Ok(row.map(Provider::from))
    }

    pub async fn create(&self, provider: Provider) -> AppResult<Provider> {
        if matches!(provider.type_, ProviderType::Api) && provider.base_url.is_none() {
            return Err(AppError::InvalidInput(
                "API providers require a base_url".to_string(),
            ));
        }
        sqlx::query(
            r#"
            INSERT INTO providers (id, name, type, base_url, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&provider.id)
        .bind(&provider.name)
        .bind(provider.type_.as_str())
        .bind(provider.base_url.as_deref())
        .bind(provider.created_at)
        .bind(provider.updated_at)
        .execute(&self.pool)
        .await?;
        Ok(provider)
    }

    pub async fn update(&self, provider: Provider) -> AppResult<Provider> {
        // Provider type is immutable to keep agent/session semantics stable.
        let existing = self
            .get(&provider.id)
            .await?
            .ok_or_else(|| AppError::NotFound(format!("provider {}", provider.id)))?;
        if existing.type_ != provider.type_ {
            return Err(AppError::InvalidInput(
                "provider type cannot be changed".to_string(),
            ));
        }
        sqlx::query(
            r#"
            UPDATE providers SET name = ?, base_url = ?, updated_at = ?
            WHERE id = ?
            "#,
        )
        .bind(&provider.name)
        .bind(provider.base_url.as_deref())
        .bind(provider.updated_at)
        .bind(&provider.id)
        .execute(&self.pool)
        .await?;
        Ok(provider)
    }

    pub async fn delete(&self, id: &str) -> AppResult<()> {
        // Refuse if any agent still references this provider — surfaces a clear error
        // instead of an opaque foreign-key failure.
        let count: (i64,) =
            sqlx::query_as("SELECT COUNT(*) FROM agents WHERE provider_id = ?")
                .bind(id)
                .fetch_one(&self.pool)
                .await?;
        if count.0 > 0 {
            return Err(AppError::InvalidInput(format!(
                "{} agent(s) still use this provider",
                count.0
            )));
        }
        sqlx::query("DELETE FROM providers WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }
}
