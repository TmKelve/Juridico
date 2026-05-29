import type express from 'express';
import { PlanDomainService } from '../plans/plan.service';
import { validateCreatePlanInput, validateUpdatePlanInput } from '../plans/plan.validators';
import { SubscriptionDomainService } from '../subscription/subscription.service';
import { validateCreateSubscriptionInput, validateTransitionSubscriptionInput } from '../subscription/subscription.validators';
import { PlatformAuditService } from '../platform-audit/platform-audit.service';
import { CompanyStatusAuditService } from '../company-status-audit/company-status-audit.service';
import { deriveCompanyStatusFromSubscriptionStatus } from '../company-status/company-status.sync';

type PrismaLike = any;
type GetUserFromReq = (req: express.Request) => any;

function toIso(value: Date | string | null | undefined) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : value;
}

export function registerPlatformActionsRoutes(params: {
  app: express.Express;
  prisma: PrismaLike;
  getUserFromReq: GetUserFromReq;
}) {
  const { app, prisma, getUserFromReq } = params;

  const planService = new PlanDomainService({
    async findByCode(code) {
      const row = await prisma.plan.findUnique({ where: { code } });
      return row ? { ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() } : null;
    },
    async findById(planId) {
      const row = await prisma.plan.findUnique({ where: { id: planId } });
      return row ? { ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() } : null;
    },
    async create(input) {
      const row = await prisma.plan.create({ data: input });
      return { ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
    },
    async update(input) {
      const { planId, ...rest } = input;
      const row = await prisma.plan.update({ where: { id: planId }, data: rest });
      return { ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
    },
  });

  const subscriptionService = new SubscriptionDomainService({
    async findSubscriptionById(subscriptionId) {
      const row = await prisma.subscription.findUnique({ where: { id: subscriptionId } });
      return row
        ? { ...row, currentPeriodStart: toIso(row.currentPeriodStart), currentPeriodEnd: toIso(row.currentPeriodEnd), cancelledAt: toIso(row.cancelledAt), createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() }
        : null;
    },
    async createSubscription(input) {
      const row = await prisma.subscription.create({ data: input });
      return { ...row, currentPeriodStart: toIso(row.currentPeriodStart), currentPeriodEnd: toIso(row.currentPeriodEnd), cancelledAt: toIso(row.cancelledAt), createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
    },
    async findTransitionByIdempotencyKey(subscriptionId, idempotencyKey) {
      const row = await prisma.subscriptionTransition.findUnique({
        where: { subscription_transition_idempotency: { subscriptionId, idempotencyKey } },
      });
      return row ? { ...row, reason: row.reason ?? undefined, actor: row.actor ?? undefined, idempotencyKey: row.idempotencyKey ?? undefined, metadata: row.metadata ?? undefined, createdAt: row.createdAt.toISOString() } : null;
    },
    async createTransition(input) {
      const row = await prisma.subscriptionTransition.create({ data: input });
      return { ...row, reason: row.reason ?? undefined, actor: row.actor ?? undefined, idempotencyKey: row.idempotencyKey ?? undefined, metadata: row.metadata ?? undefined, createdAt: row.createdAt.toISOString() };
    },
    async updateSubscriptionStatus(input) {
      const row = await prisma.subscription.update({
        where: { id: input.subscriptionId },
        data: { status: input.status, cancelledAt: input.cancelledAt ? new Date(input.cancelledAt) : null },
      });
      return { ...row, currentPeriodStart: toIso(row.currentPeriodStart), currentPeriodEnd: toIso(row.currentPeriodEnd), cancelledAt: toIso(row.cancelledAt), createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
    },
    async updateCompanyStatus(companyId, status) {
      await prisma.company.update({ where: { id: companyId }, data: { status } });
    },
  });

  const platformAudit = new PlatformAuditService({
    async create(entry) {
      await prisma.billingEvent.create({
        data: {
          companyId: entry.companyId,
          eventType: 'company.status.changed',
          eventCode: entry.action,
          payload: {
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
    async listByCompany(companyId) {
      return prisma.billingEvent.findMany({
        where: { companyId, eventType: 'company.status.changed' },
        orderBy: { createdAt: 'desc' },
      });
    },
  });
  const companyStatusAudit = new CompanyStatusAuditService(platformAudit);

  app.post('/platform/plans', async (req, res) => {
    try {
      const created = await planService.createPlan(validateCreatePlanInput(req.body ?? {}));
      res.status(201).json(created);
    } catch (error: any) {
      res.status(error?.statusCode ?? 400).json({ error: error?.code ?? 'PLAN_CREATE_FAILED', message: error?.message ?? 'Falha ao criar plano' });
    }
  });

  app.patch('/platform/plans/:id', async (req, res) => {
    try {
      const updated = await planService.updatePlan(validateUpdatePlanInput({ ...(req.body ?? {}), planId: Number(req.params.id) }));
      res.status(200).json(updated);
    } catch (error: any) {
      res.status(error?.statusCode ?? 400).json({ error: error?.code ?? 'PLAN_UPDATE_FAILED', message: error?.message ?? 'Falha ao atualizar plano' });
    }
  });

  app.post('/platform/subscriptions', async (req, res) => {
    try {
      const created = await subscriptionService.createSubscription(validateCreateSubscriptionInput(req.body ?? {}));
      res.status(201).json(created);
    } catch (error: any) {
      res.status(error?.statusCode ?? 400).json({ error: error?.code ?? 'SUBSCRIPTION_CREATE_FAILED', message: error?.message ?? 'Falha ao criar assinatura' });
    }
  });

  app.post('/platform/subscriptions/:id/activate', async (req, res) => {
    try {
      const result = await subscriptionService.transitionSubscription(
        validateTransitionSubscriptionInput({ ...(req.body ?? {}), subscriptionId: Number(req.params.id), toStatus: 'active' }),
      );
      res.status(200).json(result);
    } catch (error: any) {
      res.status(error?.statusCode ?? 400).json({ error: error?.code ?? 'SUBSCRIPTION_ACTIVATE_FAILED', message: error?.message ?? 'Falha ao ativar assinatura' });
    }
  });

  app.post('/platform/subscriptions/:id/transition', async (req, res) => {
    try {
      const actor = await getUserFromReq(req);
      const result = await subscriptionService.transitionSubscription(
        validateTransitionSubscriptionInput({ ...(req.body ?? {}), subscriptionId: Number(req.params.id) }),
      );
      await companyStatusAudit.recordTransition({
        companyId: result.subscription.companyId,
        actorUserId: actor?.id ?? actor?.sub ?? null,
        actorEmail: actor?.email ?? null,
        action: 'subscription.transitionStatus',
        fromStatus: result.transition.fromStatus,
        toStatus: result.companyStatus,
        reason: result.transition.reason ?? 'subscription transition',
        metadata: { subscriptionStatus: result.subscription.status, idempotentReplay: result.idempotentReplay },
      });
      res.status(200).json(result);
    } catch (error: any) {
      res.status(error?.statusCode ?? 400).json({ error: error?.code ?? 'SUBSCRIPTION_TRANSITION_FAILED', message: error?.message ?? 'Falha ao transicionar assinatura' });
    }
  });

  app.post('/platform/company/:companyId/read-only', async (req, res) => {
    try {
      const actor = await getUserFromReq(req);
      const companyId = Number(req.params.companyId);
      const reason = String(req.body?.reason ?? '').trim();
      if (!reason) return res.status(422).json({ error: 'REASON_REQUIRED', message: 'Motivo é obrigatório.' });
      const company = await prisma.company.update({ where: { id: companyId }, data: { status: 'read_only' } });
      await companyStatusAudit.recordTransition({ companyId, actorUserId: actor?.id ?? actor?.sub ?? null, actorEmail: actor?.email ?? null, action: 'company.setReadOnly', toStatus: 'read_only', reason });
      res.status(200).json({ companyId, status: company.status });
    } catch (error: any) {
      res.status(400).json({ error: 'COMPANY_SET_READ_ONLY_FAILED', message: error?.message ?? 'Falha ao colocar em read_only' });
    }
  });

  app.post('/platform/company/:companyId/suspend', async (req, res) => {
    try {
      const actor = await getUserFromReq(req);
      const companyId = Number(req.params.companyId);
      const reason = String(req.body?.reason ?? '').trim();
      if (!reason) return res.status(422).json({ error: 'REASON_REQUIRED', message: 'Motivo é obrigatório.' });
      const company = await prisma.company.update({ where: { id: companyId }, data: { status: 'suspended' } });
      await companyStatusAudit.recordTransition({ companyId, actorUserId: actor?.id ?? actor?.sub ?? null, actorEmail: actor?.email ?? null, action: 'company.suspend', toStatus: 'suspended', reason });
      res.status(200).json({ companyId, status: company.status });
    } catch (error: any) {
      res.status(400).json({ error: 'COMPANY_SUSPEND_FAILED', message: error?.message ?? 'Falha ao suspender company' });
    }
  });

  app.post('/platform/company/:companyId/reactivate', async (req, res) => {
    try {
      const actor = await getUserFromReq(req);
      const companyId = Number(req.params.companyId);
      const reason = String(req.body?.reason ?? '').trim();
      if (!reason) return res.status(422).json({ error: 'REASON_REQUIRED', message: 'Motivo é obrigatório.' });
      const activeSubscription = await prisma.subscription.findFirst({
        where: { companyId, status: { in: ['active', 'grace_period', 'past_due'] } },
        orderBy: { updatedAt: 'desc' },
      });
      const nextStatus = activeSubscription ? deriveCompanyStatusFromSubscriptionStatus(activeSubscription.status) : 'active';
      const company = await prisma.company.update({ where: { id: companyId }, data: { status: nextStatus } });
      await companyStatusAudit.recordTransition({ companyId, actorUserId: actor?.id ?? actor?.sub ?? null, actorEmail: actor?.email ?? null, action: 'company.reactivate', toStatus: company.status, reason });
      res.status(200).json({ companyId, status: company.status });
    } catch (error: any) {
      res.status(400).json({ error: 'COMPANY_REACTIVATE_FAILED', message: error?.message ?? 'Falha ao reativar company' });
    }
  });

  app.get('/platform/company/:companyId/status-history', async (req, res) => {
    const companyId = Number(req.params.companyId);
    const events = await platformAudit.listByCompany(companyId);
    res.status(200).json(events);
  });
}
