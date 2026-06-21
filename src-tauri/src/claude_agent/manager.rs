use crate::claude_agent::process::{ClaudeProcess, ProcessStatus, SpawnConfig};
use crate::database::models::{AgentConfig, Provider, Session};
use anyhow::Result;
use dashmap::DashMap;
use sqlx::SqlitePool;
use std::sync::Arc;
use tauri::AppHandle;

#[derive(Default)]
pub struct ClaudeSessionManager {
    processes: DashMap<String, Arc<ClaudeProcess>>,
}

impl ClaudeSessionManager {
    pub fn new() -> Self {
        Self::default()
    }

    pub async fn start(
        &self,
        session: &Session,
        provider: &Provider,
        config: &AgentConfig,
        api_key: Option<&str>,
        resume: bool,
        pool: SqlitePool,
        app: AppHandle,
    ) -> Result<Arc<ClaudeProcess>> {
        if let Some(existing) = self.processes.get(&session.id) {
            return Ok(existing.clone());
        }
        let process = ClaudeProcess::spawn(
            SpawnConfig {
                session,
                provider,
                config,
                api_key,
                resume,
            },
            pool,
            app,
        )
        .await?;
        self.processes.insert(session.id.clone(), process.clone());
        Ok(process)
    }

    pub fn get(&self, session_id: &str) -> Option<Arc<ClaudeProcess>> {
        self.processes.get(session_id).map(|r| r.clone())
    }

    pub async fn stop(&self, session_id: &str) -> Result<()> {
        if let Some((_, process)) = self.processes.remove(session_id) {
            process.stop().await?;
        }
        Ok(())
    }

    pub async fn stop_all(&self) {
        let ids: Vec<String> = self.processes.iter().map(|e| e.key().clone()).collect();
        for id in ids {
            if let Some((_, process)) = self.processes.remove(&id) {
                let _ = process.stop().await;
            }
        }
    }

    pub async fn snapshot(&self) -> Vec<RunningSessionInfo> {
        let mut out = Vec::with_capacity(self.processes.len());
        for entry in self.processes.iter() {
            let status = entry.value().current_status().await;
            out.push(RunningSessionInfo {
                session_id: entry.key().clone(),
                status,
            });
        }
        out
    }
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RunningSessionInfo {
    pub session_id: String,
    pub status: ProcessStatus,
}
