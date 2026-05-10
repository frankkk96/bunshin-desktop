use crate::database::models::model::{JsonModelConfig, Model, ProviderConfig, RemoteProviderConfig};
use crate::database::repositories::ModelRepository;
use crate::database::AppState;
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager, State};
use uuid::Uuid;

const MODELS_API_URL: &str = "https://models.dev/api.json";

/// Get the models config directory path
fn get_models_config_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let resource_path = app
        .path()
        .resource_dir()
        .map_err(|e| format!("Failed to get resource dir: {}", e))?;

    let models_dir = resource_path.join("config").join("models");

    if models_dir.exists() {
        return Ok(models_dir);
    }

    // Fallback for development: try relative to the executable
    let exe_path = std::env::current_exe().map_err(|e| format!("Failed to get exe path: {}", e))?;
    let dev_models_dir = exe_path
        .parent()
        .and_then(|p| p.parent())
        .and_then(|p| p.parent())
        .map(|p| p.join("config").join("models"));

    if let Some(dir) = dev_models_dir {
        if dir.exists() {
            return Ok(dir);
        }
    }

    Err(format!("Models config directory not found: {:?}", models_dir))
}

/// Read and parse all model config files from the config directory
/// Returns JsonModelConfig (not converted to Model) to support partial updates
fn load_json_configs_from_directory(
    models_dir: &PathBuf,
) -> Result<Vec<(String, JsonModelConfig)>, String> {
    let mut all_configs = Vec::new();

    let entries = fs::read_dir(models_dir)
        .map_err(|e| format!("Failed to read models directory: {}", e))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read directory entry: {}", e))?;
        let path = entry.path();

        // Only process .json files
        if path.extension().and_then(|s| s.to_str()) != Some("json") {
            continue;
        }

        let json_str = fs::read_to_string(&path)
            .map_err(|e| format!("Failed to read file {:?}: {}", path, e))?;

        let config: ProviderConfig = serde_json::from_str(&json_str)
            .map_err(|e| format!("Failed to parse {:?}: {}", path, e))?;

        let provider_id = config.id.clone();
        let model_count = config.models.len();
        for json_model in config.models {
            all_configs.push((provider_id.clone(), json_model));
        }

        log::debug!(
            "Loaded {} model configs from {:?}",
            model_count,
            path.file_name()
        );
    }

    Ok(all_configs)
}

/// Fetch models from remote API (models.dev)
async fn fetch_remote_models() -> Result<HashMap<String, RemoteProviderConfig>, String> {
    log::info!("Fetching models from remote API: {}", MODELS_API_URL);

    let response = reqwest::get(MODELS_API_URL)
        .await
        .map_err(|e| format!("Failed to fetch remote models: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Remote API returned status: {}", response.status()));
    }

    let data: HashMap<String, RemoteProviderConfig> = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse remote models: {}", e))?;

    log::info!("Fetched {} providers from remote API", data.len());
    Ok(data)
}

/// Initialize models on app startup
/// Step 1: Fetch from models.dev and upsert to database
/// Step 2: Load from config/models/*.json and upsert to database (may override step 1)
/// Both steps are independent - if step 1 fails, step 2 still runs
pub async fn init_models(app: &AppHandle, pool: sqlx::SqlitePool) -> Result<(), String> {
    let repository = ModelRepository::new(pool.clone());

    // Step 1: Fetch from remote API and upsert to database
    log::info!("Step 1: Fetching models from remote API...");
    match fetch_remote_models().await {
        Ok(remote_data) => {
            let mut total_count = 0;
            for (provider_id, provider_config) in remote_data {
                for (_model_id, remote_model) in provider_config.models {
                    let model = remote_model.to_model(provider_id.clone());
                    if let Err(e) = repository.upsert(model.clone(), &provider_id).await {
                        log::warn!(
                            "Failed to upsert remote model {} for provider {}: {}",
                            model.id,
                            provider_id,
                            e
                        );
                    } else {
                        total_count += 1;
                    }
                }
            }
            log::info!("Step 1 completed: upserted {} models from remote API", total_count);
        }
        Err(e) => {
            log::warn!("Step 1 failed (will continue with step 2): {}", e);
        }
    }

    // Step 2: Load from local JSON config and merge into database
    // If model exists in DB, merge only the fields present in JSON
    // If model doesn't exist in DB, create new with defaults for missing fields
    log::info!("Step 2: Loading models from local config...");
    match get_models_config_dir(app) {
        Ok(models_dir) => {
            match load_json_configs_from_directory(&models_dir) {
                Ok(local_configs) => {
                    let mut success_count = 0;
                    for (provider_id, json_config) in local_configs {
                        let model_id = json_config.id.clone();

                        // Check if model already exists in database
                        let result = match repository.get_by_id(&model_id, &provider_id).await {
                            Ok(Some(existing_model)) => {
                                // Merge: only update fields that are present in JSON
                                let merged_model = json_config.merge_into(existing_model);
                                repository.update(merged_model, &provider_id).await
                            }
                            Ok(None) => {
                                // Create new: use defaults for missing fields
                                let new_model = json_config.to_model(provider_id.clone());
                                repository.create(new_model, &provider_id).await
                            }
                            Err(e) => {
                                log::warn!(
                                    "Failed to check existing model {} for provider {}: {}",
                                    model_id,
                                    provider_id,
                                    e
                                );
                                continue;
                            }
                        };

                        if let Err(e) = result {
                            log::warn!(
                                "Failed to upsert local model {} for provider {}: {}",
                                model_id,
                                provider_id,
                                e
                            );
                        } else {
                            success_count += 1;
                        }
                    }
                    log::info!(
                        "Step 2 completed: merged {} models from local config",
                        success_count
                    );
                }
                Err(e) => {
                    log::warn!("Step 2 failed to load models from directory: {}", e);
                }
            }
        }
        Err(e) => {
            log::warn!("Step 2 failed to get models config directory: {}", e);
        }
    }

    log::info!("Models initialization completed");

    // Seed default agents after models are initialized
    seed_default_agents(&pool).await?;

    Ok(())
}

/// Seed default agents on first launch (when custom_agents table is empty)
/// Uses the first available model from each provider
async fn seed_default_agents(pool: &sqlx::SqlitePool) -> Result<(), String> {
    // Check if there are any existing agents
    let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM custom_agents")
        .fetch_one(pool)
        .await
        .map_err(|e| format!("Failed to count agents: {}", e))?;

    if count.0 > 0 {
        // Agents already exist, skip seeding
        log::debug!("Agents already exist, skipping seed");
        return Ok(());
    }

    log::info!("First launch detected, seeding default agents...");

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64;

    // Default prompt and extension configs (empty)
    let default_prompts = r#"{"systemPrompt":"","shortcuts":[]}"#;
    let default_extensions = r#"{"mcpServers":[],"skipPermission":false}"#;
    let default_extra_configs = "[]";

    // Providers to seed: (alias, provider_display_name, provider_id)
    let providers_to_seed = [
        ("ChatGPT", "OpenAI", "openai"),
        ("Claude", "Anthropic", "anthropic"),
        ("Gemini", "Google", "google"),
        ("DeepSeek", "DeepSeek", "deepseek"),
        ("Qwen", "Alibaba", "alibaba"),
    ];

    let model_repository = ModelRepository::new(pool.clone());

    for (alias, provider_name, provider_id) in providers_to_seed {
        // Get the first model for this provider from the models table
        let models = model_repository
            .get_by_provider(provider_id)
            .await
            .map_err(|e| format!("Failed to get models for {}: {}", provider_id, e))?;

        if models.is_empty() {
            log::warn!(
                "No models found for provider {}, skipping agent creation",
                provider_id
            );
            continue;
        }

        // Use the first model (they should be sorted by some reasonable order)
        let model = &models[0];
        let id = Uuid::new_v4().to_string();
        // Format description as "providerName | modelName"
        let description = format!("{} | {}", provider_name, model.name);

        sqlx::query(
            r#"
            INSERT INTO custom_agents (
                id, alias, description, pinned, provider, model,
                prompts, extensions, extra_configs, created_at, updated_at
            ) VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&id)
        .bind(alias)
        .bind(&description)
        .bind(provider_id)
        .bind(&model.id)
        .bind(default_prompts)
        .bind(default_extensions)
        .bind(default_extra_configs)
        .bind(now)
        .bind(now)
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to insert agent {}: {}", alias, e))?;

        // Create a session for this agent (contact_id = agent_id)
        let session_id = Uuid::new_v4().to_string();
        sqlx::query(
            r#"
            INSERT INTO sessions (
                id, contact_id, favorite, visited_at, created_at, updated_at
            ) VALUES (?, ?, 0, ?, ?, ?)
            "#,
        )
        .bind(&session_id)
        .bind(&id) // contact_id = agent_id
        .bind(now) // visited_at
        .bind(now) // created_at
        .bind(now) // updated_at
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to create session for agent {}: {}", alias, e))?;

        log::info!(
            "Created default agent: {} ({}/{}) with session {}",
            alias,
            provider_id,
            model.id,
            session_id
        );
    }

    log::info!("Default agents seeded successfully");
    Ok(())
}

#[tauri::command]
pub async fn get_models_by_provider(
    provider_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<Model>, String> {
    let repository = ModelRepository::new(state.db_pool.clone());

    repository
        .get_by_provider(&provider_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_model_by_id(
    model_id: String,
    provider_id: String,
    state: State<'_, AppState>,
) -> Result<Option<Model>, String> {
    let repository = ModelRepository::new(state.db_pool.clone());
    repository
        .get_by_id(&model_id, &provider_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_model(
    model: Model,
    provider_id: String,
    state: State<'_, AppState>,
) -> Result<Model, String> {
    let repository = ModelRepository::new(state.db_pool.clone());
    repository
        .create(model, &provider_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_model(
    model: Model,
    provider_id: String,
    state: State<'_, AppState>,
) -> Result<Model, String> {
    let repository = ModelRepository::new(state.db_pool.clone());
    repository
        .update(model, &provider_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_model(
    model_id: String,
    provider_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let repository = ModelRepository::new(state.db_pool.clone());
    repository
        .delete(&model_id, &provider_id)
        .await
        .map_err(|e| e.to_string())
}
