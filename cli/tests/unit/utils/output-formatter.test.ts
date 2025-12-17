/**
 * Tests for output formatting utilities
 */

import { describe, it, expect } from 'vitest';
import {
  formatMetadata,
  formatValidationError,
  formatValidationSuccess,
  formatValidationWarning,
  formatSummary,
  formatRoutingDecision,
  formatJSON,
  formatContentPreview,
} from '../../../src/utils/output-formatter.js';
import type { Metadata } from '@fractary/codex';

describe('output-formatter', () => {
  describe('formatMetadata', () => {
    it('should format basic metadata fields', () => {
      const metadata: Metadata = {
        org: 'test-org',
        system: 'test-system',
        title: 'Test Document',
        description: 'A test description',
      };

      const output = formatMetadata(metadata);
      expect(output).toContain('org: test-org');
      expect(output).toContain('system: test-system');
      expect(output).toContain('title: Test Document');
      expect(output).toContain('description: A test description');
    });

    it('should format sync rules', () => {
      const metadata: Metadata = {
        org: 'test-org',
        codex_sync_include: ['*.md', '*.txt'],
        codex_sync_exclude: ['node_modules/**'],
      };

      const output = formatMetadata(metadata);
      expect(output).toContain('includes: *.md, *.txt');
      expect(output).toContain('excludes: node_modules/**');
    });

    it('should handle empty metadata', () => {
      const metadata: Metadata = { org: 'test-org' };
      const output = formatMetadata(metadata);
      expect(output).toBeTruthy();
      expect(output).toContain('org: test-org');
    });

    it('should respect custom indent', () => {
      const metadata: Metadata = { org: 'test-org' };
      const output = formatMetadata(metadata, 4);
      expect(output.startsWith('    ')).toBe(true);
    });
  });

  describe('formatValidationError', () => {
    it('should format validation errors', () => {
      const output = formatValidationError('test.md', 'Missing required field');
      expect(output).toContain('test.md');
      expect(output).toContain('Missing required field');
    });
  });

  describe('formatValidationSuccess', () => {
    it('should format success without metadata', () => {
      const output = formatValidationSuccess('test.md');
      expect(output).toContain('test.md');
    });

    it('should format success with metadata', () => {
      const metadata: Metadata = {
        org: 'test-org',
        system: 'test-system',
      };
      const output = formatValidationSuccess('test.md', metadata);
      expect(output).toContain('test.md');
      expect(output).toContain('org: test-org');
      expect(output).toContain('system: test-system');
    });
  });

  describe('formatValidationWarning', () => {
    it('should format validation warnings', () => {
      const output = formatValidationWarning('test.md', 'Optional field missing');
      expect(output).toContain('test.md');
      expect(output).toContain('Optional field missing');
    });
  });

  describe('formatSummary', () => {
    it('should format summary with all counts', () => {
      const output = formatSummary(5, 2, 3);
      expect(output).toContain('5 valid');
      expect(output).toContain('2 errors');
      expect(output).toContain('3 warnings');
    });

    it('should handle zero counts', () => {
      const output = formatSummary(1, 0, 0);
      expect(output).toContain('1 valid');
      expect(output).not.toContain('error');
      expect(output).not.toContain('warning');
    });

    it('should use singular form for single error', () => {
      const output = formatSummary(0, 1, 0);
      expect(output).toContain('1 error');
      expect(output).not.toContain('errors');
    });
  });

  describe('formatRoutingDecision', () => {
    it('should format positive routing decision', () => {
      const output = formatRoutingDecision('my-repo', true, 'Matches include pattern');
      expect(output).toContain('my-repo');
      expect(output).toContain('Matches include pattern');
    });

    it('should format negative routing decision', () => {
      const output = formatRoutingDecision('my-repo', false, 'In exclude list');
      expect(output).toContain('my-repo');
      expect(output).toContain('In exclude list');
    });
  });

  describe('formatJSON', () => {
    it('should format JSON with proper indentation', () => {
      const data = { foo: 'bar', nested: { baz: 123 } };
      const output = formatJSON(data);
      expect(output).toContain('"foo": "bar"');
      expect(output).toContain('"nested"');
      expect(output).toContain('"baz": 123');
    });
  });

  describe('formatContentPreview', () => {
    it('should show preview of short content', () => {
      const content = 'Line 1\nLine 2\nLine 3';
      const output = formatContentPreview(content, 5);
      expect(output).toBe(content);
      expect(output).not.toContain('more lines');
    });

    it('should truncate long content', () => {
      const lines = Array.from({ length: 10 }, (_, i) => `Line ${i + 1}`);
      const content = lines.join('\n');
      const output = formatContentPreview(content, 5);
      expect(output).toContain('Line 1');
      expect(output).toContain('Line 5');
      expect(output).not.toContain('Line 6');
      expect(output).toContain('5 more lines');
    });
  });
});
