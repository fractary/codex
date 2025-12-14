"""
Path validation and sanitization utilities.

This module provides functions to validate and sanitize file paths
to prevent path traversal attacks and ensure safe file access.
"""

import os
from typing import List, Optional

from ..errors import ValidationError

# Dangerous path patterns
DANGEROUS_PATTERNS = [
    r"\.\.",  # Parent directory traversal
    r"^/",  # Absolute paths (Unix)
    r"^[A-Za-z]:",  # Absolute paths (Windows)
    r"^\\\\",  # UNC paths
    r"\x00",  # Null bytes
]

# Reserved filenames on Windows
WINDOWS_RESERVED = {
    "CON",
    "PRN",
    "AUX",
    "NUL",
    "COM1",
    "COM2",
    "COM3",
    "COM4",
    "COM5",
    "COM6",
    "COM7",
    "COM8",
    "COM9",
    "LPT1",
    "LPT2",
    "LPT3",
    "LPT4",
    "LPT5",
    "LPT6",
    "LPT7",
    "LPT8",
    "LPT9",
}

# Maximum path segment length
MAX_SEGMENT_LENGTH = 255


def validate_path(path: str, *, allow_absolute: bool = False) -> bool:
    """Validate a file path for safety.

    Checks for path traversal attempts, dangerous characters, and
    other potentially unsafe path components.

    Args:
        path: Path to validate
        allow_absolute: Whether to allow absolute paths (default: False)

    Returns:
        True if path is valid and safe

    Raises:
        ValidationError: If path contains dangerous patterns

    Examples:
        >>> validate_path("docs/api.md")
        True
        >>> validate_path("../../../etc/passwd")
        Traceback (most recent call last):
        ...
        ValidationError: Path contains parent directory traversal
    """
    if not path:
        raise ValidationError(
            "Path cannot be empty",
            code="EMPTY_PATH",
        )

    if not isinstance(path, str):
        raise ValidationError(
            f"Path must be a string, got {type(path).__name__}",
            code="INVALID_PATH_TYPE",
        )

    # Check for null bytes
    if "\x00" in path:
        raise ValidationError(
            "Path contains null bytes",
            code="PATH_NULL_BYTES",
            details={"path": repr(path)},
        )

    # Check for parent directory traversal
    if ".." in path:
        raise ValidationError(
            "Path contains parent directory traversal (..)",
            code="PATH_TRAVERSAL",
            details={"path": path},
        )

    # Check for absolute paths
    if not allow_absolute:
        if path.startswith("/"):
            raise ValidationError(
                "Absolute paths not allowed",
                code="ABSOLUTE_PATH",
                details={"path": path},
            )
        if len(path) >= 2 and path[1] == ":":
            raise ValidationError(
                "Windows absolute paths not allowed",
                code="ABSOLUTE_PATH_WINDOWS",
                details={"path": path},
            )
        if path.startswith("\\\\"):
            raise ValidationError(
                "UNC paths not allowed",
                code="UNC_PATH",
                details={"path": path},
            )

    # Check path segments
    segments = path.replace("\\", "/").split("/")
    for segment in segments:
        if not segment:
            continue  # Allow empty segments (double slashes get normalized)

        # Check segment length
        if len(segment) > MAX_SEGMENT_LENGTH:
            raise ValidationError(
                f"Path segment too long: {len(segment)} chars (max {MAX_SEGMENT_LENGTH})",
                code="SEGMENT_TOO_LONG",
                details={"segment": segment[:50] + "...", "length": len(segment)},
            )

        # Check for Windows reserved names
        name_without_ext = segment.split(".")[0].upper()
        if name_without_ext in WINDOWS_RESERVED:
            raise ValidationError(
                f"Path contains Windows reserved name: {segment}",
                code="WINDOWS_RESERVED_NAME",
                details={"segment": segment},
            )

    return True


def sanitize_path(path: str) -> str:
    """Sanitize a file path by removing dangerous components.

    This function normalizes and cleans a path to make it safe for use.
    It removes parent directory references, normalizes separators,
    and strips leading/trailing whitespace.

    Args:
        path: Path to sanitize

    Returns:
        Sanitized path string

    Examples:
        >>> sanitize_path("  docs//api.md  ")
        'docs/api.md'
        >>> sanitize_path("docs/../other/file.md")
        'other/file.md'
    """
    if not path:
        return ""

    # Strip whitespace
    path = path.strip()

    # Normalize separators
    path = path.replace("\\", "/")

    # Remove double slashes
    while "//" in path:
        path = path.replace("//", "/")

    # Remove leading slash
    path = path.lstrip("/")

    # Remove trailing slash
    path = path.rstrip("/")

    # Handle parent directory references by normalizing
    parts: List[str] = []
    for part in path.split("/"):
        if part == "..":
            if parts:
                parts.pop()
            # If no parts to pop, just skip the ..
        elif part and part != ".":
            parts.append(part)

    return "/".join(parts)


def is_safe_path(path: str) -> bool:
    """Check if a path is safe without raising exceptions.

    Args:
        path: Path to check

    Returns:
        True if path is safe, False otherwise

    Examples:
        >>> is_safe_path("docs/api.md")
        True
        >>> is_safe_path("../secret.txt")
        False
    """
    try:
        validate_path(path)
        return True
    except ValidationError:
        return False


def normalize_path(path: str) -> str:
    """Normalize a path for consistent comparison.

    This function:
    - Converts backslashes to forward slashes
    - Removes duplicate slashes
    - Removes trailing slashes
    - Lowercases for case-insensitive comparison

    Args:
        path: Path to normalize

    Returns:
        Normalized path string

    Examples:
        >>> normalize_path("Docs//API.md")
        'docs/api.md'
    """
    if not path:
        return ""

    # Normalize separators
    path = path.replace("\\", "/")

    # Remove double slashes
    while "//" in path:
        path = path.replace("//", "/")

    # Remove leading/trailing slashes
    path = path.strip("/")

    # Lowercase for comparison
    return path.lower()


def get_extension(path: str) -> Optional[str]:
    """Get the file extension from a path.

    Args:
        path: File path

    Returns:
        Extension without the dot, or None if no extension

    Examples:
        >>> get_extension("docs/api.md")
        'md'
        >>> get_extension("README")
        None
    """
    if not path:
        return None

    # Get the filename
    filename = os.path.basename(path)

    # Check for extension
    if "." not in filename:
        return None

    # Handle hidden files like .gitignore
    if filename.startswith(".") and filename.count(".") == 1:
        return None

    return filename.rsplit(".", 1)[-1].lower()
