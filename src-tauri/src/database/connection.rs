use sqlx::sqlite::{SqlitePool, SqlitePoolOptions};
use std::time::Duration;

/// Database connection wrapper.
///
/// The schema is intentionally green-field: legacy tables from the pre-Claude-Code
/// architecture are dropped on first run, and a small set of new tables backs the
/// providers / agents / sessions / messages model used by the subprocess runtime.
pub struct DatabaseConnection {
    pool: SqlitePool,
}

impl DatabaseConnection {
    pub async fn new(database_url: &str) -> Result<Self, sqlx::Error> {
        let pool = SqlitePoolOptions::new()
            .max_connections(5)
            .acquire_timeout(Duration::from_secs(3))
            .idle_timeout(Duration::from_secs(600))
            .max_lifetime(Duration::from_secs(1800))
            .connect(database_url)
            .await?;

        sqlx::query("PRAGMA journal_mode=WAL;").execute(&pool).await?;
        sqlx::query("PRAGMA synchronous=NORMAL;").execute(&pool).await?;
        sqlx::query("PRAGMA cache_size=10000;").execute(&pool).await?;
        sqlx::query("PRAGMA temp_store=MEMORY;").execute(&pool).await?;
        sqlx::query("PRAGMA busy_timeout=3000;").execute(&pool).await?;
        sqlx::query("PRAGMA foreign_keys=ON;").execute(&pool).await?;

        Ok(Self { pool })
    }

    pub fn pool(&self) -> &SqlitePool {
        &self.pool
    }

    pub async fn run_migrations(&self) -> Result<(), sqlx::Error> {
        // Hard reset: any pre-Claude-Code schema gets wiped.
        for stmt in [
            "DROP VIEW IF EXISTS session_metadata_view",
            "DROP TABLE IF EXISTS responses",
            "DROP TABLE IF EXISTS queries",
            "DROP TABLE IF EXISTS custom_agents",
            "DROP TABLE IF EXISTS hosted_agents",
            "DROP TABLE IF EXISTS market_agents",
            "DROP TABLE IF EXISTS groups",
            "DROP TABLE IF EXISTS workflows",
            "DROP TABLE IF EXISTS models",
            "DROP TABLE IF EXISTS mcp_servers",
            "DROP TABLE IF EXISTS data_providers",
        ] {
            sqlx::query(stmt).execute(&self.pool).await?;
        }

        // The legacy `sessions` table had a `contact_id` column. If it's still around
        // from a previous install, drop it so we recreate with the new shape.
        let legacy_sessions_present: Option<(String,)> = sqlx::query_as(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='sessions'",
        )
        .fetch_optional(&self.pool)
        .await?;
        if let Some(_) = legacy_sessions_present {
            // Inspect columns to detect legacy shape (presence of `contact_id`).
            let cols: Vec<(String,)> =
                sqlx::query_as("SELECT name FROM pragma_table_info('sessions')")
                    .fetch_all(&self.pool)
                    .await?;
            let has_contact_id = cols.iter().any(|(n,)| n == "contact_id");
            if has_contact_id {
                sqlx::query("DROP TABLE IF EXISTS messages")
                    .execute(&self.pool)
                    .await?;
                sqlx::query("DROP TABLE IF EXISTS sessions")
                    .execute(&self.pool)
                    .await?;
            }
        }

        // The working directory + permission mode moved from sessions onto the
        // agent. Old schemas are detected by `providers` still existing OR the
        // agents table lacking the `cwd` column — either way, hard-reset the app
        // tables (agreed early-data reset; no in-place migration).
        let providers_present: Option<(String,)> = sqlx::query_as(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='providers'",
        )
        .fetch_optional(&self.pool)
        .await?;
        let agents_exists: Option<(String,)> = sqlx::query_as(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='agents'",
        )
        .fetch_optional(&self.pool)
        .await?;
        let agents_has_cwd = if agents_exists.is_some() {
            let cols: Vec<(String,)> =
                sqlx::query_as("SELECT name FROM pragma_table_info('agents')")
                    .fetch_all(&self.pool)
                    .await?;
            cols.iter().any(|(n,)| n == "cwd")
        } else {
            true // no agents table yet → fresh install, nothing to reset
        };
        if providers_present.is_some() || !agents_has_cwd {
            for stmt in [
                "DROP TABLE IF EXISTS messages",
                "DROP TABLE IF EXISTS sessions",
                "DROP TABLE IF EXISTS agents",
                "DROP TABLE IF EXISTS providers",
            ] {
                sqlx::query(stmt).execute(&self.pool).await?;
            }
        }

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS agents (
                id TEXT PRIMARY KEY,
                alias TEXT NOT NULL,
                description TEXT,
                avatar TEXT,
                base_url TEXT,
                cwd TEXT NOT NULL DEFAULT '',
                permission_mode TEXT NOT NULL DEFAULT 'default',
                config TEXT NOT NULL DEFAULT '{}',
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE RESTRICT,
                name TEXT,
                favorite INTEGER NOT NULL DEFAULT 0,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                visited_at INTEGER NOT NULL,
                claude_session_id TEXT NOT NULL DEFAULT ''
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
                seq INTEGER NOT NULL,
                kind TEXT NOT NULL,
                payload TEXT NOT NULL,
                timestamp INTEGER NOT NULL,
                UNIQUE(session_id, seq)
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        sqlx::query(
            "CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, seq)",
        )
        .execute(&self.pool)
        .await?;

        sqlx::query("CREATE INDEX IF NOT EXISTS idx_sessions_agent ON sessions(agent_id)")
            .execute(&self.pool)
            .await?;

        Ok(())
    }
}
