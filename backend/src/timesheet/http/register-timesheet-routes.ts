import type express from 'express';
import { ensureAuthorized } from '../../authz/guards/authz.guard';
import { TimeEntryService } from '../core/time-entry.service';
import { TimeEntryApprovalService } from '../approval/time-entry-approval.service';
import { TimesheetReportService } from '../reports/timesheet-report.service';
import type { TimeEntryRepository } from '../core/time-entry.repository';

type UserToken = { sub: number; role: string; email: string };

export function registerTimesheetRoutes(input: {
  app: express.Express;
  getUserFromReq: (req: express.Request) => UserToken | null;
  repository: TimeEntryRepository;
}) {
  const timeEntryService = new TimeEntryService(input.repository);
  const approvalService = new TimeEntryApprovalService(input.repository);
  const reportService = new TimesheetReportService(input.repository);

  function coerceResourceId(value: unknown) {
    return typeof value === 'string' || typeof value === 'number' ? value : null;
  }

  function requireTimesheet(
    req: express.Request,
    res: express.Response,
    permissionKey:
      | 'timesheet.entry.create'
      | 'timesheet.entry.update'
      | 'timesheet.entry.approve'
      | 'timesheet.report.view',
    ownerUserId?: number | null,
  ) {
    const decoded = input.getUserFromReq(req);
    if (!decoded) {
      res.status(401).send({ message: 'Token nao fornecido ou invalido' });
      return null;
    }

    try {
      ensureAuthorized({
        actor: { userId: decoded.sub, role: decoded.role },
        permissionKey,
        resourceType: 'timesheet',
        resourceId: coerceResourceId(req.params?.id ?? req.body?.entryId ?? null),
        context: { ownerUserId: ownerUserId ?? decoded.sub },
      });
    } catch (error: any) {
      res.status(403).send({ message: error?.message ?? 'Acesso negado a timesheet' });
      return null;
    }

    return decoded;
  }

  input.app.post('/timesheet/entries', async (req, res) => {
    const decoded = requireTimesheet(req, res, 'timesheet.entry.create', req.body.userId ?? null);
    if (!decoded) return;

    try {
      const result = await timeEntryService.create({
        userId: Number(req.body.userId ?? decoded.sub),
        teamId: req.body.teamId ?? null,
        portfolioId: req.body.portfolioId ?? null,
        clientId: req.body.clientId ?? null,
        processId: req.body.processId ?? null,
        taskId: req.body.taskId ?? null,
        attendanceId: req.body.attendanceId ?? null,
        agendaEventId: req.body.agendaEventId ?? null,
        activityType: req.body.activityType,
        source: req.body.source ?? 'manual',
        startedAt: req.body.startedAt,
        endedAt: req.body.endedAt,
        billable: Boolean(req.body.billable),
        billableMinutes: Number(req.body.billableMinutes),
        notes: req.body.notes ?? null,
        origin: req.body.origin ?? 'manual',
        createdByUserId: decoded.sub,
        correlationId: req.body.correlationId ?? null,
        idempotencyKey: req.body.idempotencyKey ?? null,
      });
      res.status(201).json(result);
    } catch (error: any) {
      res.status(error?.statusCode ?? 400).send({ message: error?.message ?? 'Falha ao criar apontamento' });
    }
  });

  input.app.put('/timesheet/entries/:id', async (req, res) => {
    const current = await input.repository.findById(req.params.id);
    const decoded = requireTimesheet(req, res, 'timesheet.entry.update', current?.userId ?? null);
    if (!decoded) return;

    try {
      const result = await timeEntryService.update({
        entryId: req.params.id,
        startedAt: req.body.startedAt ?? null,
        endedAt: req.body.endedAt ?? null,
        billable: req.body.billable ?? null,
        billableMinutes: req.body.billableMinutes ?? null,
        notes: req.body.notes,
        status: req.body.status ?? null,
        idempotencyKey: req.body.idempotencyKey ?? null,
      });
      res.json(result);
    } catch (error: any) {
      res.status(error?.statusCode ?? 400).send({ message: error?.message ?? 'Falha ao atualizar apontamento' });
    }
  });

  input.app.post('/timesheet/entries/approve', async (req, res) => {
    const decoded = requireTimesheet(req, res, 'timesheet.entry.approve');
    if (!decoded) return;

    try {
      const result = await approvalService.approve({
        entryIds: Array.isArray(req.body.entryIds) ? req.body.entryIds : [],
        decision: req.body.decision,
        approverUserId: decoded.sub,
        reason: req.body.reason ?? null,
      });
      res.json(result);
    } catch (error: any) {
      res.status(error?.statusCode ?? 400).send({ message: error?.message ?? 'Falha ao aprovar apontamentos' });
    }
  });

  input.app.get('/timesheet/reports', async (req, res) => {
    const requestedUserId = typeof req.query.userId === 'string' ? Number(req.query.userId) : null;
    const decoded = requireTimesheet(req, res, 'timesheet.report.view', requestedUserId ?? null);
    if (!decoded) return;

    try {
      const result = await reportService.query({
        userId: requestedUserId ?? decoded.sub,
        from: typeof req.query.from === 'string' ? req.query.from : new Date().toISOString().slice(0, 10),
        to: typeof req.query.to === 'string' ? req.query.to : new Date().toISOString().slice(0, 10),
      });
      res.json(result);
    } catch (error: any) {
      res.status(error?.statusCode ?? 400).send({ message: error?.message ?? 'Falha ao consultar relatorio de horas' });
    }
  });
}
