import type { TimeEntryRepository } from '../core/time-entry.repository';
import { TimeEntryError } from '../core/time-entry.errors';

export class TimeEntryApprovalService {
  constructor(private readonly repository: TimeEntryRepository) {}

  async approve(input: {
    entryIds: string[];
    decision: 'approved' | 'rejected' | 'reopened' | 'closed';
    approverUserId: number;
    reason?: string | null;
  }) {
    const entries = [];
    for (const entryId of input.entryIds) {
      const current = await this.repository.findById(entryId);
      if (!current) {
        throw new TimeEntryError('TIMESHEET_ENTRY_NOT_FOUND', 'Apontamento nao encontrado.', 404, { entryId });
      }

      const nextStatus = input.decision === 'approved'
        ? 'approved'
        : input.decision === 'rejected'
          ? 'rejected'
          : input.decision === 'closed'
            ? 'locked'
            : 'draft';

      const updated = await this.repository.update(entryId, {
        status: nextStatus,
        approvedByUserId: input.decision === 'approved' ? input.approverUserId : current.approvedByUserId,
        approvedAt: input.decision === 'approved' ? new Date().toISOString() : current.approvedAt,
        lockedAt: input.decision === 'closed' ? new Date().toISOString() : input.decision === 'reopened' ? null : current.lockedAt,
      });
      entries.push(updated);
    }

    return {
      entries,
      decision: input.decision,
      reason: input.reason ?? null,
    };
  }
}
