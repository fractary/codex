"""Pytest configuration and fixtures."""

import os
import tempfile
from pathlib import Path
from typing import Generator

import pytest


@pytest.fixture
def temp_dir() -> Generator[Path, None, None]:
    """Create a temporary directory for tests."""
    with tempfile.TemporaryDirectory() as tmpdir:
        yield Path(tmpdir)


@pytest.fixture
def sample_config_yaml() -> str:
    """Sample codex.yaml content."""
    return """
organization: test-org
project: test-project
cache:
  directory: .test-cache
  default_ttl: 3600
types:
  custom-docs:
    patterns:
      - "custom/**/*.md"
    ttl: 7200
    priority: 100
"""


@pytest.fixture
def sample_frontmatter_md() -> str:
    """Sample markdown with frontmatter."""
    return """---
title: Test Document
author: Test Author
tags:
  - test
  - example
---

# Document Content

This is the document body.
"""


@pytest.fixture
def config_dir(temp_dir: Path, sample_config_yaml: str) -> Path:
    """Create a temporary directory with a config file."""
    fractary_dir = temp_dir / ".fractary"
    fractary_dir.mkdir()
    config_file = fractary_dir / "codex.yaml"
    config_file.write_text(sample_config_yaml)
    return temp_dir


@pytest.fixture
def git_repo(temp_dir: Path) -> Path:
    """Create a temporary git repository with a remote."""
    import subprocess

    # Initialize a real git repository
    subprocess.run(
        ["git", "init"],
        cwd=temp_dir,
        capture_output=True,
        check=True,
    )

    # Configure git user (required for some git operations)
    subprocess.run(
        ["git", "config", "user.email", "test@example.com"],
        cwd=temp_dir,
        capture_output=True,
    )
    subprocess.run(
        ["git", "config", "user.name", "Test User"],
        cwd=temp_dir,
        capture_output=True,
    )

    # Add a remote
    subprocess.run(
        ["git", "remote", "add", "origin", "git@github.com:test-org/test-repo.git"],
        cwd=temp_dir,
        capture_output=True,
        check=True,
    )

    return temp_dir


@pytest.fixture
def env_cleanup() -> Generator[None, None, None]:
    """Clean up environment variables after test."""
    original_env = dict(os.environ)
    yield
    os.environ.clear()
    os.environ.update(original_env)
