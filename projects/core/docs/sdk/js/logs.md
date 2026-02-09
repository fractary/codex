# Logs Toolset - SDK Reference

TypeScript API reference for the Logs toolset. Session and operational logging.

## LogManager

```typescript
import { LogManager } from '@fractary/core/logs';

const logManager = new LogManager({
  logsDirectory: './logs'
});
```

### Configuration

```typescript
interface LogsConfig {
  logsDirectory: string;
  redactSensitive?: boolean;
  maxAgeDays?: number;
  autoArchive?: boolean;
}
```

## Log Operations

### writeLog()

Write a new log entry.

```typescript
writeLog(options: LogWriteOptions): LogEntry
```

**Parameters:**
- `options.type` (LogType, required) - Type of log
- `options.title` (string, required) - Log title
- `options.content` (string, required) - Log content
- `options.issueNumber` (number, optional) - Associated issue number
- `options.metadata` (object, optional) - Additional metadata

**Returns:** `LogEntry`

**Example:**
```typescript
const log = logManager.writeLog({
  type: 'session',
  title: 'Feature Development Session',
  content: 'Session transcript...',
  issueNumber: 123
});
```

### readLog()

Read a log entry by ID or path.

```typescript
readLog(idOrPath: string): LogEntry | null
```

**Parameters:**
- `idOrPath` - Log ID or file path

**Returns:** `LogEntry | null`

**Example:**
```typescript
const log = logManager.readLog('LOG-20240101-001');
if (log) {
  console.log(log.title, log.content);
}
```

### searchLogs()

Search logs with filters.

```typescript
searchLogs(options: LogSearchOptions): LogSearchResult[]
```

**Parameters:**
- `options.query` (string, required) - Search query
- `options.type` (LogType, optional) - Filter by log type
- `options.issueNumber` (number, optional) - Filter by issue
- `options.since` (Date, optional) - Start date
- `options.until` (Date, optional) - End date

**Returns:** `LogSearchResult[]`

**Example:**
```typescript
const results = logManager.searchLogs({
  query: 'authentication error',
  type: 'session',
  since: new Date('2024-01-01')
});

for (const result of results) {
  console.log(`${result.logId}: ${result.title}`);
  console.log(`Matches: ${result.matches.length}`);
}
```

### listLogs()

List logs with optional filters.

```typescript
listLogs(options?: LogListOptions): LogEntry[]
```

**Parameters:**
- `options.type` (LogType, optional) - Filter by type
- `options.issueNumber` (number, optional) - Filter by issue
- `options.limit` (number, optional) - Maximum results

## Session Capture

### startCapture()

Start capturing a session.

```typescript
startCapture(options: CaptureStartOptions): CaptureResult
```

**Parameters:**
- `options.issueNumber` (number, optional) - Associated issue
- `options.title` (string, optional) - Session title
- `options.redactSensitive` (boolean, optional) - Redact sensitive data
- `options.model` (string, optional) - AI model being used

**Returns:** `CaptureResult`

**Example:**
```typescript
const capture = logManager.startCapture({
  issueNumber: 123,
  redactSensitive: true,
  model: 'claude-3.5-sonnet'
});

console.log('Capture started:', capture.sessionId);
```

### stopCapture()

Stop the active session capture.

```typescript
stopCapture(): CaptureResult | null
```

**Returns:** `CaptureResult | null` - The completed capture, or null if no active capture

**Example:**
```typescript
const result = logManager.stopCapture();
if (result) {
  console.log('Capture saved:', result.path);
  console.log('Duration:', result.duration);
}
```

### getCaptureStatus()

Get status of active capture.

```typescript
getCaptureStatus(): CaptureStatus | null
```

## Archive Operations

### archiveLog()

Archive a log entry.

```typescript
archiveLog(idOrPath: string, options?: ArchiveOptions): void
```

### archiveLogs()

Archive multiple logs matching criteria.

```typescript
archiveLogs(options: ArchiveLogsOptions): ArchiveResult
```

**Parameters:**
- `options.olderThan` (Date, optional) - Archive logs older than date
- `options.type` (LogType, optional) - Archive specific type
- `options.issueNumber` (number, optional) - Archive by issue

## Cleanup Operations

### cleanup()

Clean up old logs based on retention policy.

```typescript
cleanup(options?: CleanupOptions): CleanupResult
```

**Parameters:**
- `options.maxAgeDays` (number, optional) - Delete logs older than days
- `options.dryRun` (boolean, optional) - Preview without deleting

**Example:**
```typescript
// Preview cleanup
const preview = logManager.cleanup({ maxAgeDays: 90, dryRun: true });
console.log('Would delete:', preview.count, 'logs');

// Execute cleanup
const result = logManager.cleanup({ maxAgeDays: 90 });
console.log('Deleted:', result.count, 'logs');
```

## Types

### LogType

```typescript
type LogType =
  | 'session'      // Development session logs
  | 'build'        // Build process logs
  | 'deployment'   // Deployment logs
  | 'test'         // Test execution logs
  | 'debug'        // Debug session logs
  | 'audit'        // Audit trail logs
  | 'operational'  // Operational logs
  | 'workflow';    // FABER workflow logs
```

### LogStatus

```typescript
type LogStatus = 'active' | 'completed' | 'stopped' | 'success' | 'failure' | 'error';
```

### LogEntry

```typescript
interface LogEntry {
  id: string;
  type: LogType;
  path: string;
  title: string;
  content: string;
  metadata: LogMetadata;
  issueNumber?: number;
  status: LogStatus;
  createdAt: string;
  updatedAt: string;
}
```

### LogMetadata

```typescript
interface LogMetadata {
  model?: string;
  duration?: number;
  messageCount?: number;
  toolCalls?: number;
  tags?: string[];
}
```

### CaptureResult

```typescript
interface CaptureResult {
  sessionId: string;
  path: string;
  status: 'started' | 'completed' | 'error';
  startedAt: string;
  completedAt?: string;
  duration?: number;
}
```

### LogSearchResult

```typescript
interface LogSearchResult {
  logId: string;
  title: string;
  path: string;
  type: LogType;
  matches: Array<{
    line: number;
    content: string;
    context: string;
  }>;
  score: number;
}
```

## Error Handling

```typescript
import { LogError } from '@fractary/core';

try {
  logManager.startCapture({ issueNumber: 123 });
} catch (error) {
  if (error instanceof LogError) {
    console.error('Log error:', error.message);
  }
}
```

## Sensitive Data Redaction

When `redactSensitive` is enabled, the following are automatically redacted:

- API tokens and keys
- Passwords
- Email addresses
- IP addresses
- File paths containing sensitive directories

**Example:**
```typescript
const logManager = new LogManager({
  logsDirectory: './logs',
  redactSensitive: true
});

// Sensitive data in content will be replaced with [REDACTED]
```

## Other Interfaces

- **CLI:** [Logs Commands](/docs/cli/logs.md)
- **MCP:** [Logs Tools](/docs/mcp/server/logs.md)
- **Plugin:** [Logs Plugin](/docs/plugins/logs.md)
- **Configuration:** [Logs Config](/docs/guides/configuration.md#logs-toolset)
