#!/bin/bash
# Detect codex configuration (unified config format)
# Returns JSON with config information

set -euo pipefail

# Configuration path (unified config)
PROJECT_CONFIG=".fractary/config.yaml"

# Check for unified config
if [ -f "$PROJECT_CONFIG" ]; then
    cat <<EOF
{
  "status": "found",
  "format": "yaml",
  "location": "project",
  "path": "$PROJECT_CONFIG",
  "version": "2.0"
}
EOF
    exit 0
fi

# No config found
cat <<EOF
{
  "status": "not_found",
  "suggested_action": "Run /fractary-codex:configure to create configuration",
  "required_path": "$PROJECT_CONFIG",
  "required_format": "yaml (unified config with codex: section)"
}
EOF
exit 0
