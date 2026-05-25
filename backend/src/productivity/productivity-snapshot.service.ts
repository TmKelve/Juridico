import type { ManagementAuditEventRecord, ManagementAuditService } from '../audit/team';

export type ProductivityScopeType = 'user' | 'team' | 'portfolio';

export interface ProductivityTaskRecord {
  taskId: number;
  status: string;
  ownerUserId: number | null;
  portfolioId: number | null;
  teamId: number | null;
  dueDate?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductivityAttendanceRecord {
  attendanceId: number;
  status: string;
  ownerUserId: number | null;
  portfolioId: number | null;
  teamId: number | null;
  slaTargetAt?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductivityAuditReference {
  scope: string;
  action: string;
  entityId: string | null;
  occurredAt: string;
}

export interface ProductivitySnapshotRecord {
  referenceDate: string;
  scopeType: ProductivityScopeType;
  scopeId: number | string;
  tasksCompleted: number;
  tasksOverdue: number;
  attendancesHandled: number;
  slaBreaches: number;
  avgResolutionHours: number | null;
  reassignments: number;
  generatedAt: string;
}

export interface ProductivitySnapshotInput {
  referenceDate: string;
  scopeType: ProductivityScopeType;
  scopeId: number | string;
  includeClosedTasks: boolean;
  includeAttendances: boolean;
  actorUserId: number;
  idempotencyKey?: string | null;
}

export interface ProductivitySnapshotResult {
  snapshot: ProductivitySnapshotRecord;
  auditEvent: ManagementAuditEventRecord | null;
}

export interface ProductivitySnapshotRepository {
  listTasks(): Promise<ProductivityTaskRecord[]>;
  listAttendances(): Promise<ProductivityAttendanceRecord[]>;
  listReassignmentEvents(): Promise<ProductivityAuditReference[]>;
}

export interface ProductivityPermissionPort {
  assertAllowed(input: {
    permissionKey: 'productivity.snapshot';
    actorUserId: number;
    scopeType: ProductivityScopeType;
    scopeId: number | string;
  }): Promise<void>;
}

export class ProductivitySnapshotError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly statusCode: number = 400,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ProductivitySnapshotError';
  }
}

export class ProductivitySnapshotService {
  constructor(private readonly dependencies: {
    repository: ProductivitySnapshotRepository;
    auditService: Pick<ManagementAuditService, 'record' | 'runIdempotent'>;
    authorizer?: ProductivityPermissionPort;
  }) {}

  async snapshot(input: ProductivitySnapshotInput): Promise<ProductivitySnapshotResult> {
    const normalized = normalizeSnapshotInput(input);
    if (this.dependencies.authorizer) {
      await this.dependencies.authorizer.assertAllowed({
        permissionKey: 'productivity.snapshot',
        actorUserId: normalized.actorUserId,
        scopeType: normalized.scopeType,
        scopeId: normalized.scopeId,
      });
    }

    const idempotencyKey = normalized.idempotencyKey ?? [
      normalized.referenceDate,
      normalized.scopeType,
      String(normalized.scopeId),
    ].join('|');

    const response = await this.dependencies.auditService.runIdempotent({
      key: idempotencyKey,
      scope: 'productivity.snapshot',
      entityType: normalized.scopeType,
      entityId: normalized.scopeId,
      action: 'productivity.snapshot',
      payload: normalized,
      execute: async () => {
        const [tasks, attendances, reassignments] = await Promise.all([
          this.dependencies.repository.listTasks(),
          this.dependencies.repository.listAttendances(),
          this.dependencies.repository.listReassignmentEvents(),
        ]);

        const scopedTasks = tasks.filter((task) => matchesScope(task, normalized.scopeType, normalized.scopeId));
        const scopedAttendances = attendances.filter((attendance) => matchesScope(attendance, normalized.scopeType, normalized.scopeId));
        const scopedReassignments = reassignments.filter((event) => {
          if (event.action !== 'team.reassignPortfolio') return false;
          if (!isSameDay(event.occurredAt, normalized.referenceDate)) return false;
          return matchesReassignmentScope(event, normalized.scopeType, normalized.scopeId, scopedTasks, scopedAttendances);
        });

        const tasksCompleted = normalized.includeClosedTasks
          ? scopedTasks.filter((task) => task.status === 'concluida' && isSameDay(task.completedAt, normalized.referenceDate)).length
          : 0;
        const tasksOverdue = scopedTasks.filter((task) => isTaskOverdue(task, normalized.referenceDate)).length;

        const handledAttendances = normalized.includeAttendances
          ? scopedAttendances.filter((attendance) => isHandledAttendance(attendance) && isSameDay(attendance.resolvedAt, normalized.referenceDate))
          : [];
        const attendancesHandled = handledAttendances.length;
        const slaBreaches = handledAttendances.filter((attendance) => isSlaBreached(attendance)).length;
        const avgResolutionHours = computeAverageResolutionHours(
          normalized.includeClosedTasks ? scopedTasks : [],
          handledAttendances,
          normalized.referenceDate,
        );

        const snapshot: ProductivitySnapshotRecord = {
          referenceDate: normalized.referenceDate,
          scopeType: normalized.scopeType,
          scopeId: normalized.scopeId,
          tasksCompleted,
          tasksOverdue,
          attendancesHandled,
          slaBreaches,
          avgResolutionHours,
          reassignments: scopedReassignments.length,
          generatedAt: new Date().toISOString(),
        };

        const auditEvent = await this.dependencies.auditService.record({
          scope: 'productivity',
          action: 'productivity.snapshot',
          status: 'success',
          entityType: normalized.scopeType,
          entityId: normalized.scopeId,
          actor: `user:${normalized.actorUserId}`,
          occurredAt: snapshot.generatedAt,
          context: { ...snapshot, includeClosedTasks: normalized.includeClosedTasks, includeAttendances: normalized.includeAttendances },
          diff: null,
          idempotencyKey,
        });

        return {
          snapshot,
          auditEvent,
        };
      },
    });

    return response.data;
  }
}

export class InMemoryProductivitySnapshotRepository implements ProductivitySnapshotRepository {
  private readonly tasks: ProductivityTaskRecord[];
  private readonly attendances: ProductivityAttendanceRecord[];
  private readonly reassignmentEvents: ProductivityAuditReference[];

  constructor(seed: {
    tasks?: ProductivityTaskRecord[];
    attendances?: ProductivityAttendanceRecord[];
    reassignmentEvents?: ProductivityAuditReference[];
  } = {}) {
    this.tasks = (seed.tasks ?? []).map((task) => ({ ...task }));
    this.attendances = (seed.attendances ?? []).map((attendance) => ({ ...attendance }));
    this.reassignmentEvents = (seed.reassignmentEvents ?? []).map((event) => ({ ...event }));
  }

  async listTasks() {
    return this.tasks.map((task) => ({ ...task }));
  }

  async listAttendances() {
    return this.attendances.map((attendance) => ({ ...attendance }));
  }

  async listReassignmentEvents() {
    return this.reassignmentEvents.map((event) => ({ ...event }));
  }
}

function normalizeSnapshotInput(input: ProductivitySnapshotInput) {
  const referenceDate = normalizeReferenceDate(input.referenceDate);
  const scopeType = normalizeScopeType(input.scopeType);
  const scopeId = normalizeScopeId(input.scopeId, scopeType);
  const actorUserId = toPositiveInteger(Number(input.actorUserId), 'actorUserId');
  return {
    referenceDate,
    scopeType,
    scopeId,
    includeClosedTasks: Boolean(input.includeClosedTasks),
    includeAttendances: Boolean(input.includeAttendances),
    actorUserId,
    idempotencyKey: normalizeOptionalString(input.idempotencyKey),
  };
}

function normalizeReferenceDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ProductivitySnapshotError('PRODUCTIVITY_SCOPE_INVALID', 'referenceDate invalido.', 400, { referenceDate: value });
  }
  return value;
}

function normalizeScopeType(value: string): ProductivityScopeType {
  if (value !== 'user' && value !== 'team' && value !== 'portfolio') {
    throw new ProductivitySnapshotError('PRODUCTIVITY_SCOPE_INVALID', 'scopeType invalido.', 400, { scopeType: value });
  }
  return value;
}

function normalizeScopeId(value: number | string, scopeType: ProductivityScopeType) {
  if (scopeType === 'user' || scopeType === 'team' || scopeType === 'portfolio') {
    const numeric = Number(value);
    if (!Number.isInteger(numeric) || numeric <= 0) {
      throw new ProductivitySnapshotError('PRODUCTIVITY_SCOPE_INVALID', 'scopeId invalido.', 400, { scopeId: value });
    }
    return numeric;
  }
  return value;
}

function normalizeOptionalString(value: string | null | undefined) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length ? normalized : null;
}

function matchesScope(
  record: { ownerUserId: number | null; teamId: number | null; portfolioId: number | null },
  scopeType: ProductivityScopeType,
  scopeId: number | string,
) {
  if (scopeType === 'user') return record.ownerUserId === scopeId;
  if (scopeType === 'team') return record.teamId === scopeId;
  return record.portfolioId === scopeId;
}

function matchesReassignmentScope(
  event: ProductivityAuditReference,
  scopeType: ProductivityScopeType,
  scopeId: number | string,
  tasks: ProductivityTaskRecord[],
  attendances: ProductivityAttendanceRecord[],
) {
  if (scopeType === 'portfolio') return event.entityId === String(scopeId);
  if (scopeType === 'team') return tasks.some((task) => task.portfolioId === Number(event.entityId) && task.teamId === scopeId)
    || attendances.some((attendance) => attendance.portfolioId === Number(event.entityId) && attendance.teamId === scopeId);
  return tasks.some((task) => task.portfolioId === Number(event.entityId) && task.ownerUserId === scopeId)
    || attendances.some((attendance) => attendance.portfolioId === Number(event.entityId) && attendance.ownerUserId === scopeId);
}

function isTaskOverdue(task: ProductivityTaskRecord, referenceDate: string) {
  if (task.status === 'concluida' || task.status === 'cancelada') return false;
  if (!task.dueDate) return false;
  return task.dueDate < referenceDate;
}

function isHandledAttendance(attendance: ProductivityAttendanceRecord) {
  return attendance.status === 'resolvido' || attendance.status === 'fechado_fora_sla';
}

function isSlaBreached(attendance: ProductivityAttendanceRecord) {
  if (attendance.status === 'fechado_fora_sla') return true;
  if (!attendance.slaTargetAt || !attendance.resolvedAt) return false;
  return new Date(attendance.resolvedAt).getTime() > new Date(attendance.slaTargetAt).getTime();
}

function computeAverageResolutionHours(
  tasks: ProductivityTaskRecord[],
  attendances: ProductivityAttendanceRecord[],
  referenceDate: string,
) {
  const durations: number[] = [];

  for (const task of tasks) {
    if (task.status !== 'concluida' || !isSameDay(task.completedAt, referenceDate)) continue;
    durations.push(diffHours(task.createdAt, task.completedAt));
  }

  for (const attendance of attendances) {
    if (!attendance.resolvedAt || !isSameDay(attendance.resolvedAt, referenceDate)) continue;
    durations.push(diffHours(attendance.createdAt, attendance.resolvedAt));
  }

  if (!durations.length) return null;
  const average = durations.reduce((sum, value) => sum + value, 0) / durations.length;
  return Number(average.toFixed(2));
}

function diffHours(startAt: string, endAt: string | null | undefined) {
  if (!endAt) return 0;
  return (new Date(endAt).getTime() - new Date(startAt).getTime()) / 3600000;
}

function isSameDay(value: string | null | undefined, referenceDate: string) {
  if (!value) return false;
  return new Date(value).toISOString().slice(0, 10) === referenceDate;
}

function toPositiveInteger(value: number, field: string) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new ProductivitySnapshotError('PRODUCTIVITY_SCOPE_INVALID', `${field} invalido.`, 400, { field });
  }
  return value;
}
