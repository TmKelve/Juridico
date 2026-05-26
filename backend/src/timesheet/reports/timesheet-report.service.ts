import type { TimeEntryRepository } from '../core/time-entry.repository';

export class TimesheetReportService {
  constructor(private readonly repository: TimeEntryRepository) {}

  async query(input: {
    userId: number;
    from: string;
    to: string;
  }) {
    const entries = await this.repository.listByUser(input.userId);
    const filtered = entries.filter((entry) => entry.startedAt.slice(0, 10) >= input.from && entry.startedAt.slice(0, 10) <= input.to);
    const summary = filtered.reduce(
      (acc, entry) => {
        acc.totalMinutes += entry.durationMinutes;
        acc.billableMinutes += entry.billableMinutes;
        if (entry.status === 'approved') acc.approvedMinutes += entry.durationMinutes;
        return acc;
      },
      { totalMinutes: 0, billableMinutes: 0, approvedMinutes: 0 },
    );

    return {
      summary,
      items: filtered,
    };
  }
}
