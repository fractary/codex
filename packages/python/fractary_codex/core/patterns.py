"""
Pattern matching utilities for file paths.

This module provides functions for matching file paths against glob patterns,
with support for ** recursive matching.
"""

import fnmatch
import re
from typing import Iterable, List, Optional, Sequence


def match_pattern(path: str, pattern: str) -> bool:
    """Check if a path matches a glob pattern.

    Supports:
    - * for single path segment wildcards
    - ** for recursive directory matching
    - ? for single character wildcards
    - [abc] for character sets

    Args:
        path: File path to match
        pattern: Glob pattern

    Returns:
        True if path matches pattern

    Examples:
        >>> match_pattern("docs/api/guide.md", "docs/**/*.md")
        True
        >>> match_pattern("README.md", "*.md")
        True
        >>> match_pattern("src/index.ts", "docs/**")
        False
    """
    # Normalize path separators
    path = path.replace("\\", "/").strip("/")
    pattern = pattern.replace("\\", "/").strip("/")

    # Handle ** patterns
    if "**" in pattern:
        return _match_glob_recursive(path, pattern)

    # Use fnmatch for simple patterns
    return fnmatch.fnmatch(path, pattern)


def match_patterns(path: str, patterns: Sequence[str]) -> bool:
    """Check if a path matches any of the given patterns.

    Args:
        path: File path to match
        patterns: List of glob patterns

    Returns:
        True if path matches any pattern

    Examples:
        >>> match_patterns("docs/api.md", ["*.md", "docs/**"])
        True
        >>> match_patterns("src/main.py", ["*.md", "docs/**"])
        False
    """
    return any(match_pattern(path, p) for p in patterns)


def filter_by_pattern(
    paths: Iterable[str],
    pattern: str,
) -> List[str]:
    """Filter paths by a single pattern.

    Args:
        paths: Iterable of file paths
        pattern: Glob pattern to match

    Returns:
        List of paths that match the pattern
    """
    return [p for p in paths if match_pattern(p, pattern)]


def filter_by_patterns(
    paths: Iterable[str],
    include: Optional[Sequence[str]] = None,
    exclude: Optional[Sequence[str]] = None,
) -> List[str]:
    """Filter paths by include/exclude patterns.

    A path is included if:
    1. It matches at least one include pattern (or include is empty/None)
    2. It does NOT match any exclude pattern

    Args:
        paths: Iterable of file paths
        include: Patterns to include (None means include all)
        exclude: Patterns to exclude

    Returns:
        List of paths that pass the filter

    Examples:
        >>> paths = ["docs/api.md", "docs/internal.md", "src/main.py"]
        >>> filter_by_patterns(paths, include=["docs/**"], exclude=["**/internal*"])
        ['docs/api.md']
    """
    result: List[str] = []

    for path in paths:
        # Check include patterns
        if include:
            if not match_patterns(path, include):
                continue

        # Check exclude patterns
        if exclude:
            if match_patterns(path, exclude):
                continue

        result.append(path)

    return result


def expand_pattern(pattern: str, available_paths: Sequence[str]) -> List[str]:
    """Expand a pattern to matching paths.

    Args:
        pattern: Glob pattern
        available_paths: List of all available paths

    Returns:
        List of paths that match the pattern
    """
    return [p for p in available_paths if match_pattern(p, pattern)]


def compile_pattern(pattern: str) -> re.Pattern[str]:
    """Compile a glob pattern to a regex for efficient repeated matching.

    Args:
        pattern: Glob pattern

    Returns:
        Compiled regex pattern

    Examples:
        >>> regex = compile_pattern("docs/**/*.md")
        >>> bool(regex.match("docs/api/guide.md"))
        True
    """
    # Normalize pattern
    pattern = pattern.replace("\\", "/").strip("/")

    # Convert glob to regex
    regex = _glob_to_regex(pattern)

    return re.compile(f"^{regex}$")


def _match_glob_recursive(path: str, pattern: str) -> bool:
    """Match a path against a pattern with ** support.

    Args:
        path: Normalized file path
        pattern: Pattern with ** wildcards

    Returns:
        True if path matches pattern
    """
    # Split into segments
    path_parts = path.split("/") if path else []
    pattern_parts = pattern.split("/")

    return _match_segments(path_parts, pattern_parts)


def _match_segments(
    path_parts: List[str],
    pattern_parts: List[str],
) -> bool:
    """Recursively match path segments against pattern segments.

    Args:
        path_parts: Remaining path segments
        pattern_parts: Remaining pattern segments

    Returns:
        True if segments match
    """
    # Base cases
    if not pattern_parts:
        return not path_parts

    if not path_parts:
        # Remaining pattern must be all ** to match
        return all(p == "**" for p in pattern_parts)

    pattern = pattern_parts[0]

    if pattern == "**":
        # ** can match zero or more segments
        if len(pattern_parts) == 1:
            return True  # ** at end matches everything

        # Try matching ** against 0, 1, 2, ... path segments
        for i in range(len(path_parts) + 1):
            if _match_segments(path_parts[i:], pattern_parts[1:]):
                return True
        return False

    # Regular pattern matching
    if fnmatch.fnmatch(path_parts[0], pattern):
        return _match_segments(path_parts[1:], pattern_parts[1:])

    return False


def _glob_to_regex(pattern: str) -> str:
    """Convert a glob pattern to a regex string.

    Args:
        pattern: Glob pattern

    Returns:
        Regex pattern string
    """
    parts: List[str] = []
    i = 0

    while i < len(pattern):
        c = pattern[i]

        if c == "*":
            # Check for **
            if i + 1 < len(pattern) and pattern[i + 1] == "*":
                # Check for **/ or ** at end
                if i + 2 < len(pattern) and pattern[i + 2] == "/":
                    parts.append("(?:.*/)?")
                    i += 3
                else:
                    parts.append(".*")
                    i += 2
            else:
                # Single * - matches anything except /
                parts.append("[^/]*")
                i += 1
        elif c == "?":
            parts.append("[^/]")
            i += 1
        elif c == "[":
            # Character class - find closing ]
            j = i + 1
            if j < len(pattern) and pattern[j] in "!^":
                j += 1
            while j < len(pattern) and pattern[j] != "]":
                j += 1
            parts.append(pattern[i : j + 1])
            i = j + 1
        elif c in ".+^${}|()":
            # Escape regex special chars
            parts.append("\\" + c)
            i += 1
        else:
            parts.append(c)
            i += 1

    return "".join(parts)


def get_pattern_prefix(pattern: str) -> str:
    """Get the static prefix of a pattern (before any wildcards).

    This is useful for optimizing directory traversal.

    Args:
        pattern: Glob pattern

    Returns:
        Static prefix of the pattern

    Examples:
        >>> get_pattern_prefix("docs/**/*.md")
        'docs'
        >>> get_pattern_prefix("*.md")
        ''
        >>> get_pattern_prefix("src/components/*.tsx")
        'src/components'
    """
    pattern = pattern.replace("\\", "/").strip("/")
    parts = pattern.split("/")
    prefix_parts: List[str] = []

    for part in parts:
        if any(c in part for c in "*?["):
            break
        prefix_parts.append(part)

    return "/".join(prefix_parts)
