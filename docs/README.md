# Fractary Codex Documentation

Knowledge infrastructure for AI agents — universal document references, intelligent caching, and cross-project knowledge sharing.

## Getting Started

New to Fractary Codex? Start here:

- [Getting Started Guide](./getting-started.md) — Codex repo setup, GitHub token, installation, first sync

---

## Feature Guides

Organized by what you want to do. Each guide shows all available interfaces (SDK / CLI / MCP / Plugin) side-by-side.

| Feature | Description | Guide |
|---------|-------------|-------|
| **Configuration** | Initialize, update, and validate your codex config | [features/config.md](./features/config.md) |
| **Fetch Documents** | Retrieve docs via `codex://` URIs | [features/fetch-documents.md](./features/fetch-documents.md) |
| **Sync** | Push/pull files with a central codex repository | [features/sync.md](./features/sync.md) |
| **Cache Management** | List, clear, and diagnose the document cache | [features/cache.md](./features/cache.md) |

---

## Cross-Interface Quick Reference

| Operation | SDK | CLI | MCP | Plugin |
|-----------|-----|-----|-----|--------|
| Fetch document | `client.fetch(uri)` | `document-fetch` | `codex_document_fetch` | *(auto via MCP)* |
| List cache | `client.listCacheEntries()` | `cache-list` | `codex_cache_list` | — |
| Clear cache | — | `cache-clear` | `codex_cache_clear` | — |
| Cache stats | — | `cache-stats` | `codex_cache_stats` | — |
| Cache health | `client.getHealthChecks()` | `cache-health` | `codex_cache_health` | — |
| List file sources | — | — | `codex_file_sources_list` | — |
| Sync | — | `sync` | — | `/fractary-codex-sync` |
| Initialize config | — | `config-init` | — | `/fractary-codex-config init` |
| Update config | — | `config-update` | — | `/fractary-codex-config update` |
| Validate config | — | `config-validate` | — | `/fractary-codex-config validate` |

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                      Access Layer                         │
│  ┌──────────────┐  ┌──────────┐  ┌────────────────────┐ │
│  │ Claude Code  │  │   CLI    │  │    MCP Server      │ │
│  │   Plugin     │  │          │  │  (AI Agent Access)  │ │
│  └──────┬───────┘  └────┬─────┘  └─────────┬──────────┘ │
├─────────┴───────────────┴───────────────────┴────────────┤
│                      SDK Layer                            │
│  ┌────────────────────────────────────────────────────┐  │
│  │              @fractary/codex (JS/TS)                │  │
│  └────────────────────────────────────────────────────┘  │
│                                                           │
│  Core Features:                                          │
│  ├─ Universal References (codex:// URIs)                 │
│  ├─ Multi-Provider Storage (Local, GitHub, HTTP)         │
│  ├─ Intelligent Caching (Memory + Disk)                  │
│  ├─ File Synchronization                                 │
│  └─ Permission System                                    │
└──────────────────────────────────────────────────────────┘
```

---

## Reference Documentation

Detailed reference for each interface and configuration:

| Reference | Description |
|-----------|-------------|
| [Configuration Guide](./configuration.md) | Complete config schema reference |
| [CLI Reference](./cli/) | All CLI commands, options, and examples |
| [SDK Reference](./sdk/js/) | JavaScript/TypeScript SDK API |
| [MCP Server Reference](./mcp-server/) | MCP tools for AI agent integration |
| [Plugin Reference](./plugins/) | Claude Code plugin commands |

---

## Additional Resources

- [Technical Specifications](./specs/) — Architecture and design specifications

## License

MIT — see [LICENSE](../LICENSE)
