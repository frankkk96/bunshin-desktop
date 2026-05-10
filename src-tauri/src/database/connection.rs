use sqlx::sqlite::{SqlitePool, SqlitePoolOptions};
use std::time::Duration;

/// 数据库连接管理器
pub struct DatabaseConnection {
    pool: SqlitePool,
}

impl DatabaseConnection {
    /// 创建新的数据库连接
    pub async fn new(database_url: &str) -> Result<Self, sqlx::Error> {
        let pool = SqlitePoolOptions::new()
            .max_connections(5)
            .acquire_timeout(Duration::from_secs(3))
            .idle_timeout(Duration::from_secs(600)) // 10分钟空闲超时
            .max_lifetime(Duration::from_secs(1800)) // 30分钟最大生命周期
            .connect(database_url)
            .await?;

        // SQLite 性能优化
        sqlx::query("PRAGMA journal_mode=WAL;")
            .execute(&pool)
            .await?;
        sqlx::query("PRAGMA synchronous=NORMAL;")
            .execute(&pool)
            .await?;
        sqlx::query("PRAGMA cache_size=10000;")
            .execute(&pool)
            .await?;
        sqlx::query("PRAGMA temp_store=MEMORY;")
            .execute(&pool)
            .await?;
        sqlx::query("PRAGMA busy_timeout=3000;")
            .execute(&pool)
            .await?;

        Ok(Self { pool })
    }

    /// 获取连接池引用
    pub fn pool(&self) -> &SqlitePool {
        &self.pool
    }

    /// 运行数据库迁移
    pub async fn run_migrations(&self) -> Result<(), sqlx::Error> {
        // Ensure core tables exist. This replaces the previously empty migration stub.

        // Sessions table
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                contact_id TEXT NOT NULL,
                favorite INTEGER NOT NULL DEFAULT 0,
                visited_at INTEGER NOT NULL,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        // Queries table (用户查询)
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS queries (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                query_id INTEGER NOT NULL,
                agents TEXT NOT NULL,
                text TEXT NOT NULL,
                medias TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                timestamp INTEGER NOT NULL,
                metadata TEXT,
                UNIQUE(session_id, query_id),
                FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        // Migration: Add metadata column to queries if it doesn't exist
        sqlx::query(
            r#"
            ALTER TABLE queries ADD COLUMN metadata TEXT
            "#,
        )
        .execute(&self.pool)
        .await
        .ok(); // Ignore error if column already exists

        // Responses table (Agent 响应)
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS responses (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                query_id INTEGER NOT NULL,
                agent_id TEXT NOT NULL,
                round INTEGER NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                type TEXT NOT NULL,
                data TEXT NOT NULL,
                error TEXT,
                timestamp INTEGER NOT NULL,
                metadata TEXT,
                UNIQUE(session_id, query_id, agent_id, round),
                FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        // Migration: Add metadata column to responses if it doesn't exist
        sqlx::query(
            r#"
            ALTER TABLE responses ADD COLUMN metadata TEXT
            "#,
        )
        .execute(&self.pool)
        .await
        .ok(); // Ignore error if column already exists

        // Agents table
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS custom_agents (
                id TEXT PRIMARY KEY,
                alias TEXT NOT NULL,
                description TEXT,
                pinned INTEGER NOT NULL DEFAULT 0,
                provider TEXT NOT NULL,
                model TEXT NOT NULL,
                prompts TEXT NOT NULL,
                extensions TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        // Migration: Add extra_configs column to custom_agents if it doesn't exist
        sqlx::query(
            r#"
            ALTER TABLE custom_agents ADD COLUMN extra_configs TEXT NOT NULL DEFAULT '[]'
            "#,
        )
        .execute(&self.pool)
        .await
        .ok(); // Ignore error if column already exists

        // Groups table
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS groups (
                id TEXT PRIMARY KEY,
                alias TEXT NOT NULL,
                description TEXT,
                agents TEXT NOT NULL,
                pinned INTEGER NOT NULL DEFAULT 0,
                config TEXT,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        // Models table
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS models (
                id TEXT NOT NULL,
                provider TEXT NOT NULL,
                name TEXT NOT NULL,
                attachment INTEGER NOT NULL DEFAULT 0,
                reasoning INTEGER NOT NULL DEFAULT 0,
                tool_call INTEGER NOT NULL DEFAULT 1,
                temperature INTEGER NOT NULL DEFAULT 1,
                knowledge TEXT NOT NULL DEFAULT '',
                release_date TEXT NOT NULL DEFAULT '',
                last_updated TEXT NOT NULL DEFAULT '',
                modalities_input TEXT NOT NULL DEFAULT '[]',
                modalities_output TEXT NOT NULL DEFAULT '[]',
                open_weights INTEGER NOT NULL DEFAULT 0,
                cost_input REAL NOT NULL DEFAULT 0,
                cost_output REAL NOT NULL DEFAULT 0,
                limit_context INTEGER NOT NULL DEFAULT 0,
                limit_output INTEGER NOT NULL DEFAULT 0,
                config_schema TEXT,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                PRIMARY KEY (id, provider)
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        // Helpful indexes for queries
        sqlx::query(
            "CREATE INDEX IF NOT EXISTS idx_queries_session ON queries(session_id, timestamp)",
        )
        .execute(&self.pool)
        .await?;
        sqlx::query(
            "CREATE INDEX IF NOT EXISTS idx_queries_query_id ON queries(session_id, query_id)",
        )
        .execute(&self.pool)
        .await?;

        // Helpful indexes for responses
        sqlx::query(
            "CREATE INDEX IF NOT EXISTS idx_responses_session ON responses(session_id, timestamp)",
        )
        .execute(&self.pool)
        .await?;
        sqlx::query(
            "CREATE INDEX IF NOT EXISTS idx_responses_query ON responses(session_id, query_id)",
        )
        .execute(&self.pool)
        .await?;
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_responses_agent ON responses(agent_id)")
            .execute(&self.pool)
            .await?;

        sqlx::query("CREATE INDEX IF NOT EXISTS idx_sessions_contact_id ON sessions(contact_id)")
            .execute(&self.pool)
            .await?;

        // Session metadata view for fast aggregations
        sqlx::query("DROP VIEW IF EXISTS session_metadata_view")
            .execute(&self.pool)
            .await?;
        sqlx::query(
            r#"
            CREATE VIEW session_metadata_view AS
            SELECT
              s.id,
              s.contact_id,
              s.visited_at,
              s.created_at,
              s.updated_at,
              (SELECT COUNT(*) FROM queries WHERE session_id = s.id) +
              (SELECT COUNT(*) FROM responses WHERE session_id = s.id) AS message_count,
              (
                SELECT q.text FROM queries q
                WHERE q.session_id = s.id
                ORDER BY q.timestamp ASC
                LIMIT 1
              ) AS first_message,
              (
                SELECT content FROM (
                  SELECT q.text AS content, q.timestamp FROM queries q WHERE q.session_id = s.id
                  UNION ALL
                  SELECT
                    CASE
                      WHEN r.data IS NULL OR r.data = '' OR r.data = '[]' THEN r.error
                      ELSE r.data
                    END AS content,
                    r.timestamp
                  FROM responses r WHERE r.session_id = s.id
                )
                ORDER BY timestamp DESC
                LIMIT 1
              ) AS last_message,
              (
                SELECT MAX(timestamp) FROM (
                  SELECT timestamp FROM queries WHERE session_id = s.id
                  UNION ALL
                  SELECT timestamp FROM responses WHERE session_id = s.id
                )
              ) AS last_message_timestamp,
              s.favorite
            FROM sessions s
            GROUP BY s.id
            "#,
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }
}
