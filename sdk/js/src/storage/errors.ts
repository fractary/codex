/**
 * Storage-related error classes
 */

/**
 * Options for FilePluginFileNotFoundError
 */
export interface FilePluginFileNotFoundErrorOptions {
  /** Whether to include cloud storage suggestions (default: true) */
  includeCloudSuggestions?: boolean
  /** Cloud storage type (e.g., 's3', 'r2', 'gcs') */
  storageType?: string
}

/**
 * Error thrown when a file is not found in file plugin storage
 */
export class FilePluginFileNotFoundError extends Error {
  constructor(
    public readonly filePath: string,
    public readonly sourceName: string,
    options?: FilePluginFileNotFoundErrorOptions
  ) {
    const includeCloudSuggestions = options?.includeCloudSuggestions !== false
    const storageType = options?.storageType

    let message = `File not found: ${filePath}\n\n`

    if (includeCloudSuggestions) {
      if (storageType) {
        message += `This file may be in cloud storage (${storageType}).\n\n`
      } else {
        message += `This file may not have been synced from remote storage yet.\n`
      }
      message += `To fetch from cloud storage, run:\n`
      message += `  file pull ${sourceName}\n\n`
      message += `Or sync all sources:\n`
      message += `  file sync`
    } else {
      message += `Please ensure the file exists locally or pull it from cloud storage.`
    }

    super(message)
    this.name = 'FilePluginFileNotFoundError'

    // Maintain proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, FilePluginFileNotFoundError)
    }
  }
}
