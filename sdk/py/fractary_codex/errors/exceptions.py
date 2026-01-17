"""
Exception classes for Fractary Codex SDK.

All exceptions inherit from CodexError to allow catching all SDK-related
errors with a single except clause.
"""

from typing import Any, Optional


class CodexError(Exception):
    """Base exception for all Codex SDK errors.

    All other exceptions in this module inherit from this class,
    allowing you to catch all Codex-related errors with:

        try:
            ...
        except CodexError as e:
            handle_error(e)

    Attributes:
        message: Human-readable error description.
        code: Optional error code for programmatic handling.
        details: Optional dictionary with additional error context.
    """

    def __init__(
        self,
        message: str,
        *,
        code: Optional[str] = None,
        details: Optional[dict[str, Any]] = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.code = code
        self.details = details or {}

    def __str__(self) -> str:
        if self.code:
            return f"[{self.code}] {self.message}"
        return self.message

    def __repr__(self) -> str:
        return f"{self.__class__.__name__}({self.message!r}, code={self.code!r})"


class ConfigurationError(CodexError):
    """Raised when configuration is invalid or cannot be loaded.

    This includes:
    - Missing required configuration files
    - Invalid YAML syntax in config files
    - Missing required configuration keys
    - Invalid configuration values

    Example:
        raise ConfigurationError(
            "Missing required key 'organization' in config.yaml",
            code="CONFIG_MISSING_KEY",
            details={"key": "organization", "file": ".fractary/config.yaml"}
        )
    """

    pass


class ValidationError(CodexError):
    """Raised when validation of input data fails.

    This includes:
    - Invalid URI format
    - Invalid path components
    - Schema validation failures
    - Constraint violations

    Example:
        raise ValidationError(
            "Invalid codex URI: must start with 'codex://'",
            code="INVALID_URI_PREFIX",
            details={"uri": "http://example.com/doc.md"}
        )
    """

    pass


class StorageError(CodexError):
    """Raised when storage operations fail.

    This includes:
    - File not found errors
    - Permission denied errors
    - Network errors (for remote storage)
    - Provider-specific errors

    Example:
        raise StorageError(
            "Failed to fetch from GitHub: rate limit exceeded",
            code="GITHUB_RATE_LIMIT",
            details={"reset_at": "2025-01-01T12:00:00Z"}
        )
    """

    pass


class CacheError(CodexError):
    """Raised when cache operations fail.

    This includes:
    - Cache corruption
    - Disk space errors
    - Serialization errors

    Example:
        raise CacheError(
            "Failed to persist cache: disk full",
            code="CACHE_DISK_FULL",
            details={"required_bytes": 1024, "available_bytes": 0}
        )
    """

    pass


class ReferenceError(CodexError):
    """Raised when reference resolution fails.

    This includes:
    - Unable to resolve organization
    - Unable to resolve project
    - Circular references
    - Missing referenced files

    Example:
        raise ReferenceError(
            "Cannot resolve organization: not in a git repository",
            code="NO_GIT_REPO"
        )
    """

    pass
