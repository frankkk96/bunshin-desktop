use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ProviderType {
    /// Reuses the locally-installed `claude` CLI's existing OAuth login.
    Subscription,
    /// Claude-compatible HTTP API (Anthropic-compatible endpoint + key).
    Api,
}

impl ProviderType {
    pub fn as_str(&self) -> &'static str {
        match self {
            ProviderType::Subscription => "subscription",
            ProviderType::Api => "api",
        }
    }

    pub fn parse(s: &str) -> Option<Self> {
        match s {
            "subscription" => Some(Self::Subscription),
            "api" => Some(Self::Api),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, FromRow)]
pub struct DbProvider {
    pub id: String,
    pub name: String,
    #[sqlx(rename = "type")]
    pub type_: String,
    pub base_url: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Provider {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub type_: ProviderType,
    pub base_url: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

impl From<DbProvider> for Provider {
    fn from(db: DbProvider) -> Self {
        let type_ = ProviderType::parse(&db.type_).unwrap_or(ProviderType::Subscription);
        Provider {
            id: db.id,
            name: db.name,
            type_,
            base_url: db.base_url,
            created_at: db.created_at,
            updated_at: db.updated_at,
        }
    }
}
