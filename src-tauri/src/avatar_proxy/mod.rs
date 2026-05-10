use crate::config::constants::{AVATAR_CACHE_DURATION, MAX_AVATAR_SIZE, REQUEST_TIMEOUT};
use anyhow::{Context, Result};
use base64::{engine::general_purpose, Engine as _};
use dashmap::DashMap;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AvatarData {
    pub data: String, // Base64 encoded image data
    pub mime_type: String,
    pub cached_at: u64, // Unix timestamp
}

#[derive(Debug, Clone)]
pub struct AvatarProxy {
    cache: Arc<DashMap<String, AvatarData>>,
    cache_duration: Duration,
}

impl AvatarProxy {
    pub fn new() -> Self {
        Self {
            cache: Arc::new(DashMap::new()),
            cache_duration: AVATAR_CACHE_DURATION,
        }
    }

    pub async fn fetch_avatar(&self, url: &str) -> Result<AvatarData> {
        // Check cache first
        if let Some(cached) = self.get_from_cache(url) {
            return Ok(cached);
        }

        // Fetch from URL
        let client = reqwest::Client::builder()
            .timeout(REQUEST_TIMEOUT)
            .build()?;

        let response = client
            .get(url)
            .header("User-Agent", "BunshinDesktop/1.0")
            .send()
            .await
            .context(format!("Failed to fetch avatar from: {}", url))?;

        // Check response status
        if !response.status().is_success() {
            return Err(anyhow::anyhow!(
                "Failed to fetch avatar: HTTP {}",
                response.status()
            ));
        }

        // Get content type
        let content_type = response
            .headers()
            .get("content-type")
            .and_then(|v| v.to_str().ok())
            .unwrap_or("image/jpeg")
            .to_string();

        // Validate content type
        if !content_type.starts_with("image/") {
            return Err(anyhow::anyhow!(
                "Invalid content type for avatar: {}",
                content_type
            ));
        }

        // Read response body
        let bytes = response
            .bytes()
            .await
            .context("Failed to read avatar response")?;

        // Check size limit
        if bytes.len() > MAX_AVATAR_SIZE {
            return Err(anyhow::anyhow!(
                "Avatar image too large (max {} MB)",
                MAX_AVATAR_SIZE / (1024 * 1024)
            ));
        }

        // Convert to base64
        let base64_data = general_purpose::STANDARD.encode(&bytes);

        // Create data URL
        let data_url = format!("data:{};base64,{}", content_type, base64_data);

        let avatar_data = AvatarData {
            data: data_url,
            mime_type: content_type,
            cached_at: current_timestamp(),
        };

        // Store in cache
        self.cache.insert(url.to_string(), avatar_data.clone());

        Ok(avatar_data)
    }

    fn get_from_cache(&self, url: &str) -> Option<AvatarData> {
        self.cache.get(url).and_then(|entry| {
            let data = entry.value();
            let age = current_timestamp() - data.cached_at;

            if age < self.cache_duration.as_secs() {
                Some(data.clone())
            } else {
                // Remove expired entry
                drop(entry);
                self.cache.remove(url);
                None
            }
        })
    }

}

fn current_timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

// Tauri Commands
use tauri::State;

#[tauri::command]
pub async fn proxy_media(
    url: String,
    avatar_proxy: State<'_, Arc<AvatarProxy>>,
) -> Result<AvatarData, String> {
    avatar_proxy
        .fetch_avatar(&url)
        .await
        .map_err(|e| e.to_string())
}
