use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, FromRow)]
pub struct DbSession {
    pub id: String,
    pub agent_id: String,
    pub name: Option<String>,
    pub favorite: i64,
    pub created_at: i64,
    pub updated_at: i64,
    pub visited_at: i64,
    /// The UUID we hand to `claude --session-id` / `--resume`. Distinct from
    /// `id` so /clear can rotate it without changing Bunshin's session row.
    pub claude_session_id: String,
}

/// A session is one conversation under an agent. The working directory and
/// permission mode are inherited from the agent.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Session {
    pub id: String,
    pub agent_id: String,
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub favorite: bool,
    pub created_at: i64,
    pub updated_at: i64,
    pub visited_at: i64,
    pub claude_session_id: String,
}

impl From<DbSession> for Session {
    fn from(db: DbSession) -> Self {
        Session {
            id: db.id,
            agent_id: db.agent_id,
            name: db.name,
            favorite: db.favorite != 0,
            created_at: db.created_at,
            updated_at: db.updated_at,
            visited_at: db.visited_at,
            claude_session_id: db.claude_session_id,
        }
    }
}
