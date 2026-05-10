use serde::{Deserialize, Serialize};
use sqlx::FromRow;

use super::agent::{Agent, Prompt};

// Database format (snake_case)
#[derive(Debug, Clone, FromRow)]
pub struct DbGroup {
    pub id: String,
    pub alias: String,
    pub description: Option<String>,
    pub agents: String, // JSON string array
    pub pinned: i64,
    pub config: Option<String>, // JSON string
    pub created_at: i64,
    pub updated_at: i64,
}

// Application format (camelCase) - matches TypeScript Group type
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Group {
    pub id: String,
    pub alias: String,
    pub description: String,
    pub agents: Vec<Agent>, // 现在存储Agent实体而不是ID
    pub pinned: bool,
    #[serde(default)]
    pub shortcuts: Vec<Prompt>,
    #[serde(default)]
    pub send_to_all_members: bool,
    pub created_at: i64,
    pub updated_at: i64,
}

// Internal config for database storage (keeps shortcuts and send_to_all_members together)
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct GroupDbConfig {
    #[serde(default)]
    pub shortcuts: Vec<Prompt>,
    #[serde(default)]
    pub send_to_all_members: bool,
}

// Conversion from DbGroup to Group
impl DbGroup {
    /// 将数据库格式的Group转换为应用格式
    /// 需要传入所有agents来查找对应的Agent实体
    pub fn to_group(self, all_agents: &[Agent]) -> Result<Group, serde_json::Error> {
        // 从数据库中解析agent_ids
        let agent_ids: Vec<String> = serde_json::from_str(&self.agents)?;

        // 根据ID查找对应的Agent实体
        let agents: Vec<Agent> = agent_ids
            .iter()
            .filter_map(|id| all_agents.iter().find(|a| &a.id == id).cloned())
            .collect();

        let config: GroupDbConfig = if let Some(config_str) = &self.config {
            serde_json::from_str(config_str)?
        } else {
            GroupDbConfig::default()
        };

        Ok(Group {
            id: self.id,
            alias: self.alias,
            description: self.description.unwrap_or_default(),
            agents,
            pinned: self.pinned != 0,
            shortcuts: config.shortcuts,
            send_to_all_members: config.send_to_all_members,
            created_at: self.created_at,
            updated_at: self.updated_at,
        })
    }
}

// Conversion from Group to DbGroup
impl Group {
    pub fn to_db_group(self) -> Result<DbGroup, serde_json::Error> {
        // 从Agent实体中提取ID保存到数据库
        let agent_ids: Vec<String> = self.agents.iter().map(|a| a.id.clone()).collect();
        let agents = serde_json::to_string(&agent_ids)?;
        let config = serde_json::to_string(&GroupDbConfig {
            shortcuts: self.shortcuts,
            send_to_all_members: self.send_to_all_members,
        })?;

        Ok(DbGroup {
            id: self.id,
            alias: self.alias,
            description: if self.description.is_empty() {
                None
            } else {
                Some(self.description)
            },
            agents,
            pinned: if self.pinned { 1 } else { 0 },
            config: Some(config),
            created_at: self.created_at,
            updated_at: self.updated_at,
        })
    }
}
