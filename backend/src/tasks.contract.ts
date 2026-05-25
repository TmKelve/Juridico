import { toLegacyTaskStatus } from './tasks/integrations/task-frontend-status.adapter';

type RawTaskRecord = {
  id: number;
  title: string;
  description: string;
  processId: number | null;
  process?: {
    id: number;
    title: string;
    client: string;
    phase?: string | null;
    status?: string | null;
    ownerId?: number;
    owner?: { id: number; email: string; role: string } | null;
    clientRecord?: { id: number; name: string; legalArea?: string | null } | null;
  } | null;
  clientId: number | null;
  clientRecord?: { id: number; name: string; legalArea?: string | null } | null;
  clientName?: string | null;
  origin: string;
  dueDate: Date;
  status: string;
  priority: string;
  owner: string;
  createdBy: string;
  notes?: string | null;
  linkedToDeadline: boolean;
  linkedToPublication: boolean;
  linkedToDocument: boolean;
  immediateAction: boolean;
};

export function buildTaskPayload(task: RawTaskRecord) {
  const process = task.process ?? null;
  const client = task.clientRecord ?? process?.clientRecord ?? null;
  const status = ['backlog', 'triagem', 'em_execucao', 'aguardando_cliente', 'aguardando_interno', 'concluida', 'cancelada', 'atrasada'].includes(task.status)
    ? toLegacyTaskStatus(task.status as any)
    : task.status;

  return {
    id: task.id,
    title: task.title,
    description: task.description,
    processId: task.processId ?? null,
    processLabel: task.processId ? `#${task.processId}` : '—',
    processTitle: process?.title ?? '',
    clientId: client?.id ?? task.clientId ?? null,
    client: client?.name ?? task.clientName ?? process?.client ?? 'Cliente não informado',
    origin: task.origin,
    dueDate: task.dueDate.toISOString().slice(0, 10),
    status,
    priority: task.priority,
    owner: task.owner,
    createdBy: task.createdBy,
    notes: task.notes ?? '',
    linkedToDeadline: Boolean(task.linkedToDeadline),
    linkedToPublication: Boolean(task.linkedToPublication),
    linkedToDocument: Boolean(task.linkedToDocument),
    immediateAction: Boolean(task.immediateAction),
  };
}
