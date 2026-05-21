import { buildFinanceChargePayload, buildFinanceEntryPayload } from '../../finance.contract';
import { FinanceAuditService, FinanceDomainError, type FinanceActor } from '../shared';

export class FinanceWebhookService {
  constructor(
    private readonly dependencies: {
      repository: any;
      paymentProvider: { generateCharge?: unknown };
      auditService: FinanceAuditService;
      now?: () => Date;
    },
  ) {}

  async handle(input: {
    provider: string;
    providerEventId: string;
    chargeExternalId: string;
    status: 'pending' | 'paid' | 'failed' | 'cancelled' | 'expired';
    paidAt: string | null;
    amountPaidCents: number | null;
    idempotencyKey?: string | null;
    actor: FinanceActor;
  }) {
    const charge = this.dependencies.repository.listChargeRows
      ? this.dependencies.repository.listChargeRows().find((item: any) => item.externalId === input.chargeExternalId)
      : await this.dependencies.repository.findChargeByExternalId(input.chargeExternalId);

    if (!charge) {
      throw new FinanceDomainError('Cobrança não encontrada para o webhook', 404, 'FIN_CHARGE_NOT_FOUND', {
        chargeExternalId: input.chargeExternalId,
      });
    }

    const result = await this.dependencies.auditService.runIdempotent({
      key: input.idempotencyKey ?? input.providerEventId,
      scope: 'finance.billing.webhookUpdate',
      entityType: 'charge',
      entityId: charge.id,
      action: 'webhook_update',
      payload: input,
      execute: async () => {
        charge.status = input.status;
        charge.paidAt = input.paidAt ? new Date(input.paidAt) : null;
        charge.updatedAt = this.dependencies.now?.() ?? new Date();
        await this.dependencies.repository.appendChargeEvent({
          chargeId: charge.id,
          providerEventId: input.providerEventId,
          eventType: 'webhook_update',
          status: input.status,
          payload: input,
          occurredAt: this.dependencies.now?.() ?? new Date(),
        });

        const entry = await this.dependencies.repository.findEntryById(charge.entryId);
        const updatedEntry = input.status === 'paid'
          ? await this.dependencies.repository.updateEntry(charge.entryId, {
            status: 'paid',
            settlementDate: charge.paidAt,
            paymentMethod: charge.method === 'payment_link' ? 'link' : charge.method,
            settledAmountCents: input.amountPaidCents ?? entry.amountCents,
          })
          : entry;

        return {
          charge: buildFinanceChargePayload(charge),
          entry: updatedEntry ? buildFinanceEntryPayload(updatedEntry) : null,
        };
      },
    });

    const auditEvent = await this.dependencies.auditService.record({
      scope: 'finance.billing.webhookUpdate',
      entityType: 'charge',
      entityId: charge.id,
      action: 'charge_webhook_processed',
      status: 'success',
      summary: `Webhook financeiro processado para cobrança #${charge.id}`,
      details: { chargeExternalId: input.chargeExternalId, status: input.status },
      actor: input.actor,
      idempotencyKey: input.idempotencyKey ?? input.providerEventId,
    });

    return {
      ...result.data,
      auditEvent,
      idempotency: result.mode,
    };
  }
}
