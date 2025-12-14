"""
Reference parsing and resolution for codex:// URIs.

This module provides utilities for working with codex:// URIs, including:
- Parsing URIs into components
- Building URIs from components
- Validating paths for safety
- Resolving references to file paths or URLs
- Detecting current project context

URI Format: codex://org/project/path/to/file.md
"""

from .parser import (
    CODEX_URI_PREFIX,
    LEGACY_REF_PREFIX,
    ParsedReference,
    build_uri,
    convert_legacy_reference,
    is_legacy_reference,
    is_valid_uri,
    parse_reference,
)
from .resolver import (
    ProjectContext,
    ResolvedReference,
    detect_current_project,
    resolve_reference,
    resolve_references,
)
from .validator import (
    get_extension,
    is_safe_path,
    normalize_path,
    sanitize_path,
    validate_path,
)

__all__ = [
    # Constants
    "CODEX_URI_PREFIX",
    "LEGACY_REF_PREFIX",
    # Data classes
    "ParsedReference",
    "ProjectContext",
    "ResolvedReference",
    # Parser functions
    "parse_reference",
    "build_uri",
    "is_valid_uri",
    "is_legacy_reference",
    "convert_legacy_reference",
    # Validator functions
    "validate_path",
    "sanitize_path",
    "is_safe_path",
    "normalize_path",
    "get_extension",
    # Resolver functions
    "detect_current_project",
    "resolve_reference",
    "resolve_references",
]
