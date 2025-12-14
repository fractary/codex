"""
Reference parsing utilities for codex:// URIs.

This module provides functions to parse, build, and validate codex:// URIs
which are used to reference documents across organizations and projects.

URI Format: codex://org/project/path/to/file.md
"""

import re
from dataclasses import dataclass
from typing import Optional

from ..errors import ValidationError

CODEX_URI_PREFIX = "codex://"
LEGACY_REF_PREFIX = "$ref:"

# Valid org/project name pattern: alphanumeric, hyphens, underscores
NAME_PATTERN = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9_-]*$")

# Maximum lengths
MAX_ORG_LENGTH = 100
MAX_PROJECT_LENGTH = 100
MAX_PATH_LENGTH = 1000


@dataclass(frozen=True)
class ParsedReference:
    """Parsed components of a codex:// URI.

    Attributes:
        org: Organization name (e.g., 'fractary')
        project: Project name (e.g., 'codex')
        path: Path within the project (e.g., 'docs/api.md')
        original: The original URI string
    """

    org: str
    project: str
    path: str
    original: str

    def __str__(self) -> str:
        """Return the URI representation."""
        return build_uri(self.org, self.project, self.path)


def parse_reference(uri: str) -> ParsedReference:
    """Parse a codex:// URI into its components.

    Args:
        uri: A codex URI like "codex://org/project/path/to/file.md"

    Returns:
        ParsedReference with org, project, and path components

    Raises:
        ValidationError: If URI format is invalid

    Examples:
        >>> ref = parse_reference("codex://fractary/codex/docs/api.md")
        >>> ref.org
        'fractary'
        >>> ref.project
        'codex'
        >>> ref.path
        'docs/api.md'
    """
    if not isinstance(uri, str):
        raise ValidationError(
            f"URI must be a string, got {type(uri).__name__}",
            code="INVALID_URI_TYPE",
        )

    if not uri:
        raise ValidationError(
            "URI cannot be empty",
            code="EMPTY_URI",
        )

    if not uri.startswith(CODEX_URI_PREFIX):
        raise ValidationError(
            f"Invalid URI: must start with '{CODEX_URI_PREFIX}'",
            code="INVALID_URI_PREFIX",
            details={"uri": uri, "expected_prefix": CODEX_URI_PREFIX},
        )

    # Remove prefix and split
    path_part = uri[len(CODEX_URI_PREFIX) :]
    parts = path_part.split("/", 2)

    if len(parts) < 3 or not all(parts):
        raise ValidationError(
            "URI must have format: codex://org/project/path",
            code="INVALID_URI_FORMAT",
            details={"uri": uri},
        )

    org, project, path = parts

    # Validate org name
    if not NAME_PATTERN.match(org):
        raise ValidationError(
            f"Invalid organization name: '{org}'. "
            "Must start with alphanumeric and contain only alphanumeric, hyphens, or underscores.",
            code="INVALID_ORG_NAME",
            details={"org": org},
        )

    if len(org) > MAX_ORG_LENGTH:
        raise ValidationError(
            f"Organization name too long: {len(org)} chars (max {MAX_ORG_LENGTH})",
            code="ORG_NAME_TOO_LONG",
            details={"org": org, "length": len(org), "max": MAX_ORG_LENGTH},
        )

    # Validate project name
    if not NAME_PATTERN.match(project):
        raise ValidationError(
            f"Invalid project name: '{project}'. "
            "Must start with alphanumeric and contain only alphanumeric, hyphens, or underscores.",
            code="INVALID_PROJECT_NAME",
            details={"project": project},
        )

    if len(project) > MAX_PROJECT_LENGTH:
        raise ValidationError(
            f"Project name too long: {len(project)} chars (max {MAX_PROJECT_LENGTH})",
            code="PROJECT_NAME_TOO_LONG",
            details={"project": project, "length": len(project), "max": MAX_PROJECT_LENGTH},
        )

    # Validate path
    if len(path) > MAX_PATH_LENGTH:
        raise ValidationError(
            f"Path too long: {len(path)} chars (max {MAX_PATH_LENGTH})",
            code="PATH_TOO_LONG",
            details={"path": path, "length": len(path), "max": MAX_PATH_LENGTH},
        )

    return ParsedReference(
        org=org,
        project=project,
        path=path,
        original=uri,
    )


def build_uri(org: str, project: str, path: str) -> str:
    """Build a codex:// URI from components.

    Args:
        org: Organization name
        project: Project name
        path: Path within the project

    Returns:
        A codex:// URI string

    Examples:
        >>> build_uri("fractary", "codex", "docs/api.md")
        'codex://fractary/codex/docs/api.md'
    """
    # Normalize path - remove leading slash if present
    normalized_path = path.lstrip("/")
    return f"{CODEX_URI_PREFIX}{org}/{project}/{normalized_path}"


def is_valid_uri(uri: str) -> bool:
    """Check if a string is a valid codex:// URI.

    Args:
        uri: String to validate

    Returns:
        True if valid, False otherwise

    Examples:
        >>> is_valid_uri("codex://org/project/path.md")
        True
        >>> is_valid_uri("http://example.com")
        False
    """
    try:
        parse_reference(uri)
        return True
    except (ValidationError, TypeError):
        return False


def is_legacy_reference(text: str) -> bool:
    """Check if text contains a legacy $ref: reference.

    Args:
        text: Text to check

    Returns:
        True if contains legacy reference format

    Examples:
        >>> is_legacy_reference("$ref:docs/api.md")
        True
        >>> is_legacy_reference("codex://org/project/docs/api.md")
        False
    """
    return text.startswith(LEGACY_REF_PREFIX)


def convert_legacy_reference(
    legacy_ref: str,
    default_org: str,
    default_project: Optional[str] = None,
) -> str:
    """Convert a legacy $ref: reference to codex:// format.

    Args:
        legacy_ref: Legacy reference like "$ref:docs/api.md"
        default_org: Organization to use
        default_project: Project to use (if not in legacy ref)

    Returns:
        Converted codex:// URI

    Raises:
        ValidationError: If legacy reference format is invalid

    Examples:
        >>> convert_legacy_reference("$ref:docs/api.md", "fractary", "codex")
        'codex://fractary/codex/docs/api.md'
    """
    if not legacy_ref.startswith(LEGACY_REF_PREFIX):
        raise ValidationError(
            f"Not a legacy reference: must start with '{LEGACY_REF_PREFIX}'",
            code="NOT_LEGACY_REF",
            details={"ref": legacy_ref},
        )

    path = legacy_ref[len(LEGACY_REF_PREFIX) :]

    if not path:
        raise ValidationError(
            "Legacy reference path cannot be empty",
            code="EMPTY_LEGACY_PATH",
        )

    project = default_project or default_org
    return build_uri(default_org, project, path)
