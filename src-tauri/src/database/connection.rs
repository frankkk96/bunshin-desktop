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

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS providers (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                type TEXT NOT NULL CHECK (type IN ('subscription','api')),
                base_url TEXT,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS agents (
                id TEXT PRIMARY KEY,
                alias TEXT NOT NULL,
                description TEXT,
                avatar TEXT,
                provider_id TEXT NOT NULL REFERENCES providers(id) ON DELETE RESTRICT,
                config TEXT NOT NULL DEFAULT '{}',
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        // Drop the legacy `pinned` column from existing installs (best-effort:
        // SQLite ignores the error if the column was never present).
        let _ = sqlx::query("ALTER TABLE agents DROP COLUMN pinned")
            .execute(&self.pool)
            .await;

        // For installs created before the per-agent Claude Code config column:
        // best-effort add it; existing rows get an empty `{}` (claude defaults).
        let _ = sqlx::query("ALTER TABLE agents ADD COLUMN config TEXT NOT NULL DEFAULT '{}'")
            .execute(&self.pool)
            .await;

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE RESTRICT,
                name TEXT,
                cwd TEXT NOT NULL,
                permission_mode TEXT NOT NULL DEFAULT 'default',
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

        // For installs created before claude_session_id was added: best-effort add
        // the column then backfill it from the row's id (which used to do double duty).
        let _ = sqlx::query(
            "ALTER TABLE sessions ADD COLUMN claude_session_id TEXT NOT NULL DEFAULT ''",
        )
        .execute(&self.pool)
        .await;
        sqlx::query("UPDATE sessions SET claude_session_id = id WHERE claude_session_id = ''")
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

        sqlx::query("CREATE INDEX IF NOT EXISTS idx_agents_provider ON agents(provider_id)")
            .execute(&self.pool)
            .await?;

        sqlx::query("CREATE INDEX IF NOT EXISTS idx_sessions_agent ON sessions(agent_id)")
            .execute(&self.pool)
            .await?;

        Ok(())
    }
}
