export const canonicalTaskStatuses = [
  'backlog',
  'triagem',
  'em_execucao',
  'aguardando_cliente',
  'aguardando_interno',
  'concluida',
  'cancelada',
  'atrasada',
] as const;

export const legacyTaskStatuses = [
  'pendente',
  'em_andamento',
  'aguardando',
  'concluida',
  'atrasada',
] as const;

export const taskPriorities = ['baixa', 'media', 'alta', 'critica'] as const;
export const taskWorkflowStages = ['captura', 'planejamento', 'execucao', 'aguardando', 'conclusao'] as const;
export const taskOrigins = ['processo', 'prazo', 'documento', 'publicacao', 'atendimento', 'interno'] as const;
export const taskLinkEntityTypes = ['process', 'deadline', 'publication', 'attendance', 'document'] as const;
export const taskFollowupStates = ['idle', 'scheduled', 'pending_dispatch', 'dispatched', 'acknowledged'] as const;
export const taskAuditStatuses = ['success', 'warning', 'error'] as const;
export const taskAuditEntityTypes = ['task', 'task_followup', 'task_link', 'task_idempotency'] as const;

export type CanonicalTaskStatus = typeof canonicalTaskStatuses[number];
export type LegacyTaskStatus = typeof legacyTaskStatuses[number];
export type TaskStatusInput = CanonicalTaskStatus | LegacyTaskStatus;
export type TaskPriority = typeof taskPriorities[number];
export type TaskWorkflowStage = typeof taskWorkflowStages[number];
export type TaskOrigin = typeof taskOrigins[number];
export type TaskLinkEntityType = typeof taskLinkEntityTypes[number];
export type TaskFollowupState = typeof taskFollowupStates[number];
export type TaskAuditStatus = typeof taskAuditStatuses[number];
export type TaskAuditEntityType = typeof taskAuditEntityTypes[number];

export interface TaskActor {
  type: 'user' | 'system' | 'scheduler';
  userId?: number | null;
  label: string;
}

export interface TaskEntityLink {
  entityType: TaskLinkEntityType;
  entityId: number;
}

export interface TaskHistoryEntry {
  at: string;
  action: string;
  actor: string;
  diff: Record<string, unknown>;
}

export interface TaskAggregate {
  taskId: number;
  title: string;
  description: string;
  status: CanonicalTaskStatus;
  legacyStatus: LegacyTaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  slaDueAt: string | null;
  ownerUserId: number | null;
  ownerLabel: string;
  portfolioId: number | null;
  teamId: number | null;
  linkedEntities: TaskEntityLink[];
  workflowStage: TaskWorkflowStage;
  breached: boolean;
  followupState: TaskFollowupState;
  createdByUserId: number | null;
  createdAt: string;
  updatedAt: string;
  origin: TaskOrigin;
  processId: number | null;
  clientId: number | null;
  notes: string | null;
  history: TaskHistoryEntry[];
}

export interface TaskAuditEvent {
  id: string;
  scope: 'task';
  action: string;
  status: TaskAuditStatus;
  entityType: TaskAuditEntityType;
  entityId: number | string | null;
  actor: string;
  occurredAt: string;
  context: Record<string, unknown>;
  diff: Record<string, unknown> | null;
  idempotencyKey: string | null;
  correlationId: string | null;
}

export interface TaskRecord {
  taskId: number;
  title: string;
  description: string;
  status: CanonicalTaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  slaDueAt: string | null;
  ownerUserId: number | null;
  ownerLabel: string;
  portfolioId: number | null;
  teamId: number | null;
  linkedEntities: TaskEntityLink[];
  workflowStage: TaskWorkflowStage;
  followupState: TaskFollowupState;
  createdByUserId: number | null;
  createdAt: string;
  updatedAt: string;
  origin: TaskOrigin;
  processId: number | null;
  clientId: number | null;
  notes: string | null;
  history: TaskHistoryEntry[];
}
