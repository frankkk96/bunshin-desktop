use base64::{engine::general_purpose, Engine as _};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::Manager;
use tokio::fs;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum MediaType {
    Image,
    Pdf,
    Document,
    Audio,
    Video,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaItem {
    pub local_path: String,
    pub name: String,
    #[serde(rename = "type")]
    pub media_type: MediaType,
    pub mime_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Base64Result {
    pub success: bool,
    pub data_url: Option<String>,
    pub error: Option<String>,
}

/// Get display URL for a media item
/// Converts local file paths to tauri asset URLs
#[tauri::command]
pub async fn media_get_display_url(
    app: tauri::AppHandle,
    media: MediaItem,
) -> Result<String, String> {
    // Handle data URLs directly
    if media.local_path.starts_with("data:") {
        return Ok(media.local_path);
    }

    // Handle local files
    let clean_path = normalize_local_path(&media.local_path);
    let path = PathBuf::from(&clean_path);

    if path.exists() {
        // Convert to tauri asset URL
        let asset_url =
            tauri::Url::from_file_path(&path).map_err(|_| "Failed to convert path to URL")?;
        return Ok(asset_url
            .to_string()
            .replace("file://", "asset://localhost"));
    }

    // Try media directory
    let media_dir = get_media_directory(&app)?;
    let file_name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or(&media.name);
    let media_path = media_dir.join(file_name);

    if media_path.exists() {
        let asset_url =
            tauri::Url::from_file_path(&media_path).map_err(|_| "Failed to convert path to URL")?;
        return Ok(asset_url
            .to_string()
            .replace("file://", "asset://localhost"));
    }

    // Return original path as fallback
    Ok(media.local_path)
}

/// Get base64 data URL for a media item
/// Used for sending media to AI APIs
#[tauri::command]
pub async fn media_get_base64(
    app: tauri::AppHandle,
    media: MediaItem,
) -> Result<Base64Result, String> {
    // Handle data URLs directly
    if media.local_path.starts_with("data:") {
        return Ok(Base64Result {
            success: true,
            data_url: Some(media.local_path),
            error: None,
        });
    }

    // Resolve local file path
    let local_path = resolve_local_path(&app, &media.local_path)?;

    // Read file and convert to base64
    match fs::read(&local_path).await {
        Ok(bytes) => {
            let base64_data = general_purpose::STANDARD.encode(&bytes);

            // Return as data URL format: data:{mimeType};base64,{data}
            let data_url = format!("data:{};base64,{}", media.mime_type, base64_data);

            Ok(Base64Result {
                success: true,
                data_url: Some(data_url),
                error: None,
            })
        }
        Err(e) => Ok(Base64Result {
            success: false,
            data_url: None,
            error: Some(format!("Failed to read file: {}", e)),
        }),
    }
}

fn normalize_local_path(path: &str) -> String {
    let mut clean = path.to_string();

    // Remove file:// prefix
    if clean.starts_with("file://") {
        clean = clean[7..].to_string();
    } else if clean.starts_with("file:") {
        clean = clean[5..].to_string();
    }

    // Handle Windows drive paths
    if clean.starts_with('/') && clean.len() > 2 && clean.chars().nth(2) == Some(':') {
        clean = clean[1..].to_string();
    }

    clean
}

fn resolve_local_path(app: &tauri::AppHandle, url: &str) -> Result<PathBuf, String> {
    let clean_path = normalize_local_path(url);
    let path = PathBuf::from(&clean_path);

    if path.exists() {
        return Ok(path);
    }

    // Try media directory
    let media_dir = get_media_directory(app)?;
    let file_name = path
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or("Invalid file path")?;
    let media_path = media_dir.join(file_name);

    if media_path.exists() {
        return Ok(media_path);
    }

    Err(format!("File not found: {}", clean_path))
}

fn get_media_directory(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    let media_dir = app_data_dir.join("medias");

    if !media_dir.exists() {
        std::fs::create_dir_all(&media_dir)
            .map_err(|e| format!("Failed to create media directory: {}", e))?;
    }

    Ok(media_dir)
}

