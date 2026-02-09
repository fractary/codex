# File Toolset - SDK Reference

TypeScript API reference for the File toolset. File storage operations with local and cloud support.

## FileManager

```typescript
import { FileManager } from '@fractary/core/file';

const fileManager = new FileManager({
  basePath: './data'
});
```

### Configuration

```typescript
interface FileConfig {
  basePath: string;
  allowedPatterns?: string[];
  createDirectories?: boolean;
}
```

## Basic Operations

### write()

Write content to a file.

```typescript
write(path: string, content: string): Promise<string>
```

**Parameters:**
- `path` - Relative path within base directory
- `content` - File content to write

**Returns:** `Promise<string>` - Full path of written file

**Example:**
```typescript
const fullPath = await fileManager.write(
  'config.json',
  JSON.stringify({ key: 'value' }, null, 2)
);
console.log('Written to:', fullPath);
```

### read()

Read a file's content.

```typescript
read(path: string): Promise<string | null>
```

**Parameters:**
- `path` - Relative path within base directory

**Returns:** `Promise<string | null>` - File content, or null if not found

**Example:**
```typescript
const content = await fileManager.read('config.json');
if (content) {
  const config = JSON.parse(content);
  console.log(config);
}
```

### exists()

Check if a file exists.

```typescript
exists(path: string): Promise<boolean>
```

**Example:**
```typescript
if (await fileManager.exists('config.json')) {
  console.log('Config file exists');
}
```

### delete()

Delete a file.

```typescript
delete(path: string): Promise<void>
```

**Example:**
```typescript
await fileManager.delete('temp.json');
```

## Listing Operations

### list()

List files matching a prefix or pattern.

```typescript
list(prefix?: string): Promise<string[]>
```

**Parameters:**
- `prefix` - Optional path prefix to filter results

**Returns:** `Promise<string[]>` - Array of file paths

**Example:**
```typescript
// List all files
const allFiles = await fileManager.list();

// List files in a directory
const dataFiles = await fileManager.list('data/');

// List JSON files
const jsonFiles = await fileManager.list('*.json');
```

### listWithMetadata()

List files with metadata.

```typescript
listWithMetadata(prefix?: string): Promise<FileInfo[]>
```

**Returns:** `Promise<FileInfo[]>`

**Example:**
```typescript
const files = await fileManager.listWithMetadata('data/');
for (const file of files) {
  console.log(`${file.path}: ${file.size} bytes, modified ${file.modifiedAt}`);
}
```

## Copy and Move Operations

### copy()

Copy a file to a new location.

```typescript
copy(sourcePath: string, destPath: string): Promise<string>
```

**Parameters:**
- `sourcePath` - Source file path
- `destPath` - Destination file path

**Returns:** `Promise<string>` - Full path of copied file

**Example:**
```typescript
await fileManager.copy('config.json', 'config.backup.json');
```

### move()

Move a file to a new location.

```typescript
move(sourcePath: string, destPath: string): Promise<string>
```

**Parameters:**
- `sourcePath` - Source file path
- `destPath` - Destination file path

**Returns:** `Promise<string>` - Full path of moved file

**Example:**
```typescript
await fileManager.move('temp/output.json', 'data/output.json');
```

## Directory Operations

### createDirectory()

Create a directory.

```typescript
createDirectory(path: string): Promise<void>
```

**Example:**
```typescript
await fileManager.createDirectory('data/exports');
```

### deleteDirectory()

Delete a directory and its contents.

```typescript
deleteDirectory(path: string, recursive?: boolean): Promise<void>
```

**Parameters:**
- `path` - Directory path
- `recursive` - Delete contents recursively (default: false)

## Types

### FileInfo

```typescript
interface FileInfo {
  path: string;
  name: string;
  size: number;
  isDirectory: boolean;
  createdAt: string;
  modifiedAt: string;
}
```

### WriteOptions

```typescript
interface WriteOptions {
  overwrite?: boolean;    // Overwrite if exists (default: true)
  createDirs?: boolean;   // Create parent directories (default: true)
  encoding?: string;      // File encoding (default: 'utf-8')
}
```

### ReadOptions

```typescript
interface ReadOptions {
  encoding?: string;      // File encoding (default: 'utf-8')
}
```

## Path Safety

FileManager enforces path safety to prevent directory traversal attacks:

```typescript
// These paths are rejected
await fileManager.read('../../../etc/passwd');  // Error: Path traversal
await fileManager.read('/etc/passwd');          // Error: Absolute path

// Safe paths only
await fileManager.read('data/config.json');     // OK
await fileManager.read('exports/report.csv');   // OK
```

## Allowed Patterns

Restrict file operations to specific patterns:

```typescript
const fileManager = new FileManager({
  basePath: './data',
  allowedPatterns: ['*.json', '*.yaml', '*.txt']
});

// OK - matches patterns
await fileManager.write('config.json', '{}');
await fileManager.write('settings.yaml', 'key: value');

// Error - doesn't match patterns
await fileManager.write('script.js', 'code');
```

## Error Handling

```typescript
import { FileError } from '@fractary/core';

try {
  const content = await fileManager.read('nonexistent.json');
} catch (error) {
  if (error instanceof FileError) {
    console.error('File error:', error.message);
    console.error('Code:', error.code);  // 'NOT_FOUND', 'PERMISSION_DENIED', etc.
  }
}
```

### Error Codes

| Code | Description |
|------|-------------|
| `NOT_FOUND` | File or directory not found |
| `ALREADY_EXISTS` | File already exists (when overwrite=false) |
| `PERMISSION_DENIED` | Insufficient permissions |
| `PATH_TRAVERSAL` | Attempted path traversal attack |
| `PATTERN_MISMATCH` | File doesn't match allowed patterns |
| `IS_DIRECTORY` | Expected file but found directory |
| `IS_FILE` | Expected directory but found file |

## Storage Handlers

FileManager supports multiple storage backends:

### Local Storage (default)

```typescript
const fileManager = new FileManager({
  basePath: './data'
});
```

### S3 Storage

```typescript
const fileManager = new FileManager({
  handler: 's3',
  config: {
    bucket: 'my-bucket',
    prefix: 'data/',
    region: 'us-east-1'
  }
});
```

## Other Interfaces

- **CLI:** [File Commands](/docs/cli/file.md)
- **MCP:** [File Tools](/docs/mcp/server/file.md)
- **Plugin:** [File Plugin](/docs/plugins/file.md)
- **Configuration:** [File Config](/docs/guides/configuration.md#file-toolset)
