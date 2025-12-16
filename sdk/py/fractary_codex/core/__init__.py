"""
Core utilities for Fractary Codex.

This module provides:
- Configuration loading and management
- YAML frontmatter metadata parsing
- Glob pattern matching utilities
"""

from .config import (
    DEFAULT_CACHE_DIR,
    DEFAULT_TTL,
    CodexConfig,
    get_config_path,
    load_config,
    resolve_organization,
)
from .metadata import (
    ParsedMetadata,
    build_frontmatter,
    extract_frontmatter,
    get_metadata_value,
    has_frontmatter,
    parse_metadata,
    update_frontmatter,
    validate_metadata,
)
from .patterns import (
    compile_pattern,
    expand_pattern,
    filter_by_pattern,
    filter_by_patterns,
    get_pattern_prefix,
    match_pattern,
    match_patterns,
)

__all__ = [
    # Config constants
    "DEFAULT_CACHE_DIR",
    "DEFAULT_TTL",
    # Config classes
    "CodexConfig",
    # Config functions
    "load_config",
    "resolve_organization",
    "get_config_path",
    # Metadata classes
    "ParsedMetadata",
    # Metadata functions
    "parse_metadata",
    "extract_frontmatter",
    "has_frontmatter",
    "build_frontmatter",
    "update_frontmatter",
    "get_metadata_value",
    "validate_metadata",
    # Pattern functions
    "match_pattern",
    "match_patterns",
    "filter_by_pattern",
    "filter_by_patterns",
    "expand_pattern",
    "compile_pattern",
    "get_pattern_prefix",
]
