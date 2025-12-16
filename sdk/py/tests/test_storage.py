"""Tests for storage module."""

from datetime import datetime, timezone

import pytest

from fractary_codex.errors import StorageError
from fractary_codex.storage import (
    FetchOptions,
    FetchResult,
    LocalStorage,
    StorageManager,
)


class TestFetchResult:
    """Tests for FetchResult dataclass."""

    def test_basic_creation(self):
        """Test basic FetchResult creation."""
        result = FetchResult(
            content=b"Hello, World!",
            content_type="text/plain",
        )
        assert result.content == b"Hello, World!"
        assert result.content_type == "text/plain"
        assert result.size == 13

    def test_text_property(self):
        """Test text property decoding."""
        result = FetchResult(
            content=b"Hello, World!",
            encoding="utf-8",
        )
        assert result.text == "Hello, World!"

    def test_text_with_different_encoding(self):
        """Test text with different encoding."""
        content = "Héllo, Wörld!".encode()
        result = FetchResult(
            content=content,
            encoding="utf-8",
        )
        assert result.text == "Héllo, Wörld!"

    def test_size_auto_calculation(self):
        """Test size auto-calculation."""
        result = FetchResult(content=b"12345")
        assert result.size == 5

    def test_metadata_defaults_to_empty_dict(self):
        """Test metadata default."""
        result = FetchResult(content=b"")
        assert result.metadata == {}


class TestFetchOptions:
    """Tests for FetchOptions dataclass."""

    def test_defaults(self):
        """Test default values."""
        options = FetchOptions()
        assert options.timeout == 30.0
        assert options.headers == {}
        assert options.if_none_match is None
        assert options.if_modified_since is None
        assert options.follow_redirects is True

    def test_custom_values(self):
        """Test custom option values."""
        now = datetime.now(timezone.utc)
        options = FetchOptions(
            timeout=60.0,
            headers={"X-Custom": "value"},
            if_none_match='"etag123"',
            if_modified_since=now,
            follow_redirects=False,
        )
        assert options.timeout == 60.0
        assert options.headers == {"X-Custom": "value"}
        assert options.if_none_match == '"etag123"'
        assert options.if_modified_since == now
        assert options.follow_redirects is False


class TestLocalStorage:
    """Tests for LocalStorage provider."""

    @pytest.fixture
    def storage_dir(self, tmp_path):
        """Create a test storage directory."""
        storage = tmp_path / "storage"
        storage.mkdir()
        return storage

    @pytest.fixture
    def storage(self, storage_dir):
        """Create a LocalStorage instance."""
        return LocalStorage(base_path=storage_dir)

    @pytest.mark.asyncio
    async def test_fetch_existing_file(self, storage, storage_dir):
        """Test fetching an existing file."""
        # Create a test file
        test_file = storage_dir / "test.txt"
        test_file.write_text("Hello, World!")

        result = await storage.fetch("test.txt")
        assert result.text == "Hello, World!"
        assert result.content_type == "text/plain"
        assert result.etag is not None

    @pytest.mark.asyncio
    async def test_fetch_nonexistent_file(self, storage):
        """Test fetching a nonexistent file raises error."""
        with pytest.raises(StorageError) as exc_info:
            await storage.fetch("nonexistent.txt")
        assert exc_info.value.code == "FILE_NOT_FOUND"

    @pytest.mark.asyncio
    async def test_fetch_markdown_file(self, storage, storage_dir):
        """Test fetching a markdown file."""
        test_file = storage_dir / "docs" / "readme.md"
        test_file.parent.mkdir(parents=True)
        test_file.write_text("# Hello\n\nThis is markdown.")

        result = await storage.fetch("docs/readme.md")
        assert result.text == "# Hello\n\nThis is markdown."
        assert "markdown" in result.content_type or result.content_type == "text/markdown"

    @pytest.mark.asyncio
    async def test_exists_true(self, storage, storage_dir):
        """Test exists returns True for existing file."""
        test_file = storage_dir / "exists.txt"
        test_file.write_text("content")

        assert await storage.exists("exists.txt") is True

    @pytest.mark.asyncio
    async def test_exists_false(self, storage):
        """Test exists returns False for nonexistent file."""
        assert await storage.exists("nonexistent.txt") is False

    @pytest.mark.asyncio
    async def test_path_traversal_blocked(self, storage):
        """Test path traversal is blocked."""
        with pytest.raises(StorageError) as exc_info:
            await storage.fetch("../../../etc/passwd")
        assert exc_info.value.code == "PATH_TRAVERSAL"

    @pytest.mark.asyncio
    async def test_list_files(self, storage, storage_dir):
        """Test listing files."""
        # Create test files
        (storage_dir / "a.txt").write_text("a")
        (storage_dir / "b.txt").write_text("b")
        (storage_dir / "subdir").mkdir()
        (storage_dir / "subdir" / "c.txt").write_text("c")

        files = await storage.list_files(pattern="*.txt")
        assert "a.txt" in files
        assert "b.txt" in files
        assert "subdir/c.txt" not in files  # Not recursive by default

    @pytest.mark.asyncio
    async def test_list_files_recursive(self, storage, storage_dir):
        """Test listing files recursively."""
        (storage_dir / "a.txt").write_text("a")
        (storage_dir / "subdir").mkdir()
        (storage_dir / "subdir" / "b.txt").write_text("b")

        files = await storage.list_files(pattern="*.txt", recursive=True)
        assert "a.txt" in files
        assert "subdir/b.txt" in files

    @pytest.mark.asyncio
    async def test_conditional_fetch_etag(self, storage, storage_dir):
        """Test conditional fetch with ETag."""
        test_file = storage_dir / "cond.txt"
        test_file.write_text("content")

        # First fetch to get ETag
        result1 = await storage.fetch("cond.txt")
        etag = result1.etag

        # Second fetch with matching ETag - should return not modified
        options = FetchOptions(if_none_match=etag)
        result2 = await storage.fetch("cond.txt", options)
        assert result2.metadata.get("not_modified") is True
        assert result2.size == 0

    @pytest.mark.asyncio
    async def test_context_manager(self, storage_dir):
        """Test async context manager."""
        async with LocalStorage(base_path=storage_dir) as storage:
            (storage_dir / "test.txt").write_text("test")
            result = await storage.fetch("test.txt")
            assert result.text == "test"

        assert storage.is_closed


class TestStorageManager:
    """Tests for StorageManager."""

    @pytest.fixture
    def storage_dir(self, tmp_path):
        """Create test storage directory."""
        storage = tmp_path / "storage"
        storage.mkdir()
        return storage

    @pytest.mark.asyncio
    async def test_register_provider(self, storage_dir):
        """Test registering a provider."""
        async with StorageManager() as manager:
            storage = LocalStorage(base_path=storage_dir)
            manager.register("local", storage)
            assert "local" in manager.list_providers()

    @pytest.mark.asyncio
    async def test_register_duplicate_raises_error(self, storage_dir):
        """Test registering duplicate provider raises error."""
        async with StorageManager() as manager:
            storage1 = LocalStorage(base_path=storage_dir)
            storage2 = LocalStorage(base_path=storage_dir)
            manager.register("local", storage1)

            with pytest.raises(StorageError) as exc_info:
                manager.register("local", storage2)
            assert exc_info.value.code == "DUPLICATE_PROVIDER"

    @pytest.mark.asyncio
    async def test_unregister_provider(self, storage_dir):
        """Test unregistering a provider."""
        async with StorageManager() as manager:
            storage = LocalStorage(base_path=storage_dir)
            manager.register("local", storage)
            unregistered = manager.unregister("local")

            assert unregistered is storage
            assert "local" not in manager.list_providers()

    @pytest.mark.asyncio
    async def test_fetch_with_provider(self, storage_dir):
        """Test fetching with explicit provider."""
        (storage_dir / "test.txt").write_text("Hello!")

        async with StorageManager() as manager:
            storage = LocalStorage(base_path=storage_dir)
            manager.register("local", storage)

            result = await manager.fetch("test.txt", provider="local")
            assert result.text == "Hello!"

    @pytest.mark.asyncio
    async def test_fetch_no_providers_error(self):
        """Test fetch with no providers raises error."""
        async with StorageManager() as manager:
            with pytest.raises(StorageError) as exc_info:
                await manager.fetch("test.txt")
            assert exc_info.value.code == "NO_PROVIDERS"

    @pytest.mark.asyncio
    async def test_fetch_nonexistent_provider_error(self, storage_dir):
        """Test fetch with nonexistent provider raises error."""
        async with StorageManager() as manager:
            storage = LocalStorage(base_path=storage_dir)
            manager.register("local", storage)

            with pytest.raises(StorageError) as exc_info:
                await manager.fetch("test.txt", provider="github")
            assert exc_info.value.code == "PROVIDER_NOT_FOUND"

    @pytest.mark.asyncio
    async def test_provider_priority(self, tmp_path):
        """Test providers are tried in priority order."""
        dir1 = tmp_path / "dir1"
        dir2 = tmp_path / "dir2"
        dir1.mkdir()
        dir2.mkdir()

        (dir1 / "test.txt").write_text("from dir1")
        (dir2 / "test.txt").write_text("from dir2")

        async with StorageManager() as manager:
            storage1 = LocalStorage(base_path=dir1)
            storage2 = LocalStorage(base_path=dir2)

            # Register dir2 with higher priority (lower number)
            manager.register("local1", storage1, priority=100)
            manager.register("local2", storage2, priority=50)

            # Should fetch from dir2 (lower priority number = tried first)
            result = await manager.fetch("test.txt")
            assert result.text == "from dir2"

    @pytest.mark.asyncio
    async def test_exists(self, storage_dir):
        """Test exists method."""
        (storage_dir / "exists.txt").write_text("content")

        async with StorageManager() as manager:
            storage = LocalStorage(base_path=storage_dir)
            manager.register("local", storage)

            assert await manager.exists("exists.txt") is True
            assert await manager.exists("missing.txt") is False

    @pytest.mark.asyncio
    async def test_fallback_on_failure(self, tmp_path):
        """Test fallback to next provider on failure."""
        dir1 = tmp_path / "dir1"
        dir2 = tmp_path / "dir2"
        dir1.mkdir()
        dir2.mkdir()

        # Only create file in dir2
        (dir2 / "test.txt").write_text("from dir2")

        async with StorageManager() as manager:
            storage1 = LocalStorage(base_path=dir1)
            storage2 = LocalStorage(base_path=dir2)

            manager.register("local1", storage1, priority=50)
            manager.register("local2", storage2, priority=100)

            # Should fall back to dir2 after dir1 fails
            result = await manager.fetch("test.txt", fallback=True)
            assert result.text == "from dir2"
