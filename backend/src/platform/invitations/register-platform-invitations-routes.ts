import type express from 'express';
import { assertPlatformOperator, PlatformMembershipService } from '../memberships/platform-membership.service';
import { PlatformInvitationService } from './platform-invitation.service';

export function registerPlatformInvitationRoutes(input: {
  app: express.Express;
  prisma: any;
  getUserFromReq: (req: express.Request) => any;
}) {
  const service = new PlatformInvitationService(input.prisma);
  const membershipService = new PlatformMembershipService(input.prisma);

  const requirePlatform = (req: express.Request, res: express.Response, writeRequired = false) => {
    const actor = input.getUserFromReq(req);
    if (!actor) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'Token não fornecido ou inválido' });
      return null;
    }
    try {
      assertPlatformOperator(actor, writeRequired);
      return actor;
    } catch (error: any) {
      res.status(error?.statusCode ?? 403).json({ error: error?.code ?? 'FORBIDDEN', message: error?.message ?? 'Acesso negado' });
      return null;
    }
  };

  input.app.post('/platform/invitations', async (req, res) => {
    const actor = requirePlatform(req, res, true);
    if (!actor) return;
    try {
      const companyId = Number(req.body?.companyId);
      await membershipService.enforceMembershipLimit(companyId);
      const result = await service.invite({
        companyId,
        email: String(req.body?.email ?? ''),
        role: String(req.body?.role ?? 'assistant'),
        actor,
      });
      res.status(201).json(result);
    } catch (error: any) {
      res.status(error?.statusCode ?? 400).json({ error: error?.code ?? 'INVITATION_CREATE_FAILED', message: error?.message ?? 'Falha ao criar convite' });
    }
  });

  input.app.post('/platform/invitations/:id/accept', async (req, res) => {
    const actor = requirePlatform(req, res, true);
    if (!actor) return;
    try {
      const companyId = Number(req.body?.companyId);
      const invitationId = Number(req.params.id);
      const userId = Number(req.body?.userId);
      await membershipService.enforceMembershipLimit(companyId);
      const result = await service.accept({ companyId, invitationId, userId, actor });
      res.status(200).json(result);
    } catch (error: any) {
      res.status(error?.statusCode ?? 400).json({ error: error?.code ?? 'INVITATION_ACCEPT_FAILED', message: error?.message ?? 'Falha ao aceitar convite' });
    }
  });

  input.app.get('/platform/invitations/history', async (req, res) => {
    const actor = requirePlatform(req, res, false);
    if (!actor) return;
    try {
      const companyId = Number(req.query.companyId);
      const email = typeof req.query.email === 'string' ? req.query.email : undefined;
      const items = await service.history(companyId, email);
      res.status(200).json({ items });
    } catch (error: any) {
      res.status(error?.statusCode ?? 400).json({ error: error?.code ?? 'INVITATION_HISTORY_FAILED', message: error?.message ?? 'Falha ao consultar histórico de convite' });
    }
  });
}
