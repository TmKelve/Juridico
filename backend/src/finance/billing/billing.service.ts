import { buildFinanceChargePayload, buildFinanceEntryPayload } from '../../finance.contract';
import { FinanceAuditService, FinanceDomainError, type FinanceActor, type FinanceChargeMethod } from '../shared';
import type { FinancePaymentProvider } from '../payment-links/finance-payment-provider';

export interface FinanceBillingRepository {
  findEntryById(entryId: number): Promise<any | null>;
  findChargeByExternalId(externalId: string): Promise<any | null>;
  createCharge(input: Record<string, unknown>): Promise<any>;
  appendChargeEvent(input: Record<string, unknown>): Promise<any>;
  updateEntry(entryId: number, data: Record<string, unknown>): Promise<any>;
}

export class InMemoryFinanceBillingRepository implements FinanceBillingRepository {
  private readonly entries = new Map<number, any>();
  private readonly charges = new Map<number, any>();
  private readonly chargeEvents: any[] = [];
  private chargeSequence = 1;

  constructor(seed: { entries?: any[] } = {}) {
    for (const row of seed.entries ?? []) {
      this.entries.set(row.id, { ...row, charges: row.charges ?? [] });
    }
  }

  async findEntryById(entryId: number) {
    const entry = this.entries.get(entryId);
    return entry ? { ...entry, charges: [...entry.charges] } : null;
  }

  async findChargeByExternalId(externalId: string) {
    return [...this.charges.values()].find((charge) => charge.externalId === externalId) ?? null;
  }

  async createCharge(input: any) {
    const id = this.chargeSequence++;
    const row = { id, ...input, createdAt: new Date(), updatedAt: new Date() };
    this.charges.set(id, row);
    const entry = this.entries.get(input.entryId);
    if (entry) {
      entry.charges.push({ status: input.status, method: input.method, id });
    }
    return row;
  }

  async appendChargeEvent(input: any) {
    const row = { id: this.chargeEvents.length + 1, createdAt: new Date(), ...input };
    this.chargeEvents.push(row);
    return row;
  }

  async updateEntry(entryId: number, data: any) {
    const current = this.entries.get(entryId);
    const next = { ...current, ...data, updatedAt: new Date() };
    this.entries.set(entryId, next);
    return next;
  }

  upsertEntry(entry: any) {
    const current = this.entries.get(entry.id);
    this.entries.set(entry.id, {
      ...current,
      ...entry,
      charges: entry.charges ?? current?.charges ?? [],
    });
  }

  listChargeRows() {
    return [...this.charges.values()];
  }

  listChargeEventRows() {
    return [...this.chargeEvents];
  }
}

export class PrismaFinanceBillingRepository implements FinanceBillingRepository {
  constructor(private readonly prisma: any) {}

  async findEntryById(entryId: number) {
    return this.prisma.financeEntry.findUnique({
      where: { id: entryId },
      include: { category: true, charges: { orderBy: { createdAt: 'desc' } } },
    });
  }

  async createCharge(input: Record<string, unknown>) {
    return this.prisma.financeCharge.create({ data: input });
  }

  async findChargeByExternalId(externalId: string) {
    return this.prisma.financeCharge.findUnique({ where: { externalId } });
  }

  async appendChargeEvent(input: Record<string, unknown>) {
    return this.prisma.financeChargeEvent.create({ data: input });
  }

  async updateEntry(entryId: number, data: Record<string, unknown>) {
    return this.prisma.financeEntry.update({
      where: { id: entryId },
      data,
      include: { category: true, charges: { orderBy: { createdAt: 'desc' } } },
    });
  }
}

export class FinanceBillingService {
  constructor(
    private readonly dependencies: {
      repository: FinanceBillingRepository;
      paymentProvider: FinancePaymentProvider;
      auditService: FinanceAuditService;
      now?: () => Date;
    },
  ) {}

  async generate(input: {
    entryId: number;
    method: FinanceChargeMethod;
    expiresAt: string | null;
    recipientEmail: string | null;
    recipientPhone: string | null;
    idempotencyKey?: string | null;
    actor: FinanceActor;
  }) {
    const entry = await this.dependencies.repository.findEntryById(input.entryId);
    if (!entry) {
      throw new FinanceDomainError('Lançamento financeiro não encontrado', 404, 'FIN_ENTRY_NOT_FOUND', { entryId: input.entryId });
    }
    if (entry.type !== 'receivable' || ['paid', 'cancelled', 'reconciled'].includes(entry.status)) {
      throw new FinanceDomainError('Lançamento não elegível para cobrança', 409, 'FIN_ENTRY_NOT_CHARGEABLE', { entryId: input.entryId });
    }

    const result = await this.dependencies.auditService.runIdempotent({
      key: input.idempotencyKey,
      scope: 'finance.billing.generate',
      entityType: 'charge',
      entityId: input.entryId,
      action: 'generate',
      payload: input,
      responseCode: 201,
      execute: async () => {
        const chargeDraft = await this.dependencies.paymentProvider.generateCharge({
          entryId: entry.id,
          method: input.method,
          amountCents: entry.amountCents - (entry.settledAmountCents ?? 0),
          dueDate: entry.dueDate.toISOString().slice(0, 10),
          expiresAt: input.expiresAt,
          recipientEmail: input.recipientEmail,
          recipientPhone: input.recipientPhone,
          metadata: {
            description: entry.description,
            clientId: entry.clientId ?? null,
            processId: entry.processId ?? null,
          },
        });

        const charge = await this.dependencies.repository.createCharge({
          entryId: entry.id,
          method: input.method,
          status: 'pending',
          provider: chargeDraft.provider,
          externalId: chargeDraft.externalId,
          paymentUrl: chargeDraft.paymentUrl,
          pixCode: chargeDraft.pixCode,
          boletoBarcode: chargeDraft.boletoBarcode,
          expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
          paidAt: null,
          amountCents: entry.amountCents - (entry.settledAmountCents ?? 0),
          recipientEmail: input.recipientEmail,
          recipientPhone: input.recipientPhone,
          providerPayload: chargeDraft.providerPayload,
        });
        await this.dependencies.repository.appendChargeEvent({
          chargeId: charge.id,
          providerEventId: null,
          eventType: 'charge_generated',
          status: 'pending',
          payload: chargeDraft.providerPayload,
          occurredAt: this.dependencies.now?.() ?? new Date(),
        });

        const updatedEntry = await this.dependencies.repository.updateEntry(entry.id, {});
        return {
          charge: buildFinanceChargePayload(charge),
          entry: buildFinanceEntryPayload(updatedEntry),
        };
      },
    });

    const auditEvent = await this.dependencies.auditService.record({
      scope: 'finance.billing.generate',
      entityType: 'charge',
      entityId: result.data.charge.id,
      action: 'charge_generated',
      status: 'success',
      summary: `Cobrança ${result.data.charge.method} gerada para o lançamento #${input.entryId}`,
      details: { entryId: input.entryId, externalId: result.data.charge.externalId },
      actor: input.actor,
      idempotencyKey: input.idempotencyKey,
    });

    return {
      ...result.data,
      auditEvent,
      idempotency: result.mode,
    };
  }
}
