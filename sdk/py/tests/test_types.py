"""Tests for the types module."""

import pytest

from fractary_codex.errors import ConfigurationError
from fractary_codex.types import (
    BUILT_IN_TYPES,
    DEFAULT_TTL,
    TTL,
    ArtifactType,
    TypeRegistry,
    create_default_registry,
    get_all_built_in_types,
    get_built_in_type,
    load_custom_types,
    parse_custom_type,
)


class TestTTL:
    """Tests for TTL constants."""

    def test_minute(self) -> None:
        """Test MINUTE constant."""
        assert TTL.MINUTE == 60

    def test_hour(self) -> None:
        """Test HOUR constant."""
        assert TTL.HOUR == 3600

    def test_day(self) -> None:
        """Test DAY constant."""
        assert TTL.DAY == 86400

    def test_week(self) -> None:
        """Test WEEK constant."""
        assert TTL.WEEK == 604800


class TestBuiltInTypes:
    """Tests for built-in types."""

    def test_docs_type_exists(self) -> None:
        """Test docs type is defined."""
        assert "docs" in BUILT_IN_TYPES
        docs = BUILT_IN_TYPES["docs"]
        assert docs.name == "docs"
        assert docs.ttl == TTL.DAY

    def test_config_type_exists(self) -> None:
        """Test config type is defined."""
        assert "config" in BUILT_IN_TYPES
        config = BUILT_IN_TYPES["config"]
        assert config.ttl == TTL.HOUR

    def test_get_built_in_type(self) -> None:
        """Test get_built_in_type function."""
        docs = get_built_in_type("docs")
        assert docs is not None
        assert docs.name == "docs"

        unknown = get_built_in_type("unknown-type")
        assert unknown is None

    def test_get_all_built_in_types(self) -> None:
        """Test get_all_built_in_types returns sorted list."""
        types = get_all_built_in_types()
        assert len(types) > 0
        # Should be sorted by priority descending
        for i in range(len(types) - 1):
            assert types[i].priority >= types[i + 1].priority


class TestTypeRegistry:
    """Tests for TypeRegistry class."""

    def test_create_with_builtins(self) -> None:
        """Test creating registry with built-ins."""
        registry = TypeRegistry()
        assert len(registry) > 0
        assert "docs" in registry

    def test_create_without_builtins(self) -> None:
        """Test creating registry without built-ins."""
        registry = TypeRegistry(include_builtins=False)
        assert len(registry) == 0

    def test_register_type(self) -> None:
        """Test registering a custom type."""
        registry = TypeRegistry(include_builtins=False)
        registry.register(
            ArtifactType(
                name="custom",
                patterns=["custom/**/*.md"],
                ttl=7200,
            )
        )
        assert "custom" in registry
        assert registry.get("custom") is not None

    def test_unregister_type(self) -> None:
        """Test unregistering a type."""
        registry = TypeRegistry()
        assert "docs" in registry
        result = registry.unregister("docs")
        assert result is True
        assert "docs" not in registry

        # Unregistering non-existent type returns False
        result = registry.unregister("nonexistent")
        assert result is False

    def test_get_ttl_matching_type(self) -> None:
        """Test get_ttl with matching type."""
        registry = TypeRegistry()
        ttl = registry.get_ttl("docs/api.md")
        assert ttl == TTL.DAY

    def test_get_ttl_no_match(self) -> None:
        """Test get_ttl with no matching type."""
        registry = TypeRegistry()
        ttl = registry.get_ttl("random/unknown.xyz")
        assert ttl == DEFAULT_TTL

    def test_match_type(self) -> None:
        """Test match function."""
        registry = TypeRegistry()
        matched = registry.match("docs/api.md")
        assert matched is not None
        assert matched.name == "docs"

        no_match = registry.match("random.xyz")
        assert no_match is None

    def test_list_types(self) -> None:
        """Test list_types returns sorted list."""
        registry = TypeRegistry()
        types = registry.list_types()
        assert len(types) > 0
        # Should be sorted by priority descending
        for i in range(len(types) - 1):
            assert types[i].priority >= types[i + 1].priority

    def test_iteration(self) -> None:
        """Test iterating over registry."""
        registry = TypeRegistry()
        types = list(registry)
        assert len(types) == len(registry)

    def test_pattern_with_double_star(self) -> None:
        """Test pattern matching with ** glob."""
        registry = TypeRegistry(include_builtins=False)
        registry.register(
            ArtifactType(
                name="nested",
                patterns=["a/**/z.md"],
                ttl=1000,
            )
        )

        assert registry.match("a/z.md") is not None
        assert registry.match("a/b/z.md") is not None
        assert registry.match("a/b/c/z.md") is not None
        assert registry.match("a/b/c/d/z.md") is not None
        assert registry.match("a/x.md") is None


class TestCreateDefaultRegistry:
    """Tests for create_default_registry function."""

    def test_creates_registry_with_builtins(self) -> None:
        """Test that default registry has built-ins."""
        registry = create_default_registry()
        assert len(registry) > 0
        assert "docs" in registry
        assert "config" in registry


class TestParseCustomType:
    """Tests for parse_custom_type function."""

    def test_basic_custom_type(self) -> None:
        """Test parsing a basic custom type."""
        config = {
            "patterns": ["custom/**/*.md"],
            "ttl": 7200,
            "description": "Custom docs",
            "priority": 100,
        }
        type_def = parse_custom_type("custom", config)
        assert type_def.name == "custom"
        assert type_def.patterns == ["custom/**/*.md"]
        assert type_def.ttl == 7200
        assert type_def.priority == 100

    def test_single_pattern_string(self) -> None:
        """Test parsing with single pattern string."""
        config = {"patterns": "*.md"}
        type_def = parse_custom_type("md-files", config)
        assert type_def.patterns == ["*.md"]

    def test_ttl_string_parsing(self) -> None:
        """Test parsing TTL strings."""
        configs = [
            ({"patterns": ["*.md"], "ttl": "1h"}, 3600),
            ({"patterns": ["*.md"], "ttl": "30m"}, 1800),
            ({"patterns": ["*.md"], "ttl": "7d"}, 604800),
            ({"patterns": ["*.md"], "ttl": "1w"}, 604800),
        ]
        for config, expected_ttl in configs:
            type_def = parse_custom_type("test", config)
            assert type_def.ttl == expected_ttl

    def test_missing_patterns_raises(self) -> None:
        """Test that missing patterns raises error."""
        with pytest.raises(ConfigurationError) as exc_info:
            parse_custom_type("test", {"ttl": 1000})
        assert exc_info.value.code == "MISSING_TYPE_PATTERNS"

    def test_invalid_config_type(self) -> None:
        """Test that non-dict config raises error."""
        with pytest.raises(ConfigurationError):
            parse_custom_type("test", "not-a-dict")  # type: ignore


class TestLoadCustomTypes:
    """Tests for load_custom_types function."""

    def test_load_multiple_types(self) -> None:
        """Test loading multiple custom types."""
        config = {
            "type1": {"patterns": ["a/*.md"], "ttl": 1000},
            "type2": {"patterns": ["b/*.md"], "ttl": 2000},
        }
        types = load_custom_types(config)
        assert len(types) == 2
        assert "type1" in types
        assert "type2" in types

    def test_invalid_config_raises(self) -> None:
        """Test that invalid config raises error."""
        with pytest.raises(ConfigurationError):
            load_custom_types("not-a-dict")  # type: ignore

    def test_partial_failure_reports_all_errors(self) -> None:
        """Test that all errors are reported."""
        config = {
            "valid": {"patterns": ["*.md"]},
            "invalid1": {},  # Missing patterns
            "invalid2": {},  # Missing patterns
        }
        with pytest.raises(ConfigurationError) as exc_info:
            load_custom_types(config)
        assert exc_info.value.details["error_count"] == 2
