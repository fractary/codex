"""
Custom type loading and merging utilities.

This module provides functions for loading custom artifact types from
configuration files and merging them with built-in types.
"""

from typing import Any

from ..errors import ConfigurationError
from .builtin import ArtifactType, DEFAULT_TTL


def parse_custom_type(name: str, config: dict[str, Any]) -> ArtifactType:
    """Parse a custom type definition from configuration.

    Expected configuration format:
    ```yaml
    types:
      my-type:
        patterns:
          - "my/**/*.md"
        ttl: 3600
        description: "My custom type"
        priority: 100
    ```

    Args:
        name: Type name
        config: Type configuration dictionary

    Returns:
        ArtifactType instance

    Raises:
        ConfigurationError: If configuration is invalid
    """
    if not isinstance(config, dict):
        raise ConfigurationError(
            f"Invalid type configuration for '{name}': expected dict, got {type(config).__name__}",
            code="INVALID_TYPE_CONFIG",
            details={"type_name": name},
        )

    # Extract patterns (required)
    patterns = config.get("patterns")
    if patterns is None:
        raise ConfigurationError(
            f"Missing required 'patterns' for type '{name}'",
            code="MISSING_TYPE_PATTERNS",
            details={"type_name": name},
        )

    if isinstance(patterns, str):
        patterns = [patterns]
    elif not isinstance(patterns, (list, tuple)):
        raise ConfigurationError(
            f"Invalid 'patterns' for type '{name}': expected list or string",
            code="INVALID_TYPE_PATTERNS",
            details={"type_name": name, "patterns_type": type(patterns).__name__},
        )

    # Validate patterns are strings
    for i, pattern in enumerate(patterns):
        if not isinstance(pattern, str):
            raise ConfigurationError(
                f"Invalid pattern at index {i} for type '{name}': expected string",
                code="INVALID_PATTERN_TYPE",
                details={"type_name": name, "index": i, "pattern": pattern},
            )

    # Extract TTL (optional, defaults to DEFAULT_TTL)
    ttl = config.get("ttl", DEFAULT_TTL)
    if isinstance(ttl, str):
        ttl = _parse_ttl_string(ttl)
    elif not isinstance(ttl, int):
        raise ConfigurationError(
            f"Invalid 'ttl' for type '{name}': expected int or string",
            code="INVALID_TYPE_TTL",
            details={"type_name": name, "ttl_type": type(ttl).__name__},
        )

    # Extract description (optional)
    description = config.get("description", "")
    if not isinstance(description, str):
        description = str(description)

    # Extract priority (optional, defaults to 0)
    priority = config.get("priority", 0)
    if not isinstance(priority, int):
        try:
            priority = int(priority)
        except (ValueError, TypeError):
            raise ConfigurationError(
                f"Invalid 'priority' for type '{name}': expected int",
                code="INVALID_TYPE_PRIORITY",
                details={"type_name": name, "priority": priority},
            )

    return ArtifactType(
        name=name,
        patterns=list(patterns),
        ttl=ttl,
        description=description,
        priority=priority,
    )


def load_custom_types(types_config: dict[str, dict[str, Any]]) -> dict[str, ArtifactType]:
    """Load multiple custom types from configuration.

    Args:
        types_config: Dictionary mapping type names to configurations

    Returns:
        Dictionary mapping type names to ArtifactType instances

    Raises:
        ConfigurationError: If any configuration is invalid
    """
    if not isinstance(types_config, dict):
        raise ConfigurationError(
            f"Invalid types configuration: expected dict, got {type(types_config).__name__}",
            code="INVALID_TYPES_CONFIG",
        )

    result: dict[str, ArtifactType] = {}
    errors: list[str] = []

    for name, config in types_config.items():
        try:
            result[name] = parse_custom_type(name, config)
        except ConfigurationError as e:
            errors.append(f"  - {name}: {e.message}")

    if errors:
        raise ConfigurationError(
            f"Failed to parse {len(errors)} custom type(s):\n" + "\n".join(errors),
            code="CUSTOM_TYPES_PARSE_ERROR",
            details={"error_count": len(errors)},
        )

    return result


def merge_type(base: ArtifactType, override: dict[str, Any]) -> ArtifactType:
    """Merge an override configuration into a base type.

    This allows extending built-in types with custom settings.

    Args:
        base: Base artifact type
        override: Override configuration

    Returns:
        New ArtifactType with merged settings
    """
    # Start with base values
    patterns = list(base.patterns)
    ttl = base.ttl
    description = base.description
    priority = base.priority

    # Apply overrides
    if "patterns" in override:
        override_patterns = override["patterns"]
        if isinstance(override_patterns, str):
            override_patterns = [override_patterns]

        # Check if we should extend or replace
        if override.get("extend_patterns", False):
            patterns = patterns + list(override_patterns)
        else:
            patterns = list(override_patterns)

    if "ttl" in override:
        ttl_value = override["ttl"]
        if isinstance(ttl_value, str):
            ttl = _parse_ttl_string(ttl_value)
        else:
            ttl = int(ttl_value)

    if "description" in override:
        description = str(override["description"])

    if "priority" in override:
        priority = int(override["priority"])

    return ArtifactType(
        name=base.name,
        patterns=patterns,
        ttl=ttl,
        description=description,
        priority=priority,
    )


def _parse_ttl_string(ttl_str: str) -> int:
    """Parse a TTL string like '1h', '30m', '7d' into seconds.

    Supported units:
    - s: seconds
    - m: minutes
    - h: hours
    - d: days
    - w: weeks

    Args:
        ttl_str: TTL string (e.g., '1h', '30m', '7d')

    Returns:
        TTL in seconds

    Raises:
        ConfigurationError: If format is invalid
    """
    ttl_str = ttl_str.strip().lower()

    if not ttl_str:
        raise ConfigurationError(
            "Empty TTL string",
            code="EMPTY_TTL_STRING",
        )

    # Try to parse as plain integer first
    try:
        return int(ttl_str)
    except ValueError:
        pass

    # Parse with unit suffix
    multipliers = {
        "s": 1,
        "m": 60,
        "h": 3600,
        "d": 86400,
        "w": 604800,
    }

    unit = ttl_str[-1]
    if unit not in multipliers:
        raise ConfigurationError(
            f"Invalid TTL unit '{unit}'. Valid units: s, m, h, d, w",
            code="INVALID_TTL_UNIT",
            details={"ttl": ttl_str, "unit": unit},
        )

    try:
        value = int(ttl_str[:-1])
    except ValueError:
        raise ConfigurationError(
            f"Invalid TTL value: '{ttl_str}'",
            code="INVALID_TTL_VALUE",
            details={"ttl": ttl_str},
        )

    return value * multipliers[unit]
