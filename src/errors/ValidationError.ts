import { CodexError } from './CodexError.js'

/**
 * Error thrown when data validation fails
 */
export class ValidationError extends CodexError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'ValidationError'
    Object.setPrototypeOf(this, ValidationError.prototype)
  }
}
