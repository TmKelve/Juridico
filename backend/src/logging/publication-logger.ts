import type { PublicationLogContext, PublicationLogRecord } from './publication-logger.types';

const sensitiveKeys = new Set(['cpf', 'cpfCnpj', 'oabNumber', 'rawText', 'normalizedText', 'fullText']);

function redactValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, currentValue]) => {
      if (sensitiveKeys.has(key)) {
        return [key, '[REDACTED]'];
      }

      return [key, redactValue(currentValue)];
    }),
  );
}

export function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return { message: String(error) };
}

export class PublicationLogger {
  info(message: string, context: PublicationLogContext = {}, details: Record<string, unknown> = {}): PublicationLogRecord {
    return this.build('info', message, context, details);
  }

  warn(message: string, context: PublicationLogContext = {}, details: Record<string, unknown> = {}): PublicationLogRecord {
    return this.build('warn', message, context, details);
  }

  error(message: string, context: PublicationLogContext = {}, details: Record<string, unknown> = {}): PublicationLogRecord {
    return this.build('error', message, context, details);
  }

  private build(
    level: PublicationLogRecord['level'],
    message: string,
    context: PublicationLogContext,
    details: Record<string, unknown>,
  ): PublicationLogRecord {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      details: redactValue(details) as Record<string, unknown>,
    };
  }
}
