/**
 * Validation reporting utilities for Codex CLI
 */

import chalk from 'chalk';
import type { Metadata } from '@fractary/codex';

export interface ValidationResult {
  filePath: string;
  valid: boolean;
  metadata?: Metadata;
  errors: string[];
  warnings: string[];
}

export class ValidationReporter {
  private results: ValidationResult[] = [];

  /**
   * Add validation result
   */
  addResult(result: ValidationResult): void {
    this.results.push(result);
  }

  /**
   * Get all results
   */
  getResults(): ValidationResult[] {
    return this.results;
  }

  /**
   * Get summary counts
   */
  getSummary(): { valid: number; errors: number; warnings: number } {
    let valid = 0;
    let errors = 0;
    let warnings = 0;

    for (const result of this.results) {
      if (result.valid && result.errors.length === 0) {
        valid++;
      }
      errors += result.errors.length;
      warnings += result.warnings.length;
    }

    return { valid, errors, warnings };
  }

  /**
   * Check if validation passed
   */
  hasErrors(): boolean {
    return this.results.some(r => r.errors.length > 0);
  }

  /**
   * Check if there are warnings
   */
  hasWarnings(): boolean {
    return this.results.some(r => r.warnings.length > 0);
  }

  /**
   * Print results to console
   */
  print(options: { showWarnings?: boolean; verbose?: boolean } = {}): void {
    const { showWarnings = true, verbose = false } = options;

    for (const result of this.results) {
      if (result.valid && result.errors.length === 0 && result.warnings.length === 0) {
        // Success
        console.log(chalk.green('✓'), chalk.gray(result.filePath));

        if (verbose && result.metadata) {
          this.printMetadata(result.metadata);
        }
      } else if (result.errors.length > 0) {
        // Errors
        console.log(chalk.red('✗'), chalk.gray(result.filePath));
        for (const error of result.errors) {
          console.log(chalk.red('  - Error:'), error);
        }
      }

      if (showWarnings && result.warnings.length > 0) {
        // Warnings
        if (result.errors.length === 0) {
          console.log(chalk.yellow('⚠'), chalk.gray(result.filePath));
        }
        for (const warning of result.warnings) {
          console.log(chalk.yellow('  - Warning:'), warning);
        }
      }
    }

    // Print summary
    const summary = this.getSummary();
    console.log(this.formatSummary(summary));
  }

  /**
   * Print metadata
   */
  private printMetadata(metadata: Metadata): void {
    if (metadata.org) console.log(chalk.dim(`    org: ${metadata.org}`));
    if (metadata.system) console.log(chalk.dim(`    system: ${metadata.system}`));
    if (metadata.codex_sync_include) {
      console.log(chalk.dim(`    includes: ${metadata.codex_sync_include.join(', ')}`));
    }
    if (metadata.codex_sync_exclude) {
      console.log(chalk.dim(`    excludes: ${metadata.codex_sync_exclude.join(', ')}`));
    }
  }

  /**
   * Format summary
   */
  private formatSummary(summary: { valid: number; errors: number; warnings: number }): string {
    const parts: string[] = [];

    if (summary.valid > 0) {
      parts.push(chalk.green(`${summary.valid} valid`));
    }
    if (summary.errors > 0) {
      parts.push(chalk.red(`${summary.errors} error${summary.errors !== 1 ? 's' : ''}`));
    }
    if (summary.warnings > 0) {
      parts.push(chalk.yellow(`${summary.warnings} warning${summary.warnings !== 1 ? 's' : ''}`));
    }

    return `\nSummary: ${parts.join(', ')}`;
  }

  /**
   * Export results as JSON
   */
  toJSON(): any {
    return {
      results: this.results,
      summary: this.getSummary()
    };
  }
}
