"""Tests for cache module."""

import asyncio
from datetime import datetime, timedelta, timezone

import pytest

from fractary_codex.cache import (
    CacheEntry,
    CacheManager,
    FileCacheStore,
    generate_cache_key,
)
from fractary_codex.storage import LocalStorage


class TestCacheEntry:
    """Tests for CacheEntry dataclass."""

    def test_basic_creation(self):
        """Test basic CacheEntry creation."""
        entry = CacheEntry(
            key="test/file.md",
            content=b"# Hello",
            content_type="text/markdown",
        )
        assert entry.key == "test/file.md"
        assert entry.content == b"# Hello"
        assert entry.size == 7
        assert entry.is_fresh is True

    def test_text_property(self):
        """Test text property decoding."""
        entry = CacheEntry(
            key="test",
            content=b"Hello, World!",
        )
        assert entry.text == "Hello, World!"

    def test_is_expired(self):
        """Test expiration check."""
        # Create expired entry
        past = datetime.now(timezone.utc) - timedelta(hours=2)
        entry = CacheEntry(
            key="test",
            content=b"content",
            fetched_at=past,
            ttl=3600,  # 1 hour
        )
        assert entry.is_expired is True
        assert entry.is_fresh is False

    def test_is_fresh(self):
        """Test freshness check."""
        entry = CacheEntry(
            key="test",
            content=b"content",
            ttl=3600,  # 1 hour
        )
        assert entry.is_fresh is True
        assert entry.is_expired is False

    def test_age(self):
        """Test age calculation."""
        past = datetime.now(timezone.utc) - timedelta(minutes=30)
        entry = CacheEntry(
            key="test",
            content=b"content",
            fetched_at=past,
        )
        # Should be approximately 30 minutes
        assert 1790 < entry.age < 1810

    def test_remaining_ttl(self):
        """Test remaining TTL calculation."""
        entry = CacheEntry(
            key="test",
            content=b"content",
            ttl=3600,  # 1 hour
        )
        # Should be close to 3600
        assert 3590 < entry.remaining_ttl < 3610

    def test_remaining_ttl_expired(self):
        """Test remaining TTL for expired entry."""
        past = datetime.now(timezone.utc) - timedelta(hours=2)
        entry = CacheEntry(
            key="test",
            content=b"content",
            fetched_at=past,
            ttl=3600,
        )
        assert entry.remaining_ttl == 0

    def test_content_hash(self):
        """Test content hash generation."""
        entry = CacheEntry(
            key="test",
            content=b"Hello",
        )
        # MD5 of "Hello" is 8b1a9953c4611296a827abf8c47804d7
        assert entry.content_hash == "8b1a9953c4611296a827abf8c47804d7"

    def test_record_hit(self):
        """Test hit counter increment."""
        entry = CacheEntry(key="test", content=b"content")
        assert entry.hit_count == 0
        entry.record_hit()
        assert entry.hit_count == 1
        entry.record_hit()
        assert entry.hit_count == 2

    def test_refresh(self):
        """Test entry refresh."""
        past = datetime.now(timezone.utc) - timedelta(hours=2)
        entry = CacheEntry(
            key="test",
            content=b"old content",
            fetched_at=past,
            ttl=3600,
        )
        assert entry.is_expired is True

        entry.refresh(b"new content", new_ttl=7200)
        assert entry.content == b"new content"
        assert entry.is_fresh is True
        assert entry.ttl == 7200

    def test_to_dict(self):
        """Test serialization to dict."""
        entry = CacheEntry(
            key="test/file.md",
            content=b"content",
            content_type="text/markdown",
            etag='"abc123"',
            source="github",
        )
        data = entry.to_dict()
        assert data["key"] == "test/file.md"
        assert data["content_type"] == "text/markdown"
        assert data["etag"] == '"abc123"'
        assert data["source"] == "github"
        assert "content_hash" in data

    def test_from_dict(self):
        """Test deserialization from dict."""
        data = {
            "key": "test/file.md",
            "content_type": "text/markdown",
            "etag": '"abc123"',
            "ttl": 7200,
            "fetched_at": "2024-01-01T12:00:00+00:00",
        }
        entry = CacheEntry.from_dict(data, b"content")
        assert entry.key == "test/file.md"
        assert entry.content == b"content"
        assert entry.ttl == 7200


class TestGenerateCacheKey:
    """Tests for generate_cache_key function."""

    def test_basic_path(self):
        """Test basic path key generation."""
        key = generate_cache_key("docs/api.md")
        assert key == "docs/api.md"

    def test_codex_uri(self):
        """Test codex:// URI key generation."""
        key = generate_cache_key("codex://myorg/myrepo/docs/api.md")
        assert key == "myorg/myrepo/docs/api.md"

    def test_http_url(self):
        """Test HTTP URL key generation."""
        key = generate_cache_key("https://example.com/docs/api.md")
        assert key == "example.com/docs/api.md"

    def test_with_provider(self):
        """Test key generation with provider prefix."""
        key = generate_cache_key("docs/api.md", provider="github")
        assert key == "github/docs/api.md"

    def test_backslash_normalization(self):
        """Test backslash normalization."""
        key = generate_cache_key("docs\\api.md")
        assert key == "docs/api.md"


class TestFileCacheStore:
    """Tests for FileCacheStore."""

    @pytest.fixture
    def cache_dir(self, tmp_path):
        """Create test cache directory."""
        return tmp_path / "cache"

    @pytest.fixture
    def store(self, cache_dir):
        """Create FileCacheStore instance."""
        return FileCacheStore(cache_dir)

    @pytest.mark.asyncio
    async def test_put_and_get(self, store):
        """Test storing and retrieving entries."""
        entry = CacheEntry(
            key="test/file.md",
            content=b"# Hello",
            content_type="text/markdown",
        )
        await store.put(entry)

        retrieved = await store.get("test/file.md")
        assert retrieved is not None
        assert retrieved.key == "test/file.md"
        assert retrieved.content == b"# Hello"

    @pytest.mark.asyncio
    async def test_get_nonexistent(self, store):
        """Test getting nonexistent entry returns None."""
        result = await store.get("nonexistent")
        assert result is None

    @pytest.mark.asyncio
    async def test_delete(self, store):
        """Test deleting entries."""
        entry = CacheEntry(key="test", content=b"content")
        await store.put(entry)

        deleted = await store.delete("test")
        assert deleted is True

        result = await store.get("test")
        assert result is None

    @pytest.mark.asyncio
    async def test_delete_nonexistent(self, store):
        """Test deleting nonexistent entry returns False."""
        deleted = await store.delete("nonexistent")
        assert deleted is False

    @pytest.mark.asyncio
    async def test_exists(self, store):
        """Test existence check."""
        entry = CacheEntry(key="test", content=b"content")
        await store.put(entry)

        assert await store.exists("test") is True
        assert await store.exists("nonexistent") is False

    @pytest.mark.asyncio
    async def test_keys(self, store):
        """Test iterating over keys."""
        await store.put(CacheEntry(key="a", content=b"a"))
        await store.put(CacheEntry(key="b", content=b"b"))
        await store.put(CacheEntry(key="c", content=b"c"))

        keys = [key async for key in store.keys()]
        assert len(keys) == 3
        assert "a" in keys
        assert "b" in keys
        assert "c" in keys

    @pytest.mark.asyncio
    async def test_entries(self, store):
        """Test iterating over entries."""
        await store.put(CacheEntry(key="a", content=b"content a"))
        await store.put(CacheEntry(key="b", content=b"content b"))

        entries = [e async for e in store.entries()]
        assert len(entries) == 2

    @pytest.mark.asyncio
    async def test_clear(self, store):
        """Test clearing all entries."""
        await store.put(CacheEntry(key="a", content=b"a"))
        await store.put(CacheEntry(key="b", content=b"b"))

        count = await store.clear()
        assert count == 2

        assert await store.get("a") is None
        assert await store.get("b") is None

    @pytest.mark.asyncio
    async def test_clear_expired(self, store):
        """Test clearing only expired entries."""
        # Create one fresh and one expired entry
        await store.put(CacheEntry(key="fresh", content=b"fresh", ttl=3600))

        past = datetime.now(timezone.utc) - timedelta(hours=2)
        expired = CacheEntry(
            key="expired",
            content=b"expired",
            fetched_at=past,
            ttl=3600,
        )
        await store.put(expired)

        count = await store.clear_expired()
        assert count == 1

        # Fresh entry should still exist
        assert await store.get("fresh") is not None
        assert await store.get("expired") is None

    @pytest.mark.asyncio
    async def test_stats(self, store):
        """Test statistics."""
        await store.put(CacheEntry(key="a", content=b"content"))
        await store.put(CacheEntry(key="b", content=b"content"))

        stats = await store.stats()
        assert stats["total_entries"] == 2
        assert stats["total_size"] == 14  # 7 bytes each
        assert "cache_dir" in stats


class TestCacheManager:
    """Tests for CacheManager."""

    @pytest.fixture
    def cache_dir(self, tmp_path):
        """Create test cache directory."""
        return tmp_path / "cache"

    @pytest.fixture
    def storage_dir(self, tmp_path):
        """Create test storage directory."""
        storage = tmp_path / "storage"
        storage.mkdir()
        return storage

    @pytest.fixture
    def storage(self, storage_dir):
        """Create test LocalStorage."""
        return LocalStorage(base_path=storage_dir)

    @pytest.mark.asyncio
    async def test_fetch_caches_result(self, cache_dir, storage, storage_dir):
        """Test that fetch caches the result."""
        (storage_dir / "test.md").write_text("# Hello")

        async with CacheManager(cache_dir=cache_dir) as cache:
            # First fetch - should go to storage
            result1 = await cache.fetch("test.md", storage)
            assert result1.text == "# Hello"
            assert result1.metadata.get("from_cache") is not True

            # Second fetch - should come from cache
            result2 = await cache.fetch("test.md", storage)
            assert result2.text == "# Hello"
            assert result2.metadata.get("from_cache") is True

    @pytest.mark.asyncio
    async def test_force_refresh(self, cache_dir, storage, storage_dir):
        """Test force refresh bypasses cache."""
        (storage_dir / "test.md").write_text("original")

        async with CacheManager(cache_dir=cache_dir) as cache:
            await cache.fetch("test.md", storage)

            # Modify file
            (storage_dir / "test.md").write_text("updated")

            # Normal fetch returns cached
            result1 = await cache.fetch("test.md", storage)
            assert result1.text == "original"

            # Force refresh gets new content
            result2 = await cache.fetch("test.md", storage, force_refresh=True)
            assert result2.text == "updated"

    @pytest.mark.asyncio
    async def test_ttl_from_type(self, cache_dir, storage, storage_dir):
        """Test TTL is determined by file type."""
        # Create a docs file - docs type has TTL.DAY (86400)
        docs_dir = storage_dir / "docs"
        docs_dir.mkdir()
        (docs_dir / "readme.md").write_text("# Documentation")

        async with CacheManager(cache_dir=cache_dir) as cache:
            await cache.fetch("docs/readme.md", storage)
            entry = await cache.get_cached("docs/readme.md")

            # Docs files have TTL.DAY (86400), more than default 3600
            assert entry is not None
            assert entry.ttl == 86400  # 1 day

    @pytest.mark.asyncio
    async def test_manual_ttl_override(self, cache_dir, storage, storage_dir):
        """Test manual TTL override."""
        (storage_dir / "test.md").write_text("content")

        async with CacheManager(cache_dir=cache_dir) as cache:
            await cache.fetch("test.md", storage, ttl=60)  # 1 minute
            entry = await cache.get_cached("test.md")

            assert entry is not None
            assert entry.ttl == 60

    @pytest.mark.asyncio
    async def test_is_cached(self, cache_dir, storage, storage_dir):
        """Test is_cached method."""
        (storage_dir / "test.md").write_text("content")

        async with CacheManager(cache_dir=cache_dir) as cache:
            assert await cache.is_cached("test.md") is False

            await cache.fetch("test.md", storage)

            assert await cache.is_cached("test.md") is True

    @pytest.mark.asyncio
    async def test_is_fresh(self, cache_dir, storage, storage_dir):
        """Test is_fresh method."""
        (storage_dir / "test.md").write_text("content")

        async with CacheManager(cache_dir=cache_dir) as cache:
            await cache.fetch("test.md", storage)

            assert await cache.is_fresh("test.md") is True

    @pytest.mark.asyncio
    async def test_invalidate(self, cache_dir, storage, storage_dir):
        """Test cache invalidation."""
        (storage_dir / "test.md").write_text("content")

        async with CacheManager(cache_dir=cache_dir) as cache:
            await cache.fetch("test.md", storage)
            assert await cache.is_cached("test.md") is True

            deleted = await cache.invalidate("test.md")
            assert deleted is True
            assert await cache.is_cached("test.md") is False

    @pytest.mark.asyncio
    async def test_invalidate_pattern(self, cache_dir, storage, storage_dir):
        """Test invalidation by pattern."""
        (storage_dir / "docs").mkdir()
        (storage_dir / "docs" / "a.md").write_text("a")
        (storage_dir / "docs" / "b.md").write_text("b")
        (storage_dir / "other.md").write_text("other")

        async with CacheManager(cache_dir=cache_dir) as cache:
            await cache.fetch("docs/a.md", storage)
            await cache.fetch("docs/b.md", storage)
            await cache.fetch("other.md", storage)

            count = await cache.invalidate_pattern("docs/*")
            assert count == 2

            assert await cache.is_cached("docs/a.md") is False
            assert await cache.is_cached("docs/b.md") is False
            assert await cache.is_cached("other.md") is True

    @pytest.mark.asyncio
    async def test_clear(self, cache_dir, storage, storage_dir):
        """Test clear all cache."""
        (storage_dir / "a.md").write_text("a")
        (storage_dir / "b.md").write_text("b")

        async with CacheManager(cache_dir=cache_dir) as cache:
            await cache.fetch("a.md", storage)
            await cache.fetch("b.md", storage)

            count = await cache.clear()
            assert count == 2

            assert await cache.is_cached("a.md") is False
            assert await cache.is_cached("b.md") is False

    @pytest.mark.asyncio
    async def test_stats(self, cache_dir, storage, storage_dir):
        """Test cache statistics."""
        (storage_dir / "test.md").write_text("content")

        async with CacheManager(cache_dir=cache_dir) as cache:
            await cache.fetch("test.md", storage)

            stats = await cache.stats()
            assert stats["total_entries"] == 1
            assert "total_size" in stats
            assert "default_ttl" in stats

    @pytest.mark.asyncio
    async def test_stale_content_on_error(self, cache_dir, tmp_path):
        """Test stale content returned on storage error."""
        storage_dir = tmp_path / "storage"
        storage_dir.mkdir()
        (storage_dir / "test.md").write_text("cached content")

        storage = LocalStorage(base_path=storage_dir)

        async with CacheManager(cache_dir=cache_dir) as cache:
            # Fetch and cache
            await cache.fetch("test.md", storage, ttl=1)

            # Wait for cache to expire
            await asyncio.sleep(1.1)

            # Remove file so storage fails
            (storage_dir / "test.md").unlink()

            # Should return stale cached content
            result = await cache.fetch("test.md", storage)
            assert result.text == "cached content"
            assert result.metadata.get("stale") is True
