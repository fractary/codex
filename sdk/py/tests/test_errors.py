"""Tests for the errors module."""

import pytest

from fractary_codex.errors import (
    CacheError,
    CodexError,
    ConfigurationError,
    ReferenceError,
    StorageError,
    ValidationError,
)


class TestCodexError:
    """Tests for CodexError base exception."""

    def test_basic_message(self) -> None:
        """Test basic error message."""
        error = CodexError("Something went wrong")
        assert str(error) == "Something went wrong"
        assert error.message == "Something went wrong"
        assert error.code is None
        assert error.details == {}

    def test_with_code(self) -> None:
        """Test error with code."""
        error = CodexError("Invalid input", code="INVALID_INPUT")
        assert str(error) == "[INVALID_INPUT] Invalid input"
        assert error.code == "INVALID_INPUT"

    def test_with_details(self) -> None:
        """Test error with details."""
        error = CodexError(
            "File not found",
            code="NOT_FOUND",
            details={"path": "/some/path"},
        )
        assert error.details == {"path": "/some/path"}

    def test_repr(self) -> None:
        """Test error repr."""
        error = CodexError("Test", code="TEST")
        assert repr(error) == "CodexError('Test', code='TEST')"

    def test_inheritance(self) -> None:
        """Test that all errors inherit from CodexError."""
        errors = [
            ConfigurationError("config error"),
            ValidationError("validation error"),
            StorageError("storage error"),
            CacheError("cache error"),
            ReferenceError("reference error"),
        ]

        for error in errors:
            assert isinstance(error, CodexError)
            assert isinstance(error, Exception)

    def test_can_catch_all_with_codex_error(self) -> None:
        """Test catching all errors with CodexError."""
        error_types = [
            ConfigurationError,
            ValidationError,
            StorageError,
            CacheError,
            ReferenceError,
        ]

        for error_type in error_types:
            with pytest.raises(CodexError):
                raise error_type("test")


class TestConfigurationError:
    """Tests for ConfigurationError."""

    def test_configuration_error(self) -> None:
        """Test ConfigurationError."""
        error = ConfigurationError(
            "Missing key 'organization'",
            code="MISSING_KEY",
            details={"key": "organization"},
        )
        assert "Missing key" in str(error)
        assert error.code == "MISSING_KEY"


class TestValidationError:
    """Tests for ValidationError."""

    def test_validation_error(self) -> None:
        """Test ValidationError."""
        error = ValidationError(
            "Invalid URI format",
            code="INVALID_URI",
            details={"uri": "not-a-uri"},
        )
        assert "Invalid URI" in str(error)
        assert error.code == "INVALID_URI"


class TestStorageError:
    """Tests for StorageError."""

    def test_storage_error(self) -> None:
        """Test StorageError."""
        error = StorageError(
            "Rate limit exceeded",
            code="RATE_LIMIT",
            details={"reset_at": "2025-01-01T00:00:00Z"},
        )
        assert "Rate limit" in str(error)
        assert error.code == "RATE_LIMIT"


class TestCacheError:
    """Tests for CacheError."""

    def test_cache_error(self) -> None:
        """Test CacheError."""
        error = CacheError(
            "Disk full",
            code="DISK_FULL",
        )
        assert "Disk full" in str(error)
        assert error.code == "DISK_FULL"


class TestReferenceError:
    """Tests for ReferenceError."""

    def test_reference_error(self) -> None:
        """Test ReferenceError."""
        error = ReferenceError(
            "Cannot resolve organization",
            code="NO_ORG",
        )
        assert "Cannot resolve" in str(error)
        assert error.code == "NO_ORG"
