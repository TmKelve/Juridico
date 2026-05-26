import type express from 'express';
import { ensureAuthorized } from '../../authz/guards/authz.guard';
import { MobileFeedAdapter } from '../adapters/mobile-feed.adapter';
import type { TimeEntryRepository } from '../../timesheet/core/time-entry.repository';

type UserToken = { sub: number; role: string; email: string };

export function registerMobileRoutes(input: {
  app: express.Express;
  prisma: any;
  getUserFromReq: (req: express.Request) => UserToken | null;
  repository: TimeEntryRepository;
}) {
  const adapter = new MobileFeedAdapter();

  input.app.get('/mobile/feed', async (req, res) => {
    const decoded = input.getUserFromReq(req);
    if (!decoded) {
      return res.status(401).send({ message: 'Token nao fornecido ou invalido' });
    }

    try {
      ensureAuthorized({
        actor: { userId: decoded.sub, role: decoded.role },
        permissionKey: 'mobile.feed.view',
        resourceType: 'mobile',
        resourceId: decoded.sub,
        context: { ownerUserId: decoded.sub },
      });

      const [tasks, deadlines, agendaEvents, entries] = await Promise.all([
        input.prisma.task.findMany({
          where: { ownerUserId: decoded.sub },
          orderBy: { dueDate: 'asc' },
          take: 5,
        }).catch(() => []),
        input.prisma.prazo.findMany({
          where: { responsible: decoded.email.split('@')[0] },
          orderBy: { dueDate: 'asc' },
          take: 5,
        }).catch(() => []),
        input.prisma.agendaEvent.findMany({
          where: { createdBy: decoded.email.split('@')[0] },
          orderBy: { startAt: 'asc' },
          take: 5,
          include: {
            process: { include: { clientRecord: true } },
            clientRecord: true,
            attendance: true,
            task: true,
          },
        }).catch(() => []),
        input.repository.listByUser(decoded.sub),
      ]);

      const payload = adapter.build({
        tasks: tasks.map((task: any) => ({
          id: task.id,
          title: task.title,
          status: task.status,
          priority: task.priority,
          dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : null,
        })),
        deadlines: deadlines.map((deadline: any) => ({
          id: deadline.id,
          title: deadline.title,
          status: deadline.status,
          dueDate: deadline.dueDate ? new Date(deadline.dueDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
        })),
        agendaEvents,
        pendingTimesheet: entries.filter((entry) => entry.status === 'draft' || entry.status === 'submitted'),
      });

      res.json(payload);
    } catch (error: any) {
      res.status(403).send({ message: error?.message ?? 'Falha ao carregar feed mobile' });
    }
  });
}
