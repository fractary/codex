# Spec Toolset - SDK Reference

TypeScript API reference for the Spec toolset. Technical specification management for FABER workflows.

## SpecManager

```typescript
import { SpecManager } from '@fractary/core/spec';

const specManager = new SpecManager({
  specDirectory: './specs'
});
```

### Configuration

```typescript
interface SpecConfig {
  specDirectory: string;
  defaultTemplate?: SpecTemplateType;
  autoValidate?: boolean;
}
```

## CRUD Operations

### createSpec()

Create a new specification.

```typescript
createSpec(title: string, options?: SpecCreateOptions): Specification
```

**Parameters:**
- `title` - Specification title
- `options.workId` (string, optional) - Associated work item ID
- `options.workType` (string, optional) - Type of work
- `options.template` (SpecTemplateType, optional) - Template to use

**Returns:** `Specification`

**Example:**
```typescript
const spec = specManager.createSpec('API Authentication', {
  workType: 'feature',
  template: 'api'
});
```

### getSpec()

Get a specification by ID or path.

```typescript
getSpec(idOrPath: string): Specification | null
```

**Parameters:**
- `idOrPath` - Specification ID (e.g., 'SPEC-20240101') or file path

**Returns:** `Specification | null`

**Example:**
```typescript
const spec = specManager.getSpec('SPEC-20240101');
if (spec) {
  console.log(spec.title, spec.content);
}
```

### updateSpec()

Update an existing specification.

```typescript
updateSpec(idOrPath: string, updates: SpecUpdateOptions): Specification
```

**Parameters:**
- `idOrPath` - Specification ID or path
- `updates.title` (string, optional) - New title
- `updates.content` (string, optional) - New content
- `updates.metadata` (object, optional) - Updated metadata

**Returns:** `Specification`

**Example:**
```typescript
const updated = specManager.updateSpec('SPEC-20240101', {
  content: 'Updated specification content...'
});
```

### deleteSpec()

Delete a specification.

```typescript
deleteSpec(idOrPath: string): void
```

### listSpecs()

List specifications with optional filters.

```typescript
listSpecs(options?: SpecListOptions): Specification[]
```

**Parameters:**
- `options.workType` (string, optional) - Filter by work type
- `options.validationStatus` (string, optional) - Filter by validation status
- `options.since` (Date, optional) - Filter by creation date

**Returns:** `Specification[]`

**Example:**
```typescript
const specs = specManager.listSpecs({
  workType: 'feature',
  validationStatus: 'pass'
});
```

## Validation

### validateSpec()

Validate specification completeness.

```typescript
validateSpec(specIdOrPath: string): SpecValidateResult
```

**Parameters:**
- `specIdOrPath` - Specification ID or path

**Returns:** `SpecValidateResult`

**Example:**
```typescript
const result = specManager.validateSpec('SPEC-20240101');

console.log('Status:', result.status);
console.log('Score:', result.score);

for (const check of result.checks) {
  console.log(`${check.name}: ${check.passed ? 'PASS' : 'FAIL'}`);
  if (!check.passed) {
    console.log(`  Message: ${check.message}`);
  }
}

if (result.suggestions) {
  console.log('Suggestions:', result.suggestions);
}
```

### SpecValidateResult

```typescript
interface SpecValidateResult {
  status: 'pass' | 'partial' | 'fail';
  score: number;          // 0-100
  checks: Array<{
    name: string;
    passed: boolean;
    message: string;
  }>;
  suggestions?: string[];
}
```

## Refinement

### generateRefinementQuestions()

Generate refinement questions for incomplete specifications.

```typescript
generateRefinementQuestions(specIdOrPath: string): RefinementQuestion[]
```

**Example:**
```typescript
const questions = specManager.generateRefinementQuestions('SPEC-20240101');

for (const q of questions) {
  console.log(`Category: ${q.category}`);
  console.log(`Question: ${q.question}`);
  console.log(`Context: ${q.context}`);
}
```

### RefinementQuestion

```typescript
interface RefinementQuestion {
  category: string;
  question: string;
  context: string;
  priority: 'high' | 'medium' | 'low';
}
```

## Archive Operations

### archiveSpec()

Archive a completed specification.

```typescript
archiveSpec(specIdOrPath: string, options?: ArchiveOptions): void
```

**Parameters:**
- `specIdOrPath` - Specification ID or path
- `options.reason` (string, optional) - Archive reason
- `options.destination` (string, optional) - Archive destination

## Types

### Specification

```typescript
interface Specification {
  id: string;
  path: string;
  title: string;
  workId?: string;
  workType: string;
  template: SpecTemplateType;
  content: string;
  metadata: SpecMetadata;
  phases?: SpecPhase[];
  createdAt: string;
  updatedAt: string;
}
```

### SpecTemplateType

```typescript
type SpecTemplateType = 'basic' | 'feature' | 'bug' | 'infrastructure' | 'api';
```

### SpecMetadata

```typescript
interface SpecMetadata {
  version: string;
  author?: string;
  reviewers?: string[];
  status: 'draft' | 'review' | 'approved' | 'archived';
  tags?: string[];
}
```

### SpecPhase

```typescript
interface SpecPhase {
  name: string;
  description: string;
  tasks: string[];
  acceptance: string[];
}
```

## Error Handling

```typescript
import { SpecError } from '@fractary/core';

try {
  const spec = specManager.getSpec('SPEC-INVALID');
} catch (error) {
  if (error instanceof SpecError) {
    console.error('Specification error:', error.message);
  }
}
```

## Template Examples

### Feature Template

```typescript
const spec = specManager.createSpec('User Authentication', {
  workType: 'feature',
  template: 'feature'
});

// Generated structure:
// - Problem Statement
// - Proposed Solution
// - Acceptance Criteria
// - Technical Approach
// - Testing Strategy
// - Rollout Plan
```

### API Template

```typescript
const spec = specManager.createSpec('REST API Design', {
  workType: 'api',
  template: 'api'
});

// Generated structure:
// - Endpoints
// - Request/Response Schemas
// - Authentication
// - Error Handling
// - Rate Limiting
```

## Other Interfaces

- **CLI:** [Spec Commands](/docs/cli/spec.md)
- **MCP:** [Spec Tools](/docs/mcp/server/spec.md)
- **Plugin:** [Spec Plugin](/docs/plugins/spec.md)
- **Configuration:** [Spec Config](/docs/guides/configuration.md#spec-toolset)
