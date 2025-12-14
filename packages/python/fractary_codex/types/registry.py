"""
Type registry for managing artifact types.

This module provides the TypeRegistry class for managing artifact types,
including built-in types and custom types from configuration.
"""

import fnmatch
from typing import Iterator, Optional

from .builtin import BUILT_IN_TYPES, DEFAULT_TTL, ArtifactType, get_all_built_in_types


class TypeRegistry:
    """Registry for managing artifact types.

    The registry maintains a collection of artifact types and provides
    methods for looking up types by name or file path pattern.

    Types are matched in priority order (highest first), so more specific
    types should have higher priority values.

    Examples:
        >>> registry = TypeRegistry()
        >>> ttl = registry.get_ttl("docs/api.md")
        >>> print(f"Cache for {ttl} seconds")

        >>> # Add custom type
        >>> registry.register(ArtifactType(
        ...     name="api-docs",
        ...     patterns=["docs/api/**/*.md"],
        ...     ttl=3600,
        ...     priority=100,  # Higher than built-in docs
        ... ))
    """

    def __init__(self, *, include_builtins: bool = True) -> None:
        """Initialize the type registry.

        Args:
            include_builtins: Whether to include built-in types (default: True)
        """
        self._types: dict[str, ArtifactType] = {}
        self._sorted_types: list[ArtifactType] | None = None

        if include_builtins:
            for type_def in BUILT_IN_TYPES.values():
                self._types[type_def.name] = type_def

    def register(self, type_def: ArtifactType) -> None:
        """Register a new artifact type.

        If a type with the same name already exists, it will be replaced.

        Args:
            type_def: Artifact type definition to register
        """
        self._types[type_def.name] = type_def
        self._sorted_types = None  # Invalidate cache

    def unregister(self, name: str) -> bool:
        """Unregister an artifact type by name.

        Args:
            name: Name of the type to unregister

        Returns:
            True if type was removed, False if not found
        """
        if name in self._types:
            del self._types[name]
            self._sorted_types = None
            return True
        return False

    def get(self, name: str) -> Optional[ArtifactType]:
        """Get an artifact type by name.

        Args:
            name: Type name

        Returns:
            ArtifactType if found, None otherwise
        """
        return self._types.get(name)

    def get_ttl(self, path: str) -> int:
        """Get the TTL for a file path based on matching types.

        This method checks all registered types in priority order and
        returns the TTL of the first matching type.

        Args:
            path: File path to match

        Returns:
            TTL in seconds (DEFAULT_TTL if no type matches)

        Examples:
            >>> registry = TypeRegistry()
            >>> registry.get_ttl("docs/api.md")
            86400
            >>> registry.get_ttl("config.yaml")
            3600
        """
        matched_type = self.match(path)
        return matched_type.ttl if matched_type else DEFAULT_TTL

    def match(self, path: str) -> Optional[ArtifactType]:
        """Find the artifact type that matches a file path.

        Types are checked in priority order (highest first).

        Args:
            path: File path to match

        Returns:
            Matching ArtifactType or None
        """
        # Normalize path for matching
        normalized_path = path.replace("\\", "/").lstrip("/")

        for type_def in self._get_sorted_types():
            if self._matches_patterns(normalized_path, type_def.patterns):
                return type_def

        return None

    def list_types(self) -> list[ArtifactType]:
        """List all registered types sorted by priority.

        Returns:
            List of ArtifactType sorted by priority descending
        """
        return list(self._get_sorted_types())

    def __iter__(self) -> Iterator[ArtifactType]:
        """Iterate over registered types in priority order."""
        return iter(self._get_sorted_types())

    def __len__(self) -> int:
        """Return the number of registered types."""
        return len(self._types)

    def __contains__(self, name: str) -> bool:
        """Check if a type name is registered."""
        return name in self._types

    def _get_sorted_types(self) -> list[ArtifactType]:
        """Get types sorted by priority (cached)."""
        if self._sorted_types is None:
            self._sorted_types = sorted(
                self._types.values(),
                key=lambda t: -t.priority,
            )
        return self._sorted_types

    @staticmethod
    def _matches_patterns(path: str, patterns: list[str] | tuple[str, ...]) -> bool:
        """Check if a path matches any of the patterns.

        Args:
            path: Normalized file path
            patterns: List of glob patterns

        Returns:
            True if any pattern matches
        """
        for pattern in patterns:
            # Handle ** for recursive matching
            if "**" in pattern:
                # fnmatch doesn't handle ** well, so we need special handling
                if _glob_match(path, pattern):
                    return True
            elif fnmatch.fnmatch(path, pattern):
                return True
        return False


def _glob_match(path: str, pattern: str) -> bool:
    """Match a path against a glob pattern with ** support.

    This provides basic ** support for patterns like:
    - docs/**/*.md - matches docs/foo.md and docs/bar/baz.md
    - **/*.yaml - matches foo.yaml and a/b/c.yaml
    """
    # Split pattern into parts
    pattern_parts = pattern.split("/")
    path_parts = path.split("/")

    return _match_parts(path_parts, pattern_parts)


def _match_parts(path_parts: list[str], pattern_parts: list[str]) -> bool:
    """Recursively match path parts against pattern parts."""
    if not pattern_parts:
        return not path_parts

    if not path_parts:
        # Remaining pattern must be all ** to match empty path
        return all(p == "**" for p in pattern_parts)

    pattern = pattern_parts[0]

    if pattern == "**":
        # ** can match zero or more path segments
        if len(pattern_parts) == 1:
            return True  # ** at end matches everything

        # Try matching ** against 0, 1, 2, ... path segments
        for i in range(len(path_parts) + 1):
            if _match_parts(path_parts[i:], pattern_parts[1:]):
                return True
        return False

    if fnmatch.fnmatch(path_parts[0], pattern):
        return _match_parts(path_parts[1:], pattern_parts[1:])

    return False


def create_default_registry() -> TypeRegistry:
    """Create a TypeRegistry with default built-in types.

    Returns:
        TypeRegistry with all built-in types registered
    """
    return TypeRegistry(include_builtins=True)
