"""
Metadata parsing utilities for YAML frontmatter.

This module provides functions for extracting and parsing YAML frontmatter
from markdown and other text files.
"""

import re
from dataclasses import dataclass
from typing import Any, Optional

import yaml

from ..errors import ValidationError


# Frontmatter regex pattern - matches content between --- markers
# The \n? before closing --- handles empty frontmatter (---\n---\n)
FRONTMATTER_PATTERN = re.compile(
    r"^---\s*\n(.*?)\n?---\s*\n?",
    re.DOTALL,
)


@dataclass
class ParsedMetadata:
    """Result of parsing file metadata.

    Attributes:
        data: Parsed YAML frontmatter as a dictionary
        content: File content without frontmatter
        raw_frontmatter: Raw frontmatter string (without --- markers)
        has_frontmatter: Whether the file had frontmatter
    """

    data: dict[str, Any]
    content: str
    raw_frontmatter: Optional[str] = None
    has_frontmatter: bool = False


def parse_metadata(text: str) -> ParsedMetadata:
    """Parse YAML frontmatter from text content.

    Extracts YAML frontmatter from the beginning of a document.
    Frontmatter must be enclosed in --- markers:

    ```markdown
    ---
    title: My Document
    author: John Doe
    ---

    Document content here...
    ```

    Args:
        text: Text content to parse

    Returns:
        ParsedMetadata with extracted data and remaining content

    Raises:
        ValidationError: If frontmatter exists but is invalid YAML

    Examples:
        >>> text = '''---
        ... title: Test
        ... ---
        ... Content here'''
        >>> result = parse_metadata(text)
        >>> result.data['title']
        'Test'
        >>> result.content
        'Content here'
    """
    if not text:
        return ParsedMetadata(
            data={},
            content="",
            has_frontmatter=False,
        )

    # Check for frontmatter
    match = FRONTMATTER_PATTERN.match(text)
    if not match:
        return ParsedMetadata(
            data={},
            content=text,
            has_frontmatter=False,
        )

    # Extract frontmatter and content
    raw_frontmatter = match.group(1)
    content = text[match.end() :]

    # Parse YAML
    try:
        data = yaml.safe_load(raw_frontmatter)
    except yaml.YAMLError as e:
        raise ValidationError(
            f"Invalid YAML in frontmatter: {e}",
            code="INVALID_FRONTMATTER_YAML",
            details={"error": str(e)},
        )

    # Handle empty frontmatter
    if data is None:
        data = {}

    # Ensure data is a dictionary
    if not isinstance(data, dict):
        raise ValidationError(
            f"Frontmatter must be a YAML mapping, got {type(data).__name__}",
            code="INVALID_FRONTMATTER_TYPE",
            details={"type": type(data).__name__},
        )

    return ParsedMetadata(
        data=data,
        content=content,
        raw_frontmatter=raw_frontmatter,
        has_frontmatter=True,
    )


def extract_frontmatter(text: str) -> Optional[str]:
    """Extract raw frontmatter string from text.

    Args:
        text: Text content

    Returns:
        Raw frontmatter string (without --- markers) or None

    Examples:
        >>> text = '''---
        ... title: Test
        ... ---
        ... Content'''
        >>> extract_frontmatter(text)
        'title: Test'
    """
    match = FRONTMATTER_PATTERN.match(text)
    if match:
        return match.group(1)
    return None


def has_frontmatter(text: str) -> bool:
    """Check if text has YAML frontmatter.

    Args:
        text: Text content to check

    Returns:
        True if text starts with frontmatter

    Examples:
        >>> has_frontmatter('---\\ntitle: Test\\n---\\nContent')
        True
        >>> has_frontmatter('# Just markdown')
        False
    """
    return bool(FRONTMATTER_PATTERN.match(text))


def build_frontmatter(data: dict[str, Any]) -> str:
    """Build a YAML frontmatter string from a dictionary.

    Args:
        data: Dictionary to convert to frontmatter

    Returns:
        Frontmatter string with --- markers

    Examples:
        >>> print(build_frontmatter({'title': 'Test', 'author': 'Me'}))
        ---
        title: Test
        author: Me
        ---
    """
    if not data:
        return "---\n---\n"

    yaml_content = yaml.dump(
        data,
        default_flow_style=False,
        allow_unicode=True,
        sort_keys=False,
    )
    return f"---\n{yaml_content}---\n"


def update_frontmatter(
    text: str,
    updates: dict[str, Any],
    *,
    merge: bool = True,
) -> str:
    """Update frontmatter in text content.

    Args:
        text: Text content with optional frontmatter
        updates: Dictionary of values to update
        merge: If True, merge with existing frontmatter.
               If False, replace entirely.

    Returns:
        Text with updated frontmatter

    Examples:
        >>> text = '''---
        ... title: Old Title
        ... ---
        ... Content'''
        >>> updated = update_frontmatter(text, {'title': 'New Title'})
    """
    parsed = parse_metadata(text)

    if merge and parsed.has_frontmatter:
        new_data = {**parsed.data, **updates}
    else:
        new_data = updates

    new_frontmatter = build_frontmatter(new_data)
    return new_frontmatter + parsed.content


def get_metadata_value(
    text: str,
    key: str,
    default: Any = None,
) -> Any:
    """Get a specific value from frontmatter.

    Args:
        text: Text content with frontmatter
        key: Key to retrieve (supports dot notation for nested keys)
        default: Default value if key not found

    Returns:
        Value from frontmatter or default

    Examples:
        >>> text = '''---
        ... author:
        ...   name: John
        ... ---'''
        >>> get_metadata_value(text, 'author.name')
        'John'
    """
    try:
        parsed = parse_metadata(text)
    except ValidationError:
        return default

    # Handle dot notation for nested keys
    keys = key.split(".")
    value = parsed.data

    for k in keys:
        if isinstance(value, dict) and k in value:
            value = value[k]
        else:
            return default

    return value


def validate_metadata(
    data: dict[str, Any],
    required_fields: Optional[list[str]] = None,
    allowed_fields: Optional[list[str]] = None,
) -> list[str]:
    """Validate metadata against requirements.

    Args:
        data: Metadata dictionary to validate
        required_fields: List of required field names
        allowed_fields: List of allowed field names (if set, others are invalid)

    Returns:
        List of validation error messages (empty if valid)

    Examples:
        >>> errors = validate_metadata(
        ...     {'title': 'Test'},
        ...     required_fields=['title', 'author']
        ... )
        >>> errors
        ["Missing required field: 'author'"]
    """
    errors: list[str] = []

    # Check required fields
    if required_fields:
        for field in required_fields:
            if field not in data:
                errors.append(f"Missing required field: '{field}'")
            elif data[field] is None:
                errors.append(f"Required field is null: '{field}'")

    # Check allowed fields
    if allowed_fields:
        allowed_set = set(allowed_fields)
        for field in data:
            if field not in allowed_set:
                errors.append(f"Unknown field: '{field}'")

    return errors
