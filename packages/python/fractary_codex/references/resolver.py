"""
Reference resolution utilities.

This module provides functions to resolve codex:// URIs to actual file paths
and detect the current project context from git repositories.
"""

import os
import re
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

from ..errors import ReferenceError, ValidationError
from .parser import ParsedReference, parse_reference


@dataclass
class ResolvedReference:
    """Result of resolving a codex:// reference.

    Attributes:
        reference: The original parsed reference
        local_path: Local filesystem path (if resolved locally)
        remote_url: Remote URL (if resolved to remote storage)
        cache_path: Path in the local cache (if cached)
        source: How the reference was resolved ('local', 'cache', 'remote')
    """

    reference: ParsedReference
    local_path: Optional[Path] = None
    remote_url: Optional[str] = None
    cache_path: Optional[Path] = None
    source: str = "unknown"


@dataclass
class ProjectContext:
    """Current project context detected from environment.

    Attributes:
        org: Organization name
        project: Project name
        root_path: Path to project root
        git_remote: Git remote URL (if detected)
    """

    org: str
    project: str
    root_path: Path
    git_remote: Optional[str] = None


def detect_current_project(
    start_path: Optional[Path] = None,
) -> Optional[ProjectContext]:
    """Detect the current project context from git repository.

    This function walks up the directory tree looking for a .git directory,
    then extracts organization and project information from the git remote.

    Args:
        start_path: Starting directory (defaults to current working directory)

    Returns:
        ProjectContext if detected, None otherwise

    Examples:
        >>> ctx = detect_current_project()
        >>> if ctx:
        ...     print(f"Project: {ctx.org}/{ctx.project}")
    """
    if start_path is None:
        start_path = Path.cwd()

    start_path = Path(start_path).resolve()

    # Find git root
    git_root = _find_git_root(start_path)
    if git_root is None:
        return None

    # Get remote URL
    remote_url = _get_git_remote(git_root)
    if remote_url is None:
        # Fall back to directory name
        return ProjectContext(
            org="local",
            project=git_root.name,
            root_path=git_root,
            git_remote=None,
        )

    # Parse org/project from remote URL
    org, project = _parse_remote_url(remote_url)

    return ProjectContext(
        org=org,
        project=project,
        root_path=git_root,
        git_remote=remote_url,
    )


def resolve_reference(
    ref: ParsedReference | str,
    *,
    base_dir: Optional[Path] = None,
    cache_dir: Optional[Path] = None,
    project_context: Optional[ProjectContext] = None,
) -> ResolvedReference:
    """Resolve a codex:// reference to a file path or URL.

    This function attempts to resolve the reference in the following order:
    1. Local filesystem (if org/project matches current project)
    2. Local cache (if available)
    3. Remote URL (GitHub raw content)

    Args:
        ref: Parsed reference or URI string
        base_dir: Base directory for local resolution
        cache_dir: Cache directory for cached content
        project_context: Current project context (auto-detected if not provided)

    Returns:
        ResolvedReference with resolution details

    Raises:
        ValidationError: If URI is invalid
        ReferenceError: If reference cannot be resolved
    """
    # Parse if string
    if isinstance(ref, str):
        ref = parse_reference(ref)

    # Auto-detect project context
    if project_context is None:
        project_context = detect_current_project(base_dir)

    # Try local resolution first
    if project_context and _matches_current_project(ref, project_context):
        local_path = project_context.root_path / ref.path
        if local_path.exists():
            return ResolvedReference(
                reference=ref,
                local_path=local_path,
                source="local",
            )

    # Try cache
    if cache_dir:
        cache_path = _get_cache_path(ref, cache_dir)
        if cache_path.exists():
            return ResolvedReference(
                reference=ref,
                cache_path=cache_path,
                source="cache",
            )

    # Build remote URL
    remote_url = _build_github_url(ref)

    return ResolvedReference(
        reference=ref,
        remote_url=remote_url,
        source="remote",
    )


def resolve_references(
    refs: list[ParsedReference | str],
    *,
    base_dir: Optional[Path] = None,
    cache_dir: Optional[Path] = None,
) -> list[ResolvedReference]:
    """Resolve multiple references at once.

    Args:
        refs: List of references to resolve
        base_dir: Base directory for local resolution
        cache_dir: Cache directory

    Returns:
        List of resolved references
    """
    project_context = detect_current_project(base_dir)
    return [
        resolve_reference(
            ref,
            base_dir=base_dir,
            cache_dir=cache_dir,
            project_context=project_context,
        )
        for ref in refs
    ]


def _find_git_root(start_path: Path) -> Optional[Path]:
    """Find the git repository root by walking up the directory tree."""
    current = start_path

    while current != current.parent:
        git_dir = current / ".git"
        if git_dir.exists():
            return current
        current = current.parent

    # Check root directory
    if (current / ".git").exists():
        return current

    return None


def _get_git_remote(git_root: Path, remote_name: str = "origin") -> Optional[str]:
    """Get the URL of a git remote."""
    try:
        result = subprocess.run(
            ["git", "remote", "get-url", remote_name],
            cwd=git_root,
            capture_output=True,
            text=True,
            timeout=5,
        )
        if result.returncode == 0:
            return result.stdout.strip()
    except (subprocess.TimeoutExpired, FileNotFoundError, OSError):
        pass
    return None


def _parse_remote_url(url: str) -> tuple[str, str]:
    """Parse organization and project from a git remote URL.

    Supports:
    - SSH: git@github.com:org/project.git
    - HTTPS: https://github.com/org/project.git
    - GitLab, Bitbucket, etc.
    """
    # SSH format: git@github.com:org/project.git
    ssh_match = re.match(r"git@[^:]+:([^/]+)/([^/]+?)(?:\.git)?$", url)
    if ssh_match:
        return ssh_match.group(1), ssh_match.group(2)

    # HTTPS format: https://github.com/org/project.git
    https_match = re.match(r"https?://[^/]+/([^/]+)/([^/]+?)(?:\.git)?$", url)
    if https_match:
        return https_match.group(1), https_match.group(2)

    # Fallback: use URL parts
    parts = url.rstrip("/").split("/")
    if len(parts) >= 2:
        project = parts[-1].replace(".git", "")
        org = parts[-2]
        return org, project

    return "unknown", "unknown"


def _matches_current_project(ref: ParsedReference, ctx: ProjectContext) -> bool:
    """Check if a reference matches the current project context."""
    return ref.org.lower() == ctx.org.lower() and ref.project.lower() == ctx.project.lower()


def _get_cache_path(ref: ParsedReference, cache_dir: Path) -> Path:
    """Get the cache file path for a reference."""
    return cache_dir / ref.org / ref.project / ref.path


def _build_github_url(ref: ParsedReference, branch: str = "main") -> str:
    """Build a GitHub raw content URL for a reference."""
    return f"https://raw.githubusercontent.com/{ref.org}/{ref.project}/{branch}/{ref.path}"
