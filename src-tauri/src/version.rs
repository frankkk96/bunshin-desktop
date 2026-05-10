/// Application version information module
/// This module provides centralized access to version information
///
/// Get the application version from Cargo.toml at compile time
pub const APP_VERSION: &str = env!("CARGO_PKG_VERSION");

/// Get version info as a struct for more complex use cases
#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct VersionInfo {
    pub version: String,
    pub name: String,
    pub build_timestamp: String,
}

impl VersionInfo {}
