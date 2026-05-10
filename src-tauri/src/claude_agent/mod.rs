//! Claude Code subprocess runtime.
//!
//! Each Bunshin session owns a long-lived `claude` child process started in
//! stream-json mode. User messages arrive as Tauri commands, get serialized as
//! a stream-json `user` event and written to the child's stdin; the child's
//! stdout is read line-by-line, parsed as `ClaudeStreamEvent`s, persisted to
//! the `messages` table, and emitted to the webview.

pub mod commands;
pub mod manager;
pub mod process;
pub mod protocol;

pub use manager::ClaudeSessionManager;
