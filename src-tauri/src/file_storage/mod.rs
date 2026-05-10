use anyhow::{Context, Result};
use base64::{engine::general_purpose, Engine as _};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tokio::fs as async_fs;

/// File information for stored files
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StoredFileInfo {
    pub local_path: String,
    pub original_name: String,
    pub mime_type: String,
    pub size: u64,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

// Type alias for backward compatibility
pub type FileInfo = StoredFileInfo;

#[derive(Debug, Clone)]
pub struct FileStorage {
    base_dir: PathBuf,
}

impl FileStorage {
    pub fn new(base_dir: PathBuf) -> Result<Self> {
        let storage = Self { base_dir };
        storage.ensure_directories()?;
        Ok(storage)
    }

    /// Resolve a path relative to the storage base directory when it is not absolute
    fn resolve_path(&self, local_path: &str) -> PathBuf {
        let path = PathBuf::from(local_path);
        if path.is_absolute() {
            path
        } else {
            self.base_dir.join(path)
        }
    }

    fn ensure_directories(&self) -> Result<()> {
        let dirs = [
            self.base_dir.clone(),
            self.base_dir.join("medias"),
            self.base_dir.join("documents"),
            self.base_dir.join("cache"),
        ];

        for dir in &dirs {
            if !dir.exists() {
                fs::create_dir_all(dir)
                    .context(format!("Failed to create directory: {}", dir.display()))?;
            }
        }

        Ok(())
    }

    pub fn get_category_dir(&self, category: FileCategory) -> PathBuf {
        match category {
            FileCategory::Medias => self.base_dir.join("medias"),
            FileCategory::Documents => self.base_dir.join("documents"),
            FileCategory::Cache => self.base_dir.join("cache"),
        }
    }

    pub async fn save_file(
        &self,
        source: FileSource,
        category: FileCategory,
        original_name: Option<String>,
    ) -> Result<FileInfo> {
        let timestamp = chrono::Utc::now().timestamp_millis();
        let file_name = original_name.unwrap_or_else(|| format!("file_{}", timestamp));
        let unique_name = format!("{}_{}", timestamp, file_name);
        let category_dir = self.get_category_dir(category);
        let local_path = category_dir.join(&unique_name);

        let content = match source {
            FileSource::Path(path) => async_fs::read(&path)
                .await
                .context(format!("Failed to read file: {}", path.display()))?,
            FileSource::Base64(base64_str) => {
                let clean_base64 = if let Some(pos) = base64_str.find("base64,") {
                    &base64_str[pos + 7..]
                } else {
                    &base64_str
                };
                general_purpose::STANDARD
                    .decode(clean_base64)
                    .context("Failed to decode base64")?
            }
            FileSource::Url(url) => self.download_file(&url).await?,
        };

        async_fs::write(&local_path, &content)
            .await
            .context(format!("Failed to write file: {}", local_path.display()))?;

        Ok(FileInfo {
            local_path: local_path.to_string_lossy().to_string(),
            original_name: file_name.clone(),
            mime_type: Self::get_mime_type(&file_name),
            size: content.len() as u64,
            created_at: chrono::Utc::now(),
        })
    }

    async fn download_file(&self, url: &str) -> Result<Vec<u8>> {
        let response = reqwest::get(url)
            .await
            .context(format!("Failed to download file from: {}", url))?;

        let bytes = response
            .bytes()
            .await
            .context("Failed to read response body")?;

        Ok(bytes.to_vec())
    }

    pub async fn read_file(&self, local_path: &str) -> Result<Vec<u8>> {
        let path = self.resolve_path(local_path);
        async_fs::read(&path)
            .await
            .context(format!("Failed to read file: {}", path.display()))
    }

    pub async fn read_file_as_string(&self, local_path: &str) -> Result<String> {
        let bytes = self.read_file(local_path).await?;
        String::from_utf8(bytes).context("File content is not valid UTF-8")
    }

    pub async fn read_file_as_base64(&self, local_path: &str) -> Result<String> {
        let bytes = self.read_file(local_path).await?;
        Ok(general_purpose::STANDARD.encode(bytes))
    }

    pub async fn delete_file(&self, local_path: &str) -> Result<bool> {
        let path = self.resolve_path(local_path);
        if path.exists() {
            async_fs::remove_file(&path)
                .await
                .context(format!("Failed to delete file: {}", path.display()))?;
            Ok(true)
        } else {
            Ok(false)
        }
    }

    pub async fn file_exists(&self, local_path: &str) -> bool {
        self.resolve_path(local_path).exists()
    }

    pub async fn list_files(&self, category: FileCategory) -> Result<Vec<String>> {
        let dir = self.get_category_dir(category);
        let mut files = Vec::new();

        if dir.exists() {
            let mut entries = async_fs::read_dir(&dir)
                .await
                .context(format!("Failed to read directory: {}", dir.display()))?;

            while let Some(entry) = entries.next_entry().await? {
                if entry.file_type().await?.is_file() {
                    files.push(entry.path().to_string_lossy().to_string());
                }
            }
        }

        Ok(files)
    }

    fn get_mime_type(file_name: &str) -> String {
        crate::mime_types::get_mime_type(file_name)
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum FileCategory {
    Medias,
    Documents,
    Cache,
}

#[derive(Debug)]
pub enum FileSource {
    Path(PathBuf),
    Base64(String),
    Url(String),
}

// Tauri Commands
use std::sync::Arc;
use tauri::State;

#[tauri::command]
pub async fn fs_save_file(
    storage: State<'_, Arc<FileStorage>>,
    source_path: Option<String>,
    source_base64: Option<String>,
    source_url: Option<String>,
    category: String,
    original_name: Option<String>,
) -> Result<serde_json::Value, String> {
    let category = match category.as_str() {
        "medias" => FileCategory::Medias,
        "documents" => FileCategory::Documents,
        "cache" => FileCategory::Cache,
        _ => FileCategory::Documents,
    };

    let source = if let Some(path) = source_path {
        FileSource::Path(path.into())
    } else if let Some(base64) = source_base64 {
        FileSource::Base64(base64)
    } else if let Some(url) = source_url {
        FileSource::Url(url)
    } else {
        return Err("No source provided".to_string());
    };

    let file_info = storage
        .save_file(source, category, original_name)
        .await
        .map_err(|e| e.to_string())?;

    Ok(serde_json::to_value(file_info).unwrap())
}

#[tauri::command]
pub async fn fs_save_base64_file(
    storage: State<'_, Arc<FileStorage>>,
    base64_data: String,
    file_name: String,
    category: Option<String>,
) -> Result<serde_json::Value, String> {
    use base64::{engine::general_purpose, Engine as _};
    use serde_json::json;

    let category = match category.as_deref() {
        Some("medias") => FileCategory::Medias,
        Some("documents") => FileCategory::Documents,
        Some("cache") => FileCategory::Cache,
        _ => FileCategory::Documents,
    };

    let file_info = storage
        .save_file(
            FileSource::Base64(base64_data.clone()),
            category,
            Some(file_name.clone()),
        )
        .await
        .map_err(|e| e.to_string())?;

    let decoded_data = general_purpose::STANDARD
        .decode(&base64_data)
        .map_err(|e| e.to_string())?;

    let mime_type = crate::mime_types::detect_mime_from_bytes(&decoded_data).to_string();

    Ok(json!({
        "localPath": file_info.local_path,
        "originalName": file_name,
        "mimeType": mime_type,
        "size": decoded_data.len()
    }))
}

#[tauri::command]
pub async fn fs_read_file_as_string(
    storage: State<'_, Arc<FileStorage>>,
    local_path: String,
) -> Result<String, String> {
    storage
        .read_file_as_string(&local_path)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn fs_read_file_as_base64(
    storage: State<'_, Arc<FileStorage>>,
    local_path: String,
) -> Result<String, String> {
    storage
        .read_file_as_base64(&local_path)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn fs_delete_file(
    storage: State<'_, Arc<FileStorage>>,
    local_path: String,
) -> Result<bool, String> {
    storage
        .delete_file(&local_path)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn fs_file_exists(
    storage: State<'_, Arc<FileStorage>>,
    local_path: String,
) -> Result<bool, String> {
    Ok(storage.file_exists(&local_path).await)
}

#[tauri::command]
pub async fn fs_list_files(
    storage: State<'_, Arc<FileStorage>>,
    category: Option<String>,
) -> Result<Vec<String>, String> {
    let category = match category.as_deref() {
        Some("medias") => FileCategory::Medias,
        Some("documents") => FileCategory::Documents,
        Some("cache") => FileCategory::Cache,
        _ => FileCategory::Documents,
    };

    storage
        .list_files(category)
        .await
        .map_err(|e| e.to_string())
}
