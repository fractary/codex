"""
Legacy reference converter for migration.

This module provides functions to convert legacy $ref: references
to the new codex:// URI scheme.
"""

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional, Tuple, Union

from ..references import (
    LEGACY_REF_PREFIX,
    convert_legacy_reference,
)


@dataclass
class ConversionResult:
    """Result of converting a single reference.

    Attributes:
        original: Original reference text
        converted: Converted reference (or None if failed)
        line_number: Line number where reference was found
        column: Column position in the line
        error: Error message if conversion failed
    """

    original: str
    converted: Optional[str] = None
    line_number: int = 0
    column: int = 0
    error: Optional[str] = None

    @property
    def success(self) -> bool:
        """Check if conversion was successful."""
        return self.converted is not None and self.error is None


@dataclass
class FileConversionResult:
    """Result of migrating a file.

    Attributes:
        path: Path to the migrated file
        conversions: Number of references converted
        errors: Number of failed conversions
        results: Individual conversion results
        modified: Whether file was modified
        content: New file content (if modified)
    """

    path: Path
    conversions: int = 0
    errors: int = 0
    results: list[ConversionResult] = field(default_factory=list)
    modified: bool = False
    content: Optional[str] = None

    @property
    def success(self) -> bool:
        """Check if all conversions succeeded."""
        return self.errors == 0


# Pattern to find legacy references in text
# Matches $ref:org/project/path or $ref: org/project/path
LEGACY_REF_PATTERN = re.compile(
    r'\$ref:\s*([a-zA-Z0-9_-]+/[a-zA-Z0-9_-]+/[^\s\'"<>]+)',
    re.MULTILINE,
)


def scan_for_legacy_references(text: str) -> list[ConversionResult]:
    """Scan text for legacy references.

    Args:
        text: Text content to scan

    Returns:
        List of ConversionResult for each found reference
    """
    results: list[ConversionResult] = []
    lines = text.split("\n")

    for line_num, line in enumerate(lines, start=1):
        for match in LEGACY_REF_PATTERN.finditer(line):
            original = match.group(0)
            column = match.start() + 1

            results.append(
                ConversionResult(
                    original=original,
                    line_number=line_num,
                    column=column,
                )
            )

    return results


def convert_legacy_references(
    text: str,
    *,
    default_org: Optional[str] = None,
) -> Tuple[str, List[ConversionResult]]:
    """Convert all legacy references in text to codex:// URIs.

    Args:
        text: Text content with legacy references
        default_org: Default organization for relative references

    Returns:
        Tuple of (converted_text, list_of_results)
    """
    results: list[ConversionResult] = []
    lines = text.split("\n")
    modified_lines: list[str] = []

    for line_num, line in enumerate(lines, start=1):
        modified_line = line
        offset = 0  # Track position changes due to replacements

        for match in LEGACY_REF_PATTERN.finditer(line):
            original = match.group(0)
            ref_path = match.group(1)
            column = match.start() + 1

            # Try to convert
            try:
                # Build the full legacy reference
                legacy_ref = f"{LEGACY_REF_PREFIX}{ref_path}"
                converted = convert_legacy_reference(legacy_ref, default_org or "unknown")

                result = ConversionResult(
                    original=original,
                    converted=converted,
                    line_number=line_num,
                    column=column,
                )

                # Replace in line
                start = match.start() + offset
                end = match.end() + offset
                modified_line = modified_line[:start] + converted + modified_line[end:]
                offset += len(converted) - len(original)

            except Exception as e:
                result = ConversionResult(
                    original=original,
                    line_number=line_num,
                    column=column,
                    error=str(e),
                )

            results.append(result)

        modified_lines.append(modified_line)

    converted_text = "\n".join(modified_lines)
    return converted_text, results


def migrate_file(
    path: Union[str, Path],
    *,
    default_org: Optional[str] = None,
    write: bool = False,
    backup: bool = True,
) -> FileConversionResult:
    """Migrate a single file from legacy references to codex:// URIs.

    Args:
        path: Path to the file to migrate
        default_org: Default organization for relative references
        write: If True, write changes to file. If False, just scan.
        backup: If True and write=True, create .bak backup file

    Returns:
        FileConversionResult with conversion details
    """
    path = Path(path)

    if not path.exists():
        return FileConversionResult(
            path=path,
            errors=1,
            results=[
                ConversionResult(
                    original="",
                    error=f"File not found: {path}",
                )
            ],
        )

    try:
        original_content = path.read_text(encoding="utf-8")
    except OSError as e:
        return FileConversionResult(
            path=path,
            errors=1,
            results=[
                ConversionResult(
                    original="",
                    error=f"Failed to read file: {e}",
                )
            ],
        )

    # Convert references
    converted_content, results = convert_legacy_references(
        original_content,
        default_org=default_org,
    )

    # Count successes and failures
    conversions = sum(1 for r in results if r.success)
    errors = sum(1 for r in results if not r.success)
    modified = converted_content != original_content

    result = FileConversionResult(
        path=path,
        conversions=conversions,
        errors=errors,
        results=results,
        modified=modified,
        content=converted_content if modified else None,
    )

    # Write changes if requested
    if write and modified:
        try:
            if backup:
                backup_path = path.with_suffix(path.suffix + ".bak")
                backup_path.write_text(original_content, encoding="utf-8")

            path.write_text(converted_content, encoding="utf-8")
        except OSError as e:
            result.errors += 1
            result.results.append(
                ConversionResult(
                    original="",
                    error=f"Failed to write file: {e}",
                )
            )

    return result


def migrate_directory(
    directory: Union[str, Path],
    *,
    pattern: str = "**/*.md",
    default_org: Optional[str] = None,
    write: bool = False,
    backup: bool = True,
) -> List[FileConversionResult]:
    """Migrate all matching files in a directory.

    Args:
        directory: Directory to migrate
        pattern: Glob pattern for files to process (default: **/*.md)
        default_org: Default organization for relative references
        write: If True, write changes to files
        backup: If True, create backup files

    Returns:
        List of FileConversionResult for each processed file
    """
    directory = Path(directory)
    results: list[FileConversionResult] = []

    if not directory.exists():
        return [
            FileConversionResult(
                path=directory,
                errors=1,
                results=[
                    ConversionResult(
                        original="",
                        error=f"Directory not found: {directory}",
                    )
                ],
            )
        ]

    for file_path in directory.glob(pattern):
        if file_path.is_file():
            result = migrate_file(
                file_path,
                default_org=default_org,
                write=write,
                backup=backup,
            )
            results.append(result)

    return results
