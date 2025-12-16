"""Tests for the references module."""

import pytest

from fractary_codex.errors import ValidationError
from fractary_codex.references import (
    build_uri,
    convert_legacy_reference,
    is_legacy_reference,
    is_safe_path,
    is_valid_uri,
    normalize_path,
    parse_reference,
    sanitize_path,
    validate_path,
)


class TestParseReference:
    """Tests for parse_reference function."""

    def test_basic_uri(self) -> None:
        """Test parsing a basic codex:// URI."""
        ref = parse_reference("codex://fractary/codex/docs/api.md")
        assert ref.org == "fractary"
        assert ref.project == "codex"
        assert ref.path == "docs/api.md"
        assert ref.original == "codex://fractary/codex/docs/api.md"

    def test_nested_path(self) -> None:
        """Test parsing URI with nested path."""
        ref = parse_reference("codex://org/proj/a/b/c/file.md")
        assert ref.path == "a/b/c/file.md"

    def test_single_file_path(self) -> None:
        """Test parsing URI with single file path."""
        ref = parse_reference("codex://org/proj/README.md")
        assert ref.path == "README.md"

    def test_hyphenated_names(self) -> None:
        """Test parsing URI with hyphenated org/project names."""
        ref = parse_reference("codex://my-org/my-project/file.md")
        assert ref.org == "my-org"
        assert ref.project == "my-project"

    def test_underscored_names(self) -> None:
        """Test parsing URI with underscored names."""
        ref = parse_reference("codex://my_org/my_project/file.md")
        assert ref.org == "my_org"
        assert ref.project == "my_project"

    def test_invalid_prefix(self) -> None:
        """Test that non-codex:// URIs raise ValidationError."""
        with pytest.raises(ValidationError) as exc_info:
            parse_reference("http://example.com/file.md")
        assert exc_info.value.code == "INVALID_URI_PREFIX"

    def test_empty_uri(self) -> None:
        """Test that empty URI raises ValidationError."""
        with pytest.raises(ValidationError) as exc_info:
            parse_reference("")
        assert exc_info.value.code == "EMPTY_URI"

    def test_missing_parts(self) -> None:
        """Test that incomplete URI raises ValidationError."""
        with pytest.raises(ValidationError):
            parse_reference("codex://org/project")  # Missing path

    def test_invalid_org_name(self) -> None:
        """Test that invalid org name raises ValidationError."""
        with pytest.raises(ValidationError) as exc_info:
            parse_reference("codex://-invalid/project/file.md")
        assert exc_info.value.code == "INVALID_ORG_NAME"

    def test_non_string_input(self) -> None:
        """Test that non-string input raises ValidationError."""
        with pytest.raises(ValidationError) as exc_info:
            parse_reference(123)  # type: ignore
        assert exc_info.value.code == "INVALID_URI_TYPE"

    def test_str_method(self) -> None:
        """Test ParsedReference __str__ method."""
        ref = parse_reference("codex://org/proj/file.md")
        assert str(ref) == "codex://org/proj/file.md"


class TestBuildUri:
    """Tests for build_uri function."""

    def test_basic_build(self) -> None:
        """Test building a basic URI."""
        uri = build_uri("org", "project", "docs/file.md")
        assert uri == "codex://org/project/docs/file.md"

    def test_leading_slash_removed(self) -> None:
        """Test that leading slash in path is removed."""
        uri = build_uri("org", "project", "/docs/file.md")
        assert uri == "codex://org/project/docs/file.md"


class TestIsValidUri:
    """Tests for is_valid_uri function."""

    def test_valid_uris(self) -> None:
        """Test valid URIs return True."""
        assert is_valid_uri("codex://org/project/file.md") is True
        assert is_valid_uri("codex://a/b/c") is True

    def test_invalid_uris(self) -> None:
        """Test invalid URIs return False."""
        assert is_valid_uri("http://example.com") is False
        assert is_valid_uri("not-a-uri") is False
        assert is_valid_uri("") is False
        assert is_valid_uri("codex://") is False


class TestLegacyReferences:
    """Tests for legacy reference functions."""

    def test_is_legacy_reference(self) -> None:
        """Test is_legacy_reference function."""
        assert is_legacy_reference("$ref:docs/api.md") is True
        assert is_legacy_reference("codex://org/proj/file.md") is False
        assert is_legacy_reference("regular text") is False

    def test_convert_legacy_reference(self) -> None:
        """Test convert_legacy_reference function."""
        uri = convert_legacy_reference("$ref:docs/api.md", "myorg", "myproj")
        assert uri == "codex://myorg/myproj/docs/api.md"

    def test_convert_legacy_default_project(self) -> None:
        """Test convert with default project."""
        uri = convert_legacy_reference("$ref:file.md", "myorg")
        assert uri == "codex://myorg/myorg/file.md"

    def test_convert_legacy_invalid(self) -> None:
        """Test convert with invalid legacy reference."""
        with pytest.raises(ValidationError):
            convert_legacy_reference("not-legacy", "org")


class TestValidatePath:
    """Tests for validate_path function."""

    def test_valid_paths(self) -> None:
        """Test valid paths pass validation."""
        assert validate_path("docs/api.md") is True
        assert validate_path("a/b/c/d.txt") is True
        assert validate_path("README.md") is True

    def test_path_traversal(self) -> None:
        """Test path traversal is rejected."""
        with pytest.raises(ValidationError) as exc_info:
            validate_path("../secret.txt")
        assert exc_info.value.code == "PATH_TRAVERSAL"

    def test_absolute_path(self) -> None:
        """Test absolute paths are rejected by default."""
        with pytest.raises(ValidationError):
            validate_path("/etc/passwd")

    def test_allow_absolute(self) -> None:
        """Test absolute paths can be allowed."""
        assert validate_path("/etc/passwd", allow_absolute=True) is True

    def test_empty_path(self) -> None:
        """Test empty path is rejected."""
        with pytest.raises(ValidationError):
            validate_path("")

    def test_null_bytes(self) -> None:
        """Test null bytes are rejected."""
        with pytest.raises(ValidationError):
            validate_path("file\x00.txt")


class TestSanitizePath:
    """Tests for sanitize_path function."""

    def test_whitespace_stripped(self) -> None:
        """Test whitespace is stripped."""
        assert sanitize_path("  docs/api.md  ") == "docs/api.md"

    def test_double_slashes_removed(self) -> None:
        """Test double slashes are normalized."""
        assert sanitize_path("docs//api.md") == "docs/api.md"

    def test_backslashes_normalized(self) -> None:
        """Test backslashes are converted to forward slashes."""
        assert sanitize_path("docs\\api.md") == "docs/api.md"

    def test_parent_dir_removed(self) -> None:
        """Test parent directory references are removed."""
        assert sanitize_path("docs/../other/file.md") == "other/file.md"

    def test_empty_path(self) -> None:
        """Test empty path returns empty string."""
        assert sanitize_path("") == ""


class TestIsSafePath:
    """Tests for is_safe_path function."""

    def test_safe_paths(self) -> None:
        """Test safe paths return True."""
        assert is_safe_path("docs/api.md") is True
        assert is_safe_path("README.md") is True

    def test_unsafe_paths(self) -> None:
        """Test unsafe paths return False."""
        assert is_safe_path("../secret.txt") is False
        assert is_safe_path("/etc/passwd") is False


class TestNormalizePath:
    """Tests for normalize_path function."""

    def test_lowercase(self) -> None:
        """Test paths are lowercased."""
        assert normalize_path("Docs/API.md") == "docs/api.md"

    def test_separators(self) -> None:
        """Test separators are normalized."""
        assert normalize_path("docs\\api.md") == "docs/api.md"

    def test_double_slashes(self) -> None:
        """Test double slashes are removed."""
        assert normalize_path("docs//api.md") == "docs/api.md"
