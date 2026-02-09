# File Plugin - Claude Code Reference

Claude Code plugin reference for the File toolset (`fractary-file`). File storage operations with local and cloud support.

## Overview

The File plugin provides slash commands and agents for file operations including upload, download, and storage management directly from Claude Code.

## Installation

Add to your Claude Code settings:

```json
{
  "plugins": ["fractary-file"]
}
```

## Configuration

The plugin uses configuration from `.fractary/config.yaml`:

```yaml
file:
  schema_version: "1.0"
  active_handler: local
  handlers:
    local:
      base_path: .
      create_directories: true
    s3:
      bucket: my-bucket
      region: us-east-1
      prefix: data/
```

## Slash Commands

### /file-upload

Upload a file to storage.

**Usage:**
```
/file-upload <local-path> <remote-path> [options]
```

**Options:**
- `--overwrite` - Overwrite if exists

**Example:**
```
/file-upload ./export.csv data/exports/report.csv
```

This command delegates to the `fractary-file:file-upload` agent.

### /file-download

Download a file from storage.

**Usage:**
```
/file-download <remote-path> <local-path> [options]
```

**Options:**
- `--overwrite` - Overwrite if exists

**Example:**
```
/file-download data/config.json ./local-config.json
```

### /file-list

List files in storage.

**Usage:**
```
/file-list [prefix] [options]
```

**Options:**
- `--pattern <glob>` - Filter by pattern
- `--long` - Show detailed info

**Example:**
```
/file-list data/ --pattern "*.json" --long
```

### /file-delete

Delete a file from storage.

**Usage:**
```
/file-delete <path> [--force]
```

**Example:**
```
/file-delete temp/old-file.json --force
```

### /file-show-config

Show current file storage configuration.

**Usage:**
```
/file-show-config
```

This command delegates to the `fractary-file:file-show-config` agent.

### /file-switch-handler

Switch the active storage handler.

**Usage:**
```
/file-switch-handler <handler>
```

**Example:**
```
/file-switch-handler s3
```

This command delegates to the `fractary-file:file-switch-handler` agent.

### /file-test-connection

Test the file storage connection.

**Usage:**
```
/file-test-connection
```

This command delegates to the `fractary-file:file-test-connection` agent.

## Agents

### fractary-file:file-show-config

Shows current file plugin configuration.

**Triggered by:**
- `/file-show-config` command
- Proactively when user asks about storage config

### fractary-file:file-switch-handler

Switches the active storage handler.

**Triggered by:**
- `/file-switch-handler` command
- Proactively when user mentions switching storage or using S3/local

### fractary-file:file-test-connection

Tests file storage connection.

**Triggered by:**
- `/file-test-connection` command
- Proactively when user mentions testing or verifying storage

**Capabilities:**
- Tests read/write permissions
- Validates configuration
- Reports connection status

### fractary-file:file-upload

Uploads files to storage.

### fractary-file:file-download

Downloads files from storage.

## Usage Examples

### Viewing Configuration

```
User: Show me the current file storage config

Claude: [Uses fractary-file:file-show-config agent]

## File Storage Configuration

**Active Handler**: local

### Handlers

**local** (active)
- Base path: ./data
- Create directories: true

**s3** (available)
- Bucket: my-bucket
- Region: us-east-1
- Prefix: data/
```

### Uploading Files

```
User: Upload the export file to S3

Claude: /file-upload ./export.csv data/exports/report-2024-01.csv

File uploaded:
- Source: ./export.csv
- Destination: data/exports/report-2024-01.csv
- Size: 45.2 KB
- Handler: local

Note: Currently using local storage. Use /file-switch-handler s3 to use S3.
```

### Switching to S3

```
User: Switch to S3 storage

Claude: [Uses fractary-file:file-switch-handler agent]

Switching to S3 storage...

Testing S3 connection:
- ✅ Bucket accessible: my-bucket
- ✅ Write permission verified
- ✅ Read permission verified

Storage handler switched to: s3

All subsequent file operations will use S3.
```

### Testing Connection

```
User: Test the storage connection

Claude: [Uses fractary-file:file-test-connection agent]

## Storage Connection Test

**Handler**: s3
**Bucket**: my-bucket

### Tests
| Test | Status |
|------|--------|
| Bucket exists | ✅ Pass |
| List objects | ✅ Pass |
| Write object | ✅ Pass |
| Read object | ✅ Pass |
| Delete object | ✅ Pass |

**Result**: All tests passed. Storage is working correctly.
```

### Listing Files

```
User: List all JSON files in the data directory

Claude: /file-list data/ --pattern "*.json" --long

## Files in data/

| Size | Modified | Path |
|------|----------|------|
| 1.2 KB | Jan 15 10:30 | data/config.json |
| 45.6 KB | Jan 14 15:45 | data/export.json |
| 2.3 KB | Jan 13 09:00 | data/settings.json |

Total: 3 files, 49.1 KB
```

## Storage Handlers

### Local Handler

Default handler for local file system operations.

```yaml
file:
  active_handler: local
  handlers:
    local:
      base_path: ./data
      create_directories: true
```

### S3 Handler

Handler for Amazon S3 storage.

```yaml
file:
  active_handler: s3
  handlers:
    s3:
      bucket: my-bucket
      region: us-east-1
      prefix: project/
```

**Required Environment Variables:**
```bash
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
```

## Other Interfaces

- **SDK:** [File API](/docs/sdk/js/file.md)
- **CLI:** [File Commands](/docs/cli/file.md)
- **MCP:** [File Tools](/docs/mcp/server/file.md)
- **Configuration:** [File Config](/docs/guides/configuration.md#file-toolset)
