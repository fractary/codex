"""
Configuration loading and management.

This module provides functions for loading and managing Codex configuration
from .fractary/codex/config.yaml files (v4.0 standard).
"""

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Optional

import yaml

from ..errors import ConfigurationError
from ..references.resolver import detect_current_project

# Configuration file locations (v4.0 standard only)
CONFIG_FILENAMES = ["config.yaml", "config.yml"]
CONFIG_DIRS = [".fractary/codex"]

# Default configuration values (v4.0 standard)
DEFAULT_CACHE_DIR = ".fractary/codex/cache"
DEFAULT_TTL = 86400  # 1 day


@dataclass
class CodexConfig:
    """Codex SDK configuration.

    Attributes:
        organization: Organization name
        project: Project name (optional, defaults to organization)
        cache_dir: Directory for cache storage
        default_ttl: Default TTL in seconds
        storage: Storage provider configuration
        types: Custom type definitions
        raw: Raw configuration dictionary
    """

    organization: str
    project: Optional[str] = None
    cache_dir: str = DEFAULT_CACHE_DIR
    default_ttl: int = DEFAULT_TTL
    storage: dict[str, Any] = field(default_factory=dict)
    types: dict[str, Any] = field(default_factory=dict)
    raw: dict[str, Any] = field(default_factory=dict)

    @property
    def project_name(self) -> str:
        """Get the project name, defaulting to organization if not set."""
        return self.project or self.organization


def load_config(
    start_path: Optional[Path] = None,
    *,
    allow_missing: bool = True,
) -> Optional[CodexConfig]:
    """Load Codex configuration from .fractary/codex/config.yaml (v4.0 standard).

    This function searches for configuration files in the following order:
    1. start_path/.fractary/codex/config.yaml
    2. Parent directories (walking up to root)
    3. Not found - returns None or raises error

    Args:
        start_path: Starting directory for config search (defaults to cwd)
        allow_missing: If True, return None when no config found.
                      If False, raise ConfigurationError.

    Returns:
        CodexConfig if found, None if not found and allow_missing=True

    Raises:
        ConfigurationError: If config file exists but is invalid,
                           or if allow_missing=False and no config found

    Examples:
        >>> config = load_config()
        >>> if config:
        ...     print(f"Organization: {config.organization}")
    """
    if start_path is None:
        start_path = Path.cwd()

    start_path = Path(start_path).resolve()

    # Search for config file
    config_path = _find_config_file(start_path)

    if config_path is None:
        # Try user home directory
        home_config = _find_config_file(Path.home(), recursive=False)
        if home_config:
            config_path = home_config

    if config_path is None:
        if allow_missing:
            return None
        raise ConfigurationError(
            f"No configuration file found. Searched in {start_path} and parent directories.",
            code="CONFIG_NOT_FOUND",
            details={"search_path": str(start_path)},
        )

    # Load and parse config
    return _load_config_file(config_path)


def resolve_organization(
    config: Optional[CodexConfig] = None,
    *,
    start_path: Optional[Path] = None,
) -> str:
    """Resolve the organization name.

    Resolution order:
    1. Explicit config.organization
    2. CODEX_ORG environment variable
    3. Git remote (if in a git repository)
    4. Directory name as fallback

    Args:
        config: Configuration to use (optional)
        start_path: Starting path for git detection

    Returns:
        Organization name

    Raises:
        ConfigurationError: If organization cannot be determined
    """
    # Check explicit config
    if config and config.organization:
        return config.organization

    # Check environment variable
    env_org = os.environ.get("CODEX_ORG")
    if env_org:
        return env_org

    # Try git detection
    project_ctx = detect_current_project(start_path)
    if project_ctx:
        return project_ctx.org

    # Fallback to directory name
    if start_path is None:
        start_path = Path.cwd()

    return start_path.name


def get_config_path(start_path: Optional[Path] = None) -> Optional[Path]:
    """Get the path to the configuration file without loading it.

    Args:
        start_path: Starting directory for search

    Returns:
        Path to config file if found, None otherwise
    """
    if start_path is None:
        start_path = Path.cwd()

    return _find_config_file(Path(start_path).resolve())


def _find_config_file(
    start_path: Path,
    *,
    recursive: bool = True,
) -> Optional[Path]:
    """Find a configuration file starting from the given path.

    Args:
        start_path: Directory to start searching from
        recursive: Whether to search parent directories

    Returns:
        Path to config file if found, None otherwise
    """
    current = start_path

    while True:
        # Check each config directory
        for config_dir in CONFIG_DIRS:
            dir_path = current / config_dir
            if dir_path.is_dir():
                # Check each config filename
                for filename in CONFIG_FILENAMES:
                    config_path = dir_path / filename
                    if config_path.is_file():
                        return config_path

        # Stop if not recursive or at root
        if not recursive or current == current.parent:
            break

        current = current.parent

    return None


def _load_config_file(config_path: Path) -> CodexConfig:
    """Load and parse a configuration file.

    Args:
        config_path: Path to the configuration file

    Returns:
        Parsed CodexConfig

    Raises:
        ConfigurationError: If file cannot be read or parsed
    """
    try:
        with open(config_path, encoding="utf-8") as f:
            raw_config = yaml.safe_load(f)
    except FileNotFoundError:
        raise ConfigurationError(
            f"Configuration file not found: {config_path}",
            code="CONFIG_FILE_NOT_FOUND",
            details={"path": str(config_path)},
        )
    except yaml.YAMLError as e:
        raise ConfigurationError(
            f"Invalid YAML in configuration file: {e}",
            code="INVALID_CONFIG_YAML",
            details={"path": str(config_path), "error": str(e)},
        )
    except OSError as e:
        raise ConfigurationError(
            f"Failed to read configuration file: {e}",
            code="CONFIG_READ_ERROR",
            details={"path": str(config_path), "error": str(e)},
        )

    if raw_config is None:
        raw_config = {}

    if not isinstance(raw_config, dict):
        raise ConfigurationError(
            f"Configuration must be a YAML mapping, got {type(raw_config).__name__}",
            code="INVALID_CONFIG_TYPE",
            details={"path": str(config_path)},
        )

    return _parse_config(raw_config, config_path)


def _parse_config(raw: dict[str, Any], source_path: Path) -> CodexConfig:
    """Parse raw configuration dictionary into CodexConfig.

    Args:
        raw: Raw configuration dictionary
        source_path: Path to source file (for error messages)

    Returns:
        Parsed CodexConfig

    Raises:
        ConfigurationError: If required fields are missing or invalid
    """
    # Get organization (required, but can be inferred)
    organization = raw.get("organization") or raw.get("org")

    if not organization:
        # Try to infer from git
        project_ctx = detect_current_project(source_path.parent)
        if project_ctx:
            organization = project_ctx.org
        else:
            # Use directory name
            organization = source_path.parent.parent.name

    # Get project (optional)
    project = raw.get("project")

    # Get cache settings
    cache_config = raw.get("cache", {})
    if isinstance(cache_config, dict):
        cache_dir = cache_config.get("directory", DEFAULT_CACHE_DIR)
        default_ttl = cache_config.get("default_ttl", DEFAULT_TTL)
    else:
        cache_dir = DEFAULT_CACHE_DIR
        default_ttl = DEFAULT_TTL

    # Get storage config
    storage = raw.get("storage", {})
    if not isinstance(storage, dict):
        storage = {}

    # Get custom types
    types = raw.get("types", {})
    if not isinstance(types, dict):
        types = {}

    return CodexConfig(
        organization=organization,
        project=project,
        cache_dir=cache_dir,
        default_ttl=default_ttl,
        storage=storage,
        types=types,
        raw=raw,
    )
