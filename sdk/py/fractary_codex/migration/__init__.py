"""
Migration utilities for upgrading to new reference formats.

This module provides tools for migrating from legacy reference formats
to the new codex:// URI scheme.

Example:
    from fractary_codex.migration import migrate_file, migrate_directory

    # Migrate a single file
    result = migrate_file("docs/api.md")
    print(f"Converted {result.conversions} references")

    # Migrate an entire directory
    results = migrate_directory("docs/", pattern="**/*.md")
    for result in results:
        print(f"{result.path}: {result.conversions} conversions")
"""

from .converter import (
    ConversionResult,
    FileConversionResult,
    convert_legacy_references,
    migrate_directory,
    migrate_file,
    scan_for_legacy_references,
)

__all__ = [
    "ConversionResult",
    "FileConversionResult",
    "convert_legacy_references",
    "migrate_file",
    "migrate_directory",
    "scan_for_legacy_references",
]
