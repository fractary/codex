# Codex SDK Examples

Real-world usage patterns and integration examples for the Fractary Codex SDK.

## Examples

### Basic Usage

- [simple-fetch.ts](./simple-fetch.ts) - Basic document fetching with caching
- [simple-fetch.py](./simple-fetch.py) - Python version of simple fetch

### CLI Integration

- [minimal-cli.ts](./minimal-cli.ts) - Minimal CLI with fetch and cache commands
- [advanced-cli.ts](./advanced-cli.ts) - Full-featured CLI with all commands
- [minimal-cli.py](./minimal-cli.py) - Python minimal CLI

### MCP Server

- [mcp-server-standalone.ts](./mcp-server-standalone.ts) - Standalone MCP server
- [mcp-server-embedded.ts](./mcp-server-embedded.ts) - Embedded MCP server in application

### Custom Providers

- [custom-storage-provider.ts](./custom-storage-provider.ts) - Implement custom storage provider
- [s3-storage-provider.ts](./s3-storage-provider.ts) - S3 storage provider example

### Migration

- [migrate-references.ts](./migrate-references.ts) - Migrate v2 references to v3
- [migrate-config.ts](./migrate-config.ts) - Migrate v2 config to v3

### Advanced

- [multi-project-sync.ts](./multi-project-sync.ts) - Sync multiple projects
- [permission-system.ts](./permission-system.ts) - Custom permission rules
- [type-registry-custom.ts](./type-registry-custom.ts) - Custom artifact types

## Running Examples

### TypeScript Examples

```bash
# Install dependencies
npm install @fractary/codex

# Install dev dependencies for examples
npm install -D tsx @types/node

# Run example
npx tsx docs/examples/simple-fetch.ts
```

### Python Examples

```bash
# Install package
pip install fractary-codex

# Run example
python docs/examples/simple-fetch.py
```

## Example Structure

Each example is self-contained and includes:
- Imports and setup
- Main functionality
- Error handling
- Comments explaining key concepts

## See Also

- [CLI Integration Guide](../guides/cli-integration.md)
- [API Reference](../guides/api-reference.md)
- [Configuration Guide](../guides/configuration.md)
