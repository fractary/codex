import { CodexError } from './CodexError.js'

/**
 * Error thrown when configuration is missing or invalid
 */
export class ConfigurationError extends CodexError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'ConfigurationError'
    Object.setPrototypeOf(this, ConfigurationError.prototype)
  }
}
