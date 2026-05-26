import { randomUUID } from 'crypto';
import type { CreateTimeEntryInput, TimeEntryConflictRecord, TimeEntryRecord, UpdateTimeEntryInput } from './time-entry.types';

function overlaps(leftStart: string, leftEnd: string, rightStart: string, rightEnd: string) {
  const leftStartMs = new Date(leftStart).getTime();
  const leftEndMs = new Date(leftEnd).getTime();
  const rightStartMs = new Date(rightStart).getTime();
  const rightEndMs = new Date(rightEnd).getTime();
  return leftStartMs < rightEndMs && rightStartMs < leftEndMs;
}

export class TimeEntryConflictService {
  detect(input: {
    entryId: string;
    userId: number;
    startedAt: string;
    endedAt: string;
    existingEntries: TimeEntryRecord[];
    taskStatus?: string | null;
    attendanceStatus?: string | null;
    periodClosed?: boolean;
  }): TimeEntryConflictRecord[] {
    const conflicts: TimeEntryConflictRecord[] = [];

    for (const entry of input.existingEntries) {
      if (entry.id === input.entryId) continue;
      if (entry.userId !== input.userId) continue;
      if (!overlaps(input.startedAt, input.endedAt, entry.startedAt, entry.endedAt)) continue;
      conflicts.push({
        id: randomUUID(),
        entryId: input.entryId,
        conflictType: 'overlap',
        severity: 'error',
        fingerprint: `overlap:${entry.id}`,
        details: { overlappingEntryId: entry.id },
        resolvedAt: null,
        createdAt: new Date().toISOString(),
      });
    }

    if (input.periodClosed) {
      conflicts.push({
        id: randomUUID(),
        entryId: input.entryId,
        conflictType: 'period_closed',
        severity: 'error',
        fingerprint: 'period_closed',
        details: {},
        resolvedAt: null,
        createdAt: new Date().toISOString(),
      });
    }

    if (input.taskStatus === 'concluida' || input.taskStatus === 'cancelada') {
      conflicts.push({
        id: randomUUID(),
        entryId: input.entryId,
        conflictType: 'linked_task_closed',
        severity: 'warning',
        fingerprint: 'linked_task_closed',
        details: { taskStatus: input.taskStatus },
        resolvedAt: null,
        createdAt: new Date().toISOString(),
      });
    }

    if (input.attendanceStatus === 'cancelado') {
      conflicts.push({
        id: randomUUID(),
        entryId: input.entryId,
        conflictType: 'linked_attendance_cancelled',
        severity: 'warning',
        fingerprint: 'linked_attendance_cancelled',
        details: { attendanceStatus: input.attendanceStatus },
        resolvedAt: null,
        createdAt: new Date().toISOString(),
      });
    }

    return conflicts;
  }
}
