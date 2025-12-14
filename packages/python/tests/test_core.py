"""Tests for the core module."""

from pathlib import Path

import pytest

from fractary_codex.core import (
    CodexConfig,
    ParsedMetadata,
    build_frontmatter,
    compile_pattern,
    filter_by_patterns,
    get_metadata_value,
    has_frontmatter,
    load_config,
    match_pattern,
    match_patterns,
    parse_metadata,
    resolve_organization,
    validate_metadata,
)
from fractary_codex.errors import ConfigurationError, ValidationError


class TestLoadConfig:
    """Tests for load_config function."""

    def test_load_from_directory(self, config_dir: Path) -> None:
        """Test loading config from a directory."""
        config = load_config(config_dir)
        assert config is not None
        assert config.organization == "test-org"
        assert config.project == "test-project"
        assert config.cache_dir == ".test-cache"

    def test_missing_config_returns_none(self, temp_dir: Path) -> None:
        """Test missing config returns None with allow_missing=True."""
        config = load_config(temp_dir, allow_missing=True)
        assert config is None

    def test_missing_config_raises(self, temp_dir: Path) -> None:
        """Test missing config raises with allow_missing=False."""
        with pytest.raises(ConfigurationError):
            load_config(temp_dir, allow_missing=False)


class TestResolveOrganization:
    """Tests for resolve_organization function."""

    def test_from_config(self) -> None:
        """Test resolving from explicit config."""
        config = CodexConfig(organization="explicit-org")
        org = resolve_organization(config)
        assert org == "explicit-org"

    def test_from_environment(
        self, temp_dir: Path, env_cleanup: None, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """Test resolving from environment variable."""
        monkeypatch.setenv("CODEX_ORG", "env-org")
        org = resolve_organization(start_path=temp_dir)
        assert org == "env-org"

    def test_from_git(self, git_repo: Path) -> None:
        """Test resolving from git remote."""
        org = resolve_organization(start_path=git_repo)
        assert org == "test-org"

    def test_fallback_to_directory(self, temp_dir: Path) -> None:
        """Test fallback to directory name."""
        org = resolve_organization(start_path=temp_dir)
        assert org == temp_dir.name


class TestParseMetadata:
    """Tests for parse_metadata function."""

    def test_basic_frontmatter(self, sample_frontmatter_md: str) -> None:
        """Test parsing basic frontmatter."""
        result = parse_metadata(sample_frontmatter_md)
        assert result.has_frontmatter is True
        assert result.data["title"] == "Test Document"
        assert result.data["author"] == "Test Author"
        assert "tags" in result.data

    def test_no_frontmatter(self) -> None:
        """Test parsing content without frontmatter."""
        result = parse_metadata("# Just a heading\n\nSome content.")
        assert result.has_frontmatter is False
        assert result.data == {}
        assert "Just a heading" in result.content

    def test_empty_frontmatter(self) -> None:
        """Test parsing empty frontmatter."""
        text = "---\n---\nContent"
        result = parse_metadata(text)
        assert result.has_frontmatter is True
        assert result.data == {}

    def test_invalid_yaml(self) -> None:
        """Test that invalid YAML raises ValidationError."""
        text = "---\ninvalid: yaml: here\n---\n"
        with pytest.raises(ValidationError):
            parse_metadata(text)

    def test_empty_content(self) -> None:
        """Test parsing empty content."""
        result = parse_metadata("")
        assert result.has_frontmatter is False
        assert result.data == {}
        assert result.content == ""


class TestHasFrontmatter:
    """Tests for has_frontmatter function."""

    def test_with_frontmatter(self) -> None:
        """Test detection of frontmatter."""
        assert has_frontmatter("---\ntitle: Test\n---\nContent") is True

    def test_without_frontmatter(self) -> None:
        """Test detection of no frontmatter."""
        assert has_frontmatter("# Just markdown") is False


class TestBuildFrontmatter:
    """Tests for build_frontmatter function."""

    def test_basic_build(self) -> None:
        """Test building frontmatter."""
        frontmatter = build_frontmatter({"title": "Test", "author": "Me"})
        assert frontmatter.startswith("---\n")
        assert frontmatter.endswith("---\n")
        assert "title: Test" in frontmatter

    def test_empty_data(self) -> None:
        """Test building empty frontmatter."""
        frontmatter = build_frontmatter({})
        assert frontmatter == "---\n---\n"


class TestGetMetadataValue:
    """Tests for get_metadata_value function."""

    def test_simple_key(self, sample_frontmatter_md: str) -> None:
        """Test getting simple key."""
        value = get_metadata_value(sample_frontmatter_md, "title")
        assert value == "Test Document"

    def test_nested_key(self) -> None:
        """Test getting nested key with dot notation."""
        text = "---\nauthor:\n  name: John\n---\n"
        value = get_metadata_value(text, "author.name")
        assert value == "John"

    def test_missing_key(self) -> None:
        """Test missing key returns default."""
        text = "---\ntitle: Test\n---\n"
        value = get_metadata_value(text, "missing", default="default")
        assert value == "default"


class TestValidateMetadata:
    """Tests for validate_metadata function."""

    def test_valid_metadata(self) -> None:
        """Test valid metadata passes."""
        errors = validate_metadata(
            {"title": "Test", "author": "Me"},
            required_fields=["title", "author"],
        )
        assert errors == []

    def test_missing_required_field(self) -> None:
        """Test missing required field is reported."""
        errors = validate_metadata(
            {"title": "Test"},
            required_fields=["title", "author"],
        )
        assert len(errors) == 1
        assert "author" in errors[0]

    def test_unknown_field(self) -> None:
        """Test unknown field is reported."""
        errors = validate_metadata(
            {"title": "Test", "extra": "field"},
            allowed_fields=["title"],
        )
        assert len(errors) == 1
        assert "extra" in errors[0]


class TestMatchPattern:
    """Tests for match_pattern function."""

    def test_simple_wildcard(self) -> None:
        """Test simple * wildcard."""
        assert match_pattern("README.md", "*.md") is True
        assert match_pattern("README.txt", "*.md") is False

    def test_double_star(self) -> None:
        """Test ** recursive wildcard."""
        assert match_pattern("docs/api/guide.md", "docs/**/*.md") is True
        assert match_pattern("docs/guide.md", "docs/**/*.md") is True
        assert match_pattern("src/file.md", "docs/**/*.md") is False

    def test_question_mark(self) -> None:
        """Test ? single character wildcard."""
        assert match_pattern("file1.md", "file?.md") is True
        assert match_pattern("file12.md", "file?.md") is False


class TestMatchPatterns:
    """Tests for match_patterns function."""

    def test_match_any_pattern(self) -> None:
        """Test matching any of multiple patterns."""
        assert match_patterns("README.md", ["*.md", "*.txt"]) is True
        assert match_patterns("file.py", ["*.md", "*.txt"]) is False


class TestFilterByPatterns:
    """Tests for filter_by_patterns function."""

    def test_include_only(self) -> None:
        """Test filtering with include patterns."""
        paths = ["a.md", "b.txt", "c.md"]
        result = filter_by_patterns(paths, include=["*.md"])
        assert result == ["a.md", "c.md"]

    def test_exclude_only(self) -> None:
        """Test filtering with exclude patterns."""
        paths = ["a.md", "internal.md", "c.md"]
        result = filter_by_patterns(paths, exclude=["internal*"])
        assert result == ["a.md", "c.md"]

    def test_include_and_exclude(self) -> None:
        """Test filtering with both include and exclude."""
        paths = ["docs/api.md", "docs/internal.md", "src/main.py"]
        result = filter_by_patterns(
            paths,
            include=["docs/**"],
            exclude=["**/internal*"],
        )
        assert result == ["docs/api.md"]


class TestCompilePattern:
    """Tests for compile_pattern function."""

    def test_compiled_pattern(self) -> None:
        """Test that compiled pattern works."""
        pattern = compile_pattern("docs/**/*.md")
        assert pattern.match("docs/api.md")
        assert pattern.match("docs/a/b/c.md")
        assert not pattern.match("src/file.md")
