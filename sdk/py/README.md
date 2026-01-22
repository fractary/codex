# fractary-codex

Python SDK for Fractary Codex - knowledge infrastructure for AI agents.

## Installation

```bash
pip install fractary-codex
```

## Features

- **Universal References**: Parse and resolve `codex://` URIs
- **Multi-tier Caching**: File-based caching with intelligent TTL management
- **Storage Abstraction**: Local filesystem, GitHub, and HTTP storage providers
- **Configuration Management**: Load configs from `.fractary/` directories
- **Type Registry**: Built-in types with customizable TTL
- **Migration Tools**: Convert legacy references to `codex://` URIs
- **Async-first**: Built on `asyncio` for high performance
- **Type-safe**: Full type hints for IDE support

## Quick Start

```python
from fractary_codex import parse_reference, build_uri, CacheManager

# Parse a codex:// URI
ref = parse_reference("codex://myorg/myproject/docs/api.md")
print(f"Organization: {ref.org}")
print(f"Path: {ref.path}")

# Fetch content with caching
async with CacheManager() as cache:
    result = await cache.fetch("docs/api.md", storage)
    print(result.text)
```

## Documentation

**Full documentation**: [docs/sdk/py/](../../docs/sdk/py/)

- [API Reference](../../docs/sdk/py/#api-reference)
- [Troubleshooting](../../docs/sdk/py/#troubleshooting)
- [Configuration Guide](../../docs/configuration.md)

## Development

```bash
# Install dev dependencies
pip install -e ".[dev]"

# Run tests
pytest tests/ -v

# Type check
mypy fractary_codex

# Lint
ruff check fractary_codex
```

## Publishing

```bash
# Build
python -m build

# Check
twine check dist/*

# Upload to PyPI
twine upload dist/*
```

## Requirements

- Python 3.9+
- `pyyaml`
- `aiohttp`

## License

MIT - see [LICENSE](LICENSE)

## See Also

- [JavaScript SDK](../js/) - `@fractary/codex` on npm
- [CLI](../../cli/) - Command-line interface
- [MCP Server](../../mcp/server/) - AI agent integration
