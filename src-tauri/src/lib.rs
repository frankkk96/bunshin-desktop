use serde::{Deserialize, Serialize};
use sqlx::{Column, Row, ValueRef};
use std::collections::HashMap;
use std::fs;
use std::io;
use std::path::PathBuf;
use std::sync::Arc;
use tauri::{Manager, RunEvent};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_store::StoreExt;

mod avatar_proxy;
mod claude_agent;
mod commands;
mod config;
mod database;
mod error;
mod file_storage;
mod media;
mod mime_types;
mod secure_storage;
mod settings;
mod version;
mod window_setup;

#[tauri::command]
async fn window_ready(window: tauri::Window) -> Result<(), String> {
    window.show().map_err(|e| e.to_string())?;
    Ok(())
}

use avatar_proxy::*;
use claude_agent::commands::*;
use claude_agent::ClaudeSessionManager;
use commands::*;
use database::commands::*;
use media::*;
use settings::*;

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

fn get_extensions_for_media_type(media_type: &str) -> (&'static str, Vec<&'static str>) {
    match media_type {
        "image" => ("Images", vec!["png", "jpg", "jpeg", "gif", "bmp", "webp"]),
        "video" => ("Videos", vec!["mp4", "mov", "avi", "mkv", "webm"]),
        "audio" => ("Audio", vec!["mp3", "wav", "ogg", "flac", "aac", "m4a"]),
        "pdf" => ("PDF", vec!["pdf"]),
        _ => ("All Files", vec!["*"]),
    }
}

fn detect_media_type(extension: &str) -> &'static str {
    match extension.to_lowercase().as_str() {
        "png" | "jpg" | "jpeg" | "gif" | "bmp" | "webp" => "image",
        "mp4" | "mov" | "avi" | "mkv" | "webm" => "video",
        "mp3" | "wav" | "ogg" | "flac" | "aac" | "m4a" => "audio",
        "pdf" => "pdf",
        _ => "pdf",
    }
}

#[tauri::command]
async fn select_media_from_library(
    app_handle: tauri::AppHandle,
    media_types: Vec<String>,
) -> Result<MediaPickerResult, String> {
    let mut dialog = app_handle.dialog().file();
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
            let extension = original_path
                .extension()
                .and_then(|e| e.to_str())
                .unwrap_or("");
            let detected_type = detect_media_type(extension);
            let mime_type = mime_types::get_mime_type(extension);
            let file_name = original_path
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("media")
                .to_string();
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
async fn pick_directory(
    app_handle: tauri::AppHandle,
    title: Option<String>,
) -> Result<Option<String>, String> {
    let mut dialog = app_handle.dialog().file();
    if let Some(t) = title {
        dialog = dialog.set_title(t);
    }
    let picked = dialog.blocking_pick_folder();
    Ok(picked.and_then(|p| p.as_path().map(|p| p.to_string_lossy().to_string())))
}

#[tauri::command]
async fn save_export_data(
    app_handle: tauri::AppHandle,
    data: String,
    filename: String,
) -> Result<bool, String> {
    let dialog_result = app_handle
        .dialog()
        .file()
        .add_filter("JSON", &["json"])
        .set_file_name(&filename)
        .blocking_save_file();
    match dialog_result {
        Some(save_path) => {
            let path = save_path
                .as_path()
                .ok_or_else(|| "Invalid save path".to_string())?;
            fs::write(path, data)
                .map(|_| true)
                .map_err(|e| format!("Failed to save export data: {}", e))
        }
        None => Ok(false),
    }
}

#[tauri::command]
async fn export_all_data(app: tauri::AppHandle) -> Result<String, String> {
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| format!("System time error: {}", e))?
        .as_millis();

    let mut database_data: HashMap<String, Vec<HashMap<String, serde_json::Value>>> =
        HashMap::new();

    const ALLOWED_TABLES: &[&str] = &[
        "providers",
        "agents",
        "sessions",
        "messages",
    ];

    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    if !app_data_dir.exists() {
        std::fs::create_dir_all(&app_data_dir)
            .map_err(|e| format!("Failed to create app data directory: {}", e))?;
    }

    let db_path = app_data_dir.join("bunshin.db");
    let db_url = format!(
        "sqlite://{}",
        db_path
            .to_string_lossy()
            .replace('\\', "/")
            .replace(' ', "%20")
    );
    if let Err(e) = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&db_path)
    {
        return Err(format!("Failed to touch db file before export: {}", e));
    }

    match sqlx::SqlitePool::connect(&db_url).await {
        Ok(pool) => {
            for table in ALLOWED_TABLES {
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
                                        } else if let Ok(s) = row.try_get::<String, _>(i) {
                                            serde_json::Value::String(s)
                                        } else if let Ok(i64_val) = row.try_get::<i64, _>(i) {
                                            serde_json::Value::Number(serde_json::Number::from(
                                                i64_val,
                                            ))
                                        } else if let Ok(f64_val) = row.try_get::<f64, _>(i) {
                                            serde_json::Number::from_f64(f64_val)
                                                .map(serde_json::Value::Number)
                                                .unwrap_or(serde_json::Value::Null)
                                        } else if let Ok(bool_val) = row.try_get::<bool, _>(i) {
                                            serde_json::Value::Bool(bool_val)
                                        } else {
                                            serde_json::Value::Null
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
                        log::warn!("Failed to export table {}: {}", table, e);
                        database_data.insert(table.to_string(), vec![]);
                    }
                }
            }
        }
        Err(e) => {
            return Err(format!("Failed to connect to database: {}", e));
        }
    }

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
    log::info!("=== Test Logging Started ===");
    log::warn!("This is a WARN level message");
    log::error!("This is an ERROR level message");
    Ok(())
}

fn get_media_directory(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    let media_dir = app_data_dir.join("medias");
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
    let extension = source_path
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("jpg");
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| io::Error::new(io::ErrorKind::Other, format!("System time error: {}", e)))?
        .as_millis();
    let short_uuid: String = uuid::Uuid::new_v4().to_string().chars().take(8).collect();
    let filename = format!("media_{}_{}.{}", timestamp, short_uuid, extension);
    let destination = media_dir.join(&filename);
    fs::copy(source_path, &destination)?;
    Ok(destination)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    if let Some(app_data_dir) = dirs::data_dir() {
        let log_dir = app_data_dir.join("app.bunshin").join("logs");
        if log_dir.exists() {
            if let Err(e) = fs::remove_dir_all(&log_dir) {
                eprintln!("Failed to clean old logs: {}", e);
            }
        }
        if let Err(e) = fs::create_dir_all(&log_dir) {
            eprintln!("Failed to create logs directory: {}", e);
        }
    }

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
        #[cfg(debug_assertions)]
        eprintln!("Panic occurred: {} at {}", msg, location);
    }));

    let log_dir = dirs::data_dir()
        .map(|d| d.join("app.bunshin").join("logs"))
        .expect("Failed to get application data directory");

    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::new()
                .max_file_size(100_000_000)
                .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepOne)
                .targets([
                    #[cfg(debug_assertions)]
                    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Stdout),
                    #[cfg(debug_assertions)]
                    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Webview),
                    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Folder {
                        path: log_dir,
                        file_name: Some("application".to_string()),
                    }),
                ])
                .level(log::LevelFilter::Info)
                .timezone_strategy(tauri_plugin_log::TimezoneStrategy::UseLocal)
                .build(),
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
        .plugin(tauri_plugin_decorum::init())
        .setup(move |app| {
            log::info!("=== Bunshin Application Started ===");
            log::info!("App version: {}", env!("CARGO_PKG_VERSION"));
            log::info!("Platform: {}", std::env::consts::OS);

            if let Err(e) = window_setup::setup_window(&app.handle()) {
                log::error!("Failed to setup window: {}", e);
            }

            let app_data_dir = match app.path().app_data_dir() {
                Ok(dir) => dir,
                Err(e) => {
                    return Err(Box::new(std::io::Error::new(
                        std::io::ErrorKind::Other,
                        format!("Failed to get app data dir: {}", e),
                    )));
                }
            };
            std::fs::create_dir_all(&app_data_dir)?;

            let file_storage = Arc::new(file_storage::FileStorage::new(app_data_dir.clone())?);
            app.manage(file_storage);

            let avatar_proxy = Arc::new(avatar_proxy::AvatarProxy::new());
            app.manage(avatar_proxy);

            let db_path = app_data_dir.join("bunshin.db");
            log::info!("DB path: {}", db_path.display());
            if let Err(e) = std::fs::OpenOptions::new()
                .create(true)
                .append(true)
                .open(&db_path)
            {
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

            let db = match tauri::async_runtime::block_on(async {
                database::DatabaseConnection::new(&db_url).await
            }) {
                Ok(conn) => conn,
                Err(e) => {
                    return Err(Box::new(std::io::Error::new(
                        std::io::ErrorKind::Other,
                        format!("Failed to connect to database: {}", e),
                    )));
                }
            };

            if let Err(e) = tauri::async_runtime::block_on(async { db.run_migrations().await }) {
                return Err(Box::new(std::io::Error::new(
                    std::io::ErrorKind::Other,
                    format!("Failed to run database migrations: {}", e),
                )));
            }
            log::info!("Database initialized successfully");

            app.manage(database::AppState {
                db_pool: db.pool().clone(),
            });

            // Claude subprocess manager: one DashMap of processes for the app's lifetime.
            app.manage(Arc::new(ClaudeSessionManager::new()));

            #[cfg(any(target_os = "macos", target_os = "linux", target_os = "windows"))]
            {
                let _ = fix_path_env::fix();
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            window_ready,
            select_media_from_library,
            pick_directory,
            secure_store_set,
            secure_store_get,
            secure_store_delete,
            save_export_data,
            export_all_data,
            open_url,
            get_app_version,
            read_log_file,
            trigger_test_crash,
            // Settings
            get_app_settings,
            update_app_settings,
            reset_app_settings,
            export_app_settings,
            import_app_settings,
            // File storage
            fs_save_file,
            fs_save_base64_file,
            fs_read_file_as_string,
            fs_read_file_as_base64,
            fs_delete_file,
            fs_file_exists,
            fs_list_files,
            // Media
            proxy_media,
            media_get_display_url,
            media_get_base64,
            // Providers
            list_providers,
            get_provider,
            create_provider,
            update_provider,
            delete_provider,
            set_provider_api_key,
            has_provider_api_key,
            // Agents
            list_agents,
            get_agent,
            create_agent,
            update_agent,
            delete_agent,
            // Sessions (read + lifecycle)
            list_sessions,
            get_session,
            delete_session,
            update_session_favorite,
            update_session_visited,
            rename_session,
            // Messages
            get_messages_by_session,
            // Claude subprocess
            start_session,
            resume_session,
            stop_session,
            send_user_message,
            cancel_query,
            clear_session,
            list_running_sessions,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            if let RunEvent::ExitRequested { .. } = event {
                if let Some(manager) = app_handle.try_state::<Arc<ClaudeSessionManager>>() {
                    let manager = manager.inner().clone();
                    tauri::async_runtime::block_on(async move {
                        manager.stop_all().await;
                    });
                }
            }
        });
}
