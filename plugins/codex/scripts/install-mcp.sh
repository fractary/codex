#!/usr/bin/env bash
# Install MCP server reference in project settings
#
# Usage: ./install-mcp.sh [options]
# Output: JSON with installation status
#
# Options:
#   --settings <path>      Override settings.json path
#   --backup               Create backup of existing settings (default: true)
#   --no-backup            Skip backup creation
#
# Adds mcpServers.fractary-codex configuration to .claude/settings.json
# Uses standalone MCP server from @fractary/codex-mcp-server package

set -euo pipefail

# Default paths
settings_path=".claude/settings.json"
create_backup="true"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --marketplace)
      # Legacy flag - ignored (kept for backward compatibility)
      shift 2
      ;;
    --settings)
      settings_path="$2"
      shift 2
      ;;
    --backup)
      create_backup="true"
      shift
      ;;
    --no-backup)
      create_backup="false"
      shift
      ;;
    *)
      shift
      ;;
  esac
done

# Create .claude directory if needed
settings_dir=$(dirname "$settings_path")
if [[ ! -d "$settings_dir" ]]; then
  mkdir -p "$settings_dir"
fi

# Initialize or read existing settings
existing_settings="{}"
backup_path=""

if [[ -f "$settings_path" ]]; then
  existing_settings=$(cat "$settings_path")

  # Create backup if requested
  if [[ "$create_backup" == "true" ]]; then
    backup_path="${settings_path}.backup.$(date +%Y%m%d%H%M%S)"
    cp "$settings_path" "$backup_path"
  fi
fi

# Check if already installed
migration_performed="false"
if echo "$existing_settings" | jq -e '.mcpServers["fractary-codex"]' >/dev/null 2>&1; then
  # Check if it's the old format that needs migration
  existing_command=$(echo "$existing_settings" | jq -r '.mcpServers["fractary-codex"].command // ""')
  existing_args=$(echo "$existing_settings" | jq -r '.mcpServers["fractary-codex"].args // []' | jq -r '.[1] // ""')

  if [[ "$existing_command" == "node" ]] && [[ "$existing_args" == *"mcp-server"* ]]; then
    # Old custom server format (node + local mcp-server) - will migrate
    migration_performed="true"
  elif [[ "$existing_args" == "@fractary/codex" ]]; then
    # Old SDK-embedded format (@fractary/codex package) - will migrate
    migration_performed="true"
  elif [[ "$existing_args" == "@fractary/codex-mcp-server" ]]; then
    # Already using standalone MCP server
    jq -n \
      --arg command "$existing_command" \
      --arg settings "$settings_path" \
      '{
        success: true,
        status: "already_installed",
        message: "MCP server already configured",
        details: {
          command: $command,
          settings: $settings
        }
      }'
    exit 0
  fi
fi

# Build standalone MCP server configuration
mcp_config=$(jq -n \
  '{
    command: "npx",
    args: ["-y", "@fractary/codex-mcp-server", "--config", ".fractary/codex.yaml"],
    env: {}
  }')

# Merge into existing settings
new_settings=$(echo "$existing_settings" | jq \
  --argjson mcp "$mcp_config" \
  '.mcpServers = (.mcpServers // {}) | .mcpServers["fractary-codex"] = $mcp')

# Write updated settings
echo "$new_settings" | jq . > "$settings_path"

# Output result
jq -n \
  --arg command "npx" \
  --arg settings "$settings_path" \
  --arg backup "$backup_path" \
  --argjson had_existing "$(echo "$existing_settings" | jq 'has("mcpServers")')" \
  --argjson migrated "$migration_performed" \
  '{
    success: true,
    status: (if $migrated then "migrated" else "installed" end),
    message: (if $migrated then "Migrated to standalone MCP server successfully" else "MCP server configured successfully" end),
    details: {
      mcp_command: $command,
      mcp_package: "@fractary/codex-mcp-server",
      config_path: ".fractary/codex.yaml",
      settings: $settings,
      backup: (if $backup == "" then null else $backup end),
      updated_existing: $had_existing,
      migrated_from_custom: $migrated
    },
    next_steps: [
      "Restart Claude Code to load the MCP server",
      "Run /fractary-codex:validate-setup to verify configuration",
      (if $migrated then "Old custom MCP server can be removed: plugins/codex/mcp-server/" else null end)
    ] | map(select(. != null))
  }'
