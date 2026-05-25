export class TaskDomainError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 400,
    public readonly code = 'TASK_INVALID',
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'TaskDomainError';
  }
}
