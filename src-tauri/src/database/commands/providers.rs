use crate::claude_agent::commands::PROVIDER_KEY_SERVICE;
use crate::claude_agent::process::provider_profile_dir;
use crate::database::models::{Provider, ProviderType};
use crate::database::repositories::ProviderRepository;
use crate::database::AppState;
use crate::secure_storage::SecureStorage;
use serde::Deserialize;
use tauri::{AppHandle, Manager, State};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateProviderInput {
    pub name: String,
    #[serde(rename = "type")]
    pub type_: ProviderType,
    pub base_url: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateProviderInput {
    pub id: String,
    pub name: String,
    pub base_url: Option<String>,
}

#[tauri::command]
pub async fn list_providers(state: State<'_, AppState>) -> Result<Vec<Provider>, String> {
    let repo = ProviderRepository::new(state.db_pool.clone());
    repo.list().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_provider(
    id: String,
    state: State<'_, AppState>,
) -> Result<Option<Provider>, String> {
    let repo = ProviderRepository::new(state.db_pool.clone());
    repo.get(&id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_provider(
    input: CreateProviderInput,
    state: State<'_, AppState>,
) -> Result<Provider, String> {
    let repo = ProviderRepository::new(state.db_pool.clone());
    let now = chrono::Utc::now().timestamp_millis();
    let provider = Provider {
        id: uuid::Uuid::new_v4().to_string(),
        name: input.name,
        type_: input.type_,
        base_url: input.base_url,
        created_at: now,
        updated_at: now,
    };
    repo.create(provider).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_provider(
    input: UpdateProviderInput,
    state: State<'_, AppState>,
) -> Result<Provider, String> {
    let repo = ProviderRepository::new(state.db_pool.clone());
    let existing = repo
        .get(&input.id)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("provider {} not found", input.id))?;
    let now = chrono::Utc::now().timestamp_millis();
    let provider = Provider {
        id: existing.id,
        name: input.name,
        type_: existing.type_,
        base_url: input.base_url,
        created_at: existing.created_at,
        updated_at: now,
    };
    repo.update(provider).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_provider(
    id: String,
    state: State<'_, AppState>,
    app: AppHandle,
) -> Result<(), String> {
    // ON DELETE RESTRICT — fails fast if agents still reference this provider.
    ProviderRepository::new(state.db_pool.clone())
        .delete(&id)
        .await
        .map_err(|e| e.to_string())?;

    // Best-effort cleanup of side-channel state: a partial cleanup is OK because
    // the canonical record (the SQL row) is already gone.
    if let Ok(app_data_dir) = app.path().app_data_dir() {
        let storage =
            SecureStorage::with_base_dir(PROVIDER_KEY_SERVICE.to_string(), app_data_dir);
        if let Err(e) = storage.delete(&id) {
            log::warn!("provider {id}: failed to delete secure key: {e}");
        }
    }

    if let Ok(profile_dir) = provider_profile_dir(&app, &id) {
        if profile_dir.exists() {
            if let Err(e) = std::fs::remove_dir_all(&profile_dir) {
                log::warn!(
                    "provider {id}: failed to remove profile dir {}: {e}",
                    profile_dir.display()
                );
            }
        }
    }

    Ok(())
}
