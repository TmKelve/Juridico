type AgendaEntityRef = {
  id: number;
  name?: string | null;
  title?: string | null;
  client?: string | null;
  clientRecord?: { id: number; name: string } | null;
} | null;

type RawAgendaEventRecord = {
  id: number;
  title: string;
  eventType: string;
  status: string;
  priority: string;
  startAt: Date;
  endAt: Date;
  processId: number | null;
  process?: AgendaEntityRef;
  clientId: number | null;
  clientRecord?: AgendaEntityRef;
  attendanceId: number | null;
  attendance?: AgendaEntityRef;
  taskId: number | null;
  task?: AgendaEntityRef;
  responsible?: string | null;
  locationOrChannel?: string | null;
  notes?: string | null;
  origin: string;
  createdBy: string;
};

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function toHourMinute(date: Date) {
  return date.toISOString().slice(11, 16);
}

export function buildAgendaPayload(event: RawAgendaEventRecord) {
  const process = event.process ?? null;
  const client = event.clientRecord ?? process?.clientRecord ?? null;

  return {
    id: event.id,
    title: event.title,
    type: event.eventType,
    status: event.status,
    priority: event.priority,
    date: toIsoDate(event.startAt),
    startTime: toHourMinute(event.startAt),
    endTime: toHourMinute(event.endAt),
    clientId: client?.id ?? event.clientId ?? null,
    client: client?.name ?? process?.client ?? 'Cliente não informado',
    processId: event.processId ?? null,
    processLabel: event.processId ? `#${event.processId}` : '—',
    processTitle: process?.title ?? '',
    responsible: event.responsible ?? 'sem-responsavel',
    locationOrChannel: event.locationOrChannel ?? 'A definir',
    notes: event.notes ?? '',
    origin: event.origin,
    createdBy: event.createdBy,
    attendanceId: event.attendanceId ?? null,
    taskId: event.taskId ?? null,
    isAudience: event.eventType === 'audiencia',
    isReturn: event.eventType === 'retorno_agendado',
    isDeadline: event.eventType === 'prazo_calendario',
    requiresAttention: event.eventType === 'audiencia' || event.eventType === 'retorno_agendado' || event.eventType === 'prazo_calendario',
  };
}
