use serde::{Deserialize, Serialize};
use sqlx::FromRow;

// Database format (snake_case)
#[derive(Debug, Clone, FromRow)]
pub struct DbModel {
    pub id: String,
    pub provider: String,
    pub name: String,
    pub attachment: i64,
    pub reasoning: i64,
    pub tool_call: i64,
    pub temperature: i64,
    pub knowledge: String,
    pub release_date: String,
    pub last_updated: String,
    pub modalities_input: String,  // JSON string: ["text", "image"]
    pub modalities_output: String, // JSON string: ["text"]
    pub open_weights: i64,
    pub cost_input: f64,
    pub cost_output: f64,
    pub limit_context: i64,
    pub limit_output: i64,
    pub config_schema: Option<String>, // JSON string
    pub created_at: i64,
    pub updated_at: i64,
}

// Nested types for Model
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Modalities {
    pub input: Vec<String>,
    pub output: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Cost {
    pub input: f64,
    pub output: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Limit {
    pub context: i64,
    pub output: i64,
}

// Application format (camelCase) - matches TypeScript Model type
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Model {
    pub id: String,
    pub name: String,
    pub attachment: bool,
    pub reasoning: bool,
    pub tool_call: bool,
    pub temperature: bool,
    pub knowledge: String,
    pub release_date: String,
    pub last_updated: String,
    pub modalities: Modalities,
    pub open_weights: bool,
    pub cost: Cost,
    pub limit: Limit,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub config_schema: Option<serde_json::Value>,
    // Runtime field (not from JSON config)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub provider: Option<String>,
}

// JSON format for importing from config files (all fields optional for partial updates)
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JsonModelConfig {
    pub id: String,
    pub name: Option<String>,
    pub attachment: Option<bool>,
    pub reasoning: Option<bool>,
    pub tool_call: Option<bool>,
    pub temperature: Option<bool>,
    pub knowledge: Option<String>,
    pub release_date: Option<String>,
    pub last_updated: Option<String>,
    pub modalities: Option<Modalities>,
    pub open_weights: Option<bool>,
    pub cost: Option<Cost>,
    pub limit: Option<Limit>,
    pub config_schema: Option<serde_json::Value>,
}

// Provider config format from JSON files
#[derive(Debug, Clone, Deserialize)]
pub struct ProviderConfig {
    pub id: String,
    pub name: String,
    pub models: Vec<JsonModelConfig>,
}

fn default_true() -> bool {
    true
}

fn default_modalities() -> Modalities {
    Modalities {
        input: vec!["text".to_string()],
        output: vec!["text".to_string()],
    }
}

// Conversion from DbModel to Model
impl DbModel {
    pub fn to_model(self) -> Result<Model, serde_json::Error> {
        let modalities_input: Vec<String> = serde_json::from_str(&self.modalities_input)?;
        let modalities_output: Vec<String> = serde_json::from_str(&self.modalities_output)?;

        let config_schema: Option<serde_json::Value> = self
            .config_schema
            .as_ref()
            .map(|s| serde_json::from_str(s))
            .transpose()?;

        Ok(Model {
            id: self.id,
            name: self.name,
            attachment: self.attachment != 0,
            reasoning: self.reasoning != 0,
            tool_call: self.tool_call != 0,
            temperature: self.temperature != 0,
            knowledge: self.knowledge,
            release_date: self.release_date,
            last_updated: self.last_updated,
            modalities: Modalities {
                input: modalities_input,
                output: modalities_output,
            },
            open_weights: self.open_weights != 0,
            cost: Cost {
                input: self.cost_input,
                output: self.cost_output,
            },
            limit: Limit {
                context: self.limit_context,
                output: self.limit_output,
            },
            config_schema,
            provider: Some(self.provider),
        })
    }
}

// Conversion from Model to DbModel
impl Model {
    pub fn to_db_model(self, provider: &str, now: i64) -> Result<DbModel, serde_json::Error> {
        let modalities_input = serde_json::to_string(&self.modalities.input)?;
        let modalities_output = serde_json::to_string(&self.modalities.output)?;

        let config_schema = self
            .config_schema
            .as_ref()
            .map(|v| serde_json::to_string(v))
            .transpose()?;

        Ok(DbModel {
            id: self.id,
            provider: provider.to_string(),
            name: self.name,
            attachment: if self.attachment { 1 } else { 0 },
            reasoning: if self.reasoning { 1 } else { 0 },
            tool_call: if self.tool_call { 1 } else { 0 },
            temperature: if self.temperature { 1 } else { 0 },
            knowledge: self.knowledge,
            release_date: self.release_date,
            last_updated: self.last_updated,
            modalities_input,
            modalities_output,
            open_weights: if self.open_weights { 1 } else { 0 },
            cost_input: self.cost.input,
            cost_output: self.cost.output,
            limit_context: self.limit.context,
            limit_output: self.limit.output,
            config_schema,
            created_at: now,
            updated_at: now,
        })
    }
}

// Conversion and merge for JsonModelConfig
impl JsonModelConfig {
    /// Create a new Model from JsonModelConfig (uses defaults for missing fields)
    pub fn to_model(self, provider: String) -> Model {
        Model {
            id: self.id,
            name: self.name.unwrap_or_default(),
            attachment: self.attachment.unwrap_or(false),
            reasoning: self.reasoning.unwrap_or(false),
            tool_call: self.tool_call.unwrap_or(true),
            temperature: self.temperature.unwrap_or(true),
            knowledge: self.knowledge.unwrap_or_default(),
            release_date: self.release_date.unwrap_or_default(),
            last_updated: self.last_updated.unwrap_or_default(),
            modalities: self.modalities.unwrap_or(Modalities {
                input: vec!["text".to_string()],
                output: vec!["text".to_string()],
            }),
            open_weights: self.open_weights.unwrap_or(false),
            cost: self.cost.unwrap_or(Cost { input: 0.0, output: 0.0 }),
            limit: self.limit.unwrap_or(Limit { context: 0, output: 0 }),
            config_schema: self.config_schema,
            provider: Some(provider),
        }
    }

    /// Merge JsonModelConfig into an existing Model (only updates non-None fields)
    pub fn merge_into(self, mut model: Model) -> Model {
        if let Some(name) = self.name {
            model.name = name;
        }
        if let Some(attachment) = self.attachment {
            model.attachment = attachment;
        }
        if let Some(reasoning) = self.reasoning {
            model.reasoning = reasoning;
        }
        if let Some(tool_call) = self.tool_call {
            model.tool_call = tool_call;
        }
        if let Some(temperature) = self.temperature {
            model.temperature = temperature;
        }
        if let Some(knowledge) = self.knowledge {
            model.knowledge = knowledge;
        }
        if let Some(release_date) = self.release_date {
            model.release_date = release_date;
        }
        if let Some(last_updated) = self.last_updated {
            model.last_updated = last_updated;
        }
        if let Some(modalities) = self.modalities {
            model.modalities = modalities;
        }
        if let Some(open_weights) = self.open_weights {
            model.open_weights = open_weights;
        }
        if let Some(cost) = self.cost {
            model.cost = cost;
        }
        if let Some(limit) = self.limit {
            model.limit = limit;
        }
        if self.config_schema.is_some() {
            model.config_schema = self.config_schema;
        }
        model
    }
}

// Remote API format from models.dev (snake_case)
#[derive(Debug, Clone, Deserialize)]
#[allow(dead_code)]
pub struct RemoteModelConfig {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub attachment: bool,
    #[serde(default)]
    pub reasoning: bool,
    #[serde(default = "default_true")]
    pub tool_call: bool,
    #[serde(default)]
    pub structured_output: Option<bool>,
    #[serde(default = "default_true")]
    pub temperature: bool,
    #[serde(default)]
    pub knowledge: String,
    #[serde(default)]
    pub release_date: String,
    #[serde(default)]
    pub last_updated: String,
    #[serde(default = "default_modalities")]
    pub modalities: Modalities,
    #[serde(default)]
    pub open_weights: bool,
    #[serde(default)]
    pub cost: Option<RemoteCost>,
    #[serde(default)]
    pub limit: Option<RemoteLimit>,
    #[serde(default)]
    pub status: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[allow(dead_code)]
pub struct RemoteCost {
    #[serde(default)]
    pub input: f64,
    #[serde(default)]
    pub output: f64,
    #[serde(default)]
    pub reasoning: Option<f64>,
    #[serde(default)]
    pub cache_read: Option<f64>,
}

#[derive(Debug, Clone, Deserialize)]
#[allow(dead_code)]
pub struct RemoteLimit {
    #[serde(default)]
    pub context: i64,
    #[serde(default)]
    pub output: i64,
}

#[derive(Debug, Clone, Deserialize)]
#[allow(dead_code)]
pub struct RemoteProviderConfig {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub env: Vec<String>,
    #[serde(default)]
    pub npm: String,
    #[serde(default)]
    pub api: String,
    #[serde(default)]
    pub doc: String,
    pub models: std::collections::HashMap<String, RemoteModelConfig>,
}

// Conversion from RemoteModelConfig to Model
impl RemoteModelConfig {
    pub fn to_model(self, provider: String) -> Model {
        let cost = self.cost.unwrap_or(RemoteCost {
            input: 0.0,
            output: 0.0,
            reasoning: None,
            cache_read: None,
        });
        let limit = self.limit.unwrap_or(RemoteLimit {
            context: 0,
            output: 0,
        });

        Model {
            id: self.id,
            name: self.name,
            attachment: self.attachment,
            reasoning: self.reasoning,
            tool_call: self.tool_call,
            temperature: self.temperature,
            knowledge: self.knowledge,
            release_date: self.release_date,
            last_updated: self.last_updated,
            modalities: self.modalities,
            open_weights: self.open_weights,
            cost: Cost {
                input: cost.input,
                output: cost.output,
            },
            limit: Limit {
                context: limit.context,
                output: limit.output,
            },
            config_schema: None,
            provider: Some(provider),
        }
    }
}
