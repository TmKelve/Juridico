export class DeadlineDomainError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly statusCode = 400,
    readonly retryable = false,
    readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'DeadlineDomainError';
  }
}
