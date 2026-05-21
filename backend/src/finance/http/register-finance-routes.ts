import type express from 'express';
import { buildFinanceAuditEventPayload } from '../../finance.contract';
import { hasFinancePermission } from '../../authz/finance/permissions';
import { InMemoryFinanceEntryRepository, PrismaFinanceEntryRepository } from '../accounts/finance-entry.repository';
import { FinanceBillingService, InMemoryFinanceBillingRepository, PrismaFinanceBillingRepository } from '../billing/billing.service';
import { InMemoryFinanceCategoryRepository, PrismaFinanceCategoryRepository } from '../categories/finance-category.repository';
import { FinanceCollectionsService, InMemoryFinanceCollectionsRepository, PrismaFinanceCollectionsRepository } from '../collections/finance-collections.service';
import { FinanceAgingReportService } from '../reports/aging-report.service';
import { FinanceCashflowReportService } from '../reports/cashflow-report.service';
import { FinanceEntryService } from '../ledger/finance-entry.service';
import { MockFinancePaymentProvider } from '../payment-links/mock-payment-provider';
import { FinanceReconciliationService, InMemoryFinanceReconciliationRepository, PrismaFinanceReconciliationRepository } from '../reconciliation/reconciliation.service';
import { FinanceAuditService, InMemoryFinanceAuditRepository, PrismaFinanceAuditRepository } from '../shared/audit';
import { FinanceWebhookService } from '../webhooks/finance-webhook.service';

const defaultFinanceCategories = [
  { code: 'honorarios', label: 'Honorários', type: 'receivable', sortOrder: 10 },
  { code: 'acordo', label: 'Acordo', type: 'receivable', sortOrder: 20 },
  { code: 'mensalidade', label: 'Mensalidade', type: 'receivable', sortOrder: 30 },
  { code: 'custas', label: 'Custas', type: 'payable', sortOrder: 40 },
  { code: 'fornecedor', label: 'Fornecedor', type: 'payable', sortOrder: 50 },
];

export function registerFinanceRoutes(input: {
  app: express.Express;
  prisma: any;
  getUserFromReq: (req: express.Request) => { sub: number; role: string; email: string } | null;
  devMockEnabled?: boolean;
}) {
  const auditService = new FinanceAuditService(new PrismaFinanceAuditRepository(input.prisma));
  const entryRepository = new PrismaFinanceEntryRepository(input.prisma);
  const categoryRepository = new PrismaFinanceCategoryRepository(input.prisma);
  const billingRepository = new PrismaFinanceBillingRepository(input.prisma);
  const collectionsRepository = new PrismaFinanceCollectionsRepository(input.prisma);
  const reconciliationRepository = new PrismaFinanceReconciliationRepository(input.prisma);
  const paymentProvider = new MockFinancePaymentProvider();
  const entryService = new FinanceEntryService({ repository: entryRepository, categories: categoryRepository, auditService });
  const billingService = new FinanceBillingService({ repository: billingRepository, paymentProvider, auditService });
  const webhookService = new FinanceWebhookService({ repository: billingRepository, paymentProvider, auditService });
  const collectionsService = new FinanceCollectionsService({ repository: collectionsRepository, auditService });
  const reconciliationService = new FinanceReconciliationService({ repository: reconciliationRepository as any, auditService });
  const cashflowService = new FinanceCashflowReportService();
  const agingService = new FinanceAgingReportService();
  const fallback = createFallbackFinanceRuntime();

  void seedFinanceCategories(input.prisma);

  const withFallback = async <T>(operation: () => Promise<T>, fallbackOperation: () => Promise<T>) => {
    try {
      return await operation();
    } catch (error) {
      if (input.devMockEnabled && isPrismaUnavailable(error)) {
        return fallbackOperation();
      }
      throw error;
    }
  };

  const requireFinance = (req: express.Request, res: express.Response, permission: Parameters<typeof hasFinancePermission>[1]) => {
    const decoded = input.getUserFromReq(req);
    if (!decoded) {
      res.status(401).send({ message: 'Token nao fornecido ou invalido' });
      return null;
    }
    if (!hasFinancePermission(decoded.role, permission)) {
      res.status(403).send({ message: 'Acesso negado' });
      return null;
    }
    return decoded;
  };

  input.app.get('/finance/categories', async (req, res) => {
    const decoded = requireFinance(req, res, 'finance:view');
    if (!decoded) return;
    const items = await withFallback(
      () => categoryRepository.listActiveByType(typeof req.query.type === 'string' ? req.query.type : undefined),
      () => fallback.categoryRepository.listActiveByType(typeof req.query.type === 'string' ? req.query.type : undefined),
    );
    res.json(items);
  });

  input.app.get('/finance/entries', async (req, res) => {
    const decoded = requireFinance(req, res, 'finance:view');
    if (!decoded) return;
    const entries = await withFallback(
      () => entryService.listEntries({
        type: typeof req.query.type === 'string' ? req.query.type as any : undefined,
        status: typeof req.query.status === 'string' ? req.query.status as any : undefined,
      }),
      () => fallback.entryService.listEntries({
        type: typeof req.query.type === 'string' ? req.query.type as any : undefined,
        status: typeof req.query.status === 'string' ? req.query.status as any : undefined,
      }),
    );
    res.json(entries);
  });

  input.app.post('/finance/entries', async (req, res) => {
    const decoded = requireFinance(req, res, 'finance:entry');
    if (!decoded) return;
    try {
      const command = {
        type: req.body.type,
        description: req.body.description,
        amountCents: Number(req.body.amountCents),
        currency: req.body.currency,
        dueDate: req.body.dueDate,
        clientId: req.body.clientId ?? null,
        processId: req.body.processId ?? null,
        categoryCode: req.body.categoryCode,
        responsibleUserId: req.body.responsibleUserId ?? null,
        notes: req.body.notes ?? null,
        idempotencyKey: req.body.idempotencyKey ?? null,
      };
      const actor = { source: 'user', userId: decoded.sub, email: decoded.email, role: decoded.role } as const;
      const result = await withFallback(
        () => entryService.createEntry(command, actor),
        async () => {
          const created = await fallback.entryService.createEntry(command, actor);
          fallback.syncEntry(created.entry);
          return created;
        },
      );
      res.status(201).json(result);
    } catch (error: any) {
      res.status(error?.statusCode ?? 500).send({ message: error?.message ?? 'Falha ao criar lançamento financeiro', code: error?.code });
    }
  });

  input.app.put('/finance/entries/:id/status', async (req, res) => {
    const decoded = requireFinance(req, res, 'finance:settlement');
    if (!decoded) return;
    try {
      const command = {
        entryId: Number(req.params.id),
        status: req.body.status,
        settlementDate: req.body.settlementDate ?? null,
        paymentMethod: req.body.paymentMethod ?? null,
        notes: req.body.notes ?? null,
        idempotencyKey: req.body.idempotencyKey ?? null,
      };
      const actor = { source: 'user', userId: decoded.sub, email: decoded.email, role: decoded.role } as const;
      const result = await withFallback(
        () => entryService.updateStatus(command, actor),
        async () => {
          const updated = await fallback.entryService.updateStatus(command, actor);
          fallback.syncEntry(updated.entry);
          return updated;
        },
      );
      res.json(result);
    } catch (error: any) {
      res.status(error?.statusCode ?? 500).send({ message: error?.message ?? 'Falha ao atualizar status financeiro', code: error?.code });
    }
  });

  input.app.post('/finance/entries/:id/settle', async (req, res) => {
    const decoded = requireFinance(req, res, 'finance:settlement');
    if (!decoded) return;
    try {
      const command = {
        entryId: Number(req.params.id),
        settlementDate: req.body.settlementDate,
        paymentMethod: req.body.paymentMethod,
        notes: req.body.notes ?? null,
        idempotencyKey: req.body.idempotencyKey ?? null,
      };
      const actor = { source: 'user', userId: decoded.sub, email: decoded.email, role: decoded.role } as const;
      const result = await withFallback(
        () => entryService.settleEntryManually(command, actor),
        async () => {
          const settled = await fallback.entryService.settleEntryManually(command, actor);
          fallback.syncEntry(settled.entry);
          return settled;
        },
      );
      res.json(result);
    } catch (error: any) {
      res.status(error?.statusCode ?? 500).send({ message: error?.message ?? 'Falha ao realizar baixa manual', code: error?.code });
    }
  });

  input.app.post('/finance/billing/generate', async (req, res) => {
    const decoded = requireFinance(req, res, 'finance:billing');
    if (!decoded) return;
    try {
      const command = {
        entryId: Number(req.body.entryId),
        method: req.body.method,
        expiresAt: req.body.expiresAt ?? null,
        recipientEmail: req.body.recipientEmail ?? null,
        recipientPhone: req.body.recipientPhone ?? null,
        idempotencyKey: req.body.idempotencyKey ?? null,
        actor: { source: 'user', userId: decoded.sub, email: decoded.email, role: decoded.role } as const,
      };
      const result = await withFallback(
        () => billingService.generate(command),
        () => fallback.billingService.generate(command),
      );
      res.status(201).json(result);
    } catch (error: any) {
      res.status(error?.statusCode ?? 500).send({ message: error?.message ?? 'Falha ao gerar cobrança', code: error?.code });
    }
  });

  input.app.post('/finance/webhooks/mock', async (req, res) => {
    try {
      const command = {
        provider: req.body.provider ?? 'mock',
        providerEventId: req.body.providerEventId,
        chargeExternalId: req.body.chargeExternalId,
        status: req.body.status,
        paidAt: req.body.paidAt ?? null,
        amountPaidCents: req.body.amountPaidCents ?? null,
        idempotencyKey: req.body.idempotencyKey ?? null,
        actor: { source: 'api', email: 'webhook@lexora.local', role: 'system' } as const,
      };
      const result = await withFallback(
        () => webhookService.handle(command),
        () => fallback.webhookService.handle(command as any),
      );
      res.json(result);
    } catch (error: any) {
      res.status(error?.statusCode ?? 500).send({ message: error?.message ?? 'Falha ao processar webhook financeiro', code: error?.code });
    }
  });

  input.app.post('/finance/reconciliation/run', async (req, res) => {
    const decoded = requireFinance(req, res, 'finance:reconciliation');
    if (!decoded) return;
    try {
      const command = {
        referenceDate: req.body.referenceDate,
        lines: Array.isArray(req.body.lines) ? req.body.lines : [],
        actor: { source: 'user', userId: decoded.sub, email: decoded.email, role: decoded.role } as const,
        createdBy: decoded.email,
        idempotencyKey: req.body.idempotencyKey ?? null,
      };
      const result = await withFallback(
        () => reconciliationService.run(command),
        () => fallback.reconciliationService.run(command as any),
      );
      res.status(201).json(result);
    } catch (error: any) {
      res.status(error?.statusCode ?? 500).send({ message: error?.message ?? 'Falha ao executar conciliação', code: error?.code });
    }
  });

  input.app.post('/finance/collections/schedule', async (req, res) => {
    const decoded = requireFinance(req, res, 'finance:billing');
    if (!decoded) return;
    try {
      const command = {
        entryId: Number(req.body.entryId),
        channel: req.body.channel,
        cadenceDays: Number(req.body.cadenceDays),
        maxAttempts: Number(req.body.maxAttempts),
        startsAt: req.body.startsAt,
        actor: { source: 'user', userId: decoded.sub, email: decoded.email, role: decoded.role },
        idempotencyKey: req.body.idempotencyKey ?? null,
      };
      const result = await withFallback(
        () => collectionsService.schedule(command as any),
        () => fallback.collectionsService.schedule(command as any),
      );
      res.status(201).json(result);
    } catch (error: any) {
      res.status(error?.statusCode ?? 500).send({ message: error?.message ?? 'Falha ao agendar régua de cobrança', code: error?.code });
    }
  });

  input.app.get('/finance/reports/cashflow', async (req, res) => {
    const decoded = requireFinance(req, res, 'finance:export');
    if (!decoded) return;
    const from = String(req.query.from);
    const to = String(req.query.to);
    const groupBy = (typeof req.query.groupBy === 'string' ? req.query.groupBy : 'month') as any;
    const report = await withFallback(
      async () => {
        const entries = await input.prisma.financeEntry.findMany({
          where: {
            dueDate: {
              gte: new Date(`${from}T00:00:00.000Z`),
              lte: new Date(`${to}T23:59:59.999Z`),
            },
          },
          orderBy: { dueDate: 'asc' },
        });
        return cashflowService.build({
          from,
          to,
          groupBy,
          entries: entries.map((entry: any) => ({
            ...entry,
            dueDate: entry.dueDate.toISOString().slice(0, 10),
            settlementDate: entry.settlementDate ? entry.settlementDate.toISOString().slice(0, 10) : null,
          })),
        });
      },
      async () => {
        const entries = await fallback.entryService.listEntries();
        return cashflowService.build({ from, to, groupBy, entries });
      },
    );
    res.json(report);
  });

  input.app.get('/finance/reports/aging', async (req, res) => {
    const decoded = requireFinance(req, res, 'finance:view');
    if (!decoded) return;
    const referenceDate = typeof req.query.referenceDate === 'string' ? req.query.referenceDate : new Date().toISOString().slice(0, 10);
    const report = await withFallback(
      async () => {
        const entries = await input.prisma.financeEntry.findMany({ orderBy: { dueDate: 'asc' } });
        return agingService.build({
          referenceDate,
          bucketMode: 'default_4',
          entries: entries.map((entry: any) => ({
            ...entry,
            dueDate: entry.dueDate.toISOString().slice(0, 10),
          })),
        });
      },
      async () => {
        const entries = await fallback.entryService.listEntries();
        return agingService.build({ referenceDate, bucketMode: 'default_4', entries });
      },
    );
    res.json(report);
  });

  input.app.get('/finance/audit', async (req, res) => {
    const decoded = requireFinance(req, res, 'finance:view');
    if (!decoded) return;
    const query = {
      entityType: typeof req.query.entityType === 'string' ? req.query.entityType as any : undefined,
      entityId: typeof req.query.entityId === 'string' ? req.query.entityId : undefined,
      limit: typeof req.query.limit === 'string' ? Number(req.query.limit) : 50,
    };
    const events = await withFallback(
      () => auditService.list(query),
      () => fallback.auditService.list(query),
    );
    res.json(events.map((event) => buildFinanceAuditEventPayload({
      ...event,
      occurredAt: new Date(event.occurredAt),
      createdAt: new Date(event.createdAt),
    })));
  });
}

async function seedFinanceCategories(prisma: any) {
  if (!prisma?.financeCategory?.upsert) {
    return;
  }
  try {
    for (const category of defaultFinanceCategories) {
      await prisma.financeCategory.upsert({
        where: { code: category.code },
        update: {
          label: category.label,
          type: category.type,
          active: true,
          sortOrder: category.sortOrder,
        },
        create: {
          ...category,
          active: true,
        },
      });
    }
  } catch (error) {
    if (isPrismaUnavailable(error) || isPrismaTableMissing(error)) {
      return;
    }
    throw error;
  }
}

function createFallbackFinanceRuntime() {
  const auditService = new FinanceAuditService(new InMemoryFinanceAuditRepository());
  const categoryRepository = new InMemoryFinanceCategoryRepository(defaultFinanceCategories.map((category) => ({ ...category, active: true })));
  const entryRepository = new InMemoryFinanceEntryRepository({
    clients: [{ id: 1 }, { id: 2 }, { id: 7 }, { id: 11 }, { id: 18 }],
    processes: [{ id: 1 }, { id: 7 }, { id: 14 }, { id: 19 }],
    users: [{ id: 1 }, { id: 3 }, { id: 4 }, { id: 5 }, { id: 7 }, { id: 9 }],
  });
  const billingRepository = new InMemoryFinanceBillingRepository();
  const reconciliationRepository = new InMemoryFinanceReconciliationRepository();
  const collectionsRepository = new InMemoryFinanceCollectionsRepository();
  const paymentProvider = new MockFinancePaymentProvider();
  const entryService = new FinanceEntryService({ repository: entryRepository, categories: categoryRepository, auditService });
  const billingService = new FinanceBillingService({ repository: billingRepository, paymentProvider, auditService });
  const webhookService = new FinanceWebhookService({ repository: billingRepository, paymentProvider, auditService });
  const reconciliationService = new FinanceReconciliationService({ repository: reconciliationRepository, auditService });
  const collectionsService = new FinanceCollectionsService({ repository: collectionsRepository, auditService });

  const seedEntries = [
    {
      id: 41,
      type: 'receivable',
      status: 'open',
      description: 'Parcela de honorarios - cliente Atlas',
      amountCents: 125000,
      settledAmountCents: 0,
      dueDate: new Date('2026-05-28T00:00:00.000Z'),
      settlementDate: null,
      paymentMethod: null,
      currency: 'BRL',
      clientId: 1,
      processId: 1,
      categoryCode: 'honorarios',
      category: { code: 'honorarios', label: 'Honorários' },
      responsibleUserId: 3,
      notes: 'Fallback dev',
      createdAt: new Date('2026-05-21T09:00:00.000Z'),
      updatedAt: new Date('2026-05-21T09:00:00.000Z'),
      charges: [],
    },
    {
      id: 42,
      type: 'receivable',
      status: 'overdue',
      description: 'Acordo em aberto - cliente Boreal',
      amountCents: 98000,
      settledAmountCents: 0,
      dueDate: new Date('2026-05-10T00:00:00.000Z'),
      settlementDate: null,
      paymentMethod: null,
      currency: 'BRL',
      clientId: 2,
      processId: 7,
      categoryCode: 'acordo',
      category: { code: 'acordo', label: 'Acordo' },
      responsibleUserId: 5,
      notes: 'Fallback dev',
      createdAt: new Date('2026-05-21T09:00:00.000Z'),
      updatedAt: new Date('2026-05-21T09:00:00.000Z'),
      charges: [],
    },
    {
      id: 43,
      type: 'payable',
      status: 'open',
      description: 'Custas recursais',
      amountCents: 35000,
      settledAmountCents: 0,
      dueDate: new Date('2026-05-30T00:00:00.000Z'),
      settlementDate: null,
      paymentMethod: null,
      currency: 'BRL',
      clientId: null,
      processId: 14,
      categoryCode: 'custas',
      category: { code: 'custas', label: 'Custas' },
      responsibleUserId: 3,
      notes: 'Fallback dev',
      createdAt: new Date('2026-05-21T09:00:00.000Z'),
      updatedAt: new Date('2026-05-21T09:00:00.000Z'),
      charges: [],
    },
  ];

  for (const entry of seedEntries) {
    entryRepository.upsertEntry(entry);
    billingRepository.upsertEntry(entry);
    reconciliationRepository.upsertEntry({
      id: entry.id,
      type: entry.type,
      status: entry.status,
      amountCents: entry.amountCents,
      settledAmountCents: entry.settledAmountCents,
      dueDate: entry.dueDate.toISOString().slice(0, 10),
      description: entry.description,
      referenceNumber: `INV-${entry.id}`,
      externalRef: null,
    });
    collectionsRepository.upsertEntry({
      id: entry.id,
      type: entry.type,
      status: entry.status,
      description: entry.description,
      amountCents: entry.amountCents,
      dueDate: entry.dueDate.toISOString().slice(0, 10),
      entry,
    });
  }

  return {
    auditService,
    categoryRepository,
    entryService,
    billingService,
    webhookService,
    reconciliationService,
    collectionsService,
    syncEntry(entry: any) {
      const row = {
        id: entry.id,
        type: entry.type,
        status: entry.status,
        description: entry.description,
        amountCents: entry.amountCents,
        settledAmountCents: entry.settledAmountCents,
        dueDate: new Date(`${entry.dueDate}T00:00:00.000Z`),
        settlementDate: entry.settlementDate ? new Date(`${entry.settlementDate}T00:00:00.000Z`) : null,
        paymentMethod: entry.paymentMethod,
        currency: entry.currency,
        clientId: entry.clientId,
        processId: entry.processId,
        categoryCode: entry.categoryCode,
        category: { code: entry.categoryCode, label: entry.categoryLabel },
        responsibleUserId: entry.responsibleUserId,
        notes: entry.notes,
        createdAt: new Date(entry.createdAt),
        updatedAt: new Date(entry.updatedAt),
        charges: [],
      };
      billingRepository.upsertEntry(row);
      reconciliationRepository.upsertEntry({
        id: entry.id,
        type: entry.type,
        status: entry.status,
        amountCents: entry.amountCents,
        settledAmountCents: entry.settledAmountCents,
        dueDate: entry.dueDate,
        description: entry.description,
        referenceNumber: `INV-${entry.id}`,
        externalRef: null,
      });
      collectionsRepository.upsertEntry({
        id: entry.id,
        type: entry.type,
        status: entry.status,
        description: entry.description,
        amountCents: entry.amountCents,
        dueDate: entry.dueDate,
      });
    },
  };
}

function isPrismaUnavailable(error: unknown) {
  if (!(error instanceof Error)) return false;
  return error.name.includes('PrismaClientInitializationError')
    || error.name === 'TypeError'
    || error.message.includes('P2021')
    || error.message.includes("Can't reach database server")
    || error.message.includes('ECONNREFUSED')
    || error.message.includes('Authentication failed')
    || error.message.includes('does not exist in the current database')
    || error.message.includes("reading 'findMany'")
    || error.message.includes("reading 'findUnique'")
    || error.message.includes("reading 'upsert'")
    || error.message.includes("reading 'create'")
    || error.message.includes("reading 'update'");
}

function isPrismaTableMissing(error: unknown) {
  if (!(error instanceof Error)) return false;
  return error.message.includes('does not exist in the current database')
    || error.message.includes('The table `public.FinanceCategory` does not exist');
}
