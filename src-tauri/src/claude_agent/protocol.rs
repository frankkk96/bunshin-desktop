//! Stream-JSON protocol shapes.
//!
//! We deliberately use loose typing (`serde_json::Value` for payloads) so the
//! frontend can render any future event variants without us re-deploying.
//! The Rust side only inspects the top-level `type` discriminator for routing
//! and persistence.

use serde::{Deserialize, Serialize};

/// A user message we send to the child via stdin.
#[derive(Debug, Clone, Serialize)]
pub struct StdinUserMessage {
    #[serde(rename = "type")]
    pub type_: &'static str, // always "user"
    pub message: StdinUserBody,
}

#[derive(Debug, Clone, Serialize)]
pub struct StdinUserBody {
    pub role: &'static str, // always "user"
    pub content: Vec<serde_json::Value>,
}

/// Interrupt the current turn.
#[derive(Debug, Clone, Serialize)]
pub struct ControlInterrupt {
    #[serde(rename = "type")]
    pub type_: &'static str, // always "control_request"
    pub request_id: String,
    pub request: ControlInterruptBody,
}

#[derive(Debug, Clone, Serialize)]
pub struct ControlInterruptBody {
    pub subtype: &'static str, // always "interrupt"
}

/// Anything the child writes on stdout (one JSON object per line).
/// We keep it as a tagged passthrough so the frontend gets the raw event.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum ClaudeStreamEvent {
    /// A well-formed event with a `type` discriminator.
    Tagged {
        #[serde(rename = "type")]
        type_: String,
        #[serde(flatten)]
        rest: serde_json::Value,
    },
    /// Anything else (shouldn't happen from claude CLI in stream-json mode but
    /// we keep the parser permissive).
    Other(serde_json::Value),
}

impl ClaudeStreamEvent {
    pub fn kind(&self) -> &str {
        match self {
            ClaudeStreamEvent::Tagged { type_, .. } => type_.as_str(),
            ClaudeStreamEvent::Other(_) => "unknown",
        }
    }

    pub fn into_payload(self) -> serde_json::Value {
        match self {
            ClaudeStreamEvent::Tagged { type_, rest } => {
                let mut obj = match rest {
                    serde_json::Value::Object(map) => map,
                    other => {
                        let mut m = serde_json::Map::new();
                        m.insert("value".to_string(), other);
                        m
                    }
                };
                obj.insert("type".to_string(), serde_json::Value::String(type_));
                serde_json::Value::Object(obj)
            }
            ClaudeStreamEvent::Other(v) => v,
        }
    }
}

pub fn build_user_message(content: Vec<serde_json::Value>) -> StdinUserMessage {
    StdinUserMessage {
        type_: "user",
        message: StdinUserBody {
            role: "user",
            content,
        },
    }
}

pub fn build_interrupt() -> ControlInterrupt {
    ControlInterrupt {
        type_: "control_request",
        request_id: uuid::Uuid::new_v4().to_string(),
        request: ControlInterruptBody {
            subtype: "interrupt",
        },
    }
}
