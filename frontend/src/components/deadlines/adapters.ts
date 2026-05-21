import type { ApiDeadline } from '../../api';
import type {
  BulkActionMode,
  DeadlineAgendaDraft,
  DeadlineAgendaSyncState,
  DeadlineAutomationContext,
  DeadlineCompletionAuditEntry,
  DeadlinePriority,
  DeadlineRiskTone,
  DeadlineStatus,
  DeadlineViewItem,
} from './types';

const STATUS_WEIGHT: Record<DeadlineStatus, number> = {
  atrasado: 90,
  critico: 70,
  aberto: 35,
  concluido: -40,
};

const PRIORITY_WEIGHT: Record<DeadlinePriority, number> = {
  alta: 24,
  media: 12,
  baixa: 4,
};

export function diffInDays(fromIso: string, toDate: Date) {
  const from = new Date(`${fromIso}T00:00:00`);
  const base = new Date(toDate);
  base.setHours(0, 0, 0, 0);
  return Math.ceil((from.getTime() - base.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatDate(isoDate: string) {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString('pt-BR');
}

export function formatDateTime(isoDateTime: string) {
  return new Date(isoDateTime).toLocaleString('pt-BR');
}

export function getResponsibleLabel(email: string) {
  return email.split('@')[0] ?? email;
}

export function getRelativeDueLabel(isoDate: string) {
  const delta = diffInDays(isoDate, new Date());
  if (delta < 0) return `Venceu ha ${Math.abs(delta)} dia${Math.abs(delta) === 1 ? '' : 's'}`;
  if (delta === 0) return 'Vence hoje';
  if (delta === 1) return 'Vence amanha';
  return `Vence em ${delta} dias`;
}

export function getStatusLabel(status: DeadlineStatus) {
  const labels: Record<DeadlineStatus, string> = {
    aberto: 'Aberto',
    critico: 'Critico',
    atrasado: 'Atrasado',
    concluido: 'Concluido',
  };
  return labels[status];
}

export function getPriorityLabel(priority: DeadlinePriority) {
  const labels: Record<DeadlinePriority, string> = {
    alta: 'Alta',
    media: 'Media',
    baixa: 'Baixa',
  };
  return labels[priority];
}

export function getOriginLabel(origin: ApiDeadline['origin']) {
  const labels: Record<ApiDeadline['origin'], string> = {
    publicacao: 'Publicacao',
    audiencia: 'Audiencia',
    interno: 'Fluxo interno',
    cliente: 'Solicitacao do cliente',
  };
  return labels[origin];
}

export function buildCompletionAuditFromApi(item: ApiDeadline): DeadlineCompletionAuditEntry | null {
  if (!item.completedAt) return null;
  return {
    deadlineId: item.id,
    completedAt: item.completedAt,
    completedBy: item.completedBy || item.owner || 'Responsavel atual',
    completionMode: 'api',
    reason: item.completionJustification || 'Concluido no fluxo operacional',
    notes: item.completionJustification ? 'Auditoria persistida pelo backend.' : 'Contrato atual nao expone observacao adicional.',
    persisted: true,
    source: 'api',
  };
}

export function createCompletionAuditEntry(
  item: ApiDeadline,
  userEmail: string,
  reason: string,
  notes: string,
  mode: BulkActionMode,
): DeadlineCompletionAuditEntry {
  return {
    deadlineId: item.id,
    completedAt: new Date().toISOString(),
    completedBy: getResponsibleLabel(userEmail),
    completionMode: mode,
    reason,
    notes,
    persisted: false,
    source: 'ui',
  };
}

function getRiskTone(status: DeadlineStatus, daysToDue: number): DeadlineRiskTone {
  if (status === 'concluido') return 'success';
  if (status === 'atrasado' || daysToDue < 0) return 'danger';
  if (status === 'critico' || daysToDue <= 2) return 'warning';
  return 'info';
}

function getRiskLabel(status: DeadlineStatus, daysToDue: number) {
  if (status === 'concluido') return 'Entrega auditavel';
  if (status === 'atrasado' || daysToDue < 0) return 'Acao imediata';
  if (status === 'critico' || daysToDue <= 2) return 'Janela critica';
  if (daysToDue <= 7) return 'Curto prazo';
  return 'Monitorar';
}

function getRiskScore(item: ApiDeadline, daysToDue: number) {
  const urgencyWeight = daysToDue < 0
    ? 45 + Math.min(Math.abs(daysToDue) * 3, 18)
    : daysToDue === 0
      ? 32
      : daysToDue <= 2
        ? 24
        : daysToDue <= 7
          ? 12
          : 0;

  const originWeight = item.origin === 'publicacao' ? 8 : item.origin === 'audiencia' ? 6 : 0;

  return STATUS_WEIGHT[item.status] + PRIORITY_WEIGHT[item.priority] + urgencyWeight + originWeight;
}

function buildAutomationContext(item: ApiDeadline): DeadlineAutomationContext {
  if (item.origin === 'publicacao') {
    return {
      kind: 'publicacao',
      label: 'Automacao de publicacao',
      summary: 'Prazo originado por publicacao/intimacao. Validar triagem e publicacao vinculada antes da conclusao.',
      actionLabel: 'Ver publicacao vinculada',
      linkedPath: `/publicacoes-intimacoes?processId=${item.processId}`,
    };
  }

  if (item.origin === 'audiencia') {
    return {
      kind: 'audiencia',
      label: 'Dependencia de audiencia',
      summary: 'Prazo conectado ao calendario processual. Verifique audiencia, diligencia ou protocolo associado.',
      actionLabel: 'Abrir agenda do processo',
      linkedPath: `/agenda?processId=${item.processId}`,
    };
  }

  if (item.origin === 'cliente') {
    return {
      kind: 'cliente',
      label: 'Solicitacao do cliente',
      summary: 'Prazo nascido de interacao com cliente. Recomendado registrar retorno ou evidencia da entrega.',
      actionLabel: 'Abrir tarefas',
      linkedPath: '/tarefas',
    };
  }

  return {
    kind: 'interno',
    label: 'Fluxo operacional',
    summary: 'Prazo interno da carteira. Use agenda e checklist para reduzir risco de perda de contexto.',
    actionLabel: 'Abrir agenda',
    linkedPath: '/agenda',
  };
}

export function buildAgendaDraft(item: ApiDeadline): DeadlineAgendaDraft {
  return {
    deadlineId: item.id,
    deadlineTitle: item.title,
    title: `[Prazo] ${item.title}`,
    type: 'prazo_calendario',
    status: item.status === 'atrasado' || item.status === 'critico' ? 'atencao' : 'agendado',
    priority: item.priority,
    date: item.dueDate,
    startTime: item.status === 'atrasado' ? '08:00' : item.status === 'critico' ? '09:00' : '10:00',
    endTime: item.status === 'atrasado' ? '08:45' : item.status === 'critico' ? '09:30' : '10:30',
    processId: item.processId,
    clientId: item.clientId,
    client: item.client,
    responsible: item.owner,
    locationOrChannel: 'Agenda operacional',
    notes: `Origem: ${getOriginLabel(item.origin)}. Processo: ${item.processLabel}. Prazo: ${item.title}.`,
    origin: item.origin === 'publicacao' ? 'publicacao' : 'processo',
  };
}

export function getIdleAgendaSyncState(): DeadlineAgendaSyncState {
  return {
    status: 'idle',
    message: 'Ainda nao sincronizado com a agenda.',
    persisted: false,
    expectedContract: [
      'deadlineId no evento de agenda para reconciliacao bidirecional',
      'agendaEventId e agendaSyncStatus no payload de prazo',
      'ultima sincronizacao e responsavel da sincronizacao',
    ],
  };
}

export function enrichDeadline(
  item: ApiDeadline,
  auditEntry: DeadlineCompletionAuditEntry | null,
  agendaSyncState?: DeadlineAgendaSyncState,
): DeadlineViewItem {
  const daysToDue = diffInDays(item.dueDate, new Date());
  const completionAudit = auditEntry ?? buildCompletionAuditFromApi(item);
  const riskScore = getRiskScore(item, daysToDue);

  return {
    ...item,
    daysToDue,
    riskScore,
    riskTone: getRiskTone(item.status, daysToDue),
    riskLabel: getRiskLabel(item.status, daysToDue),
    relativeDueLabel: getRelativeDueLabel(item.dueDate),
    ownerLabel: getResponsibleLabel(item.owner),
    massActionEligible: item.status !== 'concluido',
    completionAudit,
    automationContext: buildAutomationContext(item),
    agendaDraft: buildAgendaDraft(item),
    agendaSyncState: agendaSyncState ?? getIdleAgendaSyncState(),
  };
}
