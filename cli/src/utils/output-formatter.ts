/**
 * Output formatting utilities for Codex CLI
 */

import chalk from 'chalk';
import type { Metadata } from '@fractary/codex';

/**
 * Format metadata for display
 */
export function formatMetadata(metadata: Metadata, indent: number = 2): string {
  const indentStr = ' '.repeat(indent);
  const lines: string[] = [];

  // Core fields
  if (metadata.org) lines.push(`${indentStr}org: ${chalk.cyan(metadata.org)}`);
  if (metadata.system) lines.push(`${indentStr}system: ${chalk.cyan(metadata.system)}`);
  if (metadata.title) lines.push(`${indentStr}title: ${metadata.title}`);
  if (metadata.description) lines.push(`${indentStr}description: ${metadata.description}`);

  // Sync rules
  if (metadata.codex_sync_include && metadata.codex_sync_include.length > 0) {
    lines.push(`${indentStr}includes: ${chalk.green(metadata.codex_sync_include.join(', '))}`);
  }
  if (metadata.codex_sync_exclude && metadata.codex_sync_exclude.length > 0) {
    lines.push(`${indentStr}excludes: ${chalk.yellow(metadata.codex_sync_exclude.join(', '))}`);
  }

  // Visibility
  if (metadata.visibility) {
    lines.push(`${indentStr}visibility: ${chalk.blue(metadata.visibility)}`);
  }

  // Tags
  if (metadata.tags && metadata.tags.length > 0) {
    lines.push(`${indentStr}tags: ${metadata.tags.join(', ')}`);
  }

  // Dates
  if (metadata.created) lines.push(`${indentStr}created: ${metadata.created}`);
  if (metadata.updated) lines.push(`${indentStr}updated: ${metadata.updated}`);

  return lines.join('\n');
}

/**
 * Format validation error
 */
export function formatValidationError(filePath: string, error: string): string {
  return `${chalk.red('✗')} ${chalk.gray(filePath)}\n  ${chalk.red('-')} ${error}`;
}

/**
 * Format validation success
 */
export function formatValidationSuccess(filePath: string, metadata?: Metadata): string {
  let output = `${chalk.green('✓')} ${chalk.gray(filePath)}`;

  if (metadata) {
    const details: string[] = [];
    if (metadata.org) details.push(`org: ${metadata.org}`);
    if (metadata.system) details.push(`system: ${metadata.system}`);
    if (metadata.codex_sync_include) {
      details.push(`includes: ${metadata.codex_sync_include.join(', ')}`);
    }
    if (metadata.codex_sync_exclude) {
      details.push(`excludes: ${metadata.codex_sync_exclude.join(', ')}`);
    }

    if (details.length > 0) {
      output += '\n  ' + chalk.dim(details.join('\n  '));
    }
  }

  return output;
}

/**
 * Format validation warning
 */
export function formatValidationWarning(filePath: string, warning: string): string {
  return `${chalk.yellow('⚠')} ${chalk.gray(filePath)}\n  ${chalk.yellow('-')} ${warning}`;
}

/**
 * Format summary
 */
export function formatSummary(
  valid: number,
  errors: number,
  warnings: number
): string {
  const parts: string[] = [];

  if (valid > 0) parts.push(chalk.green(`${valid} valid`));
  if (errors > 0) parts.push(chalk.red(`${errors} error${errors !== 1 ? 's' : ''}`));
  if (warnings > 0) parts.push(chalk.yellow(`${warnings} warning${warnings !== 1 ? 's' : ''}`));

  return `\nSummary: ${parts.join(', ')}`;
}

/**
 * Format routing decision
 */
export function formatRoutingDecision(
  repo: string,
  willSync: boolean,
  reason: string
): string {
  const symbol = willSync ? chalk.green('✓') : chalk.red('✗');
  return `${symbol} ${chalk.bold(repo)}\n  ${chalk.dim('Reason:')} ${reason}`;
}

/**
 * Format JSON output
 */
export function formatJSON(data: any): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Format content preview
 */
export function formatContentPreview(content: string, maxLines: number = 5): string {
  const lines = content.split('\n');
  const preview = lines.slice(0, maxLines);

  let output = preview.join('\n');
  if (lines.length > maxLines) {
    output += `\n${chalk.dim(`... (${lines.length - maxLines} more lines)`)}`;
  }

  return output;
}
