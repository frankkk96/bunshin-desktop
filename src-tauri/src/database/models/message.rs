use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, FromRow)]
pub struct DbMessage {
    pub id: String,
    pub session_id: String,
    pub seq: i64,
    pub kind: String,
    pub payload: String,
    pub timestamp: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Message {
    pub id: String,
    pub session_id: String,
    pub seq: i64,
    /// Discriminator for the payload shape. Mirrors the stream-json `type` field
    /// for assistant/user/system/result events, plus `local_user` for messages we
    /// send into the subprocess and `process_exit` synthesised on child exit.
    pub kind: String,
    pub payload: serde_json::Value,
    pub timestamp: i64,
}

impl From<DbMessage> for Message {
    fn from(db: DbMessage) -> Self {
        let payload = serde_json::from_str(&db.payload).unwrap_or(serde_json::Value::Null);
        Message {
            id: db.id,
            session_id: db.session_id,
            seq: db.seq,
            kind: db.kind,
            payload,
            timestamp: db.timestamp,
        }
    }
}
