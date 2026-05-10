use serde::{de::Error as DeError, Deserialize, Deserializer, Serialize};
use sqlx::FromRow;

// Database format (snake_case)
#[derive(Debug, Clone, FromRow)]
pub struct DbAgent {
    pub id: String,
    pub alias: String,
    pub description: Option<String>,
    pub pinned: i64,
    pub provider: String,
    pub model: String,
    pub prompts: String,       // JSON string
    pub extensions: String,    // JSON string
    pub extra_configs: String, // JSON string
    pub created_at: i64,
    pub updated_at: i64,
}

// Application format (camelCase) - matches TypeScript Agent type
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Agent {
    pub id: String,
    pub alias: String,
    pub description: String,
    pub pinned: bool,
    pub llm: LLMConfig,
    pub prompt: PromptConfig,
    pub extension: ExtensionConfig,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LLMConfig {
    pub provider_id: String,
    pub model_id: String,
    #[serde(default)]
    pub custom_configs: Vec<CustomConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct CustomConfig {
    pub identifier: String,
    pub configs: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct PromptConfig {
    /// System prompt content
    #[serde(default)]
    pub system_prompt: String,
    /// Shortcut prompts (aligns with frontend `Prompt` type)
    #[serde(default)]
    pub shortcuts: Vec<Prompt>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct Prompt {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub key: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub queries: Vec<QueryItem>,
    #[serde(default)]
    pub created_at: i64,
    #[serde(default)]
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct QueryItem {
    #[serde(default)]
    pub agents: Vec<String>,
    #[serde(default)]
    pub text: String,
    #[serde(default)]
    pub image: Option<QueryMedia>,
    #[serde(default)]
    pub video: Option<QueryMedia>,
    #[serde(default)]
    pub audio: Option<QueryMedia>,
    #[serde(default)]
    pub pdf: Option<QueryMedia>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct QueryMedia {
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ExtensionConfig {
    /// Full MCP server builder configs from the UI
    #[serde(default, deserialize_with = "deserialize_mcp_servers")]
    pub mcp_servers: Vec<McpServerBuilderConfig>,
    #[serde(default)]
    pub skip_permission: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct McpServerBuilderConfig {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub avatar: Option<String>,
    /// Config type: custom | builtin | remote
    #[serde(rename = "type")]
    pub config_type: String,
    /// Config payload differs per type (stdio/http/builtin/remote)
    #[serde(default)]
    pub config: serde_json::Value,
    #[serde(default)]
    pub enabled: bool,
}

/// Accept both legacy string IDs and new builder configs
fn deserialize_mcp_servers<'de, D>(deserializer: D) -> Result<Vec<McpServerBuilderConfig>, D::Error>
where
    D: Deserializer<'de>,
{
    let value = Option::<serde_json::Value>::deserialize(deserializer)?;
    let Some(value) = value else {
        return Ok(Vec::new());
    };

    if let Some(arr) = value.as_array() {
        // Legacy format: array of server IDs (strings)
        if arr.iter().all(|v| v.is_string()) {
            return Ok(arr
                .iter()
                .filter_map(|v| v.as_str())
                .map(|id| McpServerBuilderConfig {
                    id: id.to_string(),
                    name: id.to_string(),
                    description: None,
                    avatar: None,
                    config_type: "remote".to_string(),
                    config: serde_json::Value::Null,
                    enabled: true,
                })
                .collect());
        }
    }

    serde_json::from_value(value).map_err(DeError::custom)
}

// Conversion from DbAgent to Agent
impl DbAgent {
    pub fn to_agent(self) -> Result<Agent, serde_json::Error> {
        let prompt: PromptConfig = serde_json::from_str(&self.prompts)?;
        let extension: ExtensionConfig = serde_json::from_str(&self.extensions)?;
        let custom_configs: Vec<CustomConfig> =
            serde_json::from_str(&self.extra_configs).unwrap_or_default();

        Ok(Agent {
            id: self.id,
            alias: self.alias,
            description: self.description.unwrap_or_default(),
            pinned: self.pinned != 0,
            llm: LLMConfig {
                provider_id: self.provider,
                model_id: self.model,
                custom_configs,
            },
            prompt,
            extension,
            created_at: self.created_at,
            updated_at: self.updated_at,
        })
    }
}

// Conversion from Agent to DbAgent
impl Agent {
    pub fn to_db_agent(self) -> Result<DbAgent, serde_json::Error> {
        let prompts = serde_json::to_string(&self.prompt)?;
        let extensions = serde_json::to_string(&self.extension)?;
        let extra_configs = serde_json::to_string(&self.llm.custom_configs)?;

        Ok(DbAgent {
            id: self.id,
            alias: self.alias,
            description: if self.description.is_empty() {
                None
            } else {
                Some(self.description)
            },
            pinned: if self.pinned { 1 } else { 0 },
            provider: self.llm.provider_id,
            model: self.llm.model_id,
            prompts,
            extensions,
            extra_configs,
            created_at: self.created_at,
            updated_at: self.updated_at,
        })
    }
}
