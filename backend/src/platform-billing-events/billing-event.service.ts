export type PlatformBillingEventType =
  | 'invoice.created'
  | 'payment.attempted'
  | 'payment.failed'
  | 'subscription.renewed'
  | 'subscription.reactivated';

export type CreateBillingEventInput = {
  companyId: number;
  invoiceId?: number | null;
  paymentAttemptId?: number | null;
  type: PlatformBillingEventType;
  status: string;
  summary: string;
  metadata?: Record<string, unknown>;
};

type BillingEventRow = {
  id: number;
  companyId: number;
  invoiceId: number | null;
  paymentAttemptId: number | null;
  eventType: string;
  eventStatus: string;
  summary: string;
  metadataJson: unknown;
  occurredAt: Date;
  createdAt: Date;
};

export class PlatformBillingEventService {
  constructor(private readonly prisma: any) {}

  async record(input: CreateBillingEventInput): Promise<BillingEventRow> {
    return this.prisma.billingEvent.create({
      data: {
        companyId: input.companyId,
        invoiceId: input.invoiceId ?? null,
        paymentAttemptId: input.paymentAttemptId ?? null,
        eventType: input.type,
        eventStatus: input.status,
        summary: input.summary,
        metadataJson: input.metadata ?? {},
        occurredAt: new Date(),
      },
    });
  }

  async list(companyId?: number) {
    return this.prisma.billingEvent.findMany({
      where: companyId ? { companyId } : undefined,
      orderBy: { occurredAt: 'desc' },
      take: 200,
    });
  }
}
