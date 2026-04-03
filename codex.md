# Fractary Codex

Knowledge infrastructure for AI agents — universal references, multi-tier caching, and project-to-codex synchronization.

## CLI

This project provides the `fractary-codex` CLI for knowledge management operations.

Run `fractary-codex --help` for full usage. Key commands:
- `fractary-codex fetch <uri>` — Fetch a document by codex:// URI
- `fractary-codex cache list|clear|stats|health` — Manage document cache
- `fractary-codex sync [--to-codex|--from-codex] [--work-id <id>]` — Sync with codex repository
- `fractary-codex config-init|config-update|config-validate` — Manage configuration

## Skills

Portable skills in `plugins/codex/skills/` provide detailed guidance for each operation. Read the relevant `SKILL.md` file for instructions.

## Configuration

Configuration lives at `.fractary/config.yaml`. Validate with `fractary-codex config-validate`.
