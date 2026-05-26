import { randomUUID } from 'crypto';
import type { CreateTimeEntryInput, TimeEntryConflictRecord, TimeEntryRecord, UpdateTimeEntryInput } from './time-entry.types';

export interface TimeEntryRepository {
  listByUser(userId: number): Promise<TimeEntryRecord[]>;
  findById(entryId: string): Promise<TimeEntryRecord | null>;
  create(input: CreateTimeEntryInput & { durationMinutes: number }): Promise<TimeEntryRecord>;
  update(entryId: string, patch: Partial<TimeEntryRecord>): Promise<TimeEntryRecord>;
  saveConflicts(entryId: string, conflicts: TimeEntryConflictRecord[]): Promise<TimeEntryConflictRecord[]>;
  listConflicts(entryId: string): Promise<TimeEntryConflictRecord[]>;
}

export class InMemoryTimeEntryRepository implements TimeEntryRepository {
  private readonly entries = new Map<string, TimeEntryRecord>();
  private readonly conflicts = new Map<string, TimeEntryConflictRecord[]>();

  constructor(seed: { entries?: TimeEntryRecord[]; conflicts?: TimeEntryConflictRecord[] } = {}) {
    for (const entry of seed.entries ?? []) this.entries.set(entry.id, { ...entry });
    for (const conflict of seed.conflicts ?? []) {
      const list = this.conflicts.get(conflict.entryId) ?? [];
      list.push({ ...conflict });
      this.conflicts.set(conflict.entryId, list);
    }
  }

  async listByUser(userId: number) {
    return [...this.entries.values()].filter((entry) => entry.userId === userId).map((entry) => ({ ...entry }));
  }

  async findById(entryId: string) {
    const entry = this.entries.get(entryId);
    return entry ? { ...entry } : null;
  }

  async create(input: CreateTimeEntryInput & { durationMinutes: number }) {
    const now = new Date().toISOString();
    const entry: TimeEntryRecord = {
      id: randomUUID(),
      userId: input.userId,
      teamId: input.teamId ?? null,
      portfolioId: input.portfolioId ?? null,
      clientId: input.clientId ?? null,
      processId: input.processId ?? null,
      taskId: input.taskId ?? null,
      attendanceId: input.attendanceId ?? null,
      agendaEventId: input.agendaEventId ?? null,
      activityType: input.activityType,
      source: input.source,
      status: 'draft',
      billable: input.billable,
      durationMinutes: input.durationMinutes,
      billableMinutes: input.billableMinutes,
      startedAt: input.startedAt,
      endedAt: input.endedAt,
      notes: input.notes ?? null,
      origin: input.origin ?? 'manual',
      createdByUserId: input.createdByUserId ?? null,
      approvedByUserId: null,
      approvedAt: null,
      lockedAt: null,
      correlationId: input.correlationId ?? null,
      idempotencyKey: input.idempotencyKey ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.entries.set(entry.id, entry);
    return { ...entry };
  }

  async update(entryId: string, patch: Partial<TimeEntryRecord>) {
    const current = this.entries.get(entryId);
    if (!current) throw new Error('TIMESHEET_ENTRY_NOT_FOUND');
    const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
    this.entries.set(entryId, next);
    return { ...next };
  }

  async saveConflicts(entryId: string, conflicts: TimeEntryConflictRecord[]) {
    this.conflicts.set(entryId, conflicts.map((item) => ({ ...item })));
    return conflicts.map((item) => ({ ...item }));
  }

  async listConflicts(entryId: string) {
    return (this.conflicts.get(entryId) ?? []).map((item) => ({ ...item }));
  }
}
