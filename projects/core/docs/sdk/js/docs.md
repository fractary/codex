# Docs Toolset - SDK Reference

TypeScript API reference for the Docs toolset. Documentation management.

## DocsManager

```typescript
import { DocsManager } from '@fractary/core/docs';

const docsManager = new DocsManager({
  docsDir: './docs',
  defaultFormat: 'markdown'
});
```

### Configuration

```typescript
interface DocsConfig {
  docsDir: string;
  defaultFormat?: DocFormat;
  defaultTags?: string[];
}
```

## Document Operations

### createDoc()

Create a new document.

```typescript
createDoc(id: string, content: string, metadata: DocMetadata, format?: DocFormat): Promise<Doc>
```

**Parameters:**
- `id` - Unique document identifier
- `content` - Document content
- `metadata` - Document metadata
- `format` - Document format (default: 'markdown')

**Returns:** `Promise<Doc>`

**Example:**
```typescript
const doc = await docsManager.createDoc(
  'user-guide',
  '# User Guide\n\nWelcome to the application...',
  {
    title: 'User Guide',
    authors: ['author1'],
    tags: ['guide', 'user']
  },
  'markdown'
);
```

### getDoc()

Get a document by ID.

```typescript
getDoc(id: string): Promise<Doc | null>
```

**Example:**
```typescript
const doc = await docsManager.getDoc('user-guide');
if (doc) {
  console.log(doc.metadata.title);
  console.log(doc.content);
}
```

### updateDoc()

Update an existing document.

```typescript
updateDoc(id: string, updates: DocUpdateOptions): Promise<Doc>
```

**Parameters:**
- `id` - Document ID
- `updates.content` (string, optional) - New content
- `updates.metadata` (object, optional) - Updated metadata

**Returns:** `Promise<Doc>`

**Example:**
```typescript
const updated = await docsManager.updateDoc('user-guide', {
  content: '# User Guide (Updated)\n\nNew content...',
  metadata: {
    description: 'Updated user guide'
  }
});
```

### deleteDoc()

Delete a document.

```typescript
deleteDoc(id: string): Promise<void>
```

### listDocs()

List all documents.

```typescript
listDocs(options?: DocListOptions): Promise<Doc[]>
```

**Parameters:**
- `options.tags` (string[], optional) - Filter by tags
- `options.author` (string, optional) - Filter by author
- `options.format` (DocFormat, optional) - Filter by format

**Example:**
```typescript
const guides = await docsManager.listDocs({
  tags: ['guide']
});
```

## Search Operations

### searchDocs()

Search documents by query.

```typescript
searchDocs(query: DocSearchQuery): Promise<Doc[]>
```

**Parameters:**
- `query.text` (string, optional) - Full-text search
- `query.tags` (string[], optional) - Filter by tags
- `query.author` (string, optional) - Filter by author

**Returns:** `Promise<Doc[]>`

**Example:**
```typescript
const results = await docsManager.searchDocs({
  text: 'authentication',
  tags: ['api']
});

for (const doc of results) {
  console.log(`${doc.id}: ${doc.metadata.title}`);
}
```

## Validation

### validateDoc()

Validate a document against its type rules.

```typescript
validateDoc(id: string): Promise<DocValidationResult>
```

**Returns:** `Promise<DocValidationResult>`

**Example:**
```typescript
const result = await docsManager.validateDoc('api-spec');

if (result.valid) {
  console.log('Document is valid');
} else {
  console.log('Validation errors:');
  for (const error of result.errors) {
    console.log(`- ${error.message}`);
  }
}
```

### DocValidationResult

```typescript
interface DocValidationResult {
  valid: boolean;
  errors: Array<{
    code: string;
    message: string;
    line?: number;
  }>;
  warnings: Array<{
    code: string;
    message: string;
    line?: number;
  }>;
}
```

## Export Operations

### exportDoc()

Export a document to a different format.

```typescript
exportDoc(id: string, format: DocFormat): Promise<string>
```

**Parameters:**
- `id` - Document ID
- `format` - Target format

**Returns:** `Promise<string>` - Exported content

**Example:**
```typescript
// Export markdown to HTML
const html = await docsManager.exportDoc('user-guide', 'html');

// Export to PDF (requires external renderer)
const pdf = await docsManager.exportDoc('user-guide', 'pdf');
```

## Types

### Doc

```typescript
interface Doc {
  id: string;
  content: string;
  format: DocFormat;
  metadata: DocMetadata;
  path: string;
  createdAt: string;
  updatedAt: string;
}
```

### DocFormat

```typescript
type DocFormat = 'markdown' | 'html' | 'pdf' | 'text';
```

### DocMetadata

```typescript
interface DocMetadata {
  title: string;
  description?: string;
  authors?: string[];
  tags?: string[];
  version?: string;
  status?: 'draft' | 'review' | 'published' | 'archived';
}
```

### DocSearchQuery

```typescript
interface DocSearchQuery {
  text?: string;
  tags?: string[];
  author?: string;
  format?: DocFormat;
  status?: string;
}
```

## Document Types

DocsManager supports different document types with specific validation rules:

### ADR (Architecture Decision Record)

```typescript
const adr = await docsManager.createDoc('adr-001', content, {
  title: 'Use PostgreSQL for primary database',
  type: 'adr',
  status: 'accepted'
});
```

### API Documentation

```typescript
const apiDoc = await docsManager.createDoc('api-auth', content, {
  title: 'Authentication API',
  type: 'api',
  version: '1.0'
});
```

### User Guide

```typescript
const guide = await docsManager.createDoc('getting-started', content, {
  title: 'Getting Started Guide',
  type: 'guide',
  audience: 'developers'
});
```

## Error Handling

```typescript
import { DocsError } from '@fractary/core';

try {
  await docsManager.getDoc('nonexistent');
} catch (error) {
  if (error instanceof DocsError) {
    console.error('Documentation error:', error.message);
  }
}
```

## Consistency Checking

### checkConsistency()

Check if documentation is consistent with code.

```typescript
checkConsistency(options?: ConsistencyOptions): Promise<ConsistencyResult>
```

**Example:**
```typescript
const result = await docsManager.checkConsistency({
  sourceDirs: ['src/'],
  docTypes: ['api']
});

if (result.outdated.length > 0) {
  console.log('Outdated documentation:');
  for (const doc of result.outdated) {
    console.log(`- ${doc.id}: ${doc.reason}`);
  }
}
```

## Other Interfaces

- **CLI:** [Docs Commands](/docs/cli/docs.md)
- **MCP:** [Docs Tools](/docs/mcp/server/docs.md)
- **Plugin:** [Docs Plugin](/docs/plugins/docs.md)
- **Configuration:** [Docs Config](/docs/guides/configuration.md#docs-toolset)
