import type express from 'express';
import { registerPlatformCompanyAdminRoutes } from './company-actions/register-platform-company-admin-routes';
import { registerPlatformMembershipRoutes } from './memberships/register-platform-membership-routes';
import { registerPlatformInvitationRoutes } from './invitations/register-platform-invitations-routes';
import { PlatformAuditService } from './audit/platform-audit.service';
import { platformAuditList } from './audit/platform-audit.list';
import { PlatformSupportService } from './support/platform-support.service';

type PrismaLike = any;

function createPlatformAuditService(prisma: PrismaLike) {
  return new PlatformAuditService({
    async createEvent(event) {
      await prisma.billingEvent.create({
        data: {
          companyId: event.companyId,
          eventType: 'platform.audit.event',
          eventStatus: event.status,
          summary: event.action,
          metadataJson: {
            actor: event.actor,
            context: event.context ?? null,
            metadata: event.metadata ?? null,
            occurredAt: event.occurredAt,
          },
        },
      });
      return event;
    },
    async listEvents(query) {
      const rows = await prisma.billingEvent.findMany({
        where: {
          ...(query.companyId ? { companyId: query.companyId } : {}),
          ...(query.action ? { summary: query.action } : {}),
          eventType: 'platform.audit.event',
        },
        orderBy: { occurredAt: 'desc' },
        take: query.limit ?? 100,
      });
      return rows.map((row: any) => ({
        id: `billing-event-${row.id}`,
        companyId: row.companyId,
        actor: String(row.metadataJson?.actor ?? 'platform'),
        action: String(row.summary ?? 'platform.audit.event'),
        status: row.eventStatus === 'error' ? 'error' : row.eventStatus === 'warning' ? 'warning' : 'success',
        occurredAt: row.occurredAt instanceof Date ? row.occurredAt.toISOString() : String(row.occurredAt),
        context: row.metadataJson?.context ?? {},
        metadata: row.metadataJson?.metadata ?? null,
        createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
      }));
    },
  });
}

export function registerPlatformConsoleRoutes(params: {
  app: express.Express;
  prisma: PrismaLike;
  getUserFromReq: (req: express.Request) => any;
}) {
  const { app, prisma, getUserFromReq } = params;
  const auditService = createPlatformAuditService(prisma);

  registerPlatformCompanyAdminRoutes({ app, prisma, getUserFromReq });
  registerPlatformMembershipRoutes({ app, prisma, getUserFromReq });
  registerPlatformInvitationRoutes({ app, prisma, getUserFromReq });

  app.get('/platform/audit', async (req, res) => {
    try {
      const result = await platformAuditList(auditService, {
        companyId: req.query.companyId ? Number(req.query.companyId) : undefined,
        actor: typeof req.query.actor === 'string' ? req.query.actor : undefined,
        action: typeof req.query.action === 'string' ? req.query.action : undefined,
        limit: req.query.limit ? Number(req.query.limit) : 100,
      });
      res.status(200).json(result);
    } catch (error: any) {
      res.status(error?.statusCode ?? 400).json({ error: error?.code ?? 'PLATFORM_AUDIT_LIST_FAILED', message: error?.message ?? 'Falha ao listar auditoria' });
    }
  });

  app.get('/platform/company/:companyId/support-view', async (req, res) => {
    try {
      const actor = getUserFromReq(req);
      if (!actor || actor.userType !== 'platform') {
        return res.status(403).json({ error: 'PLATFORM_PROFILE_REQUIRED', message: 'Acesso permitido apenas para plataforma' });
      }
      const service = new PlatformSupportService(
        {
          async getSupportView(query) {
            const [company, subscriptions, memberships] = await Promise.all([
              prisma.company.findUnique({ where: { id: query.companyId } }),
              prisma.subscription.findMany({ where: { companyId: query.companyId }, include: { plan: true }, orderBy: { updatedAt: 'desc' }, take: 3 }),
              prisma.companyMembership.findMany({ where: { companyId: query.companyId }, include: { user: true }, orderBy: { updatedAt: 'desc' }, take: 10 }),
            ]);
            return { company, subscriptions, memberships };
          },
        },
        auditService.createRecorder({ companyId: Number(req.params.companyId), actor: String(actor.email ?? actor.role ?? 'platform') }),
      );
      const result = await service.supportView({
        companyId: Number(req.params.companyId),
        actor: String(actor.email ?? actor.role ?? 'platform'),
        supportUserId: Number(actor.sub ?? actor.id ?? 0),
        section: typeof req.query.section === 'string' ? req.query.section : null,
      });
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(400).json({ error: 'PLATFORM_SUPPORT_VIEW_FAILED', message: error?.message ?? 'Falha ao montar visão de suporte' });
    }
  });
}
