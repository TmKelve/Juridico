import type { BillingCycle } from '../platform-payments/provider-adapter';
import { PlatformBillingEventService } from '../platform-billing-events/billing-event.service';

export type CreateBillingInvoiceCommand = {
  companyId: number;
  planCode: string;
  billingCycle: BillingCycle;
  amountCents: number;
  currency?: string;
  dueDate: string;
  externalRef?: string | null;
};

export class BillingInvoiceService {
  constructor(
    private readonly prisma: any,
    private readonly eventService: PlatformBillingEventService,
  ) {}

  async create(command: CreateBillingInvoiceCommand) {
    const company = await this.prisma.company.findUnique({ where: { id: command.companyId } });
    if (!company) {
      const error: any = new Error('Empresa não encontrada para cobrança SaaS');
      error.statusCode = 404;
      throw error;
    }

    const invoice = await this.prisma.billingInvoice.create({
      data: {
        companyId: command.companyId,
        planCode: command.planCode,
        billingCycle: command.billingCycle,
        amountCents: command.amountCents,
        currency: command.currency ?? 'BRL',
        status: 'open',
        dueDate: new Date(`${command.dueDate}T00:00:00.000Z`),
        externalRef: command.externalRef ?? null,
      },
    });

    await this.eventService.record({
      companyId: command.companyId,
      invoiceId: invoice.id,
      type: 'invoice.created',
      status: 'success',
      summary: `Fatura SaaS #${invoice.id} criada`,
      metadata: { planCode: command.planCode, billingCycle: command.billingCycle },
    });

    return invoice;
  }

  async getById(invoiceId: number) {
    return this.prisma.billingInvoice.findUnique({
      where: { id: invoiceId },
      include: { attempts: { orderBy: { attemptNumber: 'desc' } } },
    });
  }

  async markAsPaid(invoiceId: number, paidAt: Date) {
    return this.prisma.billingInvoice.update({
      where: { id: invoiceId },
      data: { status: 'paid', paidAt },
    });
  }

  async markAsFailed(invoiceId: number) {
    return this.prisma.billingInvoice.update({
      where: { id: invoiceId },
      data: { status: 'past_due' },
    });
  }
}
