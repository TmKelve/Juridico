import { TimeEntryError } from './time-entry.errors';
import { TimeEntryConflictService } from './time-entry-conflict.service';
import type { CreateTimeEntryInput, TimeEntryRecord, UpdateTimeEntryInput } from './time-entry.types';
import type { TimeEntryRepository } from './time-entry.repository';

function computeDurationMinutes(startedAt: string, endedAt: string) {
  const start = new Date(startedAt).getTime();
  const end = new Date(endedAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    throw new TimeEntryError('TIMESHEET_INVALID', 'Intervalo de horas invalido.');
  }
  return Math.round((end - start) / 60000);
}

export class TimeEntryService {
  constructor(
    private readonly repository: TimeEntryRepository,
    private readonly conflictService = new TimeEntryConflictService(),
  ) {}

  async create(input: CreateTimeEntryInput, dependencies: {
    taskStatus?: string | null;
    attendanceStatus?: string | null;
    periodClosed?: boolean;
  } = {}) {
    const durationMinutes = computeDurationMinutes(input.startedAt, input.endedAt);
    if (input.billableMinutes > durationMinutes) {
      throw new TimeEntryError('TIMESHEET_INVALID', 'billableMinutes nao pode exceder durationMinutes.');
    }

    const created = await this.repository.create({ ...input, durationMinutes });
    const existingEntries = await this.repository.listByUser(created.userId);
    const conflicts = this.conflictService.detect({
      entryId: created.id,
      userId: created.userId,
      startedAt: created.startedAt,
      endedAt: created.endedAt,
      existingEntries,
      taskStatus: dependencies.taskStatus ?? null,
      attendanceStatus: dependencies.attendanceStatus ?? null,
      periodClosed: dependencies.periodClosed ?? false,
    });
    await this.repository.saveConflicts(created.id, conflicts);

    if (conflicts.some((item) => item.severity === 'error')) {
      throw new TimeEntryError('TIMESHEET_CONFLICT', 'Conflitos impedem o apontamento.', 409, { conflicts });
    }

    return {
      entry: created,
      conflicts,
    };
  }

  async update(input: UpdateTimeEntryInput, dependencies: {
    taskStatus?: string | null;
    attendanceStatus?: string | null;
    periodClosed?: boolean;
  } = {}) {
    const current = await this.repository.findById(input.entryId);
    if (!current) {
      throw new TimeEntryError('TIMESHEET_ENTRY_NOT_FOUND', 'Apontamento nao encontrado.', 404);
    }
    if (current.lockedAt || current.status === 'locked' || dependencies.periodClosed) {
      throw new TimeEntryError('TIMESHEET_PERIOD_CLOSED', 'Periodo fechado para edicao.', 409);
    }

    const startedAt = input.startedAt ?? current.startedAt;
    const endedAt = input.endedAt ?? current.endedAt;
    const durationMinutes = computeDurationMinutes(startedAt, endedAt);
    const billableMinutes = input.billableMinutes ?? current.billableMinutes;
    if (billableMinutes > durationMinutes) {
      throw new TimeEntryError('TIMESHEET_INVALID', 'billableMinutes nao pode exceder durationMinutes.');
    }

    const updated = await this.repository.update(current.id, {
      startedAt,
      endedAt,
      billable: input.billable ?? current.billable,
      billableMinutes,
      durationMinutes,
      notes: input.notes === undefined ? current.notes : input.notes,
      status: input.status ?? current.status,
    });

    const conflicts = this.conflictService.detect({
      entryId: updated.id,
      userId: updated.userId,
      startedAt: updated.startedAt,
      endedAt: updated.endedAt,
      existingEntries: await this.repository.listByUser(updated.userId),
      taskStatus: dependencies.taskStatus ?? null,
      attendanceStatus: dependencies.attendanceStatus ?? null,
      periodClosed: false,
    });
    await this.repository.saveConflicts(updated.id, conflicts);

    if (conflicts.some((item) => item.severity === 'error')) {
      throw new TimeEntryError('TIMESHEET_CONFLICT', 'Conflitos impedem a atualizacao.', 409, { conflicts });
    }

    return {
      entry: updated,
      conflicts,
    };
  }
}
