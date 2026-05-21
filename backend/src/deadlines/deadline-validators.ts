import { DeadlineDomainError } from './deadline-errors';

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00.000Z`).getTime());
}

function isIsoDateTime(value: string) {
  return !Number.isNaN(new Date(value).getTime());
}

export function normalizeOptionalString(value: unknown) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized || null;
}

export function requireNonEmptyString(field: string, value: unknown) {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    throw new DeadlineDomainError('DEADLINE_VALIDATION_ERROR', `Campo obrigatório inválido: ${field}.`, 400, false, { field });
  }
  return normalized;
}

export function requirePositiveInteger(field: string, value: unknown) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new DeadlineDomainError('DEADLINE_VALIDATION_ERROR', `Campo obrigatório inválido: ${field}.`, 400, false, { field });
  }
  return value;
}

export function requireIsoDate(field: string, value: unknown) {
  if (typeof value !== 'string' || !isIsoDate(value)) {
    throw new DeadlineDomainError('DEADLINE_VALIDATION_ERROR', `Data inválida para ${field}.`, 400, false, { field });
  }
  return value;
}

export function requireIsoDateTime(field: string, value: unknown) {
  if (typeof value !== 'string' || !isIsoDateTime(value)) {
    throw new DeadlineDomainError('DEADLINE_VALIDATION_ERROR', `Data e hora inválidas para ${field}.`, 400, false, { field });
  }
  return new Date(value).toISOString();
}

export function requireArrayOfIds(field: string, value: unknown) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new DeadlineDomainError('DEADLINE_VALIDATION_ERROR', `Lista obrigatória inválida: ${field}.`, 400, false, { field });
  }

  const seen = new Set<number>();
  const ids: number[] = [];
  for (const item of value) {
    const id = requirePositiveInteger(field, item);
    if (!seen.has(id)) {
      ids.push(id);
      seen.add(id);
    }
  }

  return ids;
}

export function assertAllowedValue<TValue extends string>(
  field: string,
  value: string,
  allowed: readonly TValue[],
) {
  if (!allowed.includes(value as TValue)) {
    throw new DeadlineDomainError('DEADLINE_VALIDATION_ERROR', `Valor inválido para ${field}.`, 400, false, {
      field,
      allowed,
    });
  }
  return value as TValue;
}
