use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use tauri::{AppHandle, Emitter};
use tauri_plugin_store::StoreExt;

// Settings event name
pub const SETTINGS_CHANGED_EVENT: &str = "settings:changed";

// Settings types matching TypeScript definitions
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProxySettings {
    pub enabled: bool,
    pub url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DebugSettings {
    pub enabled: bool,
    #[serde(rename = "verboseLogging")]
    pub verbose_logging: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub theme: String,
    pub language: String,
    #[serde(rename = "autoUpdate")]
    pub auto_update: bool,
    #[serde(rename = "crashReports")]
    pub crash_reports: bool,
    #[serde(rename = "maxConcurrency")]
    pub max_concurrency: i32,
    pub proxy: ProxySettings,
    pub debug: DebugSettings,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            theme: "system".to_string(),
            language: "en".to_string(),
            auto_update: true,
            crash_reports: true,
            max_concurrency: 20,
            proxy: ProxySettings {
                enabled: false,
                url: String::new(),
            },
            debug: DebugSettings {
                enabled: false,
                verbose_logging: false,
            },
        }
    }
}

const SETTINGS_KEY: &str = "settings:app_settings";
const SETTINGS_VERSION_KEY: &str = "settings:settings_version";
const SETTINGS_VERSION: &str = "1.0.0";

/// Get app settings from settings store
#[tauri::command]
pub async fn get_app_settings(app: AppHandle) -> Result<AppSettings, String> {
    let store = app
        .store_builder("settings.json")
        .build()
        .map_err(|e| e.to_string())?;

    match store.get(SETTINGS_KEY) {
        Some(value) => {
            // Try to deserialize the settings
            serde_json::from_value(value.clone()).map_err(|e| {
                log::error!("Failed to deserialize settings: {}", e);
                // Return default settings on error
                format!("Failed to deserialize settings: {}", e)
            })
        }
        None => {
            // First time - save and return default settings
            let default_settings = AppSettings::default();
            save_settings_internal(&app, &default_settings).await?;
            Ok(default_settings)
        }
    }
}

/// Update app settings
#[tauri::command]
pub async fn update_app_settings(
    app: AppHandle,
    updates: JsonValue,
) -> Result<AppSettings, String> {
    // Get current settings
    let mut current_settings = get_app_settings(app.clone()).await?;

    // Deep merge updates into current settings
    deep_merge_settings(&mut current_settings, &updates)?;

    // Save the updated settings
    save_settings_internal(&app, &current_settings).await?;

    // Emit event to notify all windows
    app.emit(SETTINGS_CHANGED_EVENT, &current_settings)
        .map_err(|e| format!("Failed to emit settings changed event: {}", e))?;

    log::info!("Settings updated successfully");

    Ok(current_settings)
}

/// Reset app settings to defaults
#[tauri::command]
pub async fn reset_app_settings(app: AppHandle) -> Result<AppSettings, String> {
    let default_settings = AppSettings::default();

    // Save default settings
    save_settings_internal(&app, &default_settings).await?;

    // Emit event to notify all windows
    app.emit(SETTINGS_CHANGED_EVENT, &default_settings)
        .map_err(|e| format!("Failed to emit settings changed event: {}", e))?;

    log::info!("Settings reset to defaults");

    Ok(default_settings)
}

/// Export app settings as JSON string
#[tauri::command]
pub async fn export_app_settings(app: AppHandle) -> Result<String, String> {
    let settings = get_app_settings(app).await?;

    let export_data = serde_json::json!({
        "version": SETTINGS_VERSION,
        "timestamp": std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map_err(|e| format!("System time error: {}", e))?
            .as_millis(),
        "settings": settings
    });

    serde_json::to_string_pretty(&export_data)
        .map_err(|e| format!("Failed to serialize export data: {}", e))
}

/// Import app settings from JSON string
#[tauri::command]
pub async fn import_app_settings(app: AppHandle, json_data: String) -> Result<AppSettings, String> {
    // Parse the import data
    let import_data: JsonValue =
        serde_json::from_str(&json_data).map_err(|e| format!("Invalid JSON format: {}", e))?;

    // Extract settings from import data
    let settings_value = import_data
        .get("settings")
        .ok_or("Invalid settings format: missing 'settings' field")?;

    // Deserialize settings
    let settings: AppSettings = serde_json::from_value(settings_value.clone())
        .map_err(|e| format!("Invalid settings format: {}", e))?;

    // Validate settings
    let validated_settings = validate_settings(settings)?;

    // Save the imported settings
    save_settings_internal(&app, &validated_settings).await?;

    // Emit event to notify all windows
    app.emit(SETTINGS_CHANGED_EVENT, &validated_settings)
        .map_err(|e| format!("Failed to emit settings changed event: {}", e))?;

    log::info!("Settings imported successfully");

    Ok(validated_settings)
}

// Internal helper functions

/// Save settings to settings store
async fn save_settings_internal(app: &AppHandle, settings: &AppSettings) -> Result<(), String> {
    let store = app
        .store_builder("settings.json")
        .build()
        .map_err(|e| e.to_string())?;

    // Serialize settings to JSON value
    let settings_value = serde_json::to_value(settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;

    store.set(SETTINGS_KEY, settings_value);
    store.set(SETTINGS_VERSION_KEY, SETTINGS_VERSION.to_string());

    store.save().map_err(|e| e.to_string())?;

    Ok(())
}

/// Deep merge updates into settings
fn deep_merge_settings(settings: &mut AppSettings, updates: &JsonValue) -> Result<(), String> {
    if let Some(obj) = updates.as_object() {
        // Update theme
        if let Some(theme) = obj.get("theme").and_then(|v| v.as_str()) {
            settings.theme = theme.to_string();
        }

        // Update language
        if let Some(language) = obj.get("language").and_then(|v| v.as_str()) {
            settings.language = language.to_string();
        }

        // Update autoUpdate
        if let Some(auto_update) = obj.get("autoUpdate").and_then(|v| v.as_bool()) {
            settings.auto_update = auto_update;
        }

        // Update crashReports
        if let Some(crash_reports) = obj.get("crashReports").and_then(|v| v.as_bool()) {
            settings.crash_reports = crash_reports;
        }

        // Update maxConcurrency
        if let Some(max_concurrency) = obj.get("maxConcurrency").and_then(|v| v.as_i64()) {
            settings.max_concurrency = max_concurrency as i32;
        }

        // Update proxy settings
        if let Some(proxy) = obj.get("proxy").and_then(|v| v.as_object()) {
            if let Some(enabled) = proxy.get("enabled").and_then(|v| v.as_bool()) {
                settings.proxy.enabled = enabled;
            }
            if let Some(url) = proxy.get("url").and_then(|v| v.as_str()) {
                settings.proxy.url = url.to_string();
            }
        }

        // Update debug settings
        if let Some(debug) = obj.get("debug").and_then(|v| v.as_object()) {
            if let Some(enabled) = debug.get("enabled").and_then(|v| v.as_bool()) {
                settings.debug.enabled = enabled;
            }
            if let Some(verbose_logging) = debug.get("verboseLogging").and_then(|v| v.as_bool()) {
                settings.debug.verbose_logging = verbose_logging;
            }
        }
    }

    Ok(())
}

/// Validate settings values
fn validate_settings(mut settings: AppSettings) -> Result<AppSettings, String> {
    // Validate theme
    if !["light", "dark", "system"].contains(&settings.theme.as_str()) {
        settings.theme = "system".to_string();
    }

    // Validate maxConcurrency
    if settings.max_concurrency < 1 || settings.max_concurrency > 100 {
        settings.max_concurrency = 20;
    }

    Ok(settings)
}
