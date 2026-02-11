# Python SDK

> **Status: Planned - Not Yet Implemented**
>
> The Python SDK for Fractary Codex is planned but not yet available. The JavaScript/TypeScript SDK is the current implementation.

## Planned Features

When implemented, the Python SDK will provide:

- `codex://` URI parsing and resolution
- Multi-provider storage (Local, GitHub, HTTP)
- TTL-based caching
- Configuration management
- Async-first API

## Current Alternative

Use the JavaScript/TypeScript SDK:

```bash
npm install @fractary/codex
```

Or use the CLI from any environment:

```bash
npm install -g @fractary/codex-cli
fractary-codex document-fetch codex://myorg/project/docs/api.md
```

## See Also

- [JavaScript SDK](../js/) - Current SDK implementation
- [CLI Documentation](../../cli/) - Command-line interface (language-agnostic)
