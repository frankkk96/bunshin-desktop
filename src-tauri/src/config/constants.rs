use std::time::Duration;

/// Avatar cache duration (1 hour)
pub const AVATAR_CACHE_DURATION: Duration = Duration::from_secs(3600);

/// Maximum avatar file size (5MB)
pub const MAX_AVATAR_SIZE: usize = 5 * 1024 * 1024;

/// HTTP request timeout (10 seconds)
pub const REQUEST_TIMEOUT: Duration = Duration::from_secs(10);
