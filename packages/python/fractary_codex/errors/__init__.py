"""
Error classes for Fractary Codex.

This module provides a hierarchy of exceptions for handling various error
conditions in the SDK.
"""

from .exceptions import (
    CodexError,
    ConfigurationError,
    ValidationError,
    StorageError,
    CacheError,
    ReferenceError,
)

__all__ = [
    "CodexError",
    "ConfigurationError",
    "ValidationError",
    "StorageError",
    "CacheError",
    "ReferenceError",
]
