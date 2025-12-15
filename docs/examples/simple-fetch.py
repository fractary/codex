"""
Simple Fetch Example

Demonstrates basic document fetching with caching.
"""

import asyncio
import os
from fractary_codex import (
    CacheManager,
    StorageManager,
    LocalStorage,
    GitHubStorage,
    parse_reference,
    resolve_reference
)


async def main():
    # Create storage manager with multiple providers
    async with StorageManager() as storage:
        # Register local storage
        local = LocalStorage(base_path="./knowledge")
        await storage.register_provider("local", local, priority=10)

        # Register GitHub storage (if token available)
        if os.environ.get("GITHUB_TOKEN"):
            github = GitHubStorage(token=os.environ["GITHUB_TOKEN"])
            await storage.register_provider("github", github, priority=100)

        # Create cache manager
        async with CacheManager(
            cache_dir=".codex-cache",
            max_memory_size=50 * 1024 * 1024,  # 50 MB
            default_ttl=3600  # 1 hour
        ) as cache:
            cache.set_storage_manager(storage)

            # Fetch a document
            uri = "codex://fractary/codex/docs/README.md"

            print(f"Fetching: {uri}")

            try:
                # Parse and resolve reference
                ref = parse_reference(uri)
                print(f"Organization: {ref.org}")
                print(f"Project: {ref.project}")
                print(f"Path: {ref.path}")

                resolved = resolve_reference(uri, cache_dir=".codex-cache")
                print(f"Cache path: {resolved.cache_path}")
                print(f"Is local: {resolved.is_local}")

                # First fetch (from storage)
                print("\nFirst fetch...")
                result1 = await cache.get(resolved)
                print(f"Source: {result1.source}")
                print(f"Size: {result1.size} bytes")
                print(f"From cache: {result1.metadata.get('from_cache', False)}")
                print(f"Content preview: {result1.text[:100]}...")

                # Second fetch (from cache)
                print("\nSecond fetch...")
                result2 = await cache.get(resolved)
                print(f"From cache: {result2.metadata.get('from_cache', False)}")

                # Get cache statistics
                stats = await cache.get_stats()
                print("\nCache Statistics:")
                print(f"Total entries: {stats.total_entries}")
                print(f"Memory entries: {stats.memory_entries}")
                print(f"Disk entries: {stats.disk_entries}")
                print(f"Hit rate: {stats.hit_rate * 100:.2f}%")

            except Exception as error:
                print(f"Error: {error}")
                raise


if __name__ == "__main__":
    asyncio.run(main())
