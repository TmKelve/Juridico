import { PlatformBillingEventService } from '../platform-billing-events/billing-event.service';
import { BillingInvoiceService } from '../platform-invoices/billing-invoice.service';
import type { PlatformPaymentProviderAdapter, PaymentAttemptStatus } from './provider-adapter';

type CreateAttemptCommand = {
  invoiceId: number;
  customerEmail?: string | null;
};

export class PaymentAttemptService {
  constructor(
    private readonly prisma: any,
    private readonly invoiceService: BillingInvoiceService,
    private readonly eventService: PlatformBillingEventService,
    private readonly adapter: PlatformPaymentProviderAdapter,
  ) {}

  async createAttempt(command: CreateAttemptCommand) {
    const invoice = await this.invoiceService.getById(command.invoiceId);
    if (!invoice) {
      const error: any = new Error('Fatura SaaS não encontrada');
      error.statusCode = 404;
      throw error;
    }

    const lastAttempt = await this.prisma.paymentAttempt.findFirst({
      where: { invoiceId: invoice.id },
      orderBy: { attemptNumber: 'desc' },
    });

    const attemptNumber = (lastAttempt?.attemptNumber ?? 0) + 1;
    const providerCharge = await this.adapter.createCharge({
      invoiceId: invoice.id,
      companyId: invoice.companyId,
      externalInvoiceRef: invoice.externalRef ?? `inv-${invoice.id}`,
      amountCents: invoice.amountCents,
      currency: invoice.currency,
      customerEmail: command.customerEmail ?? null,
    });

    const attempt = await this.prisma.paymentAttempt.create({
      data: {
        invoiceId: invoice.id,
        companyId: invoice.companyId,
        attemptNumber,
        provider: providerCharge.provider,
        providerInvoiceId: providerCharge.providerInvoiceId,
        status: 'pending',
        checkoutUrl: providerCharge.checkoutUrl ?? null,
        pixCode: providerCharge.pixCode ?? null,
        boletoUrl: providerCharge.boletoUrl ?? null,
        providerPayload: providerCharge.providerPayload ?? {},
      },
    });

    await this.eventService.record({
      companyId: invoice.companyId,
      invoiceId: invoice.id,
      paymentAttemptId: attempt.id,
      type: 'payment.attempted',
      status: 'success',
      summary: `Tentativa de pagamento #${attempt.id} criada`,
      metadata: { provider: attempt.provider, providerInvoiceId: attempt.providerInvoiceId },
    });

    return attempt;
  }

  async handleWebhook(payload: unknown, headers: Record<string, unknown>) {
    const normalized = await this.adapter.normalizeWebhook(payload, headers);
    const attempt = await this.prisma.paymentAttempt.findFirst({
      where: { providerInvoiceId: normalized.providerInvoiceId },
      orderBy: { attemptNumber: 'desc' },
    });
    if (!attempt) {
      const error: any = new Error('Tentativa de pagamento não encontrada para o providerInvoiceId');
      error.statusCode = 404;
      throw error;
    }

    const status = normalized.status as PaymentAttemptStatus;
    const updated = await this.prisma.paymentAttempt.update({
      where: { id: attempt.id },
      data: {
        status,
        providerEventId: normalized.providerEventId,
        errorCode: normalized.errorCode ?? null,
        errorMessage: normalized.errorMessage ?? null,
        paidAt: normalized.paidAt ? new Date(normalized.paidAt) : null,
        providerPayload: normalized.providerPayload ?? {},
      },
    });

    if (status === 'paid') {
      await this.invoiceService.markAsPaid(attempt.invoiceId, updated.paidAt ?? new Date());
      await this.eventService.record({
        companyId: attempt.companyId,
        invoiceId: attempt.invoiceId,
        paymentAttemptId: attempt.id,
        type: 'subscription.renewed',
        status: 'success',
        summary: `Renovação confirmada para fatura #${attempt.invoiceId}`,
        metadata: { providerEventId: normalized.providerEventId },
      });
    } else if (status === 'failed') {
      await this.invoiceService.markAsFailed(attempt.invoiceId);
      await this.eventService.record({
        companyId: attempt.companyId,
        invoiceId: attempt.invoiceId,
        paymentAttemptId: attempt.id,
        type: 'payment.failed',
        status: 'error',
        summary: `Falha de cobrança para fatura #${attempt.invoiceId}`,
        metadata: { providerEventId: normalized.providerEventId, errorCode: normalized.errorCode ?? null },
      });
    }

    return updated;
  }
}
