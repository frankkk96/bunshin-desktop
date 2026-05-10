use super::{ExtensionTool, MCPManager, MCPServerConfig, MCPToolResult, OAuthManager, StartServerResult};
use std::sync::Arc;
use tauri::{AppHandle, State};
use tokio::sync::Mutex;

pub type MCPManagerState = Arc<Mutex<Option<MCPManager>>>;
pub type OAuthManagerState = Arc<OAuthManager>;

#[tauri::command]
pub async fn mcp_start_server(
    config: MCPServerConfig,
    app_handle: AppHandle,
    manager_state: State<'_, MCPManagerState>,
    oauth_state: State<'_, OAuthManagerState>,
) -> Result<StartServerResult, String> {
    let mut manager_guard = manager_state.lock().await;

    // Initialize manager if not already done
    if manager_guard.is_none() {
        // Create MCPManager with OAuth support
        let oauth_manager = oauth_state.inner().clone();
        *manager_guard = Some(MCPManager::with_oauth_manager(
            app_handle.clone(),
            oauth_manager,
        )?);
    }

    if let Some(manager) = manager_guard.as_ref() {
        manager.start_server(config).await
    } else {
        Err("MCP Manager failed to initialize".to_string())
    }
}

#[tauri::command]
pub async fn mcp_stop_server(
    server_id: String,
    manager_state: State<'_, MCPManagerState>,
) -> Result<(), String> {
    let manager_guard = manager_state.lock().await;
    if let Some(manager) = manager_guard.as_ref() {
        manager.stop_server(&server_id).await?;
    } else {
        return Err("MCP Manager not initialized".to_string());
    }

    Ok(())
}

#[tauri::command]
pub async fn mcp_cancel_connection(
    server_id: String,
    manager_state: State<'_, MCPManagerState>,
) -> Result<(), String> {
    let manager_guard = manager_state.lock().await;
    if let Some(manager) = manager_guard.as_ref() {
        manager.cancel_connection(&server_id).await?;
    } else {
        return Err("MCP Manager not initialized".to_string());
    }

    Ok(())
}

#[tauri::command]
pub async fn mcp_list_tools(
    server_id: String,
    manager_state: State<'_, MCPManagerState>,
) -> Result<Vec<ExtensionTool>, String> {
    let manager_guard = manager_state.lock().await;
    if let Some(manager) = manager_guard.as_ref() {
        manager.list_tools(&server_id).await
    } else {
        Err("MCP Manager not initialized".to_string())
    }
}

#[tauri::command]
pub async fn mcp_call_tool(
    server_id: String,
    tool_name: String,
    arguments: serde_json::Value,
    manager_state: State<'_, MCPManagerState>,
) -> Result<MCPToolResult, String> {
    let manager_guard = manager_state.lock().await;
    if let Some(manager) = manager_guard.as_ref() {
        manager.call_tool(&server_id, &tool_name, arguments).await
    } else {
        Err("MCP Manager not initialized".to_string())
    }
}
