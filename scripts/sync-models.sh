#!/bin/bash

# Sync models from models.dev API to local config files
# Usage: ./scripts/sync-models.sh [provider_id]
# Examples:
#   ./scripts/sync-models.sh           # Sync all providers
#   ./scripts/sync-models.sh openai    # Sync only OpenAI
#   ./scripts/sync-models.sh anthropic # Sync only Anthropic (Claude)

set -e

API_URL="https://models.dev/api.json"
CONFIG_DIR="src-tauri/config/models"

# Ensure config directory exists
mkdir -p "$CONFIG_DIR"

# Fetch API data
echo "Fetching data from $API_URL..."
API_DATA=$(curl -s "$API_URL")

if [ -z "$API_DATA" ]; then
    echo "Error: Failed to fetch API data"
    exit 1
fi

# Function to transform a provider's data to our format
transform_provider() {
    local provider_id="$1"

    # Use node to transform the data
    node -e "
const data = $API_DATA;
const providerId = '$provider_id';

const provider = data[providerId];
if (!provider) {
    console.error('Provider not found:', providerId);
    process.exit(1);
}

// Transform models from object to array
const modelsObj = provider.models || {};
const models = Object.values(modelsObj)
    .filter(model => model.status !== 'deprecated') // Skip deprecated models
    .map(model => ({
        id: model.id,
        name: model.name || model.id,
        attachment: model.attachment ?? false,
        reasoning: model.reasoning ?? false,
        toolCall: model.tool_call ?? false,
        temperature: model.temperature ?? true,
        knowledge: model.knowledge || '',
        releaseDate: model.release_date || '',
        lastUpdated: model.last_updated || '',
        modalities: {
            input: model.modalities?.input || ['text'],
            output: model.modalities?.output || ['text']
        },
        openWeights: model.open_weights ?? false,
        cost: {
            input: model.cost?.input ?? 0,
            output: model.cost?.output ?? 0
        },
        limit: {
            context: model.limit?.context ?? 128000,
            output: model.limit?.output ?? 4096
        }
    }));

// Sort models: newest first (by release date), then by name
models.sort((a, b) => {
    if (a.releaseDate && b.releaseDate) {
        return b.releaseDate.localeCompare(a.releaseDate);
    }
    return a.name.localeCompare(b.name);
});

const output = {
    id: providerId,
    name: provider.name || providerId,
    models: models
};

console.log(JSON.stringify(output, null, 2));
"
}

# Get all provider IDs from the API data
get_all_providers() {
    node -e "
const data = $API_DATA;
console.log(Object.keys(data).join('\n'));
"
}

# Get provider ID argument
TARGET_PROVIDER="$1"

if [ -n "$TARGET_PROVIDER" ]; then
    # Single provider mode
    OUTPUT_FILE="$CONFIG_DIR/$TARGET_PROVIDER.json"
    echo "Syncing $TARGET_PROVIDER..."

    if RESULT=$(transform_provider "$TARGET_PROVIDER" 2>&1); then
        echo "$RESULT" > "$OUTPUT_FILE"
        MODEL_COUNT=$(echo "$RESULT" | node -e "const d=require('fs').readFileSync(0,'utf8');console.log(JSON.parse(d).models.length)")
        echo "  ✓ Saved $MODEL_COUNT models to $OUTPUT_FILE"
    else
        echo "  ✗ Failed: $RESULT"
        exit 1
    fi
else
    # All providers mode
    PROVIDERS=$(get_all_providers)

    for PROVIDER_ID in $PROVIDERS; do
        OUTPUT_FILE="$CONFIG_DIR/$PROVIDER_ID.json"
        echo "Syncing $PROVIDER_ID..."

        if RESULT=$(transform_provider "$PROVIDER_ID" 2>&1); then
            echo "$RESULT" > "$OUTPUT_FILE"
            MODEL_COUNT=$(echo "$RESULT" | node -e "const d=require('fs').readFileSync(0,'utf8');console.log(JSON.parse(d).models.length)")
            echo "  ✓ Saved $MODEL_COUNT models to $OUTPUT_FILE"
        else
            echo "  ✗ Failed: $RESULT"
        fi
    done
fi

echo ""
echo "Done!"
