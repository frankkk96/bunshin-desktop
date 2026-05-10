// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use serde::{Deserialize, Serialize};
use sqlx::{Column, Row, ValueRef};
use std::collections::HashMap;
use std::fs;
use std::io;
use std::path::PathBuf;
use std::sync::Arc;
use tauri::{Emitter, Manager};
use tauri_plugin_deep_link::DeepLinkExt;
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_store::StoreExt;

// Import new modules
mod avatar_proxy;
mod commands;
mod config;
mod database;
mod error;
mod file_storage;
mod mcp;
mod media;
mod mime_types;
mod secure_storage;
mod settings;
mod version;
mod window_setup;

// Window ready command
#[tauri::command]
async fn window_ready(window: tauri::Window) -> Result<(), String> {
    window.show().map_err(|e| e.to_string())?;
    Ok(())
}

use avatar_proxy::*;
use commands::*;
use database::commands::*;
use mcp::commands::*;
use media::*;
use settings::*;

#[derive(Debug, Serialize, Deserialize)]
pub struct MediaManagerOptions {
    max_width: Option<u32>,
    max_height: Option<u32>,
    image_quality: Option<f32>,
    cache_images: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct HttpResponse {
    data: String,
    status: u16,
    status_text: String,
    headers: HashMap<String, String>,
    ok: bool,
    url: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PickedMedia {
    local_path: String,
    name: String,
    #[serde(rename = "type")]
    media_type: String,
    mime_type: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MediaPickerResult {
    media: Option<PickedMedia>,
    cancelled: bool,
    error: Option<String>,
}

/// Get file extensions for a media type
fn get_extensions_for_media_type(media_type: &str) -> (&'static str, Vec<&'static str>) {
    match media_type {
        "image" => ("Images", vec!["png", "jpg", "jpeg", "gif", "bmp", "webp"]),
        "video" => ("Videos", vec!["mp4", "mov", "avi", "mkv", "webm"]),
        "audio" => ("Audio", vec!["mp3", "wav", "ogg", "flac", "aac", "m4a"]),
        "pdf" => ("PDF", vec!["pdf"]),
        _ => ("All Files", vec!["*"]),
    }
}

/// Detect media type from file extension
fn detect_media_type(extension: &str) -> &'static str {
    match extension.to_lowercase().as_str() {
        "png" | "jpg" | "jpeg" | "gif" | "bmp" | "webp" => "image",
        "mp4" | "mov" | "avi" | "mkv" | "webm" => "video",
        "mp3" | "wav" | "ogg" | "flac" | "aac" | "m4a" => "audio",
        "pdf" => "pdf",
        _ => "pdf", // fallback to pdf for unknown types
    }
}

#[tauri::command]
async fn select_media_from_library(
    app_handle: tauri::AppHandle,
    media_types: Vec<String>,
) -> Result<MediaPickerResult, String> {
    let mut dialog = app_handle.dialog().file();

    // Add filters for each media type
    for media_type in &media_types {
        let (label, extensions) = get_extensions_for_media_type(media_type);
        dialog = dialog.add_filter(label, &extensions);
    }

    let dialog_result = dialog.blocking_pick_file();

    match dialog_result {
        Some(file_path) => {
            let original_path = file_path
                .as_path()
                .ok_or_else(|| "Invalid file path".to_string())?;

            // Get extension to detect media type
            let extension = original_path
                .extension()
                .and_then(|e| e.to_str())
                .unwrap_or("");

            let detected_type = detect_media_type(extension);
            let mime_type = mime_types::get_mime_type(extension);

            // Extract filename
            let file_name = original_path
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("media")
                .to_string();

            // Copy to app media directory
            let media_path = copy_to_media_directory(&app_handle, original_path)
                .map_err(|e| format!("Failed to copy media to media directory: {}", e))?;

            Ok(MediaPickerResult {
                media: Some(PickedMedia {
                    local_path: media_path.to_string_lossy().to_string(),
                    name: file_name,
                    media_type: detected_type.to_string(),
                    mime_type: mime_type.to_string(),
                }),
                cancelled: false,
                error: None,
            })
        }
        None => Ok(MediaPickerResult {
            media: None,
            cancelled: true,
            error: None,
        }),
    }
}

// KV Store commands
// Secure Store commands (using age encryption)
#[tauri::command]
async fn secure_store_set(
    app: tauri::AppHandle,
    service: String,
    key: String,
    value: String,
) -> Result<(), String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let storage = secure_storage::SecureStorage::with_base_dir(service, app_data_dir);
    storage.set(&key, &value).map_err(|e| e.to_string())
}

#[tauri::command]
async fn secure_store_get(
    app: tauri::AppHandle,
    service: String,
    key: String,
) -> Result<Option<String>, String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let storage = secure_storage::SecureStorage::with_base_dir(service, app_data_dir);
    storage.get(&key).map_err(|e| e.to_string())
}

#[tauri::command]
async fn secure_store_delete(
    app: tauri::AppHandle,
    service: String,
    key: String,
) -> Result<(), String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let storage = secure_storage::SecureStorage::with_base_dir(service, app_data_dir);
    storage.delete(&key).map_err(|e| e.to_string())
}

#[tauri::command]
async fn secure_store_list(app: tauri::AppHandle, service: String) -> Result<Vec<String>, String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let storage = secure_storage::SecureStorage::with_base_dir(service, app_data_dir);
    Ok(storage.list_keys())
}

#[tauri::command]
async fn save_export_data(
    app_handle: tauri::AppHandle,
    data: String,
    filename: String,
) -> Result<bool, String> {
    // Ask user where to save the file
    let dialog_result = app_handle
        .dialog()
        .file()
        .add_filter("JSON", &["json"])
        .set_file_name(&filename)
        .blocking_save_file();

    match dialog_result {
        Some(save_path) => {
            // Write the data to the selected location
            let path = save_path
                .as_path()
                .ok_or_else(|| "Invalid save path".to_string())?;
            match fs::write(path, data) {
                Ok(()) => Ok(true),
                Err(e) => Err(format!("Failed to save export data: {}", e)),
            }
        }
        None => Ok(false), // User cancelled
    }
}

#[tauri::command]
async fn export_all_data(app: tauri::AppHandle) -> Result<String, String> {
    use std::collections::HashMap;

    // Get current timestamp
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| format!("System time error: {}", e))?
        .as_millis();

    // 1. Export SQLite database data
    let mut database_data: HashMap<String, Vec<HashMap<String, serde_json::Value>>> =
        HashMap::new();

    // List of allowed tables to export (whitelist for SQL injection prevention)
    const ALLOWED_TABLES: &[&str] = &[
        "messages",
        "sessions",
        "custom_agents",
        "hosted_agents",
        "market_agents",
        "groups",
        "workflows",
        "providers",
        "mcp_servers",
        "data_providers",
    ];

    // Connect to SQLite database using sqlx
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    // Ensure the app data directory exists
    if !app_data_dir.exists() {
        std::fs::create_dir_all(&app_data_dir)
            .map_err(|e| format!("Failed to create app data directory: {}", e))?;
    }

    let db_path = app_data_dir.join("bunshin.db");
    // Percent-encode spaces so SQLx URI parser handles macOS "Application Support" paths
    let db_url = format!(
        "sqlite://{}",
        db_path
            .to_string_lossy()
            .replace('\\', "/")
            .replace(' ', "%20")
    );
    // Log and proactively create the db file to surface permission/path issues earlier
    log::info!("Exporting from DB path: {}", db_path.display());
    if let Err(e) = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&db_path)
    {
        log::error!("Failed to touch db file before export: {}", e);
        return Err(format!("Failed to touch db file before export: {}", e));
    }

    match sqlx::SqlitePool::connect(&db_url).await {
        Ok(pool) => {
            for table in ALLOWED_TABLES {
                // Validate table name against whitelist (already done by iterating ALLOWED_TABLES)
                let query = format!("SELECT * FROM {}", table);
                match sqlx::query(&query).fetch_all(&pool).await {
                    Ok(rows) => {
                        let mut table_data = Vec::new();
                        for row in rows {
                            let mut row_map = HashMap::new();
                            for (i, column) in row.columns().iter().enumerate() {
                                let column_name = column.name();
                                let value: serde_json::Value = match row.try_get_raw(i) {
                                    Ok(raw_value) => {
                                        if raw_value.is_null() {
                                            serde_json::Value::Null
                                        } else {
                                            // Try to get as different types
                                            if let Ok(s) = row.try_get::<String, _>(i) {
                                                serde_json::Value::String(s)
                                            } else if let Ok(i64_val) = row.try_get::<i64, _>(i) {
                                                serde_json::Value::Number(serde_json::Number::from(
                                                    i64_val,
                                                ))
                                            } else if let Ok(f64_val) = row.try_get::<f64, _>(i) {
                                                serde_json::Number::from_f64(f64_val)
                                                    .map(serde_json::Value::Number)
                                                    .unwrap_or(serde_json::Value::Null)
                                            // OK: fallback for invalid f64
                                            } else if let Ok(bool_val) = row.try_get::<bool, _>(i) {
                                                serde_json::Value::Bool(bool_val)
                                            } else {
                                                // Fallback to null for unknown types
                                                serde_json::Value::Null
                                            }
                                        }
                                    }
                                    Err(_) => serde_json::Value::Null,
                                };
                                row_map.insert(column_name.to_string(), value);
                            }
                            table_data.push(row_map);
                        }
                        database_data.insert(table.to_string(), table_data);
                    }
                    Err(e) => {
                        println!("Warning: Failed to export table {}: {}", table, e);
                        // Continue with other tables even if one fails
                        database_data.insert(table.to_string(), vec![]);
                    }
                }
            }
        }
        Err(e) => {
            return Err(format!("Failed to connect to database: {}", e));
        }
    }

    // 2. Export Settings data
    let settings_store = app
        .store_builder("settings.json")
        .build()
        .map_err(|e| format!("Failed to access settings store: {}", e))?;

    let mut settings_data: HashMap<String, serde_json::Value> = HashMap::new();
    for key in settings_store.keys() {
        if let Some(value) = settings_store.get(&key) {
            settings_data.insert(key, value.clone());
        }
    }

    // 3. Build final export structure
    let export_data = serde_json::json!({
        "export_info": {
            "version": "1.0",
            "timestamp": timestamp,
            "app_version": env!("CARGO_PKG_VERSION"),
            "export_type": "full_data_export"
        },
        "database": database_data,
        "settings": settings_data
    });

    // 4. Serialize to JSON
    serde_json::to_string_pretty(&export_data)
        .map_err(|e| format!("Failed to serialize export data: {}", e))
}

#[tauri::command]
async fn open_url(app: tauri::AppHandle, url: String) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;

    app.opener()
        .open_url(url, None::<String>)
        .map_err(|e| format!("Failed to open URL: {}", e))?;
    Ok(())
}

#[tauri::command]
async fn get_app_version() -> Result<String, String> {
    Ok(version::APP_VERSION.to_string())
}

#[tauri::command]
async fn read_log_file(_app_handle: tauri::AppHandle) -> Result<String, String> {
    // 读取 Application Support 目录下的日志
    let log_file = dirs::data_dir()
        .map(|d| d.join("app.bunshin/logs/application.log"))
        .ok_or_else(|| "Failed to get application data directory".to_string())?;

    if !log_file.exists() {
        return Ok(String::new());
    }

    fs::read_to_string(&log_file).map_err(|e| format!("Failed to read log file: {}", e))
}

#[tauri::command]
async fn trigger_test_crash(_app_handle: tauri::AppHandle) -> Result<(), String> {
    // 获取日志文件位置
    let log_file = dirs::data_dir()
        .map(|d| d.join("app.bunshin/logs/application.log"))
        .ok_or_else(|| "Failed to get application data directory".to_string())?;

    // 记录一些测试日志
    log::info!("=== Test Logging Started ===");
    log::info!("Log file location: {}", log_file.display());
    log::debug!("This is a DEBUG level message");
    log::info!("This is an INFO level message");
    log::warn!("This is a WARN level message - simulating warning condition");
    log::error!("This is an ERROR level message - simulating critical error (TEST ONLY)");
    log::info!("=== Test Logging Completed ===");

    Ok(())
}

fn get_media_directory(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    let media_dir = app_data_dir.join("medias");

    // Create medias directory if it doesn't exist
    if !media_dir.exists() {
        fs::create_dir_all(&media_dir)
            .map_err(|e| format!("Failed to create medias directory: {}", e))?;
    }

    Ok(media_dir)
}

fn copy_to_media_directory(
    app_handle: &tauri::AppHandle,
    source_path: &std::path::Path,
) -> Result<PathBuf, io::Error> {
    let media_dir =
        get_media_directory(app_handle).map_err(|e| io::Error::new(io::ErrorKind::Other, e))?;

    // Generate unique filename using timestamp
    let extension = source_path
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("jpg");

    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| io::Error::new(io::ErrorKind::Other, format!("System time error: {}", e)))?
        .as_millis();

    let short_uuid: String = uuid::Uuid::new_v4().to_string().chars().take(8).collect();

    let filename = format!("image_{}_{}.{}", timestamp, short_uuid, extension);

    let destination = media_dir.join(&filename);
    fs::copy(source_path, &destination)?;

    Ok(destination)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // 清理旧日志文件（启动时删除所有旧日志）
    // 使用 Application Support 目录统一管理所有应用数据
    // macOS: ~/Library/Application Support/app.bunshin/logs
    // Windows: %APPDATA%/app.bunshin/logs
    // Linux: $XDG_DATA_HOME/app.bunshin/logs
    if let Some(app_data_dir) = dirs::data_dir() {
        let log_dir = app_data_dir.join("app.bunshin").join("logs");
        if log_dir.exists() {
            if let Err(e) = fs::remove_dir_all(&log_dir) {
                eprintln!("Failed to clean old logs: {}", e);
            }
        }
        // 重新创建 logs 目录
        if let Err(e) = fs::create_dir_all(&log_dir) {
            eprintln!("Failed to create logs directory: {}", e);
        }
    }

    // 初始化 panic hook 用于捕获 Rust panic
    std::panic::set_hook(Box::new(|panic_info| {
        let msg = if let Some(s) = panic_info.payload().downcast_ref::<&str>() {
            s.to_string()
        } else if let Some(s) = panic_info.payload().downcast_ref::<String>() {
            s.clone()
        } else {
            "Unknown panic".to_string()
        };

        let location = panic_info
            .location()
            .map(|loc| format!("{}:{}:{}", loc.file(), loc.line(), loc.column()))
            .unwrap_or_else(|| "unknown".to_string());

        log::error!("PANIC: {} at {}", msg, location);

        // 开发环境仍然输出到控制台
        #[cfg(debug_assertions)]
        eprintln!("Panic occurred: {} at {}", msg, location);
    }));

    // 获取日志目录路径
    let log_dir = dirs::data_dir()
        .map(|d| d.join("app.bunshin").join("logs"))
        .expect("Failed to get application data directory");

    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::new()
                // 日志配置 - 单个文件最大 100MB，只保留当前文件
                .max_file_size(100_000_000)
                .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepOne)

                // 多目标输出
                .targets([
                    // 开发环境：输出到控制台
                    #[cfg(debug_assertions)]
                    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Stdout),

                    // 开发环境：输出到 webview 控制台
                    #[cfg(debug_assertions)]
                    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Webview),

                    // 所有环境：输出到 Application Support 目录
                    // macOS: ~/Library/Application Support/app.bunshin/logs/
                    // Windows: %APPDATA%/app.bunshin/logs/
                    // Linux: $XDG_DATA_HOME/app.bunshin/logs/
                    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Folder {
                        path: log_dir,
                        file_name: Some("application".to_string()),
                    }),
                ])

                // 日志级别：全局 Info（默认屏蔽 Debug 日志噪音）
                .level(log::LevelFilter::Info)

                // 使用本地时区
                .timezone_strategy(tauri_plugin_log::TimezoneStrategy::UseLocal)

                .build()
        )
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_cache::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_decorum::init())
        .setup(move |app| {
            // 记录应用启动
            log::info!("=== Bunshin Application Started ===");
            log::info!("App version: {}", env!("CARGO_PKG_VERSION"));
            log::info!("Platform: {}", std::env::consts::OS);
            log::info!("Arch: {}", std::env::consts::ARCH);

            // Setup window based on platform
            if let Err(e) = window_setup::setup_window(&app.handle()) {
                log::error!("Failed to setup window: {}", e);
                eprintln!("Failed to setup window: {}", e);
            }
            // Main window will be shown when frontend is ready

            // Initialize services
            let app_data_dir = match app.path().app_data_dir() {
                Ok(dir) => dir,
                Err(e) => {
                    eprintln!("Failed to get app data dir: {}", e);
                    return Err(Box::new(std::io::Error::new(
                        std::io::ErrorKind::Other,
                        format!("Failed to get app data dir: {}", e),
                    )));
                }
            };

            // Ensure app data directory exists before using it for DB/storage
            if let Err(e) = std::fs::create_dir_all(&app_data_dir) {
                eprintln!("Failed to create app data dir: {}", e);
                return Err(Box::new(std::io::Error::new(
                    std::io::ErrorKind::Other,
                    format!("Failed to create app data dir: {}", e),
                )));
            }

            // Initialize file storage
            let file_storage = match file_storage::FileStorage::new(app_data_dir.clone()) {
                Ok(fs) => Arc::new(fs),
                Err(e) => {
                    eprintln!("Failed to initialize file storage: {}", e);
                    return Err(Box::new(std::io::Error::new(
                        std::io::ErrorKind::Other,
                        format!("Failed to initialize file storage: {}", e),
                    )));
                }
            };

            // Store services in app state
            app.manage(file_storage);

            // Initialize avatar proxy
            let avatar_proxy = Arc::new(avatar_proxy::AvatarProxy::new());
            app.manage(avatar_proxy);

            // Initialize database connection
            let db_path = app_data_dir.join("bunshin.db");
            log::info!("DB path: {}", db_path.display());
            if let Err(e) = std::fs::OpenOptions::new()
                .create(true)
                .append(true)
                .open(&db_path)
            {
                log::error!("Failed to create/open DB file: {}", e);
                eprintln!("Failed to create/open DB file: {}", e);
                return Err(Box::new(std::io::Error::new(
                    std::io::ErrorKind::Other,
                    format!("Failed to create/open DB file: {}", e),
                )));
            }

            let db_url = format!(
                "sqlite://{}",
                db_path
                    .to_string_lossy()
                    .replace('\\', "/")
                    .replace(' ', "%20")
            );
            log::info!("DB URL: {}", db_url);

            let db = match tauri::async_runtime::block_on(async {
                database::DatabaseConnection::new(&db_url).await
            }) {
                Ok(conn) => conn,
                Err(e) => {
                    log::error!("Failed to connect to database: {}", e);
                    eprintln!("Failed to connect to database: {}", e);
                    return Err(Box::new(std::io::Error::new(
                        std::io::ErrorKind::Other,
                        format!("Failed to connect to database: {}", e),
                    )));
                }
            };

            // Run database migrations
            if let Err(e) = tauri::async_runtime::block_on(async { db.run_migrations().await }) {
                log::error!("Failed to run database migrations: {}", e);
                eprintln!("Failed to run database migrations: {}", e);
                return Err(Box::new(std::io::Error::new(
                    std::io::ErrorKind::Other,
                    format!("Failed to run database migrations: {}", e),
                )));
            }

            log::info!("Database initialized successfully");

            // Initialize models (fetch from remote + load from local config)
            if let Err(e) = tauri::async_runtime::block_on(async {
                database::commands::init_models(app.handle(), db.pool().clone()).await
            }) {
                log::error!("Failed to initialize models: {}", e);
                // Non-fatal: continue startup even if model init fails
            } else {
                log::info!("Models initialized successfully");
            }

            app.manage(database::AppState {
                db_pool: db.pool().clone(),
            });

            // Initialize MCP manager state
            app.manage(Arc::new(tokio::sync::Mutex::new(None::<mcp::MCPManager>))
                as mcp::commands::MCPManagerState);

            // Initialize OAuth manager state with Tauri's app_data_dir
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to get app data directory");
            app.manage(Arc::new(mcp::OAuthManager::with_app_data_dir(app_data_dir)) as mcp::commands::OAuthManagerState);

            // Set up deep link handler for OAuth callbacks
            let handle = app.handle().clone();

            // Register the protocol at runtime (Windows/Linux only)
            #[cfg(any(windows, target_os = "linux"))]
            {
                let _ = app.deep_link().register("bunshin");
            }

            #[cfg(any(target_os = "macos", target_os = "linux", target_os = "windows"))]
            {
                // 跨平台修正 PATH（macOS/Linux 不继承 shell PATH；Windows 某些场景也会丢）
                let _ = fix_path_env::fix();
            }

            // Set up the deep link event handler
            let handle_clone = handle.clone();
            app.deep_link().on_open_url(move |event| {
                let urls = event.urls();
                println!("Received deep link URLs: {:?}", urls);

                // Check for OAuth callback URLs
                for url in urls {
                    println!("Processing URL: {}", url.as_str());

                    // Supabase OAuth callback
                    if url.scheme() == "bunshin" && url.host_str() == Some("oauth-callback") {
                        println!("OAuth callback detected: {}", url.as_str());

                        // Focus the main window
                        if let Some(window) = handle_clone.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                            let _ = window.unminimize();
                        }

                        // Emit to frontend
                        let _ = handle_clone.emit("oauth-callback", url.as_str());
                    }

                    // MCP OAuth callback - Handle directly in backend
                    if url.scheme() == "bunshin" && url.host_str() == Some("mcp-oauth-callback") {
                        println!("MCP OAuth callback detected: {}", url.as_str());

                        // Focus the main window
                        if let Some(window) = handle_clone.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                            let _ = window.unminimize();
                        }

                        // Extract server_id from URL path: bunshin://mcp-oauth-callback/{server_id}
                        let server_id = url.path().trim_start_matches('/');

                        if server_id.is_empty() {
                            log::error!("[OAuth] Missing server_id in callback URL: {}", url.as_str());
                            let _ = handle_clone.emit("mcp-oauth-error", "Missing server ID in callback URL");
                            continue;
                        }

                        println!("MCP OAuth callback for server: {}", server_id);

                        // Handle callback directly in backend
                        let handle_inner = handle_clone.clone();
                        let server_id = server_id.to_string();
                        let callback_url = url.as_str().to_string();

                        tauri::async_runtime::spawn(async move {
                            // Get OAuth manager from app state
                            if let Some(oauth_state) = handle_inner.try_state::<mcp::commands::OAuthManagerState>() {
                                let oauth_manager = oauth_state.inner().clone();
                                let callback_result =
                                    oauth_manager.handle_callback_from_url(&server_id, &callback_url).await;

                                match callback_result {
                                    Ok(_) => {
                                        log::info!("[OAuth] Successfully handled callback for server: {}", server_id);
                                        let _ = handle_inner.emit("mcp-oauth-success", &server_id);

                                        // Automatically retry connection now that OAuth is complete
                                        if let Some(mcp_state) = handle_inner.try_state::<mcp::commands::MCPManagerState>() {
                                            let manager_guard = mcp_state.lock().await;
                                            if let Some(manager) = manager_guard.as_ref() {
                                                log::info!("[OAuth] Retrying connection for server: {}", server_id);
                                                match manager.retry_connection_after_oauth(&server_id).await {
                                                    Ok(_) => {
                                                        log::info!("[OAuth] Successfully reconnected after OAuth for: {}", server_id);
                                                    }
                                                    Err(e) => {
                                                        log::error!("[OAuth] Failed to reconnect after OAuth: {}", e);
                                                    }
                                                }
                                            }
                                        }
                                    }
                                    Err(e) => {
                                        log::error!("[OAuth] Failed to handle callback: {}", e);
                                        let _ = handle_inner.emit("mcp-oauth-error", e.as_str());
                                    }
                                }
                            } else {
                                log::error!("[OAuth] OAuth manager not found in app state");
                            }
                        });
                    }
                }
            });

            // Check if the app was started with a deep link
            if let Ok(Some(urls)) = app.deep_link().get_current() {
                for url in urls {
                    println!("Initial deep link: {}", url.as_str());

                    // Supabase OAuth callback
                    if url.scheme() == "bunshin" && url.host_str() == Some("oauth-callback") {
                        // Focus the main window
                        if let Some(window) = handle.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                            let _ = window.unminimize();
                        }

                        let _ = handle.emit("oauth-callback", url.as_str());
                    }

                    // MCP OAuth callback - Handle directly in backend
                    if url.scheme() == "bunshin" && url.host_str() == Some("mcp-oauth-callback") {
                        // Focus the main window
                        if let Some(window) = handle.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                            let _ = window.unminimize();
                        }

                        // Extract server_id from URL path
                        let server_id = url.path().trim_start_matches('/');

                        if server_id.is_empty() {
                            log::error!("[OAuth] Missing server_id in initial callback URL: {}", url.as_str());
                            continue;
                        }

                        println!("Initial MCP OAuth callback for server: {}", server_id);

                        // Handle callback directly in backend
                        let handle_inner = handle.clone();
                        let server_id = server_id.to_string();
                        let callback_url = url.as_str().to_string();

                        tauri::async_runtime::spawn(async move {
                            if let Some(oauth_state) = handle_inner.try_state::<mcp::commands::OAuthManagerState>() {
                                let oauth_manager = oauth_state.inner().clone();
                                let callback_result =
                                    oauth_manager.handle_callback_from_url(&server_id, &callback_url).await;

                                match callback_result {
                                    Ok(_) => {
                                        log::info!("[OAuth] Successfully handled initial callback for server: {}", server_id);
                                        let _ = handle_inner.emit("mcp-oauth-success", &server_id);

                                        // Automatically retry connection now that OAuth is complete
                                        if let Some(mcp_state) = handle_inner.try_state::<mcp::commands::MCPManagerState>() {
                                            let manager_guard = mcp_state.lock().await;
                                            if let Some(manager) = manager_guard.as_ref() {
                                                log::info!("[OAuth] Retrying connection for server: {}", server_id);
                                                match manager.retry_connection_after_oauth(&server_id).await {
                                                    Ok(_) => {
                                                        log::info!("[OAuth] Successfully reconnected after OAuth for: {}", server_id);
                                                    }
                                                    Err(e) => {
                                                        log::error!("[OAuth] Failed to reconnect after OAuth: {}", e);
                                                    }
                                                }
                                            }
                                        }
                                    }
                                    Err(e) => {
                                        log::error!("[OAuth] Failed to handle initial callback: {}", e);
                                        let _ = handle_inner.emit("mcp-oauth-error", e.as_str());
                                    }
                                }
                            }
                        });
                    }
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Window commands
            window_ready,
            // Media commands
            select_media_from_library,
            // Secure store commands
            secure_store_set,
            secure_store_get,
            secure_store_delete,
            secure_store_list,
            // Settings commands
            get_app_settings,
            update_app_settings,
            reset_app_settings,
            export_app_settings,
            import_app_settings,
            // Utility commands
            save_export_data,
            export_all_data,
            open_url,
            get_app_version,
            read_log_file,
            trigger_test_crash,
            // Models commands (database-backed)
            get_models_by_provider,
            get_model_by_id,
            create_model,
            update_model,
            delete_model,
            // File storage commands
            fs_save_file,
            fs_save_base64_file,
            fs_read_file_as_string,
            fs_read_file_as_base64,
            fs_delete_file,
            fs_file_exists,
            fs_list_files,
            // MCP commands
            mcp_start_server,
            mcp_stop_server,
            mcp_cancel_connection,
            mcp_list_tools,
            mcp_call_tool,
            // Media proxy commands
            proxy_media,
            // Media commands
            media_get_display_url,
            media_get_base64,
            // Database commands - Queries
            upsert_query,
            get_queries_by_session,
            get_query_by_id,
            delete_query,
            // Database commands - Responses
            upsert_response,
            get_responses_by_session,
            get_responses_by_query,
            get_response_by_id,
            delete_response,
            // Database commands - Cleanup
            delete_messages_by_session_id,
            delete_all_messages,
            delete_message,
            // Database commands - Search
            search_messages,
            // Database commands - Sessions
            get_all_sessions,
            get_session_by_id,
            create_session,
            update_session_favorite,
            update_session_visited,
            // Database commands - Agents
            get_all_agents,
            get_agent_by_id,
            create_agent,
            update_agent,
            delete_agent_by_id,
            // Database commands - Groups
            get_all_groups,
            get_group_by_id,
            create_group,
            update_group,
            delete_group_by_id,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
