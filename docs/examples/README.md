# Codex SDK Examples

Real-world usage patterns and integration examples for the Fractary Codex SDK.

## Examples

### Basic Usage

- [simple-fetch.ts](./simple-fetch.ts) - Basic document fetching with caching
- [simple-fetch.py](./simple-fetch.py) - Python version of simple fetch

### CLI Integration

- [minimal-cli.ts](./minimal-cli.ts) - Minimal CLI with fetch and cache commands

### MCP Server

- [mcp-server-standalone.ts](./mcp-server-standalone.ts) - Standalone MCP server

### Custom Providers

- [custom-storage-provider.ts](./custom-storage-provider.ts) - Implement custom storage provider

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

- [Configuration Guide](../configuration.md)
- [JavaScript SDK](../sdk/js/)
- [Python SDK](../sdk/py/)
- [CLI Documentation](../cli/)
