import { buildFinanceDelinquencyContactPayload, buildFinanceEntryPayload } from '../../finance.contract';
import type { FinanceEntryRow } from '../accounts/finance-entry.repository';

function remainingAmount(entry: FinanceEntryRow) {
  return Math.max(0, entry.amountCents - (entry.settledAmountCents ?? 0));
}

function daysPastDue(entry: FinanceEntryRow, referenceDate = new Date()) {
  const due = new Date(entry.dueDate.toISOString().slice(0, 10)).getTime();
  const ref = new Date(referenceDate.toISOString().slice(0, 10)).getTime();
  return Math.max(0, Math.floor((ref - due) / 86400000));
}

function firstUpcomingScheduleDate(entry: FinanceEntryRow) {
  return null;
}

export class FinanceDelinquencyContactsService {
  build(entries: FinanceEntryRow[], schedules: Array<{ entryId: number; channel: string; nextRunAt: Date | string; status: string; attempts?: Array<{ channel?: string | null; status?: string | null; sentAt?: Date | string | null }> }> = []) {
    const overdue = entries.filter((entry) => entry.type === 'receivable' && entry.status === 'overdue');
    const groups = new Map<string, FinanceEntryRow[]>();
    const scheduleByEntryId = new Map(schedules.map((schedule) => [schedule.entryId, schedule]));

    for (const entry of overdue) {
      const key = `${entry.clientId ?? 'none'}:${entry.processId ?? 'none'}`;
      const current = groups.get(key) ?? [];
      current.push(entry);
      groups.set(key, current);
    }

    return [...groups.values()]
      .map((items) => {
        const [first] = items;
        const sortedByDue = [...items].sort((left, right) => left.dueDate.getTime() - right.dueDate.getTime());
        const firstSchedule = items
          .map((item) => scheduleByEntryId.get(item.id))
          .find((schedule) => Boolean(schedule));
        const latestAttempt = firstSchedule?.attempts?.[0] ?? null;
        const payload = buildFinanceDelinquencyContactPayload({
          id: `${first.clientId ?? 'none'}:${first.processId ?? 'none'}`,
          clientId: first.clientId ?? null,
          clientName: first.clientRecord?.name ?? 'Sem cliente vinculado',
          contactName: first.clientRecord?.name ?? null,
          contactEmail: first.clientRecord?.email ?? null,
          contactPhone: first.clientRecord?.phone ?? null,
          processId: first.processId ?? null,
          processTitle: first.process?.title ?? null,
          processNumber: first.process?.processNumber ?? null,
          overdueEntriesCount: items.length,
          overdueInstallmentsCount: items.filter((item) => item.installmentPlanId).length,
          overdueAmountCents: items.reduce((acc, item) => acc + remainingAmount(item), 0),
          oldestDaysPastDue: sortedByDue[0] ? daysPastDue(sortedByDue[0]) : 0,
          nextActionAt: firstSchedule?.nextRunAt ? new Date(firstSchedule.nextRunAt).toISOString() : firstUpcomingScheduleDate(first),
          lastCollectionChannel: (latestAttempt?.channel ?? firstSchedule?.channel ?? null) as any,
          lastCollectionOutcome: mapAttemptOutcome(latestAttempt?.status ?? firstSchedule?.status ?? null),
          entries: items
            .sort((left, right) => left.dueDate.getTime() - right.dueDate.getTime())
            .map((entry) => buildFinanceEntryPayload(entry as any)),
        });

        return payload;
      })
      .sort((left, right) => right.overdueAmountCents - left.overdueAmountCents);
  }
}

function mapAttemptOutcome(value: string | null) {
  if (!value) return null;
  const normalized = value.toLowerCase();
  if (normalized === 'sent' || normalized === 'processing') return 'sent';
  if (normalized === 'paid') return 'paid';
  if (normalized === 'failed' || normalized === 'cancelled') return 'failed';
  return 'no_response';
}
