use serde::{Deserialize, Serialize};
use sqlx::FromRow;

/// 数据库中的会话元数据格式（snake_case）
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct DbSessionMetadata {
    pub id: String,
    pub contact_id: String,
    pub visited_at: i64,
    pub created_at: i64,
    pub updated_at: i64,
    pub message_count: i64,
    pub first_message: Option<String>,
    pub last_message: Option<String>,
    pub last_message_timestamp: Option<i64>,
    pub favorite: Option<i64>,
}

/// 应用层的会话元数据格式（camelCase）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionMetadata {
    pub id: String,
    #[serde(rename = "contactId")]
    pub contact_id: String,
    #[serde(rename = "visitedAt")]
    pub visited_at: i64,
    #[serde(rename = "createdAt")]
    pub created_at: i64,
    #[serde(rename = "updatedAt")]
    pub updated_at: i64,
    #[serde(rename = "messageCount")]
    pub message_count: i64,
    #[serde(rename = "firstMessage")]
    pub first_message: Option<String>,
    #[serde(rename = "lastMessage")]
    pub last_message: Option<String>,
    #[serde(rename = "lastMessageTimestamp")]
    pub last_message_timestamp: Option<i64>,
    pub favorite: bool,
}

impl From<DbSessionMetadata> for SessionMetadata {
    fn from(db_session: DbSessionMetadata) -> Self {
        SessionMetadata {
            id: db_session.id,
            contact_id: db_session.contact_id,
            visited_at: db_session.visited_at,
            created_at: db_session.created_at,
            updated_at: db_session.updated_at,
            message_count: db_session.message_count,
            first_message: extract_message_preview(db_session.first_message.as_deref()),
            last_message: extract_message_preview(db_session.last_message.as_deref()).or_else(
                || {
                    if db_session.message_count == 0 {
                        Some("Ready to chat".to_string())
                    } else {
                        None
                    }
                },
            ),
            last_message_timestamp: db_session.last_message_timestamp,
            favorite: db_session.favorite.unwrap_or(0) != 0,
        }
    }
}

/// 提取消息预览文本
fn extract_message_preview(raw: Option<&str>) -> Option<String> {
    let raw = raw?;
    let value = raw.trim();

    if value.is_empty() {
        return None;
    }

    // 尝试解析 JSON
    let Ok(parsed) = serde_json::from_str::<serde_json::Value>(value) else {
        return Some(value.to_string());
    };

    match parsed {
        serde_json::Value::Array(items) => {
            let find_text_by_type = |target: &str| -> Option<String> {
                items.iter().find_map(|item| {
                    let obj = item.as_object()?;
                    if obj.get("type").and_then(|t| t.as_str()) != Some(target) {
                        return None;
                    }

                    let field = match target {
                        "content" => "content",
                        "context" => "context",
                        "reasoning" => "reasoning",
                        _ => return None,
                    };

                    obj.get(field)
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string())
                })
            };

            if let Some(content) = find_text_by_type("content") {
                return Some(content);
            }
            if let Some(context) = find_text_by_type("context") {
                return Some(context);
            }
            if let Some(reasoning) = find_text_by_type("reasoning") {
                return Some(reasoning);
            }

            for item in &items {
                if let Some(obj) = item.as_object() {
                    for key in ["text", "content", "message", "name"] {
                        if let Some(value) = obj.get(key).and_then(|v| v.as_str()) {
                            if !value.trim().is_empty() {
                                return Some(value.to_string());
                            }
                        }
                    }
                } else if let Some(text) = item.as_str() {
                    if !text.trim().is_empty() {
                        return Some(text.to_string());
                    }
                }
            }

            items.first().map(|first| first.to_string())
        }
        serde_json::Value::Object(obj) => {
            if let Some(type_str) = obj.get("type").and_then(|t| t.as_str()) {
                match type_str {
                    "error" => {
                        if let Some(message) = obj.get("message").and_then(|m| m.as_str()) {
                            return Some(message.to_string());
                        }
                    }
                    "content" => {
                        if let Some(content) = obj.get("content").and_then(|c| c.as_str()) {
                            return Some(content.to_string());
                        }
                    }
                    "context" => {
                        if let Some(context) = obj.get("context").and_then(|c| c.as_str()) {
                            return Some(context.to_string());
                        }
                    }
                    "reasoning" => {
                        if let Some(reasoning) = obj.get("reasoning").and_then(|r| r.as_str()) {
                            return Some(reasoning.to_string());
                        }
                    }
                    _ => {}
                }
            }

            for key in ["text", "content", "message"] {
                if let Some(value) = obj.get(key).and_then(|v| v.as_str()) {
                    if !value.trim().is_empty() {
                        return Some(value.to_string());
                    }
                }
            }

            Some(value.to_string())
        }
        _ => Some(value.to_string()),
    }
}
