import { assertAllowedValue, normalizeOptionalString, requireArrayOfIds, requireIsoDate, requireNonEmptyString } from '../deadline-validators';
import type { DeadlineBulkAction } from './deadline-bulk-action.types';

const bulkActionTypes = ['complete', 'reopen', 'reprioritize', 'reassign', 'reschedule'] as const;

export function validateDeadlineBulkAction(input: unknown): DeadlineBulkAction {
  if (!input || typeof input !== 'object') {
    throw new Error('Invalid bulk action.');
  }

  const action = input as Record<string, unknown>;
  const type = assertAllowedValue('action.type', requireNonEmptyString('action.type', action.type), bulkActionTypes);
  const deadlineIds = requireArrayOfIds('action.deadlineIds', action.deadlineIds);

  if (type === 'complete') {
    return {
      type,
      deadlineIds,
      reason: normalizeOptionalString(action.reason),
    };
  }

  if (type === 'reopen') {
    return {
      type,
      deadlineIds,
      reason: normalizeOptionalString(action.reason),
    };
  }

  if (type === 'reprioritize') {
    return {
      type,
      deadlineIds,
      priority: requireNonEmptyString('action.priority', action.priority),
    };
  }

  if (type === 'reassign') {
    return {
      type,
      deadlineIds,
      responsible: requireNonEmptyString('action.responsible', action.responsible),
    };
  }

  return {
    type,
    deadlineIds,
    dueDate: requireIsoDate('action.dueDate', action.dueDate),
  };
}
