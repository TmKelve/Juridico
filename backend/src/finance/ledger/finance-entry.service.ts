import { buildFinanceEntryPayload } from '../../finance.contract';
import { assertCategoryMatchesType, type FinanceCategoryRepository } from '../categories/finance-category.repository';
import type { FinanceEntryRepository } from '../accounts/finance-entry.repository';
import { FinanceAuditService, FinanceDomainError, type FinanceActor, type FinanceEntryStatus, type FinancePaymentMethod } from '../shared';

function normalizeDateOnly(value: string) {
  const normalized = `${value}T00:00:00.000Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    throw new FinanceDomainError('Data financeira inválida', 400, 'FIN_ENTRY_INVALID', { value });
  }
  return date;
}

function resolveInitialStatus(dueDate: Date, now = new Date()): FinanceEntryStatus {
  return dueDate.getTime() < new Date(now.toISOString().slice(0, 10)).getTime() ? 'overdue' : 'open';
}

function nextStatusFromManualSettlement(): FinanceEntryStatus {
  return 'paid';
}

export class FinanceEntryService {
  constructor(
    private readonly dependencies: {
      repository: FinanceEntryRepository;
      categories: FinanceCategoryRepository;
      auditService: FinanceAuditService;
      now?: () => Date;
    },
  ) {}

  async createEntry(input: {
    type: 'receivable' | 'payable';
    description: string;
    amountCents: number;
    currency?: string;
    dueDate: string;
    clientId: number | null;
    processId: number | null;
    categoryCode: string;
    responsibleUserId: number | null;
    notes?: string | null;
    idempotencyKey?: string | null;
  }, actor: FinanceActor) {
    const now = this.dependencies.now?.() ?? new Date();
    const dueDate = normalizeDateOnly(input.dueDate);
    const normalized = {
      ...input,
      description: input.description.trim(),
      amountCents: Math.trunc(input.amountCents),
      currency: input.currency?.trim() || 'BRL',
      dueDate,
      notes: input.notes ?? null,
    };

    if (!normalized.description || normalized.amountCents <= 0) {
      throw new FinanceDomainError('Lançamento financeiro inválido', 400, 'FIN_ENTRY_INVALID');
    }

    const category = await this.dependencies.categories.findByCode(normalized.categoryCode);
    assertCategoryMatchesType(category, normalized.type);
    await this.assertRelations(normalized.clientId, normalized.processId, normalized.responsibleUserId);

    const result = await this.dependencies.auditService.runIdempotent({
      key: normalized.idempotencyKey,
      scope: 'finance.entry.create',
      entityType: 'entry',
      entityId: normalized.processId,
      action: 'create',
      payload: {
        ...normalized,
        dueDate: normalized.dueDate.toISOString(),
      },
      responseCode: 201,
      execute: async () => {
        const created = await this.dependencies.repository.create({
          type: normalized.type,
          status: resolveInitialStatus(normalized.dueDate, now),
          description: normalized.description,
          amountCents: normalized.amountCents,
          settledAmountCents: 0,
          dueDate: normalized.dueDate,
          settlementDate: null,
          paymentMethod: null,
          currency: normalized.currency,
          clientId: normalized.clientId,
          processId: normalized.processId,
          categoryCode: normalized.categoryCode,
          responsibleUserId: normalized.responsibleUserId,
          notes: normalized.notes,
        });
        created.category = category;
        return buildFinanceEntryPayload(created);
      },
    });

    const auditEvent = await this.dependencies.auditService.record({
      scope: 'finance.audit.event',
      entityType: 'entry',
      entityId: result.data.id,
      action: 'entry_created',
      status: 'success',
      summary: `Lançamento financeiro #${result.data.id} criado`,
      details: { type: result.data.type, amountCents: result.data.amountCents, dueDate: result.data.dueDate },
      actor,
      idempotencyKey: normalized.idempotencyKey,
    });

    return {
      entry: result.data,
      auditEvent,
      idempotency: result.mode,
    };
  }

  async settleEntryManually(input: {
    entryId: number;
    settlementDate: string;
    paymentMethod: FinancePaymentMethod;
    notes?: string | null;
    idempotencyKey?: string | null;
  }, actor: FinanceActor) {
    return this.updateStatus({
      entryId: input.entryId,
      status: nextStatusFromManualSettlement(),
      settlementDate: input.settlementDate,
      paymentMethod: input.paymentMethod,
      notes: input.notes ?? null,
      idempotencyKey: input.idempotencyKey,
    }, actor);
  }

  async updateStatus(input: {
    entryId: number;
    status: FinanceEntryStatus;
    settlementDate: string | null;
    paymentMethod: FinancePaymentMethod | null;
    notes?: string | null;
    idempotencyKey?: string | null;
  }, actor: FinanceActor) {
    const current = await this.dependencies.repository.findById(input.entryId);
    if (!current) {
      throw new FinanceDomainError('Lançamento financeiro não encontrado', 404, 'FIN_ENTRY_NOT_FOUND', { entryId: input.entryId });
    }

    if ((current.status === 'paid' || current.status === 'cancelled') && input.status === 'open') {
      throw new FinanceDomainError('Transição de status inválida para lançamento financeiro', 409, 'FIN_STATUS_TRANSITION_INVALID', {
        currentStatus: current.status,
        nextStatus: input.status,
      });
    }

    const result = await this.dependencies.auditService.runIdempotent({
      key: input.idempotencyKey,
      scope: 'finance.entry.updateStatus',
      entityType: 'entry',
      entityId: input.entryId,
      action: 'update_status',
      payload: input,
      execute: async () => {
        const settlementDate = input.settlementDate ? normalizeDateOnly(input.settlementDate) : null;
        const updated = await this.dependencies.repository.update(input.entryId, {
          status: input.status,
          settlementDate,
          paymentMethod: input.paymentMethod,
          notes: input.notes ?? current.notes,
          settledAmountCents: input.status === 'paid' || input.status === 'reconciled' ? current.amountCents : current.settledAmountCents,
        });
        updated.category = current.category;
        return buildFinanceEntryPayload(updated);
      },
    });

    const auditEvent = await this.dependencies.auditService.record({
      scope: 'finance.audit.event',
      entityType: 'entry',
      entityId: input.entryId,
      action: 'entry_status_updated',
      status: 'success',
      summary: `Status do lançamento #${input.entryId} atualizado para ${result.data.status}`,
      details: { from: current.status, to: result.data.status, paymentMethod: result.data.paymentMethod },
      actor,
      idempotencyKey: input.idempotencyKey,
    });

    return {
      entry: result.data,
      auditEvent,
      idempotency: result.mode,
    };
  }

  async listEntries(filters?: { type?: 'receivable' | 'payable'; status?: FinanceEntryStatus }) {
    const rows = await this.dependencies.repository.list(filters);
    return Promise.all(rows.map(async (row) => {
      const charge = await this.dependencies.repository.chargeStatusSnapshot(row.id);
      return { ...buildFinanceEntryPayload(row), ...charge };
    }));
  }

  private async assertRelations(clientId: number | null, processId: number | null, responsibleUserId: number | null) {
    try {
      await this.dependencies.repository.assertClientExists(clientId);
      await this.dependencies.repository.assertProcessExists(processId);
      await this.dependencies.repository.assertUserExists(responsibleUserId);
    } catch (error: any) {
      if (error?.code === 'FIN_CLIENT_NOT_FOUND') {
        throw new FinanceDomainError('Cliente financeiro não encontrado', 404, 'FIN_CLIENT_NOT_FOUND', { clientId });
      }
      if (error?.code === 'FIN_PROCESS_NOT_FOUND') {
        throw new FinanceDomainError('Processo financeiro não encontrado', 404, 'FIN_PROCESS_NOT_FOUND', { processId });
      }
      throw new FinanceDomainError('Relação financeira inválida', 400, 'FIN_ENTRY_INVALID', { responsibleUserId });
    }
  }
}
