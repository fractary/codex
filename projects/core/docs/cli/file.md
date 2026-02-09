# File Module - CLI Reference

Command-line reference for the File module. File storage operations with support for local and cloud backends.

## Command Structure

```bash
fractary-core file <command> [arguments] [options]
```

## Upload and Download Commands

### file upload

Upload a local file to storage.

```bash
fractary-core file upload <local-path> [options]
```

**Arguments:**
- `local-path` - Path to local file

**Options:**
- `--remote-path <path>` - Remote storage path (defaults to filename)
- `--source <name>` - Named source from config
- `--json` - Output as JSON

**Examples:**
```bash
# Upload file (uses filename as remote path)
fractary-core file upload ./export.csv

# Upload to specific remote path
fractary-core file upload ./export.csv --remote-path data/exports/export.csv

# Upload to named source
fractary-core file upload ./backup.json --source s3-archive
```

### file download

Download a file from storage to local path.

```bash
fractary-core file download <remote-path> [options]
```

**Arguments:**
- `remote-path` - Remote storage path

**Options:**
- `--local-path <path>` - Local destination path (defaults to filename)
- `--source <name>` - Named source from config
- `--json` - Output as JSON

**Examples:**
```bash
# Download file (uses filename as local path)
fractary-core file download data/config.json

# Download to specific local path
fractary-core file download data/config.json --local-path ./local-config.json
```

## Read and Write Commands

### file write

Write content to a storage path.

```bash
fractary-core file write <path> [options]
```

**Arguments:**
- `path` - Storage path

**Options:**
- `--content <text>` - Content to write (required)
- `--source <name>` - Named source from config
- `--json` - Output as JSON

**Examples:**
```bash
# Write JSON content
fractary-core file write config.json --content '{"key":"value"}'

# Write to named source
fractary-core file write settings.yaml --content "key: value" --source mycloud
```

### file read

Read content from a storage path.

```bash
fractary-core file read <path> [options]
```

**Arguments:**
- `path` - Storage path

**Options:**
- `--source <name>` - Named source from config
- `--json` - Output as JSON

**Examples:**
```bash
# Read file (prints content to stdout)
fractary-core file read config.json

# Read as JSON envelope
fractary-core file read config.json --json
```

## List and Query Commands

### file list

List files in storage.

```bash
fractary-core file list [options]
```

**Options:**
- `--prefix <prefix>` - Filter by prefix
- `--source <name>` - Named source from config
- `--json` - Output as JSON

**Examples:**
```bash
# List all files
fractary-core file list

# List files under prefix
fractary-core file list --prefix data/exports/

# List from named source
fractary-core file list --source s3-archive --json
```

### file exists

Check if a file exists in storage.

```bash
fractary-core file exists <path> [options]
```

**Arguments:**
- `path` - Storage path

**Options:**
- `--source <name>` - Named source from config
- `--json` - Output as JSON

**Examples:**
```bash
# Check existence
fractary-core file exists config.json

# Check with JSON output
fractary-core file exists data/report.csv --json
```

### file get-url

Get a URL for a file in storage.

```bash
fractary-core file get-url <path> [options]
```

**Arguments:**
- `path` - Storage path

**Options:**
- `--expires-in <seconds>` - URL expiration in seconds
- `--source <name>` - Named source from config
- `--json` - Output as JSON

**Examples:**
```bash
# Get URL
fractary-core file get-url data/report.pdf

# Get presigned URL with expiration
fractary-core file get-url data/report.pdf --expires-in 3600
```

## File Operations

### file delete

Delete a file from storage.

```bash
fractary-core file delete <path> [options]
```

**Arguments:**
- `path` - Storage path

**Options:**
- `--source <name>` - Named source from config
- `--json` - Output as JSON

**Example:**
```bash
fractary-core file delete temp/old-file.json
```

### file copy

Copy a file within storage.

```bash
fractary-core file copy <src-path> <dest-path> [options]
```

**Arguments:**
- `src-path` - Source path
- `dest-path` - Destination path

**Options:**
- `--source <name>` - Named source from config
- `--json` - Output as JSON

**Example:**
```bash
fractary-core file copy config.json config.backup.json
```

### file move

Move a file within storage.

```bash
fractary-core file move <src-path> <dest-path> [options]
```

**Arguments:**
- `src-path` - Source path
- `dest-path` - Destination path

**Options:**
- `--source <name>` - Named source from config
- `--json` - Output as JSON

**Example:**
```bash
fractary-core file move temp/output.json data/output.json
```

## Configuration and Diagnostics

### file show-config

Show file plugin configuration.

```bash
fractary-core file show-config [options]
```

**Options:**
- `--json` - Output as JSON

**Example:**
```bash
fractary-core file show-config
```

**Output:**
```
File Plugin Configuration:

  default: local
    Base path: .fractary/files

  s3-archive: s3
    Bucket: my-bucket
    Region: us-east-1
    Auth: configured
```

### file test-connection

Test storage connection.

```bash
fractary-core file test-connection [options]
```

**Options:**
- `--source <name>` - Named source to test
- `--json` - Output as JSON

**Examples:**
```bash
# Test default source
fractary-core file test-connection

# Test specific source
fractary-core file test-connection --source s3-archive
```

**Output:**
```
Connection successful
  Source: default (local)
  Response time: 12ms
```

## JSON Output

All commands support `--json` for structured output:

```bash
fractary-core file upload ./data.csv --json
```

```json
{
  "status": "success",
  "data": {
    "source": "default",
    "localPath": "./data.csv",
    "remotePath": "data.csv",
    "url": ".fractary/files/data.csv",
    "sizeBytes": 1234,
    "checksum": "sha256:abc123...",
    "uploadedAt": "2024-01-15T10:30:00Z"
  }
}
```

## Other Interfaces

- **SDK:** [File API](/docs/sdk/js/file.md)
- **MCP:** [File Tools](/docs/mcp/server/file.md)
- **Plugin:** [File Plugin](/docs/plugins/file.md)
- **Configuration:** [File Config](/docs/guides/configuration.md#file-toolset)
