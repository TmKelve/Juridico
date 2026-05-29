import type express from 'express';
import { PlatformMembershipService, assertPlatformOperator } from './platform-membership.service';
import { PlatformUserLifecycleService } from '../user-lifecycle/platform-user-lifecycle.service';

export function registerPlatformMembershipRoutes(input: {
  app: express.Express;
  prisma: any;
  getUserFromReq: (req: express.Request) => any;
}) {
  const service = new PlatformMembershipService(input.prisma);
  const lifecycle = new PlatformUserLifecycleService(input.prisma);

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

  input.app.get('/platform/memberships', async (req, res) => {
    const actor = requirePlatform(req, res, false);
    if (!actor) return;
    try {
      const companyId = Number(req.query.companyId);
      const items = await service.list(companyId);
      res.status(200).json({ items });
    } catch (error: any) {
      res.status(error?.statusCode ?? 400).json({ error: error?.code ?? 'MEMBERSHIPS_LIST_FAILED', message: error?.message ?? 'Falha ao listar memberships' });
    }
  });

  input.app.post('/platform/memberships/:id/assign-role', async (req, res) => {
    const actor = requirePlatform(req, res, true);
    if (!actor) return;
    try {
      const companyId = Number(req.body?.companyId);
      const membershipId = Number(req.params.id);
      const role = String(req.body?.role ?? '');
      const membership = await service.assignRole({ companyId, membershipId, role, actor });
      res.status(200).json({ membership });
    } catch (error: any) {
      res.status(error?.statusCode ?? 400).json({ error: error?.code ?? 'ASSIGN_ROLE_FAILED', message: error?.message ?? 'Falha ao atribuir role' });
    }
  });

  input.app.post('/platform/memberships/:id/deactivate', async (req, res) => {
    const actor = requirePlatform(req, res, true);
    if (!actor) return;
    try {
      const companyId = Number(req.body?.companyId);
      const membershipId = Number(req.params.id);
      const membership = await lifecycle.deactivate({ companyId, membershipId, actor });
      res.status(200).json({ membership });
    } catch (error: any) {
      res.status(error?.statusCode ?? 400).json({ error: error?.code ?? 'DEACTIVATE_FAILED', message: error?.message ?? 'Falha ao desativar acesso' });
    }
  });

  input.app.delete('/platform/memberships/:id', async (req, res) => {
    const actor = requirePlatform(req, res, true);
    if (!actor) return;
    try {
      const companyId = Number(req.body?.companyId ?? req.query.companyId);
      const membershipId = Number(req.params.id);
      const result = await lifecycle.remove({ companyId, membershipId, actor });
      res.status(200).json(result);
    } catch (error: any) {
      res.status(error?.statusCode ?? 400).json({ error: error?.code ?? 'REMOVE_FAILED', message: error?.message ?? 'Falha ao remover acesso' });
    }
  });

  input.app.post('/platform/memberships/:id/reset-access', async (req, res) => {
    const actor = requirePlatform(req, res, true);
    if (!actor) return;
    try {
      const companyId = Number(req.body?.companyId);
      const membershipId = Number(req.params.id);
      const membership = await lifecycle.resetAccess({ companyId, membershipId, actor });
      res.status(200).json({ membership });
    } catch (error: any) {
      res.status(error?.statusCode ?? 400).json({ error: error?.code ?? 'RESET_ACCESS_FAILED', message: error?.message ?? 'Falha ao resetar acesso' });
    }
  });
}
