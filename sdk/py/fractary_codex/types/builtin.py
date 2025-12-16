"""
Built-in artifact types and TTL constants.

This module defines the default artifact types recognized by the Codex SDK,
along with their default TTL (time-to-live) values for caching.
"""

from collections.abc import Sequence
from dataclasses import dataclass
from typing import Optional


class TTL:
    """Time-to-live constants in seconds.

    These constants provide human-readable TTL values for common durations.

    Examples:
        >>> from fractary_codex.types import TTL
        >>> cache_ttl = TTL.HOUR * 2  # 2 hours
        >>> long_ttl = TTL.WEEK
    """

    MINUTE: int = 60
    HOUR: int = 3600
    DAY: int = 86400
    WEEK: int = 604800
    MONTH: int = 2592000  # 30 days
    YEAR: int = 31536000  # 365 days

    # Common aliases
    FIVE_MINUTES: int = 300
    FIFTEEN_MINUTES: int = 900
    THIRTY_MINUTES: int = 1800
    SIX_HOURS: int = 21600
    TWELVE_HOURS: int = 43200
    TWO_DAYS: int = 172800
    THREE_DAYS: int = 259200


@dataclass(frozen=True)
class ArtifactType:
    """Definition of an artifact type.

    Attributes:
        name: Unique identifier for the type (e.g., 'docs', 'config')
        patterns: Glob patterns that match this type
        ttl: Default TTL in seconds for caching
        description: Human-readable description
        priority: Priority for pattern matching (higher = checked first)
    """

    name: str
    patterns: Sequence[str]
    ttl: int
    description: str = ""
    priority: int = 0


# Built-in artifact types with default TTLs
# These match the TypeScript SDK's built-in types
BUILT_IN_TYPES: dict[str, ArtifactType] = {
    "docs": ArtifactType(
        name="docs",
        patterns=["docs/**/*.md", "docs/**/*.mdx", "*.md"],
        ttl=TTL.DAY,
        description="Documentation files",
        priority=10,
    ),
    "config": ArtifactType(
        name="config",
        patterns=[
            "*.yaml",
            "*.yml",
            "*.json",
            "*.toml",
            ".fractary/**",
            "config/**",
        ],
        ttl=TTL.HOUR,
        description="Configuration files",
        priority=20,
    ),
    "schema": ArtifactType(
        name="schema",
        patterns=[
            "schemas/**/*.json",
            "schemas/**/*.yaml",
            "**/*.schema.json",
            "**/*.schema.yaml",
        ],
        ttl=TTL.DAY,
        description="Schema definition files",
        priority=30,
    ),
    "templates": ArtifactType(
        name="templates",
        patterns=["templates/**/*", "**/*.template.*", "**/*.tmpl"],
        ttl=TTL.WEEK,
        description="Template files",
        priority=15,
    ),
    "specs": ArtifactType(
        name="specs",
        patterns=["specs/**/*.md", "specifications/**/*.md"],
        ttl=TTL.DAY,
        description="Specification documents",
        priority=25,
    ),
    "workflows": ArtifactType(
        name="workflows",
        patterns=[".github/workflows/**/*.yaml", ".github/workflows/**/*.yml"],
        ttl=TTL.SIX_HOURS,
        description="CI/CD workflow files",
        priority=40,
    ),
    "scripts": ArtifactType(
        name="scripts",
        patterns=["scripts/**/*.sh", "scripts/**/*.py", "bin/**/*"],
        ttl=TTL.TWELVE_HOURS,
        description="Script files",
        priority=35,
    ),
    "prompts": ArtifactType(
        name="prompts",
        patterns=["prompts/**/*.md", "prompts/**/*.txt", "**/*.prompt.md"],
        ttl=TTL.HOUR,
        description="AI prompt templates",
        priority=50,
    ),
    "agents": ArtifactType(
        name="agents",
        patterns=["agents/**/*", "**/*.agent.yaml", "**/*.agent.md"],
        ttl=TTL.HOUR,
        description="AI agent definitions",
        priority=45,
    ),
    "skills": ArtifactType(
        name="skills",
        patterns=["skills/**/*", "**/*.skill.yaml", "**/*.skill.md"],
        ttl=TTL.HOUR,
        description="AI skill definitions",
        priority=45,
    ),
}


# Default TTL when no type matches
DEFAULT_TTL: int = TTL.DAY


def get_built_in_type(name: str) -> Optional[ArtifactType]:
    """Get a built-in type by name.

    Args:
        name: Type name (e.g., 'docs', 'config')

    Returns:
        ArtifactType if found, None otherwise

    Examples:
        >>> t = get_built_in_type("docs")
        >>> t.ttl
        86400
    """
    return BUILT_IN_TYPES.get(name)


def get_all_built_in_types() -> list[ArtifactType]:
    """Get all built-in types sorted by priority (highest first).

    Returns:
        List of ArtifactType sorted by priority descending
    """
    return sorted(BUILT_IN_TYPES.values(), key=lambda t: -t.priority)
