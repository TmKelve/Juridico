export class FinanceDomainError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 400,
    public readonly code = 'FINANCE_ERROR',
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'FinanceDomainError';
  }
}
