import { FinanceAuditService, FinanceDomainError, type FinanceActor } from '../shared';

export class InMemoryFinanceReconciliationRepository {
  private readonly entries = new Map<number, any>();
  private readonly runs = new Map<number, any>();
  private readonly matches = new Map<number, any[]>();
  private runSequence = 1;
  private matchSequence = 1;

  constructor(entries: any[] = []) {
    for (const entry of entries) this.entries.set(entry.id, { ...entry });
  }

  async listOpenReceivables() {
    return [...this.entries.values()].filter((entry) => entry.type === 'receivable' && !['paid', 'cancelled'].includes(entry.status));
  }

  async createRun(data: any) {
    const row = { id: this.runSequence++, ...data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    this.runs.set(row.id, row);
    return row;
  }

  async saveMatches(runId: number, rows: any[]) {
    const next = rows.map((row) => ({ id: this.matchSequence++, runId, ...row, createdAt: new Date().toISOString() }));
    this.matches.set(runId, next);
    return next;
  }

  upsertEntry(entry: any) {
    this.entries.set(entry.id, { ...this.entries.get(entry.id), ...entry });
  }
}

export class PrismaFinanceReconciliationRepository {
  constructor(private readonly prisma: any) {}

  async listOpenReceivables() {
    return this.prisma.financeEntry.findMany({
      where: {
        type: 'receivable',
        status: { notIn: ['paid', 'cancelled'] },
      },
      orderBy: [{ dueDate: 'asc' }, { id: 'asc' }],
    });
  }

  async createRun(data: any) {
    return this.prisma.financeReconciliationRun.create({ data });
  }

  async saveMatches(runId: number, rows: any[]) {
    const created = [];
    for (const row of rows) {
      created.push(await this.prisma.financeReconciliationMatch.create({
        data: {
          runId,
          entryId: row.entryId,
          externalId: row.externalId,
          status: row.status,
          occurredAt: new Date(row.occurredAt),
          amountCents: row.amountCents,
          description: row.description,
          matchedAt: row.matchedAt ? new Date(row.matchedAt) : null,
          metadata: row.metadata ?? {},
        },
      }));
    }
    return created;
  }
}

export interface FinanceReconciliationRepository {
  listOpenReceivables(): Promise<any[]>;
  createRun(data: any): Promise<any>;
  saveMatches(runId: number, rows: any[]): Promise<any[]>;
}

function normalizeDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new FinanceDomainError('Data de conciliação inválida', 400, 'FIN_RECONCILIATION_INVALID');
  return date;
}

export class FinanceReconciliationService {
  constructor(private readonly dependencies: { repository: FinanceReconciliationRepository; auditService: FinanceAuditService }) {}

  async run(input: {
    referenceDate: string;
    lines: Array<{ externalId: string; occurredAt: string; amountCents: number; description: string }>;
    actor: FinanceActor;
    createdBy?: string;
    idempotencyKey?: string | null;
  }) {
    const ids = new Set<string>();
    for (const line of input.lines) {
      if (ids.has(line.externalId)) {
        throw new FinanceDomainError('Linha bancária duplicada na conciliação', 400, 'FIN_RECONCILIATION_INVALID', { externalId: line.externalId });
      }
      ids.add(line.externalId);
    }

    const result = await this.dependencies.auditService.runIdempotent({
      key: input.idempotencyKey,
      scope: 'finance.reconciliation.run',
      entityType: 'reconciliation',
      entityId: input.referenceDate,
      action: 'run',
      payload: input,
      execute: async () => {
        const entries = await this.dependencies.repository.listOpenReceivables();
        const meaningfulTokens = (value: string) => value
          .toLowerCase()
          .split(/[^a-z0-9]+/)
          .filter((token) => token.length >= 4 && !['pix', 'boleto', 'parcial', 'credito'].includes(token));
        const matchesDraft = input.lines.map((line) => {
          const byRef = entries.find((entry) =>
            entry.referenceNumber && line.description.toLowerCase().includes(String(entry.referenceNumber).toLowerCase()),
          );
          if (byRef && byRef.amountCents === line.amountCents) {
            return { entryId: byRef.id, status: 'matched', ...line, matchedAt: new Date().toISOString(), metadata: { reason: 'reference_number' } };
          }

          const partial = entries.find((entry) => {
            const outstanding = entry.amountCents - (entry.settledAmountCents ?? 0);
            const tokens = meaningfulTokens(line.description);
            return outstanding > line.amountCents
              && tokens.some((token) => entry.description.toLowerCase().includes(token));
          });
          if (partial) {
            return { entryId: partial.id, status: 'partial', ...line, matchedAt: new Date().toISOString(), metadata: { reason: 'partial_amount' } };
          }

          return { entryId: null, status: 'unmatched', ...line, matchedAt: null, metadata: { reason: 'not_found' } };
        });

        const matchedLines = matchesDraft.filter((item) => item.status === 'matched').length;
        const unmatchedLines = matchesDraft.filter((item) => item.status === 'unmatched').length;
        const status = unmatchedLines > 0 || matchesDraft.some((item) => item.status === 'partial') ? 'partial' : 'matched';
        const run = await this.dependencies.repository.createRun({
          referenceDate: normalizeDate(`${input.referenceDate}T00:00:00.000Z`).toISOString(),
          status,
          source: 'manual',
          importedLines: input.lines.length,
          matchedLines,
          unmatchedLines,
          summaryJson: {},
          createdBy: input.createdBy ?? null,
        });
        const matches = await this.dependencies.repository.saveMatches(run.id, matchesDraft);
        return { run, matches };
      },
    });

    const auditEvent = await this.dependencies.auditService.record({
      scope: 'finance.reconciliation.run',
      entityType: 'reconciliation',
      entityId: result.data.run.id,
      action: 'reconciliation_run',
      status: 'success',
      summary: `Conciliação financeira #${result.data.run.id} executada`,
      details: { lines: input.lines.length },
      actor: input.actor,
      idempotencyKey: input.idempotencyKey,
    });

    return {
      ...result.data,
      auditEvent,
      idempotency: { mode: result.mode },
    };
  }
}
