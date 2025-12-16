/**
 * Base error class for all Codex SDK errors
 */
export class CodexError extends Error {
  constructor(
    message: string,
    options?: ErrorOptions
  ) {
    super(message, options)
    this.name = 'CodexError'
    Object.setPrototypeOf(this, CodexError.prototype)
  }
}
