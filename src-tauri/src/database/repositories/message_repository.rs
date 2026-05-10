use crate::database::models::{DbQuery, DbResponse, Query, Response};
use crate::error::AppResult;
use sqlx::SqlitePool;

/// 搜索消息结果的枚举类型
pub enum SearchedMessage {
    Query(Query),
    Response(Response),
}

pub struct MessageRepository {
    pool: SqlitePool,
}

impl MessageRepository {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    // ==================== Query 相关操作 ====================

    /// 插入或更新 Query
    pub async fn upsert_query(&self, query: Query) -> AppResult<()> {
        let db_query = DbQuery::from(query);

        sqlx::query(
            r#"
            INSERT INTO queries (id, session_id, query_id, agents, text, medias, status, timestamp, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                session_id = excluded.session_id,
                query_id = excluded.query_id,
                agents = excluded.agents,
                text = excluded.text,
                medias = excluded.medias,
                status = excluded.status,
                timestamp = excluded.timestamp,
                metadata = excluded.metadata
            "#,
        )
        .bind(&db_query.id)
        .bind(&db_query.session_id)
        .bind(db_query.query_id)
        .bind(&db_query.agents)
        .bind(&db_query.text)
        .bind(&db_query.medias)
        .bind(&db_query.status)
        .bind(db_query.timestamp)
        .bind(&db_query.metadata)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// 获取指定 session 的所有 queries
    pub async fn get_queries_by_session(&self, session_id: &str) -> AppResult<Vec<Query>> {
        let queries = sqlx::query_as::<_, DbQuery>(
            "SELECT * FROM queries WHERE session_id = ? ORDER BY timestamp ASC",
        )
        .bind(session_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(queries.into_iter().map(Query::from).collect())
    }

    /// 根据 ID 获取 Query
    pub async fn get_query_by_id(&self, id: &str) -> AppResult<Option<Query>> {
        let query = sqlx::query_as::<_, DbQuery>("SELECT * FROM queries WHERE id = ?")
            .bind(id)
            .fetch_optional(&self.pool)
            .await?;

        Ok(query.map(Query::from))
    }

    /// 删除 Query
    pub async fn delete_query(&self, id: &str) -> AppResult<()> {
        sqlx::query("DELETE FROM queries WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    // ==================== Response 相关操作 ====================

    /// 插入或更新 Response
    pub async fn upsert_response(&self, response: Response) -> AppResult<()> {
        let db_response = DbResponse::from(response);

        sqlx::query(
            r#"
            INSERT INTO responses (id, session_id, query_id, agent_id, round, status, type, data, error, timestamp, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                session_id = excluded.session_id,
                query_id = excluded.query_id,
                agent_id = excluded.agent_id,
                round = excluded.round,
                status = excluded.status,
                type = excluded.type,
                data = excluded.data,
                error = excluded.error,
                timestamp = excluded.timestamp,
                metadata = excluded.metadata
            "#,
        )
        .bind(&db_response.id)
        .bind(&db_response.session_id)
        .bind(db_response.query_id)
        .bind(&db_response.agent_id)
        .bind(db_response.round)
        .bind(&db_response.status)
        .bind(&db_response.data_type)
        .bind(&db_response.data)
        .bind(&db_response.error)
        .bind(db_response.timestamp)
        .bind(&db_response.metadata)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// 获取指定 session 的所有 responses
    pub async fn get_responses_by_session(&self, session_id: &str) -> AppResult<Vec<Response>> {
        let responses = sqlx::query_as::<_, DbResponse>(
            "SELECT * FROM responses WHERE session_id = ? ORDER BY timestamp ASC",
        )
        .bind(session_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(responses.into_iter().map(Response::from).collect())
    }

    /// 根据 query_id 获取 responses
    pub async fn get_responses_by_query(
        &self,
        session_id: &str,
        query_id: i64,
    ) -> AppResult<Vec<Response>> {
        let responses = sqlx::query_as::<_, DbResponse>(
            "SELECT * FROM responses WHERE session_id = ? AND query_id = ? ORDER BY timestamp ASC",
        )
        .bind(session_id)
        .bind(query_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(responses.into_iter().map(Response::from).collect())
    }

    /// 根据 ID 获取 Response
    pub async fn get_response_by_id(&self, id: &str) -> AppResult<Option<Response>> {
        let response = sqlx::query_as::<_, DbResponse>("SELECT * FROM responses WHERE id = ?")
            .bind(id)
            .fetch_optional(&self.pool)
            .await?;

        Ok(response.map(Response::from))
    }

    /// 删除 Response
    pub async fn delete_response(&self, id: &str) -> AppResult<()> {
        sqlx::query("DELETE FROM responses WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    /// 按 Session ID 删除所有消息
    pub async fn delete_messages_by_session_id(&self, session_id: &str) -> AppResult<()> {
        let mut tx = self.pool.begin().await?;

        sqlx::query("DELETE FROM queries WHERE session_id = ?")
            .bind(session_id)
            .execute(&mut *tx)
            .await?;

        sqlx::query("DELETE FROM responses WHERE session_id = ?")
            .bind(session_id)
            .execute(&mut *tx)
            .await?;

        tx.commit().await?;
        Ok(())
    }

    /// 删除所有消息
    pub async fn delete_all_messages(&self) -> AppResult<()> {
        let mut tx = self.pool.begin().await?;

        sqlx::query("DELETE FROM queries").execute(&mut *tx).await?;

        sqlx::query("DELETE FROM responses")
            .execute(&mut *tx)
            .await?;

        tx.commit().await?;
        Ok(())
    }

    /// 删除消息（Query 及其关联的 Responses）
    pub async fn delete_message(&self, id: &str) -> AppResult<()> {
        // 首先获取 query 以获取 query_id 和 session_id
        let query = sqlx::query_as::<_, DbQuery>("SELECT * FROM queries WHERE id = ?")
            .bind(id)
            .fetch_optional(&self.pool)
            .await?;

        if let Some(q) = query {
            let mut tx = self.pool.begin().await?;

            // 删除关联的 responses
            sqlx::query("DELETE FROM responses WHERE session_id = ? AND query_id = ?")
                .bind(&q.session_id)
                .bind(q.query_id)
                .execute(&mut *tx)
                .await?;

            // 删除 query
            sqlx::query("DELETE FROM queries WHERE id = ?")
                .bind(id)
                .execute(&mut *tx)
                .await?;

            tx.commit().await?;
        }

        Ok(())
    }

    /// 搜索消息（同时搜索 queries 和 responses 表）
    pub async fn search_messages(
        &self,
        query: &str,
        contact_id: Option<&str>,
    ) -> AppResult<
        Vec<(
            SearchedMessage,
            Option<crate::database::models::SessionMetadata>,
        )>,
    > {
        let search_pattern = format!("%{}%", query);

        // 搜索 queries 表
        let query_results = match contact_id {
            Some(cid) => {
                sqlx::query_as::<_, DbQuery>(
                    r#"
                    SELECT q.* FROM queries q
                    JOIN sessions s ON q.session_id = s.id
                    WHERE q.text LIKE ? AND s.contact_id = ?
                    ORDER BY q.timestamp DESC
                    LIMIT 50
                    "#,
                )
                .bind(&search_pattern)
                .bind(cid)
                .fetch_all(&self.pool)
                .await?
            }
            None => {
                sqlx::query_as::<_, DbQuery>(
                    r#"
                    SELECT * FROM queries
                    WHERE text LIKE ?
                    ORDER BY timestamp DESC
                    LIMIT 50
                    "#,
                )
                .bind(&search_pattern)
                .fetch_all(&self.pool)
                .await?
            }
        };

        // 搜索 responses 表（在 data JSON 字段中搜索）
        let response_results = match contact_id {
            Some(cid) => {
                sqlx::query_as::<_, DbResponse>(
                    r#"
                    SELECT r.* FROM responses r
                    JOIN sessions s ON r.session_id = s.id
                    WHERE r.data LIKE ? AND s.contact_id = ?
                    ORDER BY r.timestamp DESC
                    LIMIT 50
                    "#,
                )
                .bind(&search_pattern)
                .bind(cid)
                .fetch_all(&self.pool)
                .await?
            }
            None => {
                sqlx::query_as::<_, DbResponse>(
                    r#"
                    SELECT * FROM responses
                    WHERE data LIKE ?
                    ORDER BY timestamp DESC
                    LIMIT 50
                    "#,
                )
                .bind(&search_pattern)
                .fetch_all(&self.pool)
                .await?
            }
        };

        // 合并结果并按时间戳排序
        let mut all_results: Vec<(SearchedMessage, i64, String)> = Vec::new();

        for db_query in query_results {
            let session_id = db_query.session_id.clone();
            let timestamp = db_query.timestamp;
            all_results.push((
                SearchedMessage::Query(Query::from(db_query)),
                timestamp,
                session_id,
            ));
        }

        for db_response in response_results {
            let session_id = db_response.session_id.clone();
            let timestamp = db_response.timestamp;
            all_results.push((
                SearchedMessage::Response(Response::from(db_response)),
                timestamp,
                session_id,
            ));
        }

        // 按时间戳降序排序
        all_results.sort_by(|a, b| b.1.cmp(&a.1));

        // 限制总结果数量
        all_results.truncate(100);

        // 获取相关的 session 信息
        let mut result_with_sessions = Vec::new();
        for (message, _, session_id) in all_results {
            let session = sqlx::query_as::<_, crate::database::models::DbSessionMetadata>(
                "SELECT * FROM session_metadata_view WHERE id = ?",
            )
            .bind(&session_id)
            .fetch_optional(&self.pool)
            .await?
            .map(crate::database::models::SessionMetadata::from);

            result_with_sessions.push((message, session));
        }

        Ok(result_with_sessions)
    }
}
