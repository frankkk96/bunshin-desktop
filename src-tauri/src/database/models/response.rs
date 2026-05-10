use serde::{Deserialize, Serialize};
use sqlx::FromRow;

/// 数据库中的响应格式（snake_case）
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct DbResponse {
    pub id: String,
    pub session_id: String,
    pub query_id: i64,
    pub agent_id: String,
    pub round: i64,
    pub status: String, // TaskStatus: pending | running | cancelled | failed | succeeded
    #[serde(rename = "type")]
    #[sqlx(rename = "type")]
    pub data_type: String, // 保留用于兼容旧数据，新数据设为 "array"
    pub data: String,   // JSON string - 现在存储 DataItem[] 数组
    pub error: Option<String>, // JSON string - ErrorItem
    pub timestamp: i64,
    pub metadata: Option<String>, // JSON object
}

/// 应用层的响应格式（camelCase）
/// 匹配 TypeScript 的 Response 类型
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Response {
    pub id: String,
    #[serde(rename = "sessionId")]
    pub session_id: String,
    #[serde(rename = "queryId")]
    pub query_id: i64,
    #[serde(rename = "type", default = "default_response_type")]
    pub message_type: String,
    #[serde(rename = "agentId")]
    pub agent_id: String,
    pub round: i64,
    pub status: String, // TaskStatus: pending | running | cancelled | failed | succeeded
    pub data: serde_json::Value, // DataItem[] 数组
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<serde_json::Value>, // ErrorItem
    pub timestamp: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<serde_json::Value>,
}

fn default_response_type() -> String {
    "response".to_string()
}

impl From<DbResponse> for Response {
    fn from(db_response: DbResponse) -> Self {
        // 解析 data 字段
        let data: serde_json::Value = if db_response.data_type == "array" {
            // 新格式：直接是 DataItem[] 数组
            serde_json::from_str(&db_response.data).unwrap_or(serde_json::json!([]))
        } else {
            // 旧格式兼容：将单个对象转换为数组
            let mut item: serde_json::Value =
                serde_json::from_str(&db_response.data).unwrap_or(serde_json::json!({}));

            // 确保 item 中有 type 字段
            if let Some(obj) = item.as_object_mut() {
                obj.insert(
                    "type".to_string(),
                    serde_json::Value::String(db_response.data_type.clone()),
                );
            }

            // 转换旧的 text 类型为新的格式
            if db_response.data_type == "text" {
                let mut items = Vec::new();
                if let Some(obj) = item.as_object() {
                    if let Some(reasoning) = obj.get("reasoning").and_then(|v| v.as_str()) {
                        if !reasoning.is_empty() {
                            items.push(serde_json::json!({
                                "type": "reasoning",
                                "reasoning": reasoning
                            }));
                        }
                    }
                    if let Some(context) = obj.get("context").and_then(|v| v.as_str()) {
                        if !context.is_empty() {
                            items.push(serde_json::json!({
                                "type": "context",
                                "context": context
                            }));
                        }
                    }
                    if let Some(content) = obj.get("content").and_then(|v| v.as_str()) {
                        if !content.is_empty() {
                            items.push(serde_json::json!({
                                "type": "content",
                                "content": content
                            }));
                        }
                    }
                }
                serde_json::json!(items)
            } else {
                // 其他类型直接包装为数组
                serde_json::json!([item])
            }
        };

        // 解析 error 字段
        let error = db_response
            .error
            .and_then(|e| serde_json::from_str(&e).ok());

        let metadata: Option<serde_json::Value> = db_response
            .metadata
            .and_then(|m| serde_json::from_str(&m).ok());

        Response {
            id: db_response.id,
            session_id: db_response.session_id,
            query_id: db_response.query_id,
            message_type: "response".to_string(),
            agent_id: db_response.agent_id,
            round: db_response.round,
            status: db_response.status,
            data,
            error,
            timestamp: db_response.timestamp,
            metadata,
        }
    }
}

impl From<Response> for DbResponse {
    fn from(response: Response) -> Self {
        // data 现在是数组，直接序列化
        let data_type = "array".to_string();

        // 序列化 error
        let error = response
            .error
            .map(|e| serde_json::to_string(&e).unwrap_or_default());

        // 序列化 metadata
        let metadata = response
            .metadata
            .map(|m| serde_json::to_string(&m).unwrap_or_default());

        DbResponse {
            id: response.id,
            session_id: response.session_id,
            query_id: response.query_id,
            agent_id: response.agent_id,
            round: response.round,
            status: response.status,
            data_type,
            data: serde_json::to_string(&response.data).unwrap_or_default(),
            error,
            timestamp: response.timestamp,
            metadata,
        }
    }
}
