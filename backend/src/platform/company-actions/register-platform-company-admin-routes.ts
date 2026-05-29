import type express from 'express';
import { PlatformAuditService } from '../../platform-audit/platform-audit.service';
import { ensurePlatformCompanyPermission, PlatformCompanyAccessError } from '../company-admin/company-admin.policy';
import { PlatformCompanyManagementService, PlatformCompanyDomainError } from '../company-management/company-management.service';
import { PlatformCompanyContractError, validateCompanyId, validateStatusActionInput } from '../company-management/company-management.validators';
import type { PlatformCompanyActor, PlatformCompanyAuditSink } from '../company-management/company-management.types';

type PrismaLike = any;

function resolveActor(input: any): PlatformCompanyActor {
  return {
    role: String(input?.role ?? ''),
    userId: typeof input?.sub === 'number' ? input.sub : typeof input?.id === 'number' ? input.id : null,
    email: typeof input?.email === 'string' ? input.email : null,
  };
}

function defaultAuditSink(prisma: PrismaLike): PlatformCompanyAuditSink {
  const service = new PlatformAuditService({
    async create(entry) {
      await prisma.billingEvent.create({
        data: {
          companyId: entry.companyId,
          eventType: 'platform.company.audit',
          eventStatus: 'success',
          summary: entry.action,
          metadataJson: {
            reason: entry.reason ?? null,
            previousStatus: entry.previousStatus ?? null,
            nextStatus: entry.nextStatus ?? null,
            actorUserId: entry.actorUserId ?? null,
            actorEmail: entry.actorEmail ?? null,
            metadata: entry.metadata ?? null,
          },
        },
      });
    },
    async listByCompany() {
      return [];
    },
  });
  return { record: (event) => service.record(event) };
}

export function registerPlatformCompanyAdminRoutes(input: {
  app: express.Express;
  prisma: PrismaLike;
  getUserFromReq: (req: express.Request) => any;
  auditSink?: PlatformCompanyAuditSink;
}) {
  const repository = {
    listCompanies: async () => input.prisma.company.findMany({ orderBy: { createdAt: 'desc' } }),
    findCompanyById: async (companyId: number) => input.prisma.company.findUnique({ where: { id: companyId } }),
    findSummaryByCompanyId: async (companyId: number) => {
      const subscription = await input.prisma.subscription.findFirst({
        where: { companyId },
        include: { plan: true },
        orderBy: { updatedAt: 'desc' },
      });
      const responsible = await input.prisma.companyMembership.findFirst({
        where: { companyId, active: true },
        include: { user: true },
        orderBy: { updatedAt: 'desc' },
      });
      return {
        subscriptionStatus: subscription?.status ?? null,
        planCode: subscription?.plan?.code ?? null,
        planName: subscription?.plan?.name ?? null,
        activationDate: subscription?.currentPeriodStart ?? null,
        responsibleUserId: responsible?.userId ?? null,
        responsibleEmail: responsible?.user?.email ?? null,
        responsibleRole: responsible?.role ?? null,
      };
    },
    updateCompanyStatus: async (companyId: number, status: string) =>
      input.prisma.company.update({ where: { id: companyId }, data: { status } }),
  };
  const service = new PlatformCompanyManagementService(repository, input.auditSink ?? defaultAuditSink(input.prisma));

  const handleError = (error: any, res: express.Response) => {
    if (
      error instanceof PlatformCompanyContractError ||
      error instanceof PlatformCompanyDomainError ||
      error instanceof PlatformCompanyAccessError
    ) {
      return res.status(error.statusCode).json({ error: error.code, message: error.message });
    }
    return res.status(500).json({ error: 'PLATFORM_COMPANY_INTERNAL_ERROR', message: error?.message ?? 'Falha interna.' });
  };

  const authorize = (req: express.Request, res: express.Response, action: any) => {
    const decoded = input.getUserFromReq(req);
    if (!decoded) {
      res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Token nao fornecido ou invalido' });
      return null;
    }
    const actor = resolveActor(decoded);
    ensurePlatformCompanyPermission(actor.role, action);
    return actor;
  };

  input.app.get('/platform/companies', async (req, res) => {
    try {
      authorize(req, res, 'list');
      if (res.headersSent) return;
      res.status(200).json(await service.list());
    } catch (error) {
      handleError(error, res);
    }
  });

  input.app.get('/platform/companies/:companyId', async (req, res) => {
    try {
      authorize(req, res, 'detail');
      if (res.headersSent) return;
      const companyId = validateCompanyId(req.params.companyId);
      res.status(200).json(await service.detail(companyId));
    } catch (error) {
      handleError(error, res);
    }
  });

  input.app.get('/platform/companies/:companyId/summary', async (req, res) => {
    try {
      authorize(req, res, 'summary');
      if (res.headersSent) return;
      const companyId = validateCompanyId(req.params.companyId);
      res.status(200).json(await service.summary(companyId));
    } catch (error) {
      handleError(error, res);
    }
  });

  input.app.post('/platform/companies/:companyId/activate', async (req, res) => {
    try {
      const actor = authorize(req, res, 'activate');
      if (!actor) return;
      const parsed = validateStatusActionInput({ companyId: req.params.companyId, action: 'activate', reason: req.body?.reason });
      res.status(200).json(await service.activate({ companyId: parsed.companyId, actor, reason: parsed.reason }));
    } catch (error) {
      handleError(error, res);
    }
  });

  input.app.post('/platform/companies/:companyId/block', async (req, res) => {
    try {
      const actor = authorize(req, res, 'block');
      if (!actor) return;
      const parsed = validateStatusActionInput({ companyId: req.params.companyId, action: 'block', reason: req.body?.reason });
      res.status(200).json(await service.block({ companyId: parsed.companyId, actor, reason: parsed.reason as string }));
    } catch (error) {
      handleError(error, res);
    }
  });

  input.app.post('/platform/companies/:companyId/cancel', async (req, res) => {
    try {
      const actor = authorize(req, res, 'cancel');
      if (!actor) return;
      const parsed = validateStatusActionInput({ companyId: req.params.companyId, action: 'cancel', reason: req.body?.reason });
      res.status(200).json(await service.cancel({ companyId: parsed.companyId, actor, reason: parsed.reason as string }));
    } catch (error) {
      handleError(error, res);
    }
  });

  input.app.post('/platform/companies/:companyId/reactivate', async (req, res) => {
    try {
      const actor = authorize(req, res, 'reactivate');
      if (!actor) return;
      const parsed = validateStatusActionInput({
        companyId: req.params.companyId,
        action: 'reactivate',
        reason: req.body?.reason,
      });
      res.status(200).json(await service.reactivate({ companyId: parsed.companyId, actor, reason: parsed.reason as string }));
    } catch (error) {
      handleError(error, res);
    }
  });
}

