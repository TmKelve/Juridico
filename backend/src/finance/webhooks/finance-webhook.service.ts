import { buildFinanceChargePayload, buildFinanceEntryPayload } from '../../finance.contract';
import { FinanceAuditService, FinanceDomainError, type FinanceActor } from '../shared';
import type { FinancePaymentProvider } from '../payment-links/finance-payment-provider';

export class FinanceWebhookService {
  constructor(
    private readonly dependencies: {
      repository: any;
      paymentProvider: FinancePaymentProvider;
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
    const normalized = {
      provider: input.provider,
      providerEventId: input.providerEventId,
      chargeExternalId: input.chargeExternalId,
      status: input.status,
      paidAt: input.paidAt,
      amountPaidCents: input.amountPaidCents,
      rawPayload: input,
    };

    const charge = this.dependencies.repository.listChargeRows
      ? this.dependencies.repository.listChargeRows().find((item: any) => item.externalId === normalized.chargeExternalId)
      : await this.dependencies.repository.findChargeByExternalId(normalized.chargeExternalId);

    if (!charge) {
      throw new FinanceDomainError('Cobrança não encontrada para o webhook', 404, 'FIN_CHARGE_NOT_FOUND', {
        chargeExternalId: normalized.chargeExternalId,
      });
    }

    const result = await this.dependencies.auditService.runIdempotent({
      key: input.idempotencyKey ?? normalized.providerEventId,
      scope: 'finance.billing.webhookUpdate',
      entityType: 'charge',
      entityId: charge.id,
      action: 'webhook_update',
      payload: normalized,
      execute: async () => {
        charge.status = normalized.status;
        charge.paidAt = normalized.paidAt ? new Date(normalized.paidAt) : null;
        charge.updatedAt = this.dependencies.now?.() ?? new Date();
        await this.dependencies.repository.appendChargeEvent({
          chargeId: charge.id,
          providerEventId: normalized.providerEventId,
          eventType: 'webhook_update',
          status: normalized.status,
          payload: normalized.rawPayload,
          occurredAt: this.dependencies.now?.() ?? new Date(),
        });

        const entry = await this.dependencies.repository.findEntryById(charge.entryId);
        const updatedEntry = normalized.status === 'paid'
          ? await this.dependencies.repository.updateEntry(charge.entryId, {
            status: 'paid',
            settlementDate: charge.paidAt,
            paymentMethod: charge.method === 'payment_link' ? 'link' : charge.method,
            settledAmountCents: normalized.amountPaidCents ?? entry.amountCents,
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
      details: { chargeExternalId: normalized.chargeExternalId, status: normalized.status, provider: normalized.provider },
      actor: input.actor,
      idempotencyKey: input.idempotencyKey ?? normalized.providerEventId,
    });

    return {
      ...result.data,
      auditEvent,
      idempotency: result.mode,
    };
  }
}
