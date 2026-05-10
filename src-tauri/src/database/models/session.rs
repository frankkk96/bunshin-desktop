use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum PermissionMode {
    #[serde(rename = "default")]
    Default,
    #[serde(rename = "acceptEdits")]
    AcceptEdits,
    #[serde(rename = "plan")]
    Plan,
    #[serde(rename = "bypassPermissions")]
    BypassPermissions,
    #[serde(rename = "dontAsk")]
    DontAsk,
}

impl PermissionMode {
    pub fn as_cli_flag(&self) -> &'static str {
        match self {
            PermissionMode::Default => "default",
            PermissionMode::AcceptEdits => "acceptEdits",
            PermissionMode::Plan => "plan",
            PermissionMode::BypassPermissions => "bypassPermissions",
            PermissionMode::DontAsk => "dontAsk",
        }
    }

    pub fn parse(s: &str) -> Option<Self> {
        match s {
            "default" => Some(Self::Default),
            "acceptEdits" => Some(Self::AcceptEdits),
            "plan" => Some(Self::Plan),
            "bypassPermissions" => Some(Self::BypassPermissions),
            "dontAsk" => Some(Self::DontAsk),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, FromRow)]
pub struct DbSession {
    pub id: String,
    pub agent_id: String,
    pub name: Option<String>,
    pub cwd: String,
    pub permission_mode: String,
    pub favorite: i64,
    pub created_at: i64,
    pub updated_at: i64,
    pub visited_at: i64,
    /// The UUID we hand to `claude --session-id` / `--resume`. Distinct from
    /// `id` so /clear can rotate it without changing Bunshin's session row.
    pub claude_session_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Session {
    pub id: String,
    pub agent_id: String,
    #[serde(default)]
    pub name: Option<String>,
    pub cwd: String,
    pub permission_mode: PermissionMode,
    #[serde(default)]
    pub favorite: bool,
    pub created_at: i64,
    pub updated_at: i64,
    pub visited_at: i64,
    pub claude_session_id: String,
}

impl From<DbSession> for Session {
    fn from(db: DbSession) -> Self {
        let mode = PermissionMode::parse(&db.permission_mode).unwrap_or(PermissionMode::Default);
        Session {
            id: db.id,
            agent_id: db.agent_id,
            name: db.name,
            cwd: db.cwd,
            permission_mode: mode,
            favorite: db.favorite != 0,
            created_at: db.created_at,
            updated_at: db.updated_at,
            visited_at: db.visited_at,
            claude_session_id: db.claude_session_id,
        }
    }
}
