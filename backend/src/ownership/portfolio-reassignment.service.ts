import type { ManagementAuditEventRecord, ManagementAuditService } from '../audit/team';
import type { PortfolioOwnershipRecord, TeamUserRecord } from '../team';

export interface TaskOwnershipRecord {
  taskId: number;
  status: string;
  ownerUserId: number | null;
  portfolioId: number | null;
  teamId: number | null;
  updatedAt: string;
}

export interface AttendanceOwnershipRecord {
  attendanceId: number;
  status: string;
  ownerUserId: number | null;
  portfolioId: number | null;
  teamId: number | null;
  updatedAt: string;
}

export interface ReassignPortfolioInput {
  portfolioId: number;
  fromOwnerUserId: number | null;
  toOwnerUserId: number;
  reason: string;
  includeBacklog: boolean;
  includeOpenTasks: boolean;
  actorUserId: number;
  idempotencyKey?: string | null;
}

export interface ReassignPortfolioResult {
  portfolio: PortfolioOwnershipRecord;
  movedTasks: number;
  movedAttendances: number;
  auditEvent: ManagementAuditEventRecord;
  idempotency: 'created' | 'replayed';
}

export interface PortfolioOwnershipRepository {
  findUserById(userId: number): Promise<TeamUserRecord | null>;
  findPortfolioById(portfolioId: number): Promise<PortfolioOwnershipRecord | null>;
  savePortfolio(portfolio: PortfolioOwnershipRecord): Promise<PortfolioOwnershipRecord>;
  listTasksByPortfolioId(portfolioId: number): Promise<TaskOwnershipRecord[]>;
  saveTask(task: TaskOwnershipRecord): Promise<TaskOwnershipRecord>;
  listAttendancesByPortfolioId(portfolioId: number): Promise<AttendanceOwnershipRecord[]>;
  saveAttendance(attendance: AttendanceOwnershipRecord): Promise<AttendanceOwnershipRecord>;
}

export interface PortfolioPermissionPort {
  assertAllowed(input: {
    permissionKey: 'team.reassignPortfolio';
    actorUserId: number;
    portfolioId: number;
  }): Promise<void>;
}

export class PortfolioReassignmentError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly statusCode: number = 400,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'PortfolioReassignmentError';
  }
}

export class PortfolioReassignmentService {
  constructor(private readonly dependencies: {
    repository: PortfolioOwnershipRepository;
    auditService: Pick<ManagementAuditService, 'record' | 'runIdempotent'>;
    authorizer?: PortfolioPermissionPort;
  }) {}

  async reassignPortfolio(input: ReassignPortfolioInput): Promise<ReassignPortfolioResult> {
    const normalized = normalizeReassignmentInput(input);
    const portfolio = await this.dependencies.repository.findPortfolioById(normalized.portfolioId);
    if (!portfolio || !portfolio.active) {
      throw new PortfolioReassignmentError('PORTFOLIO_NOT_FOUND', 'Carteira nao encontrada.', 404, { portfolioId: normalized.portfolioId });
    }

    await this.assertUser(normalized.toOwnerUserId, 'PORTFOLIO_OWNER_NOT_FOUND');
    await this.assertUser(normalized.actorUserId, 'PORTFOLIO_REASSIGN_DENIED');

    if (normalized.fromOwnerUserId !== null && portfolio.primaryOwnerUserId !== normalized.fromOwnerUserId) {
      throw new PortfolioReassignmentError(
        'PORTFOLIO_REASSIGN_DENIED',
        'Owner atual diverge do owner informado para redistribuicao.',
        409,
        { currentOwnerUserId: portfolio.primaryOwnerUserId, fromOwnerUserId: normalized.fromOwnerUserId },
      );
    }

    if (this.dependencies.authorizer) {
      await this.dependencies.authorizer.assertAllowed({
        permissionKey: 'team.reassignPortfolio',
        actorUserId: normalized.actorUserId,
        portfolioId: normalized.portfolioId,
      });
    }

    const response = await this.dependencies.auditService.runIdempotent({
      key: normalized.idempotencyKey,
      scope: 'team.reassignPortfolio',
      entityType: 'portfolio',
      entityId: normalized.portfolioId,
      action: 'team.reassignPortfolio',
      payload: normalized,
      execute: async () => {
        const tasks = await this.dependencies.repository.listTasksByPortfolioId(normalized.portfolioId);
        const attendances = await this.dependencies.repository.listAttendancesByPortfolioId(normalized.portfolioId);
        let movedTasks = 0;
        let movedAttendances = 0;

        for (const task of tasks) {
          if (!shouldMoveTask(task, normalized)) continue;
          const updated = { ...task, ownerUserId: normalized.toOwnerUserId, updatedAt: new Date().toISOString() };
          await this.dependencies.repository.saveTask(updated);
          movedTasks += 1;
        }

        for (const attendance of attendances) {
          if (!shouldMoveAttendance(attendance, normalized)) continue;
          const updated = { ...attendance, ownerUserId: normalized.toOwnerUserId, updatedAt: new Date().toISOString() };
          await this.dependencies.repository.saveAttendance(updated);
          movedAttendances += 1;
        }

        const before = {
          primaryOwnerUserId: portfolio.primaryOwnerUserId,
          memberUserIds: [...portfolio.memberUserIds],
        };
        const nextPortfolio: PortfolioOwnershipRecord = {
          ...portfolio,
          primaryOwnerUserId: normalized.toOwnerUserId,
          memberUserIds: ensureMember(portfolio.memberUserIds, normalized.toOwnerUserId),
        };
        const saved = await this.dependencies.repository.savePortfolio(nextPortfolio);
        const auditEvent = await this.dependencies.auditService.record({
          scope: 'portfolio',
          action: 'team.reassignPortfolio',
          status: 'success',
          entityType: 'portfolio',
          entityId: saved.portfolioId,
          actor: `user:${normalized.actorUserId}`,
          occurredAt: new Date().toISOString(),
          context: {
            portfolioId: saved.portfolioId,
            fromOwnerUserId: normalized.fromOwnerUserId,
            toOwnerUserId: normalized.toOwnerUserId,
            reason: normalized.reason,
            includeBacklog: normalized.includeBacklog,
            includeOpenTasks: normalized.includeOpenTasks,
            movedTasks,
            movedAttendances,
          },
          diff: {
            before,
            after: {
              primaryOwnerUserId: saved.primaryOwnerUserId,
              memberUserIds: [...saved.memberUserIds],
            },
          },
          idempotencyKey: normalized.idempotencyKey,
        });

        return {
          portfolio: saved,
          movedTasks,
          movedAttendances,
          auditEvent,
        };
      },
    });

    return {
      ...response.data,
      idempotency: response.mode,
    };
  }

  private async assertUser(userId: number, errorCode: string) {
    const user = await this.dependencies.repository.findUserById(userId);
    if (!user) {
      throw new PortfolioReassignmentError(errorCode, 'Usuario nao encontrado.', 404, { userId });
    }
  }
}

export class InMemoryPortfolioOwnershipRepository implements PortfolioOwnershipRepository {
  private readonly users = new Map<number, TeamUserRecord>();
  private readonly portfolios = new Map<number, PortfolioOwnershipRecord>();
  private readonly tasks = new Map<number, TaskOwnershipRecord>();
  private readonly attendances = new Map<number, AttendanceOwnershipRecord>();

  constructor(seed: {
    users?: TeamUserRecord[];
    portfolios?: PortfolioOwnershipRecord[];
    tasks?: TaskOwnershipRecord[];
    attendances?: AttendanceOwnershipRecord[];
  } = {}) {
    for (const user of seed.users ?? []) this.users.set(user.id, { ...user });
    for (const portfolio of seed.portfolios ?? []) this.portfolios.set(portfolio.portfolioId, clonePortfolio(portfolio));
    for (const task of seed.tasks ?? []) this.tasks.set(task.taskId, { ...task });
    for (const attendance of seed.attendances ?? []) this.attendances.set(attendance.attendanceId, { ...attendance });
  }

  async findUserById(userId: number) {
    const user = this.users.get(userId);
    return user ? { ...user } : null;
  }

  async findPortfolioById(portfolioId: number) {
    const portfolio = this.portfolios.get(portfolioId);
    return portfolio ? clonePortfolio(portfolio) : null;
  }

  async savePortfolio(portfolio: PortfolioOwnershipRecord) {
    const clone = clonePortfolio(portfolio);
    this.portfolios.set(clone.portfolioId, clone);
    return clonePortfolio(clone);
  }

  async listTasksByPortfolioId(portfolioId: number) {
    return [...this.tasks.values()].filter((task) => task.portfolioId === portfolioId).map((task) => ({ ...task }));
  }

  async saveTask(task: TaskOwnershipRecord) {
    const clone = { ...task };
    this.tasks.set(clone.taskId, clone);
    return { ...clone };
  }

  async listAttendancesByPortfolioId(portfolioId: number) {
    return [...this.attendances.values()]
      .filter((attendance) => attendance.portfolioId === portfolioId)
      .map((attendance) => ({ ...attendance }));
  }

  async saveAttendance(attendance: AttendanceOwnershipRecord) {
    const clone = { ...attendance };
    this.attendances.set(clone.attendanceId, clone);
    return { ...clone };
  }
}

function normalizeReassignmentInput(input: ReassignPortfolioInput) {
  const portfolioId = toPositiveInteger(input.portfolioId, 'portfolioId');
  const toOwnerUserId = toPositiveInteger(input.toOwnerUserId, 'toOwnerUserId');
  const actorUserId = toPositiveInteger(input.actorUserId, 'actorUserId');
  const fromOwnerUserId = input.fromOwnerUserId === null ? null : toPositiveInteger(input.fromOwnerUserId, 'fromOwnerUserId');
  const reason = normalizeRequiredString(input.reason, 'reason');
  return {
    portfolioId,
    fromOwnerUserId,
    toOwnerUserId,
    reason,
    includeBacklog: Boolean(input.includeBacklog),
    includeOpenTasks: Boolean(input.includeOpenTasks),
    actorUserId,
    idempotencyKey: normalizeOptionalString(input.idempotencyKey),
  };
}

function shouldMoveTask(task: TaskOwnershipRecord, input: ReturnType<typeof normalizeReassignmentInput>) {
  if (task.ownerUserId !== input.fromOwnerUserId && input.fromOwnerUserId !== null) return false;
  if (task.status === 'concluida' || task.status === 'cancelada') return false;
  if (task.status === 'backlog') return input.includeBacklog;
  return input.includeOpenTasks;
}

function shouldMoveAttendance(attendance: AttendanceOwnershipRecord, input: ReturnType<typeof normalizeReassignmentInput>) {
  if (attendance.ownerUserId !== input.fromOwnerUserId && input.fromOwnerUserId !== null) return false;
  if (attendance.status === 'resolvido' || attendance.status === 'fechado_fora_sla' || attendance.status === 'cancelado') return false;
  return input.includeOpenTasks;
}

function ensureMember(memberUserIds: number[], userId: number) {
  const set = new Set(memberUserIds);
  set.add(userId);
  return [...set];
}

function normalizeRequiredString(value: string, field: string) {
  if (typeof value !== 'string') {
    throw new PortfolioReassignmentError('PORTFOLIO_REASSIGN_DENIED', `${field} invalido.`, 400, { field });
  }
  const normalized = value.trim();
  if (!normalized) {
    throw new PortfolioReassignmentError('PORTFOLIO_REASSIGN_DENIED', `${field} obrigatorio.`, 400, { field });
  }
  return normalized;
}

function normalizeOptionalString(value: string | null | undefined) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length ? normalized : null;
}

function toPositiveInteger(value: number, field: string) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new PortfolioReassignmentError('PORTFOLIO_REASSIGN_DENIED', `${field} invalido.`, 400, { field });
  }
  return value;
}

function clonePortfolio(portfolio: PortfolioOwnershipRecord): PortfolioOwnershipRecord {
  return { ...portfolio, memberUserIds: [...portfolio.memberUserIds] };
}
