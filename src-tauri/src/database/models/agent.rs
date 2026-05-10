use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, FromRow)]
pub struct DbAgent {
    pub id: String,
    pub alias: String,
    pub description: Option<String>,
    pub avatar: Option<String>,
    pub provider_id: String,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Agent {
    pub id: String,
    pub alias: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub avatar: Option<String>,
    pub provider_id: String,
    pub created_at: i64,
    pub updated_at: i64,
}

impl From<DbAgent> for Agent {
    fn from(db: DbAgent) -> Self {
        Agent {
            id: db.id,
            alias: db.alias,
            description: db.description,
            avatar: db.avatar,
            provider_id: db.provider_id,
            created_at: db.created_at,
            updated_at: db.updated_at,
        }
    }
}
