use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Invalid input: {0}")]
    InvalidInput(String),

    #[error("Internal error: {0}")]
    Internal(String),
}

// 实现 Serialize 以便可以通过 Tauri 返回给前端
#[derive(Serialize)]
pub struct ErrorResponse {
    pub message: String,
    pub kind: String,
}

impl From<AppError> for ErrorResponse {
    fn from(error: AppError) -> Self {
        ErrorResponse {
            message: error.to_string(),
            kind: match error {
                AppError::Database(_) => "Database",
                AppError::Serialization(_) => "Serialization",
                AppError::NotFound(_) => "NotFound",
                AppError::InvalidInput(_) => "InvalidInput",
                AppError::Internal(_) => "Internal",
            }
            .to_string(),
        }
    }
}

// 转换为 Tauri 可返回的错误字符串
impl From<AppError> for String {
    fn from(error: AppError) -> Self {
        error.to_string()
    }
}

pub type AppResult<T> = Result<T, AppError>;
