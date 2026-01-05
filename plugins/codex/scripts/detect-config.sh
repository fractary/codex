#!/bin/bash
# Detect codex configuration (v4.0 standard only)
# Returns JSON with config information

set -euo pipefail

# Configuration path (v4.0 standard)
PROJECT_CONFIG=".fractary/codex/config.yaml"

# Check for v4.0 standard config
if [ -f "$PROJECT_CONFIG" ]; then
    cat <<EOF
{
  "status": "found",
  "format": "yaml",
  "location": "project",
  "path": "$PROJECT_CONFIG",
  "version": "4.0"
}
EOF
    exit 0
fi

# No config found
cat <<EOF
{
  "status": "not_found",
  "suggested_action": "Run /fractary-codex:config-init to create configuration",
  "required_path": "$PROJECT_CONFIG",
  "required_format": "yaml",
  "required_version": "4.0"
}
EOF
exit 0
