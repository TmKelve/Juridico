import type express from 'express';
import { PlatformBillingEventService } from '../platform-billing-events/billing-event.service';
import { BillingInvoiceService } from '../platform-invoices/billing-invoice.service';
import { MockPlatformPaymentProviderAdapter } from '../platform-payments/provider-adapter';
import { PaymentAttemptService } from '../platform-payments/payment-attempt.service';

export function registerPlatformBillingRoutes(input: {
  app: express.Express;
  prisma: any;
  getUserFromReq: (req: express.Request) => { sub: number; role: string; email: string } | null;
}) {
  const eventService = new PlatformBillingEventService(input.prisma);
  const invoiceService = new BillingInvoiceService(input.prisma, eventService);
  const paymentProviderAdapter = new MockPlatformPaymentProviderAdapter();
  const paymentAttemptService = new PaymentAttemptService(input.prisma, invoiceService, eventService, paymentProviderAdapter);

  const requireUser = (req: express.Request, res: express.Response) => {
    const decoded = input.getUserFromReq(req);
    if (!decoded) {
      res.status(401).send({ message: 'Token nao fornecido ou invalido' });
      return null;
    }
    return decoded;
  };

  input.app.post('/platform/invoices', async (req, res) => {
    const decoded = requireUser(req, res);
    if (!decoded) return;
    try {
      const invoice = await invoiceService.create({
        companyId: Number(req.body.companyId),
        planCode: String(req.body.planCode),
        billingCycle: req.body.billingCycle === 'yearly' ? 'yearly' : 'monthly',
        amountCents: Number(req.body.amountCents),
        currency: typeof req.body.currency === 'string' ? req.body.currency : 'BRL',
        dueDate: String(req.body.dueDate),
        externalRef: req.body.externalRef ?? null,
      });
      res.status(201).json(invoice);
    } catch (error: any) {
      res.status(error?.statusCode ?? 500).json({ message: error?.message ?? 'Falha ao criar fatura SaaS' });
    }
  });

  input.app.get('/platform/invoices/:id', async (req, res) => {
    const decoded = requireUser(req, res);
    if (!decoded) return;
    const invoice = await invoiceService.getById(Number(req.params.id));
    if (!invoice) return res.status(404).json({ message: 'Fatura SaaS não encontrada' });
    res.json(invoice);
  });

  input.app.post('/platform/invoices/:id/attempts', async (req, res) => {
    const decoded = requireUser(req, res);
    if (!decoded) return;
    try {
      const attempt = await paymentAttemptService.createAttempt({
        invoiceId: Number(req.params.id),
        customerEmail: req.body.customerEmail ?? null,
      });
      res.status(201).json(attempt);
    } catch (error: any) {
      res.status(error?.statusCode ?? 500).json({ message: error?.message ?? 'Falha ao criar tentativa de pagamento' });
    }
  });

  input.app.post('/platform/payments/webhook', async (req, res) => {
    try {
      const updated = await paymentAttemptService.handleWebhook(req.body ?? {}, req.headers as Record<string, unknown>);
      res.json(updated);
    } catch (error: any) {
      res.status(error?.statusCode ?? 500).json({ message: error?.message ?? 'Falha ao processar webhook de pagamento SaaS' });
    }
  });

  input.app.post('/platform/subscriptions/:companyId/failure', async (req, res) => {
    const decoded = requireUser(req, res);
    if (!decoded) return;
    const companyId = Number(req.params.companyId);
    const event = await eventService.record({
      companyId,
      type: 'payment.failed',
      status: 'error',
      summary: req.body.summary ?? `Falha de renovação para empresa #${companyId}`,
      metadata: req.body.metadata ?? {},
    });
    await input.prisma.company.update({ where: { id: companyId }, data: { status: 'suspended' } });
    res.status(201).json(event);
  });

  input.app.post('/platform/subscriptions/:companyId/renew', async (req, res) => {
    const decoded = requireUser(req, res);
    if (!decoded) return;
    const companyId = Number(req.params.companyId);
    const event = await eventService.record({
      companyId,
      type: 'subscription.renewed',
      status: 'success',
      summary: req.body.summary ?? `Renovação confirmada para empresa #${companyId}`,
      metadata: req.body.metadata ?? {},
    });
    await input.prisma.company.update({ where: { id: companyId }, data: { status: 'active' } });
    res.status(201).json(event);
  });

  input.app.post('/platform/subscriptions/:companyId/reactivate', async (req, res) => {
    const decoded = requireUser(req, res);
    if (!decoded) return;
    const companyId = Number(req.params.companyId);
    const event = await eventService.record({
      companyId,
      type: 'subscription.reactivated',
      status: 'success',
      summary: req.body.summary ?? `Reativação concluída para empresa #${companyId}`,
      metadata: req.body.metadata ?? {},
    });
    await input.prisma.company.update({ where: { id: companyId }, data: { status: 'active' } });
    res.status(201).json(event);
  });

  input.app.get('/platform/billing-events', async (req, res) => {
    const decoded = requireUser(req, res);
    if (!decoded) return;
    const companyId = typeof req.query.companyId === 'string' ? Number(req.query.companyId) : undefined;
    const events = await eventService.list(companyId);
    res.json(events);
  });
}
