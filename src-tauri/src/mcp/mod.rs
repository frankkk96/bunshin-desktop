pub mod commands;

use oauth2::TokenResponse;
use rmcp::{
    model::CallToolRequestParam,
    transport::auth::OAuthState as RmcpOAuthState,
    transport::{
        streamable_http_client::{StreamableHttpClientTransportConfig, StreamableHttpClientWorker},
        TokioChildProcess, WorkerTransport,
    },
    ServiceExt,
};
use std::process::Stdio;
use tokio::io::AsyncReadExt;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tokio::process::Command;
use tokio::sync::Mutex;

use crate::secure_storage::SecureStorage;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

#[cfg(windows)]
fn set_no_window(cmd: &mut Command) {
    cmd.creation_flags(CREATE_NO_WINDOW);
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MCPServerConfig {
    pub id: String,
    pub name: String,
    pub server_type: String, // "stdio" or "http"
    pub command: Option<String>,
    pub args: Option<Vec<String>>,
    pub env: Option<Vec<MCPEnvVar>>,
    pub url: Option<String>,
    pub auth_token: Option<String>, // Bearer token for HTTP authentication (without "Bearer " prefix)
    pub use_oauth: Option<bool>,    // Whether to use OAuth authentication
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MCPEnvVar {
    pub key: String,
    pub value: String,
}

// ============================================================================
// OAuth Types and Manager
// ============================================================================

/// OAuth configuration for MCP servers
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OAuthConfig {
    pub client_id: String,
    pub client_secret: Option<String>,
    pub scopes: Vec<String>,
    pub redirect_uri: String,
}

/// OAuth state for a server (simplified - just tracks authentication status)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OAuthState {
    pub is_authenticated: bool,
    pub metadata: Option<serde_json::Value>,
}

/// Stored OAuth tokens for persistence
#[derive(Debug, Clone, Serialize, Deserialize)]
struct StoredOAuthTokens {
    access_token: String,
    refresh_token: Option<String>,
    expires_at: Option<i64>, // Unix timestamp
}

/// OAuth manager wrapping rmcp's OAuth state machine
/// This manager maintains OAuth states for MCP servers and delegates
/// all OAuth operations to rmcp's built-in OAuthState
pub struct OAuthManager {
    states: Arc<Mutex<HashMap<String, Arc<Mutex<RmcpOAuthState>>>>>,
    /// Channels waiting for OAuth completion
    oauth_waiters: Arc<Mutex<HashMap<String, tokio::sync::oneshot::Sender<Result<(), String>>>>>,
    /// Secure storage for persisting OAuth tokens
    secure_storage: SecureStorage,
}

impl OAuthManager {
    /// Create OAuthManager with custom app data directory (recommended for Tauri apps)
    pub fn with_app_data_dir(app_data_dir: std::path::PathBuf) -> Self {
        Self {
            states: Arc::new(Mutex::new(HashMap::new())),
            oauth_waiters: Arc::new(Mutex::new(HashMap::new())),
            secure_storage: SecureStorage::with_base_dir("mcp_oauth", app_data_dir),
        }
    }

    /// Initialize OAuth for a server (create OAuth state machine)
    /// Following MCP spec: https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization
    pub async fn initialize(
        &self,
        _app_handle: &AppHandle,
        server_id: String,
        server_url: String,
        _config: OAuthConfig,
    ) -> Result<(), String> {
        log::info!(
            "[OAuth] Initializing OAuth for server: {} (URL: {})",
            server_id,
            server_url
        );

        // Create OAuth state machine
        // rmcp will automatically:
        // 1. Discover resource metadata from /.well-known/oauth-protected-resource (RFC 9728)
        // 2. Discover authorization server metadata from /.well-known/oauth-authorization-server (RFC 8414)
        // 3. Optionally register client dynamically if supported
        // TODO: Implement token persistence - rmcp may store tokens in memory only in current version
        //       Need to investigate rmcp's token storage mechanism and add persistence if needed
        let oauth_state = RmcpOAuthState::new(&server_url, None).await.map_err(|e| {
            log::error!("[OAuth] Failed to create OAuth state: {}", e);
            format!("Failed to create OAuth state: {}", e)
        })?;

        log::info!(
            "[OAuth] Created OAuth state machine for server: {}",
            server_id
        );

        // Store the state
        let mut states = self.states.lock().await;
        states.insert(server_id.clone(), Arc::new(Mutex::new(oauth_state)));

        log::debug!("[OAuth] Stored OAuth state for server: {}", server_id);
        Ok(())
    }

    pub async fn has_state(&self, server_id: &str) -> bool {
        let states = self.states.lock().await;
        states.contains_key(server_id)
    }

    /// Get authorization URL (with PKCE automatically handled by rmcp)
    pub async fn get_authorization_url(
        &self,
        server_id: &str,
        scopes: Vec<String>,
    ) -> Result<String, String> {
        log::info!(
            "[OAuth] get_authorization_url called for server: {}",
            server_id
        );
        log::debug!("[OAuth] Requested scopes: {:?}", scopes);

        let states = self.states.lock().await;
        let state = states.get(server_id).ok_or_else(|| {
            log::error!(
                "[OAuth] Server {} not initialized for authorization URL",
                server_id
            );
            format!("Server {} not initialized", server_id)
        })?;

        let mut state = state.lock().await;
        let scope_refs: Vec<&str> = scopes.iter().map(|s| s.as_str()).collect();

        log::debug!("[OAuth] Starting authorization for server: {}", server_id);

        // Include server_id in redirect_uri so we can identify which server this callback is for
        let redirect_uri = format!("bunshin://mcp-oauth-callback/{}", server_id);

        // Start authorization
        // rmcp will automatically include:
        // - PKCE parameters (code_challenge, code_challenge_method=S256) - Required by MCP spec
        // - state parameter (for CSRF protection) - Required by MCP spec
        // - resource parameter (RFC 8707) - Required by MCP spec to specify target MCP server
        state
            .start_authorization(&scope_refs, &redirect_uri, None)
            .await
            .map_err(|e| {
                log::error!("[OAuth] Failed to start authorization: {}", e);
                format!("Failed to start authorization: {}", e)
            })?;

        log::debug!(
            "[OAuth] Getting authorization URL for server: {}",
            server_id
        );
        // Get the authorization URL from the session
        let url = state.get_authorization_url().await.map_err(|e| {
            log::error!("[OAuth] Failed to get authorization URL: {}", e);
            format!("Failed to get authorization URL: {}", e)
        })?;

        log::info!(
            "[OAuth] Got authorization URL for server {}: {}",
            server_id,
            url
        );
        Ok(url)
    }

    /// Exchange authorization code for tokens (PKCE verification automatic)
    /// Following MCP spec: https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization
    pub async fn exchange_code(
        &self,
        server_id: &str,
        code: String,
        csrf_token: String,
    ) -> Result<(), String> {
        log::info!("[OAuth] exchange_code called for server: {}", server_id);
        log::debug!(
            "[OAuth] code length: {}, csrf_token length: {}",
            code.len(),
            csrf_token.len()
        );

        let states = self.states.lock().await;
        let state = states.get(server_id).ok_or_else(|| {
            log::error!("[OAuth] Server {} not found in states map", server_id);
            format!("Server {} not initialized", server_id)
        })?;

        let mut state = state.lock().await;

        log::info!("[OAuth] Calling handle_callback for server: {}", server_id);
        // rmcp will automatically:
        // 1. Verify state parameter (CSRF protection) - Required by MCP spec
        // 2. Exchange code for token with PKCE code_verifier - Required by MCP spec
        // 3. Include resource parameter in token request - Required by MCP spec (RFC 8707)
        // 4. Store access_token and refresh_token securely
        state
            .handle_callback(&code, &csrf_token)
            .await
            .map_err(|e| {
                log::error!("[OAuth] handle_callback failed: {}", e);
                format!("Failed to handle callback: {}", e)
            })?;

        log::info!(
            "[OAuth] handle_callback succeeded for server: {}",
            server_id
        );
        log::info!("[OAuth] Token is now managed by rmcp's OAuthState");

        // Release the state lock before saving tokens
        drop(state);
        drop(states);

        // Save tokens to secure storage for persistence across app restarts
        if let Err(e) = self.save_tokens(server_id).await {
            log::warn!("[OAuth] Failed to save tokens: {}", e);
            // Continue even if saving fails - the tokens are still in memory
        }

        // Notify waiting tasks that OAuth is complete
        let mut waiters = self.oauth_waiters.lock().await;
        if let Some(sender) = waiters.remove(server_id) {
            log::info!("[OAuth] Notifying waiter for server: {}", server_id);
            let _ = sender.send(Ok(()));
        }

        Ok(())
    }

    /// Get valid access token (automatically refreshes if expired)
    /// Following MCP spec: Token will be used in Authorization header as "Bearer <token>"
    /// First tries to load from secure storage, then from OAuth state
    pub async fn get_valid_token(&self, server_id: &str) -> Result<String, String> {
        log::info!("[OAuth] get_valid_token called for server: {}", server_id);

        // First, try to load token from secure storage (for persistence across restarts)
        if let Ok(stored_tokens) = self.load_tokens(server_id) {
            log::info!("[OAuth] Using stored token for {}", server_id);
            return Ok(stored_tokens.access_token);
        }

        // If no stored token, try to get from OAuth state (in-memory)
        log::info!(
            "[OAuth] No stored token, checking OAuth state for {}",
            server_id
        );
        log::info!("[OAuth] Acquiring states lock for {}", server_id);
        let states = self.states.lock().await;
        log::info!(
            "[OAuth] States lock acquired, looking for server: {}",
            server_id
        );

        let state = states
            .get(server_id)
            .ok_or_else(|| {
                log::error!("[OAuth] Server {} not found in states map", server_id);
                format!("Server {} not initialized", server_id)
            })?
            .clone();

        // Release states lock before potentially long-running operation
        drop(states);

        log::info!(
            "[OAuth] Found state for {}, calling get_credentials WITHOUT holding lock...",
            server_id
        );

        // IMPORTANT: Don't hold the Mutex lock while calling get_credentials()
        // because get_credentials() internally needs to acquire locks
        // which can cause deadlock if we're holding the outer lock

        use tokio::time::{timeout, Duration};

        // Call get_credentials without holding the state lock
        let credentials_future = async {
            let state_guard = state.lock().await;
            state_guard.get_credentials().await
        };

        log::info!(
            "[OAuth] About to call get_credentials().await for {} with 10s timeout",
            server_id
        );
        match timeout(Duration::from_secs(10), credentials_future).await {
            Ok(Ok((_client_id, token_response_opt))) => {
                log::info!("[OAuth] get_credentials completed for {}", server_id);
                if let Some(token_response) = token_response_opt {
                    let token = token_response.access_token().secret().to_string();
                    log::info!(
                        "[OAuth] Got access token from rmcp OAuthState (length: {})",
                        token.len()
                    );
                    // This token will be used in HTTP header: Authorization: Bearer <token>
                    // As required by MCP spec
                    Ok(token)
                } else {
                    log::error!(
                        "[OAuth] No token response in credentials for server: {}",
                        server_id
                    );
                    Err(format!("No access token found for server: {}", server_id))
                }
            }
            Ok(Err(e)) => {
                log::error!("[OAuth] Failed to get credentials: {}", e);
                Err(format!("Failed to get credentials: {}", e))
            }
            Err(_) => {
                log::error!(
                    "[OAuth] get_credentials() timed out after 10s for {}",
                    server_id
                );
                Err(format!(
                    "Timeout getting credentials for server: {}",
                    server_id
                ))
            }
        }
    }

    /// Cancel OAuth flow by notifying the waiting channel
    pub async fn cancel_oauth_flow(&self, server_id: &str) {
        log::info!("[OAuth] Cancelling OAuth flow for server: {}", server_id);

        let mut waiters = self.oauth_waiters.lock().await;
        if let Some(sender) = waiters.remove(server_id) {
            log::info!("[OAuth] Sending cancellation to waiter for server: {}", server_id);
            let _ = sender.send(Err("User cancelled OAuth authentication".to_string()));
        } else {
            log::info!("[OAuth] No waiter found to cancel for server: {}", server_id);
        }
    }

    /// Clear OAuth state
    pub async fn clear_state(&self, server_id: &str) {
        log::info!("[OAuth] Clearing OAuth state for server: {}", server_id);

        let mut states = self.states.lock().await;
        states.remove(server_id);

        log::info!("[OAuth] Cleared OAuth state for server: {}", server_id);
    }

    /// Save OAuth tokens to secure storage
    async fn save_tokens(&self, server_id: &str) -> Result<(), String> {
        log::info!("[OAuth] Saving tokens for server: {}", server_id);

        let states = self.states.lock().await;
        let state = states
            .get(server_id)
            .ok_or_else(|| format!("Server {} not found", server_id))?
            .clone();
        drop(states);

        // Get credentials from OAuth state
        let state_guard = state.lock().await;
        match state_guard.get_credentials().await {
            Ok((_client_id, Some(token_response))) => {
                let access_token = token_response.access_token().secret().to_string();
                let refresh_token = token_response
                    .refresh_token()
                    .map(|t| t.secret().to_string());
                let expires_at = token_response.expires_in().map(|duration| {
                    std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap()
                        .as_secs() as i64
                        + duration.as_secs() as i64
                });

                let stored_tokens = StoredOAuthTokens {
                    access_token,
                    refresh_token,
                    expires_at,
                };

                self.secure_storage
                    .set_json(server_id, &stored_tokens)
                    .map_err(|e| format!("Failed to save tokens: {}", e))?;

                log::info!(
                    "[OAuth] Tokens saved successfully for server: {}",
                    server_id
                );
                Ok(())
            }
            Ok((_client_id, None)) => {
                log::warn!(
                    "[OAuth] No tokens available to save for server: {}",
                    server_id
                );
                Err("No tokens available".to_string())
            }
            Err(e) => {
                log::error!("[OAuth] Failed to get credentials for saving: {}", e);
                Err(format!("Failed to get credentials: {}", e))
            }
        }
    }

    /// Load OAuth tokens from secure storage
    fn load_tokens(&self, server_id: &str) -> Result<StoredOAuthTokens, String> {
        log::info!("[OAuth] Loading tokens for server: {}", server_id);

        match self.secure_storage.get_json::<StoredOAuthTokens>(server_id) {
            Ok(Some(tokens)) => {
                // Check if token is expired
                if let Some(expires_at) = tokens.expires_at {
                    let now = std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap()
                        .as_secs() as i64;

                    if now >= expires_at {
                        log::warn!("[OAuth] Stored token for {} is expired", server_id);
                        return Err("Token expired".to_string());
                    }
                }

                log::info!(
                    "[OAuth] Tokens loaded successfully for server: {}",
                    server_id
                );
                Ok(tokens)
            }
            Ok(None) => {
                log::info!("[OAuth] No stored tokens found for server: {}", server_id);
                Err("No stored tokens".to_string())
            }
            Err(e) => {
                log::error!("[OAuth] Failed to load tokens: {}", e);
                Err(format!("Failed to load tokens: {}", e))
            }
        }
    }

    /// Wait for OAuth to complete
    /// Shows confirmation dialog, then opens browser and waits for the OAuth callback
    pub async fn wait_for_oauth(
        &self,
        app_handle: &AppHandle,
        server_id: &str,
        server_name: &str,
        server_url: &str,
        auth_url: &str,
    ) -> Result<(), String> {
        log::info!("[OAuth] Starting OAuth flow for server: {}", server_id);

        // Show confirmation dialog with OK/Cancel buttons before opening browser
        use tauri_plugin_dialog::{DialogExt, MessageDialogButtons};
        let message = format!(
            "Server \"{}\" requires OAuth authentication.\n\nURL: {}\n\nContinue to authorize in browser?",
            server_name, server_url
        );
        let confirmed = app_handle
            .dialog()
            .message(&message)
            .title("Authentication Required")
            .buttons(MessageDialogButtons::OkCancelCustom(
                "Continue".to_string(),
                "Cancel".to_string(),
            ))
            .blocking_show();

        if !confirmed {
            log::info!(
                "[OAuth] User cancelled OAuth flow for server: {}",
                server_id
            );
            return Err("User cancelled OAuth authentication".to_string());
        }

        // Create a oneshot channel to wait for OAuth completion
        let (tx, rx) = tokio::sync::oneshot::channel();

        // Store the sender
        {
            let mut waiters = self.oauth_waiters.lock().await;
            waiters.insert(server_id.to_string(), tx);
        }

        // Open browser
        log::info!("[OAuth] Opening browser: {}", auth_url);
        if let Err(e) = open::that(auth_url) {
            log::error!("[OAuth] Failed to open browser: {}", e);
            // Clean up waiter
            let mut waiters = self.oauth_waiters.lock().await;
            waiters.remove(server_id);
            return Err(format!("Failed to open browser: {}", e));
        }

        log::info!("[OAuth] Browser opened, waiting for OAuth callback...");

        // Wait for OAuth to complete (with timeout)
        match tokio::time::timeout(tokio::time::Duration::from_secs(120), rx).await {
            Ok(Ok(result)) => {
                log::info!("[OAuth] OAuth flow completed for server: {}", server_id);
                result
            }
            Ok(Err(_)) => {
                log::error!(
                    "[OAuth] OAuth channel closed unexpectedly for server: {}",
                    server_id
                );
                Err("OAuth flow was cancelled".to_string())
            }
            Err(_) => {
                log::error!("[OAuth] OAuth timeout for server: {}", server_id);
                // Clean up waiter
                let mut waiters = self.oauth_waiters.lock().await;
                waiters.remove(server_id);
                Err("OAuth timeout (5 minutes)".to_string())
            }
        }
    }

    /// Handle OAuth callback from URL (for deep link handler)
    /// Extracts code and state from the callback URL and completes the OAuth flow
    pub async fn handle_callback_from_url(
        &self,
        server_id: &str,
        callback_url: &str,
    ) -> Result<(), String> {
        log::info!(
            "[OAuth] Handling callback from URL for server: {}",
            server_id
        );

        // Parse the callback URL
        let parsed =
            url::Url::parse(callback_url).map_err(|e| format!("Invalid callback URL: {}", e))?;

        let mut code = None;
        let mut csrf_token = None;

        for (key, value) in parsed.query_pairs() {
            match key.as_ref() {
                "code" => code = Some(value.to_string()),
                "state" => csrf_token = Some(value.to_string()),
                _ => {}
            }
        }

        let code = code.ok_or("Missing 'code' parameter in callback URL")?;
        let csrf_token = csrf_token.ok_or("Missing 'state' parameter in callback URL")?;

        // Exchange code for tokens
        self.exchange_code(server_id, code, csrf_token).await
    }
}

// ============================================================================
// Connection Error Types
// ============================================================================

#[derive(Debug)]
enum ConnectionError {
    /// Server requires OAuth authentication (401/403 response)
    AuthRequired {
        server_url: String,
        scope_hint: Option<Vec<String>>,
    },
    /// Other connection errors
    Other(String),
}

// ============================================================================
// MCP Types
// ============================================================================

/// Extension tool - matches frontend ExtensionTool interface
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExtensionTool {
    pub name: String,
    pub description: Option<String>,
    pub input_schema: serde_json::Value,
    pub extension_id: String,
    pub extension_name: String,
}

/// Start server result with tools (OAuth is handled internally if needed)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StartServerResult {
    pub tools: Vec<ExtensionTool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MCPToolResult {
    pub content: Vec<MCPContent>,
    #[serde(rename = "isError")]
    pub is_error: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MCPContent {
    #[serde(rename = "type")]
    pub content_type: String,
    pub text: Option<String>,
    pub data: Option<String>,
    pub url: Option<String>,
}

pub enum MCPTransport {
    Stdio(Arc<rmcp::service::RunningService<rmcp::RoleClient, ()>>),
    Http(Arc<rmcp::service::RunningService<rmcp::RoleClient, ()>>),
}

impl MCPTransport {
    fn as_service(&self) -> &Arc<rmcp::service::RunningService<rmcp::RoleClient, ()>> {
        match self {
            MCPTransport::Stdio(service) => service,
            MCPTransport::Http(service) => service,
        }
    }
}

pub struct MCPClientWrapper {
    config: MCPServerConfig,
    transport: Option<MCPTransport>,
}

impl MCPClientWrapper {
    pub fn new(config: MCPServerConfig) -> Result<Self, String> {
        Ok(Self {
            config,
            transport: None,
        })
    }

    pub async fn connect(&mut self) -> Result<(), String> {
        match self.config.server_type.as_str() {
            "stdio" => self.connect_stdio().await,
            "http" => self.connect_http().await,
            _ => Err(format!(
                "Unsupported server type: {}. Supported types are: stdio, http",
                self.config.server_type
            )),
        }
    }

    async fn connect_stdio(&mut self) -> Result<(), String> {
        if self.config.command.is_none() {
            return Err("Command is required for STDIO servers".to_string());
        }

        let service = self.create_stdio_service().await?;
        self.transport = Some(MCPTransport::Stdio(Arc::new(service)));
        Ok(())
    }

    async fn connect_http(&mut self) -> Result<(), String> {
        if self.config.url.is_none() {
            return Err("URL is required for HTTP servers".to_string());
        }

        let service = self.create_http_service().await?;
        self.transport = Some(MCPTransport::Http(Arc::new(service)));
        Ok(())
    }

    async fn create_stdio_service(
        &self,
    ) -> Result<rmcp::service::RunningService<rmcp::RoleClient, ()>, String> {
        let command = self
            .config
            .command
            .as_ref()
            .ok_or("Command is required for STDIO servers")?;

        let (mut cmd, skip_args) = if cfg!(target_os = "windows") {
            match command.as_str() {
                "npx" => {
                    let mut cmd = Command::new("cmd");
                    let mut cmd_args = vec!["/C", "npx"];
                    if let Some(args) = &self.config.args {
                        cmd_args.extend(args.iter().map(|s| s.as_str()));
                    }
                    cmd.args(&cmd_args);
                    #[cfg(windows)]
                    set_no_window(&mut cmd);
                    (cmd, true)
                }
                cmd_name if cmd_name.ends_with(".cmd") || cmd_name.ends_with(".bat") => {
                    let mut cmd = Command::new("cmd");
                    let mut cmd_args = vec!["/C", command];
                    if let Some(args) = &self.config.args {
                        cmd_args.extend(args.iter().map(|s| s.as_str()));
                    }
                    cmd.args(&cmd_args);
                    #[cfg(windows)]
                    set_no_window(&mut cmd);
                    (cmd, true)
                }
                cmd_name if cmd_name.ends_with(".ps1") => {
                    let mut cmd = Command::new("powershell");
                    let mut cmd_args = vec!["-ExecutionPolicy", "Bypass", "-File", command];
                    if let Some(args) = &self.config.args {
                        cmd_args.extend(args.iter().map(|s| s.as_str()));
                    }
                    cmd.args(&cmd_args);
                    #[cfg(windows)]
                    set_no_window(&mut cmd);
                    (cmd, true)
                }
                _ => {
                    if let Ok(output) = std::process::Command::new("where").arg(command).output() {
                        if output.status.success() {
                            let exe_path = String::from_utf8_lossy(&output.stdout)
                                .lines()
                                .next()
                                .unwrap_or(command)
                                .trim()
                                .to_string();

                            if exe_path.ends_with(".cmd") || exe_path.ends_with(".bat") {
                                let mut cmd = Command::new("cmd");
                                let mut cmd_args = vec!["/C", &exe_path];
                                if let Some(args) = &self.config.args {
                                    cmd_args.extend(args.iter().map(|s| s.as_str()));
                                }
                                cmd.args(&cmd_args);
                                #[cfg(windows)]
                                set_no_window(&mut cmd);
                                (cmd, true)
                            } else {
                                #[allow(unused_mut)]
                                let mut cmd = Command::new(&exe_path);
                                #[cfg(windows)]
                                set_no_window(&mut cmd);
                                (cmd, false)
                            }
                        } else {
                            #[allow(unused_mut)]
                            let mut cmd = Command::new(command);
                            #[cfg(windows)]
                            set_no_window(&mut cmd);
                            (cmd, false)
                        }
                    } else {
                        #[allow(unused_mut)]
                        let mut cmd = Command::new(command);
                        #[cfg(windows)]
                        set_no_window(&mut cmd);
                        (cmd, false)
                    }
                }
            }
        } else {
            (Command::new(command), false)
        };

        if !skip_args {
            if let Some(args) = &self.config.args {
                cmd.args(args);
            }
        }

        if let Some(env_vars) = &self.config.env {
            for env_var in env_vars {
                cmd.env(&env_var.key, &env_var.value);
            }
        }

        // Use builder to capture stderr for better error messages
        let (child_process, stderr_opt) = TokioChildProcess::builder(cmd)
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to create child process: {}", e))?;

        // Spawn a task to collect stderr output
        let stderr_output = Arc::new(Mutex::new(String::new()));
        let stderr_output_clone = stderr_output.clone();

        if let Some(mut stderr) = stderr_opt {
            tokio::spawn(async move {
                let mut buffer = String::new();
                if let Ok(_) = stderr.read_to_string(&mut buffer).await {
                    let mut output = stderr_output_clone.lock().await;
                    *output = buffer;
                }
            });
        }

        // Give a small delay to allow stderr to be captured if process fails immediately
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

        match ().serve(child_process).await {
            Ok(service) => Ok(service),
            Err(e) => {
                // Wait a bit more and try to collect stderr
                tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;

                let stderr_content = stderr_output.lock().await;
                if stderr_content.is_empty() {
                    Err(format!("Failed to connect to MCP server: {}", e))
                } else {
                    Err(format!(
                        "Failed to connect to MCP server: {}\n\nProcess stderr:\n{}",
                        e, *stderr_content
                    ))
                }
            }
        }
    }

    async fn create_http_service(
        &self,
    ) -> Result<rmcp::service::RunningService<rmcp::RoleClient, ()>, String> {
        let url = self
            .config
            .url
            .as_ref()
            .ok_or("URL is required for HTTP servers")?;

        // Create HTTP client configuration
        let mut config = StreamableHttpClientTransportConfig::with_uri(url.as_str());

        // Set auth token if provided
        if let Some(token) = &self.config.auth_token {
            config = config.auth_header(token.clone());
        }

        // Create HTTP client worker using tauri_plugin_http's reqwest client
        // This is necessary because rmcp implements StreamableHttpClient for this specific client type
        let http_client = tauri_plugin_http::reqwest::Client::new();
        let worker = StreamableHttpClientWorker::new(http_client, config);

        // Spawn worker to create transport
        let transport = WorkerTransport::spawn(worker);

        // Create and return the service
        ().serve(transport).await.map_err(|e| {
            let error_msg = e.to_string();
            eprintln!("HTTP MCP connection error details: {:#?}", e);

            // Try to extract more specific error information
            if error_msg.contains("400") || error_msg.contains("Bad Request") {
                format!(
                    "Failed to connect to HTTP MCP server: HTTP 400 Bad Request - The server rejected the request. \
                    This usually means:\n\
                    • Missing or invalid authentication token\n\
                    • The server requires OAuth authentication (like GitHub Copilot)\n\
                    • Incorrect request format\n\
                    \nOriginal error: {}",
                    error_msg
                )
            } else if error_msg.contains("401") || error_msg.contains("Unauthorized") {
                format!(
                    "Failed to connect to HTTP MCP server: HTTP 401 Unauthorized - Authentication required or invalid token.\n\
                    Please check your auth token.\n\
                    \nOriginal error: {}",
                    error_msg
                )
            } else if error_msg.contains("403") || error_msg.contains("Forbidden") {
                format!(
                    "Failed to connect to HTTP MCP server: HTTP 403 Forbidden - Access denied.\n\
                    Your token may not have the required permissions.\n\
                    \nOriginal error: {}",
                    error_msg
                )
            } else {
                format!("Failed to connect to HTTP MCP server: {}", error_msg)
            }
        })
    }

    pub async fn list_tools(
        &self,
        extension_id: &str,
        extension_name: &str,
    ) -> Result<Vec<ExtensionTool>, String> {
        let service = self
            .transport
            .as_ref()
            .ok_or("Service not connected. Please connect first.")?
            .as_service();

        let tools = service
            .list_tools(Default::default())
            .await
            .map_err(|e| format!("Failed to list tools: {}", e))?;

        let parsed_tools: Vec<ExtensionTool> = tools
            .tools
            .into_iter()
            .map(|tool| ExtensionTool {
                name: tool.name.to_string(),
                description: tool.description.map(|d| d.to_string()),
                input_schema: serde_json::Value::Object((*tool.input_schema).clone()),
                extension_id: extension_id.to_string(),
                extension_name: extension_name.to_string(),
            })
            .collect();

        Ok(parsed_tools)
    }

    pub async fn call_tool(
        &self,
        name: &str,
        arguments: serde_json::Value,
    ) -> Result<MCPToolResult, String> {
        let service = self
            .transport
            .as_ref()
            .ok_or("Service not connected. Please connect first.")?
            .as_service();

        use std::borrow::Cow;

        let request = CallToolRequestParam {
            name: Cow::Owned(name.to_string()),
            arguments: if let serde_json::Value::Object(map) = arguments {
                Some(map)
            } else {
                None
            },
        };

        let result = service
            .call_tool(request)
            .await
            .map_err(|e| format!("Failed to call tool {}: {}", name, e))?;

        let content = result
            .content
            .into_iter()
            .map(|c| {
                let raw = &c.raw;
                match raw {
                    rmcp::model::RawContent::Text(text_content) => MCPContent {
                        content_type: "text".to_string(),
                        text: Some(text_content.text.clone()),
                        data: None,
                        url: None,
                    },
                    rmcp::model::RawContent::Image(image_content) => MCPContent {
                        content_type: "image".to_string(),
                        text: None,
                        data: Some(image_content.data.clone()),
                        url: None,
                    },
                    rmcp::model::RawContent::Resource(resource_content) => MCPContent {
                        content_type: "resource".to_string(),
                        text: Some(format!("{:?}", resource_content.resource)),
                        data: None,
                        url: None,
                    },
                    rmcp::model::RawContent::Audio(_) => MCPContent {
                        content_type: "audio".to_string(),
                        text: Some("[Audio content]".to_string()),
                        data: None,
                        url: None,
                    },
                    rmcp::model::RawContent::ResourceLink(resource) => MCPContent {
                        content_type: "resource_link".to_string(),
                        text: Some(format!("{:?}", resource)),
                        data: None,
                        url: None,
                    },
                }
            })
            .collect();

        let mcp_result = MCPToolResult {
            content,
            is_error: result.is_error,
        };

        Ok(mcp_result)
    }

    pub async fn disconnect(&mut self) -> Result<(), String> {
        if let Some(transport) = self.transport.take() {
            match transport {
                MCPTransport::Stdio(service_arc) | MCPTransport::Http(service_arc) => {
                    match Arc::try_unwrap(service_arc) {
                        Ok(service) => {
                            service
                                .cancel()
                                .await
                                .map_err(|e| format!("Failed to cancel service: {}", e))?;
                        }
                        Err(_) => {
                            eprintln!(
                                "Warning: Unable to cancel MCP service - other references exist"
                            );
                        }
                    }
                }
            }
        }
        Ok(())
    }
}

pub struct MCPManager {
    clients: Arc<Mutex<HashMap<String, MCPClientWrapper>>>,
    app_handle: AppHandle,
    oauth_manager: Option<Arc<OAuthManager>>,
    /// Store pending server configs during OAuth flow
    pending_configs: Arc<Mutex<HashMap<String, MCPServerConfig>>>,
    /// Store connected server configs for list_tools
    connected_configs: Arc<Mutex<HashMap<String, MCPServerConfig>>>,
    /// Track servers that should be cancelled (server_id -> cancel flag)
    cancel_flags: Arc<Mutex<HashMap<String, bool>>>,
}

impl MCPManager {
    pub fn with_oauth_manager(
        app_handle: AppHandle,
        oauth_manager: Arc<OAuthManager>,
    ) -> Result<Self, String> {
        Ok(Self {
            clients: Arc::new(Mutex::new(HashMap::new())),
            app_handle,
            oauth_manager: Some(oauth_manager),
            pending_configs: Arc::new(Mutex::new(HashMap::new())),
            connected_configs: Arc::new(Mutex::new(HashMap::new())),
            cancel_flags: Arc::new(Mutex::new(HashMap::new())),
        })
    }

    /// Check if a server connection has been cancelled
    async fn is_cancelled(&self, server_id: &str) -> bool {
        let flags = self.cancel_flags.lock().await;
        flags.get(server_id).copied().unwrap_or(false)
    }

    /// Clear the cancel flag for a server
    async fn clear_cancel_flag(&self, server_id: &str) {
        let mut flags = self.cancel_flags.lock().await;
        flags.remove(server_id);
    }

    /// Request cancellation of a server connection
    pub async fn cancel_connection(&self, server_id: &str) -> Result<(), String> {
        log::info!("[MCP] Requesting cancellation for server: {}", server_id);

        // Set cancel flag
        {
            let mut flags = self.cancel_flags.lock().await;
            flags.insert(server_id.to_string(), true);
        }

        // If there's an OAuth waiter, cancel it and notify the waiting channel
        if let Some(oauth_mgr) = &self.oauth_manager {
            // Cancel the OAuth waiter by sending an error through the channel
            oauth_mgr.cancel_oauth_flow(server_id).await;
            oauth_mgr.clear_state(server_id).await;
        }

        // Remove from pending configs
        {
            let mut pending = self.pending_configs.lock().await;
            pending.remove(server_id);
        }

        log::info!("[MCP] Cancellation requested for server: {}", server_id);
        Ok(())
    }

    /// Start MCP server - synchronously waits for connection to complete
    /// Returns either Success with tools or OAuthRequired with auth URL
    /// Following MCP specification: https://modelcontextprotocol.io/specification/draft/basic/authorization
    pub async fn start_server(&self, config: MCPServerConfig) -> Result<StartServerResult, String> {
        let server_id = config.id.clone();
        log::info!("[MCP] Starting server: {}", server_id);

        // Clear any previous cancel flag
        self.clear_cancel_flag(&server_id).await;

        // Step 1: Try direct connection (may use existing OAuth token)
        match Self::attempt_connection(&config, self.oauth_manager.as_ref()).await {
            Ok(client) => {
                log::info!("[MCP] Server {} connected successfully", server_id);

                // Get tools list
                let tools = client
                    .list_tools(&config.id, &config.name)
                    .await
                    .map_err(|e| format!("Failed to list tools for {}: {}", server_id, e))?;

                // Store client and config
                {
                    let mut clients_guard = self.clients.lock().await;
                    clients_guard.insert(server_id.clone(), client);
                }
                {
                    let mut configs_guard = self.connected_configs.lock().await;
                    configs_guard.insert(server_id.clone(), config.clone());
                }

                log::info!(
                    "[MCP] Server {} started with {} tools",
                    server_id,
                    tools.len()
                );
                Ok(StartServerResult { tools })
            }
            Err(ConnectionError::AuthRequired {
                server_url,
                scope_hint,
            }) => {
                log::info!("[MCP] Server {} requires OAuth authentication", server_id);

                // Step 2: Check if we already have a valid token (might have expired)
                if let Some(oauth_mgr) = &self.oauth_manager {
                    if let Ok(token) = oauth_mgr.get_valid_token(&server_id).await {
                        log::info!(
                            "[MCP] Found existing OAuth token for {}, retrying connection",
                            server_id
                        );

                        // We have a token, retry connection with it
                        let mut config_with_oauth = config.clone();
                        config_with_oauth.use_oauth = Some(true);
                        config_with_oauth.auth_token = Some(token);

                        match Self::attempt_connection(
                            &config_with_oauth,
                            self.oauth_manager.as_ref(),
                        )
                        .await
                        {
                            Ok(client) => {
                                log::info!("[MCP] Successfully connected with existing token");

                                let tools = client
                                    .list_tools(&config.id, &config.name)
                                    .await
                                    .map_err(|e| {
                                        format!("Failed to list tools for {}: {}", server_id, e)
                                    })?;

                                {
                                    let mut clients_guard = self.clients.lock().await;
                                    clients_guard.insert(server_id.clone(), client);
                                }
                                {
                                    let mut configs_guard = self.connected_configs.lock().await;
                                    configs_guard.insert(server_id.clone(), config.clone());
                                }

                                return Ok(StartServerResult { tools });
                            }
                            Err(e) => {
                                log::warn!(
                                    "[MCP] Token may have expired, will request new OAuth: {:?}",
                                    e
                                );
                                // Fall through to request new OAuth
                            }
                        }
                    }
                }

                // Step 3: No valid token found, initiate OAuth flow and wait for completion
                if let Some(oauth_mgr) = &self.oauth_manager {
                    let auth_url = Self::initiate_oauth_flow(
                        &self.app_handle,
                        oauth_mgr,
                        &server_id,
                        &server_url,
                        scope_hint,
                    )
                    .await?;

                    log::info!(
                        "[MCP] OAuth authorization URL generated for {}, opening browser and waiting...",
                        server_id
                    );

                    // Wait for OAuth to complete (this opens browser and blocks until callback)
                    oauth_mgr
                        .wait_for_oauth(
                            &self.app_handle,
                            &server_id,
                            &config.name,
                            &server_url,
                            &auth_url,
                        )
                        .await?;

                    log::info!(
                        "[MCP] OAuth completed for {}, retrying connection...",
                        server_id
                    );

                    // OAuth completed successfully, retry connection with token
                    let token = oauth_mgr.get_valid_token(&server_id).await?;
                    let mut config_with_oauth = config.clone();
                    config_with_oauth.use_oauth = Some(true);
                    config_with_oauth.auth_token = Some(token);

                    match Self::attempt_connection(&config_with_oauth, self.oauth_manager.as_ref())
                        .await
                    {
                        Ok(client) => {
                            log::info!("[MCP] Successfully connected after OAuth completion");

                            let tools =
                                client
                                    .list_tools(&config.id, &config.name)
                                    .await
                                    .map_err(|e| {
                                        format!("Failed to list tools for {}: {}", server_id, e)
                                    })?;

                            {
                                let mut clients_guard = self.clients.lock().await;
                                clients_guard.insert(server_id.clone(), client);
                            }
                            {
                                let mut configs_guard = self.connected_configs.lock().await;
                                configs_guard.insert(server_id.clone(), config.clone());
                            }

                            Ok(StartServerResult { tools })
                        }
                        Err(e) => {
                            log::error!("[MCP] Failed to connect even after OAuth: {:?}", e);
                            Err(format!("Failed to connect after OAuth: {:?}", e))
                        }
                    }
                } else {
                    Err("OAuth required but OAuth manager not available".to_string())
                }
            }
            Err(ConnectionError::Other(e)) => {
                log::error!("[MCP] Failed to connect to server {}: {}", server_id, e);
                Err(e)
            }
        }
    }

    /// Attempt to connect to MCP server
    /// Returns AuthRequired error if server returns 401/403
    async fn attempt_connection(
        config: &MCPServerConfig,
        oauth_manager: Option<&Arc<OAuthManager>>,
    ) -> Result<MCPClientWrapper, ConnectionError> {
        let mut config = config.clone();

        // If OAuth is marked as enabled, try to get existing token
        if config.use_oauth == Some(true) && config.auth_token.is_none() {
            log::info!(
                "[MCP] Config marked as use_oauth, attempting to get token for {}",
                config.id
            );
            if let Some(oauth_mgr) = oauth_manager {
                match oauth_mgr.get_valid_token(&config.id).await {
                    Ok(token) => {
                        log::info!(
                            "[MCP] Successfully retrieved OAuth token for {} (length: {})",
                            config.id,
                            token.len()
                        );
                        config.auth_token = Some(token);
                    }
                    Err(e) => {
                        log::error!("[MCP] Failed to get OAuth token for {}: {}", config.id, e);
                    }
                }
            } else {
                log::error!(
                    "[MCP] OAuth marked as enabled but no OAuth manager available for {}",
                    config.id
                );
            }
        }

        let mut client =
            MCPClientWrapper::new(config.clone()).map_err(|e| ConnectionError::Other(e))?;

        log::info!(
            "[MCP] Created client wrapper for {}, attempting connection...",
            config.id
        );

        match client.connect().await {
            Ok(_) => {
                log::info!("[MCP] Client connection successful for {}", config.id);
                Ok(client)
            }
            Err(e) => {
                let error_msg = e.to_string();
                log::info!("[MCP] Connection error for {}: {}", config.id, error_msg);

                // Check if it's an authentication error (following MCP spec)
                // rmcp may report AuthRequired errors as:
                // - "401" / "403" (HTTP status codes)
                // - "Unauthorized" / "Forbidden" (HTTP status text)
                // - "authentication" / "invalid_token" (OAuth error descriptions)
                // - "Transport" (rmcp transport layer error when AuthRequired)
                // - "AuthRequired" (rmcp error type name)
                let is_auth_error = error_msg.contains("401")
                    || error_msg.contains("403")
                    || error_msg.contains("Unauthorized")
                    || error_msg.contains("Forbidden")
                    || error_msg.contains("authentication")
                    || error_msg.contains("invalid_token")
                    || error_msg.contains("AuthRequired")
                    || (error_msg.contains("Transport") && config.server_type == "http");

                if is_auth_error {
                    // Extract server URL for OAuth discovery
                    let server_url = if let Some(url) = &config.url {
                        url.clone()
                    } else {
                        return Err(ConnectionError::Other(
                            "Cannot perform OAuth: server URL not found".to_string(),
                        ));
                    };

                    log::info!(
                        "[MCP] Detected authentication requirement for {}",
                        server_url
                    );
                    // TODO: Parse WWW-Authenticate header to extract scope hint
                    // For now, use default scope
                    Err(ConnectionError::AuthRequired {
                        server_url,
                        scope_hint: None,
                    })
                } else {
                    Err(ConnectionError::Other(error_msg))
                }
            }
        }
    }

    /// Initiate OAuth flow following MCP specification
    /// Returns authorization URL for user to open in browser
    async fn initiate_oauth_flow(
        app_handle: &AppHandle,
        oauth_manager: &Arc<OAuthManager>,
        server_id: &str,
        server_url: &str,
        scope_hint: Option<Vec<String>>,
    ) -> Result<String, String> {
        let mut scopes = scope_hint.unwrap_or_else(|| vec!["mcp".to_string()]);
        if scopes.is_empty() {
            scopes = vec!["mcp".to_string()];
        }

        if oauth_manager.has_state(server_id).await {
            log::info!(
                "[MCP] OAuth state already exists for {}, attempting to get auth URL...",
                server_id
            );
            match oauth_manager
                .get_authorization_url(server_id, scopes.clone())
                .await
            {
                Ok(auth_url) => return Ok(auth_url),
                Err(e) if e.contains("Already in session state") => {
                    log::warn!(
                        "[MCP] OAuth state is stuck in session state for {}, clearing and reinitializing...",
                        server_id
                    );
                    oauth_manager.clear_state(server_id).await;
                }
                Err(e) => return Err(e),
            }
        }

        log::info!("[MCP] Initializing OAuth for {}", server_id);
        oauth_manager
            .initialize(
                app_handle,
                server_id.to_string(),
                server_url.to_string(),
                OAuthConfig {
                    client_id: "bunshin".to_string(),
                    client_secret: None,
                    scopes: scopes.clone(),
                    redirect_uri: format!("bunshin://mcp-oauth-callback/{}", server_id),
                },
            )
            .await?;

        oauth_manager.get_authorization_url(server_id, scopes).await
    }

    /// Retry connection after OAuth completes
    /// Called by deep link handler after successful OAuth callback
    pub async fn retry_connection_after_oauth(&self, server_id: &str) -> Result<(), String> {
        log::info!("[MCP] Retrying connection for {} after OAuth", server_id);

        // Give rmcp a moment to finish internal state transitions after handle_callback
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

        // Get config from pending configs
        let config = {
            let mut pending = self.pending_configs.lock().await;
            log::info!(
                "[MCP] Pending configs before removal: {:?}",
                pending.keys().collect::<Vec<_>>()
            );
            pending.remove(server_id).ok_or_else(|| {
                log::error!("[MCP] No pending config found for server: {}", server_id);
                format!("No pending config found for server: {}", server_id)
            })?
        };

        log::info!("[MCP] Retrieved pending config for {}", server_id);

        // Mark config as using OAuth
        let mut config = config;
        config.use_oauth = Some(true);

        log::info!(
            "[MCP] Attempting reconnection with OAuth token for {}",
            server_id
        );

        // Attempt connection again (will use OAuth token this time)
        match Self::attempt_connection(&config, self.oauth_manager.as_ref()).await {
            Ok(client) => {
                log::info!(
                    "[MCP] Server {} connected successfully after OAuth",
                    server_id
                );

                // Get tools list
                let tools = match client.list_tools(&config.id, &config.name).await {
                    Ok(tools) => tools,
                    Err(e) => {
                        log::warn!("[MCP] Failed to list tools for {}: {}", server_id, e);
                        Vec::new()
                    }
                };

                // Store client and config
                {
                    let mut clients = self.clients.lock().await;
                    clients.insert(server_id.to_string(), client);
                }
                {
                    let mut configs = self.connected_configs.lock().await;
                    configs.insert(server_id.to_string(), config.clone());
                }

                // Notify success with tools
                let _ = self.app_handle.emit(
                    "mcp-event",
                    serde_json::json!({
                        "type": "connected",
                        "server_id": server_id,
                        "tools": tools,
                    }),
                );
                Ok(())
            }
            Err(e) => {
                let error_msg = format!("Failed to connect after OAuth: {:?}", e);
                log::error!("[MCP] {}", error_msg);
                let _ = self.app_handle.emit(
                    "mcp-event",
                    serde_json::json!({
                        "type": "error",
                        "server_id": server_id,
                        "error": error_msg,
                    }),
                );
                Err(error_msg)
            }
        }
    }

    pub async fn stop_server(&self, server_id: &str) -> Result<(), String> {
        let client = {
            let mut clients = self.clients.lock().await;
            clients.remove(server_id)
        };

        if let Some(mut client) = client {
            client.disconnect().await?;
        }

        let _ = self
            .app_handle
            .emit(&format!("mcp-server-stopped-{}", server_id), server_id);

        Ok(())
    }

    pub async fn list_tools(&self, server_id: &str) -> Result<Vec<ExtensionTool>, String> {
        let clients = self.clients.lock().await;
        let client = clients
            .get(server_id)
            .ok_or_else(|| format!("Server {} not found", server_id))?;

        // Get config to get extension_id and extension_name
        let configs = self.connected_configs.lock().await;
        let config = configs
            .get(server_id)
            .ok_or_else(|| format!("Config for server {} not found", server_id))?;

        client.list_tools(&config.id, &config.name).await
    }

    pub async fn call_tool(
        &self,
        server_id: &str,
        tool_name: &str,
        arguments: serde_json::Value,
    ) -> Result<MCPToolResult, String> {
        let clients = self.clients.lock().await;
        let client = clients
            .get(server_id)
            .ok_or_else(|| format!("Server {} not found", server_id))?;

        client.call_tool(tool_name, arguments).await
    }

}
