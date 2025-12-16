"""
Artifact type system for Fractary Codex.

This module provides a type registry for managing artifact types,
which are used to determine caching TTLs and other type-specific behavior.

Built-in types include:
- docs: Documentation files (*.md, docs/**)
- config: Configuration files (*.yaml, *.json, *.toml)
- schema: Schema definition files
- templates: Template files
- specs: Specification documents
- workflows: CI/CD workflow files
- scripts: Script files
- prompts: AI prompt templates
- agents: AI agent definitions
- skills: AI skill definitions

Custom types can be defined in configuration and registered with the registry.
"""

from .builtin import (
    BUILT_IN_TYPES,
    DEFAULT_TTL,
    TTL,
    ArtifactType,
    get_all_built_in_types,
    get_built_in_type,
)
from .custom import (
    load_custom_types,
    merge_type,
    parse_custom_type,
)
from .registry import (
    TypeRegistry,
    create_default_registry,
)

__all__ = [
    # Constants
    "BUILT_IN_TYPES",
    "DEFAULT_TTL",
    "TTL",
    # Data classes
    "ArtifactType",
    # Built-in functions
    "get_built_in_type",
    "get_all_built_in_types",
    # Registry
    "TypeRegistry",
    "create_default_registry",
    # Custom type functions
    "parse_custom_type",
    "load_custom_types",
    "merge_type",
]
