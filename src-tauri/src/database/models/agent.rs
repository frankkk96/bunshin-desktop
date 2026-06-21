use serde::{Deserialize, Serialize};
use sqlx::FromRow;

/// How an agent authenticates to Claude. Each agent owns its own auth — there is
/// no shared "provider" entity anymore.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ProviderType {
    /// Reuses an isolated `claude` CLI OAuth login (per-agent CLAUDE_CONFIG_DIR).
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

/// A single environment variable injected into the claude subprocess via the
/// merged settings.json `env` block.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnvVar {
    pub key: String,
    pub value: String,
}

/// All the Claude Code knobs we expose per agent. Every field is optional so an
/// empty `{}` round-trips to "use claude defaults". Persisted as a JSON string
/// in `agents.config`; translated into CLI flags + a merged `--settings` JSON at
/// spawn time (see `claude_agent::process`).
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentConfig {
    /// `--model` (alias like "opus"/"sonnet" or a full model id). None = default.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,
    /// `--effort` (low | medium | high | xhigh | max).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub effort: Option<String>,
    /// `--fallback-model` (comma-separated list accepted by the CLI).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub fallback_model: Option<String>,
    /// `--append-system-prompt`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub append_system_prompt: Option<String>,
    /// Built-in tool names to disable (passed to `--disallowedTools`).
    #[serde(default)]
    pub disabled_tools: Vec<String>,
    /// settings.json `includeCoAuthoredBy`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub include_co_authored_by: Option<bool>,
    /// settings.json `permissions.allow` rules.
    #[serde(default)]
    pub permission_allow: Vec<String>,
    /// settings.json `permissions.deny` rules.
    #[serde(default)]
    pub permission_deny: Vec<String>,
    /// settings.json `permissions.ask` rules.
    #[serde(default)]
    pub permission_ask: Vec<String>,
    /// Environment variables injected via settings.json `env`.
    #[serde(default)]
    pub env: Vec<EnvVar>,
    /// Raw `{ "mcpServers": { ... } }` JSON passed to `--mcp-config`. Empty = none.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub mcp_config: Option<String>,
    /// Raw settings.json fragment merged last into `--settings` (escape hatch for
    /// any key we don't surface with a dedicated control).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub extra_settings: Option<String>,
}

impl AgentConfig {
    /// Parse the persisted JSON string; an unparseable/empty value falls back to
    /// defaults so a bad row never bricks the agent.
    pub fn from_json(raw: &str) -> Self {
        if raw.trim().is_empty() {
            return Self::default();
        }
        serde_json::from_str(raw).unwrap_or_default()
    }

    pub fn to_json(&self) -> String {
        serde_json::to_string(self).unwrap_or_else(|_| "{}".to_string())
    }
}

#[derive(Debug, Clone, FromRow)]
pub struct DbAgent {
    pub id: String,
    pub alias: String,
    pub description: Option<String>,
    pub avatar: Option<String>,
    pub provider_type: String,
    pub base_url: Option<String>,
    pub config: String,
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
    /// Auth type, locked after creation.
    pub provider_type: ProviderType,
    /// Custom base URL (API agents only).
    #[serde(default)]
    pub base_url: Option<String>,
    #[serde(default)]
    pub config: AgentConfig,
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
            provider_type: ProviderType::parse(&db.provider_type)
                .unwrap_or(ProviderType::Subscription),
            base_url: db.base_url,
            config: AgentConfig::from_json(&db.config),
            created_at: db.created_at,
            updated_at: db.updated_at,
        }
    }
}
