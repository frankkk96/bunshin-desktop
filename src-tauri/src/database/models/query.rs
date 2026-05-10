use serde::{Deserialize, Serialize};
use sqlx::FromRow;

/// 数据库中的查询格式（snake_case）
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct DbQuery {
    pub id: String,
    pub session_id: String,
    pub query_id: i64,
    pub agents: String, // JSON array
    pub text: String,
    pub medias: String, // JSON array
    pub status: String, // QueryStatus: pending | running | cancelled | failed | succeeded
    pub timestamp: i64,
    pub metadata: Option<String>, // JSON object
}

/// 应用层的查询格式（camelCase）
/// 匹配 TypeScript 的 Query 类型
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Query {
    pub id: String,
    #[serde(rename = "sessionId")]
    pub session_id: String,
    #[serde(rename = "queryId")]
    pub query_id: i64,
    #[serde(rename = "type", default = "default_query_type")]
    pub message_type: String,
    pub agents: Vec<String>,
    pub text: String,
    pub medias: Vec<serde_json::Value>,
    pub status: String, // QueryStatus: pending | running | cancelled | failed | succeeded
    pub timestamp: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<serde_json::Value>,
}

fn default_query_type() -> String {
    "query".to_string()
}

impl From<DbQuery> for Query {
    fn from(db_query: DbQuery) -> Self {
        let agents: Vec<String> = serde_json::from_str(&db_query.agents).unwrap_or_else(|_| vec![]);
        let medias: Vec<serde_json::Value> =
            serde_json::from_str(&db_query.medias).unwrap_or_else(|_| vec![]);
        let metadata: Option<serde_json::Value> = db_query
            .metadata
            .and_then(|m| serde_json::from_str(&m).ok());

        Query {
            id: db_query.id,
            session_id: db_query.session_id,
            query_id: db_query.query_id,
            message_type: "query".to_string(),
            agents,
            text: db_query.text,
            medias,
            status: db_query.status,
            timestamp: db_query.timestamp,
            metadata,
        }
    }
}

impl From<Query> for DbQuery {
    fn from(query: Query) -> Self {
        DbQuery {
            id: query.id,
            session_id: query.session_id,
            query_id: query.query_id,
            agents: serde_json::to_string(&query.agents).unwrap_or_else(|_| "[]".to_string()),
            text: query.text,
            medias: serde_json::to_string(&query.medias).unwrap_or_else(|_| "[]".to_string()),
            status: query.status,
            timestamp: query.timestamp,
            metadata: query.metadata.map(|m| serde_json::to_string(&m).unwrap_or_default()),
        }
    }
}
