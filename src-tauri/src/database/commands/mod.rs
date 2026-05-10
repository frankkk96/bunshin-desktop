pub mod agent_commands;
pub mod group_commands;
pub mod message_commands;
pub mod model_commands;
pub mod session_commands;

pub use agent_commands::{
    create_agent, delete_agent_by_id, get_agent_by_id, get_all_agents, update_agent,
};

pub use group_commands::{
    create_group, delete_group_by_id, get_all_groups, get_group_by_id, update_group,
};

pub use message_commands::{
    // Cleanup commands
    delete_all_messages,
    delete_message,
    delete_messages_by_session_id,
    // Query commands
    delete_query,
    // Response commands
    delete_response,
    get_queries_by_session,
    get_query_by_id,
    get_response_by_id,
    get_responses_by_query,
    get_responses_by_session,
    // Search commands
    search_messages,
    upsert_query,
    upsert_response,
    AppState,
};

pub use model_commands::{
    create_model, delete_model, get_model_by_id, get_models_by_provider, init_models,
    update_model,
};

pub use session_commands::{
    create_session, get_all_sessions, get_session_by_id, update_session_favorite,
    update_session_visited,
};
