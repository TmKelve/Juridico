import { useEffect, useEffectEvent, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Download,
  ExternalLink,
  Filter,
  FileText,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldAlert,
  TimerReset,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api, type ApiDeadline } from './api';
import {
  enrichDeadline,
  formatDate,
  formatDateTime,
  getIdleAgendaSyncState,
  getPriorityLabel,
  getResponsibleLabel,
  getStatusLabel,
  getOriginLabel,
} from './components/deadlines/adapters';
import type {
  BulkActionKind,
  BulkActionMode,
  DeadlineAgendaDraft,
  DeadlineAgendaSyncState,
  DeadlineCalendarMode,
  DeadlineCompletionAuditEntry,
  DeadlineFilters,
  DeadlinePeriodFilter,
  DeadlineSortField,
  DeadlineViewItem,
  DeadlineViewMode,
} from './components/deadlines/types';
import { captureException, trackEvent, trackPageView } from './monitoring';
import './Deadlines.css';

interface DeadlinesProps {
  user: { id: number; email: string; role: string };
}

const EMPTY_FILTERS: DeadlineFilters = {
  query: '',
  period: 'todos',
  status: '',
  priority: '',
  responsible: '',
  area: '',
  process: '',
  origin: '',
  dueTodayOnly: false,
  dueInDays: '',
};

const ORIGINS: Array<ApiDeadline['origin']> = ['publicacao', 'audiencia', 'interno', 'cliente'];
const BULK_REASON_OPTIONS = [
  'Protocolo realizado',
  'Peca protocolada e conferida',
  'Checklist concluido',
  'Entrega validada com cliente',
];

function parseSavedFilters(raw: string | null): DeadlineFilters | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<DeadlineFilters>;
    return {
      ...EMPTY_FILTERS,
      ...parsed,
      dueTodayOnly: Boolean(parsed.dueTodayOnly),
    };
  } catch {
    return null;
  }
}

function buildAgendaPayload(draft: DeadlineAgendaDraft) {
  return {
    title: draft.title,
    type: draft.type,
    status: draft.status,
    priority: draft.priority,
    date: draft.date,
    startTime: draft.startTime,
    endTime: draft.endTime,
    processId: draft.processId,
    clientId: draft.clientId ?? undefined,
    client: draft.client,
    responsible: draft.responsible,
    locationOrChannel: draft.locationOrChannel,
    notes: `${draft.notes} Referencia local do prazo: #${draft.deadlineId}.`,
    origin: draft.origin,
  };
}

function buildAgendaSuccessState(eventId: number): DeadlineAgendaSyncState {
  return {
    status: 'synced',
    message: 'Evento criado na agenda operacional.',
    eventId,
    syncedAt: new Date().toISOString(),
    persisted: false,
    expectedContract: [
      'persistir deadlineId no evento de agenda',
      'retornar agendaEventId no payload do prazo',
      'expor agendaSyncStatus no GET /deadlines',
    ],
  };
}

function buildAgendaErrorState(message: string): DeadlineAgendaSyncState {
  return {
    status: 'error',
    message,
    persisted: false,
    expectedContract: [
      'retorno de erro estruturado por item sincronizado',
      'suporte a idempotencia para evitar eventos duplicados',
      'ligacao persistida entre prazo e agenda',
    ],
  };
}

function getQuickFilterState(filter: PeriodFilterShortcut): DeadlineFilters {
  if (filter === 'todos') return EMPTY_FILTERS;
  if (filter === 'hoje') return { ...EMPTY_FILTERS, period: 'hoje' };
  if (filter === 'atrasados') return { ...EMPTY_FILTERS, period: 'atrasados' };
  if (filter === 'criticos') return { ...EMPTY_FILTERS, status: 'critico' };
  if (filter === 'publicacao') return { ...EMPTY_FILTERS, origin: 'publicacao' };
  return EMPTY_FILTERS;
}

type PeriodFilterShortcut = 'todos' | 'hoje' | 'atrasados' | 'criticos' | 'publicacao' | 'meus';

function compareBySort(a: DeadlineViewItem, b: DeadlineViewItem, sortBy: DeadlineSortField) {
  if (sortBy === 'risco') {
    return b.riskScore - a.riskScore || a.daysToDue - b.daysToDue;
  }

  if (sortBy === 'vencimento') {
    return a.daysToDue - b.daysToDue || b.riskScore - a.riskScore;
  }

  if (sortBy === 'prioridade') {
    const order = { alta: 0, media: 1, baixa: 2 };
    return order[a.priority] - order[b.priority] || a.daysToDue - b.daysToDue;
  }

  const order = { atrasado: 0, critico: 1, aberto: 2, concluido: 3 };
  return order[a.status] - order[b.status] || b.riskScore - a.riskScore;
}

function statusBadge(status: DeadlineViewItem['status']) {
  return (
    <span className={`deadline-badge status-${status}`}>
      <Circle size={9} aria-hidden="true" />
      {getStatusLabel(status)}
    </span>
  );
}

function priorityBadge(priority: DeadlineViewItem['priority']) {
  return (
    <span className={`deadline-badge priority-${priority}`}>
      <Circle size={9} aria-hidden="true" />
      {getPriorityLabel(priority)}
    </span>
  );
}

export function Deadlines({ user }: DeadlinesProps) {
  const navigate = useNavigate();
  const [deadlines, setDeadlines] = useState<ApiDeadline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filters, setFilters] = useState<DeadlineFilters>(EMPTY_FILTERS);
  const [viewMode, setViewMode] = useState<DeadlineViewMode>('lista');
  const [calendarMode, setCalendarMode] = useState<DeadlineCalendarMode>('semana');
  const [sortBy, setSortBy] = useState<DeadlineSortField>('risco');
  const [page, setPage] = useState(1);
  const [selectedDeadlineId, setSelectedDeadlineId] = useState<number | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkReason, setBulkReason] = useState(BULK_REASON_OPTIONS[0]);
  const [bulkNotes, setBulkNotes] = useState('');
  const [processingIds, setProcessingIds] = useState<number[]>([]);
  const [auditLog, setAuditLog] = useState<Record<number, DeadlineCompletionAuditEntry>>({});
  const [agendaSyncMap, setAgendaSyncMap] = useState<Record<number, DeadlineAgendaSyncState>>({});

  const itemsPerPage = 10;
  const loadDeadlinesOnMount = useEffectEvent(loadDeadlines);

  useEffect(() => {
    trackPageView('deadlines', { role: user.role });
    const savedFilters = parseSavedFilters(localStorage.getItem('lexora_deadlines_saved_filter'));
    if (savedFilters) setFilters(savedFilters);
    loadDeadlinesOnMount();
  }, [user.role]);

  useEffect(() => {
    setPage(1);
  }, [filters, sortBy, viewMode]);

  const viewItems = useMemo(
    () => deadlines.map((item) => enrichDeadline(item, auditLog[item.id] ?? null, agendaSyncMap[item.id] ?? getIdleAgendaSyncState())),
    [deadlines, auditLog, agendaSyncMap],
  );

  const owners = useMemo(() => Array.from(new Set(viewItems.map((item) => item.owner))), [viewItems]);
  const processes = useMemo(() => {
    const map = new Map<string, string>();
    viewItems.forEach((item) => map.set(String(item.processId), item.processLabel));
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [viewItems]);
  const areas = useMemo(() => Array.from(new Set(viewItems.map((item) => item.area).filter(Boolean))), [viewItems]);

  const filteredDeadlines = useMemo(() => {
    return viewItems.filter((item) => {
      if (filters.query) {
        const q = filters.query.toLowerCase();
        const text = [
          item.title,
          item.processLabel,
          item.processTitle,
          item.client,
          item.origin,
          item.owner,
          item.notes,
          item.automationContext.summary,
        ].join(' ').toLowerCase();
        if (!text.includes(q)) return false;
      }

      if (filters.period === 'hoje' && item.daysToDue !== 0) return false;
      if (filters.period === 'semana' && (item.daysToDue < 0 || item.daysToDue > 7)) return false;
      if (filters.period === 'mes' && (item.daysToDue < 0 || item.daysToDue > 30)) return false;
      if (filters.period === 'atrasados' && item.daysToDue >= 0) return false;
      if (filters.status && item.status !== filters.status) return false;
      if (filters.priority && item.priority !== filters.priority) return false;
      if (filters.responsible && item.owner !== filters.responsible) return false;
      if (filters.area && item.area !== filters.area) return false;
      if (filters.process && String(item.processId) !== filters.process) return false;
      if (filters.origin && item.origin !== filters.origin) return false;
      if (filters.dueTodayOnly && item.daysToDue !== 0) return false;

      if (filters.dueInDays) {
        const maxDays = Number(filters.dueInDays);
        if (item.daysToDue < 0 || item.daysToDue > maxDays) return false;
      }

      return true;
    });
  }, [filters, viewItems]);

  const sortedDeadlines = useMemo(
    () => [...filteredDeadlines].sort((a, b) => compareBySort(a, b, sortBy)),
    [filteredDeadlines, sortBy],
  );

  const pageCount = Math.max(1, Math.ceil(sortedDeadlines.length / itemsPerPage));
  const pagedDeadlines = sortedDeadlines.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  const selectedDeadline = useMemo(
    () => viewItems.find((item) => item.id === selectedDeadlineId) ?? null,
    [selectedDeadlineId, viewItems],
  );

  const selectedItems = useMemo(
    () => sortedDeadlines.filter((item) => selectedIds.includes(item.id)),
    [selectedIds, sortedDeadlines],
  );

  const kpis = useMemo(() => ({
    today: viewItems.filter((item) => item.daysToDue === 0).length,
    week: viewItems.filter((item) => item.daysToDue >= 0 && item.daysToDue <= 7).length,
    critical: viewItems.filter((item) => item.status === 'critico' || (item.status === 'aberto' && item.daysToDue <= 2)).length,
    overdue: viewItems.filter((item) => item.daysToDue < 0 || item.status === 'atrasado').length,
    done: viewItems.filter((item) => item.status === 'concluido').length,
    audited: viewItems.filter((item) => item.completionAudit).length,
    agendaSynced: Object.values(agendaSyncMap).filter((item) => item.status === 'synced').length,
  }), [agendaSyncMap, viewItems]);

  const topQueue = useMemo(() => sortedDeadlines.slice(0, 3), [sortedDeadlines]);
  const recentAudits = useMemo(
    () => [...viewItems]
      .filter((item) => item.completionAudit)
      .sort((a, b) => {
        const aTime = a.completionAudit ? new Date(a.completionAudit.completedAt).getTime() : 0;
        const bTime = b.completionAudit ? new Date(b.completionAudit.completedAt).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 4),
    [viewItems],
  );

  const focusDeadline = topQueue[0] ?? null;
  const hasActiveFilter = JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS);

  const activeQuickView = useMemo(() => {
    const normalizedOwner = getResponsibleLabel(user.email);
    if (!hasActiveFilter) return 'todos';
    if (filters.period === 'hoje' && !filters.status && !filters.priority && !filters.responsible && !filters.area && !filters.process && !filters.origin && !filters.dueTodayOnly && !filters.dueInDays && !filters.query) return 'hoje';
    if (filters.period === 'atrasados' && !filters.status && !filters.priority && !filters.responsible && !filters.area && !filters.process && !filters.origin && !filters.dueTodayOnly && !filters.dueInDays && !filters.query) return 'atrasados';
    if (filters.status === 'critico' && filters.period === 'todos' && !filters.priority && !filters.responsible && !filters.area && !filters.process && !filters.origin && !filters.dueTodayOnly && !filters.dueInDays && !filters.query) return 'criticos';
    if (filters.origin === 'publicacao' && !filters.priority && !filters.responsible && !filters.area && !filters.process && !filters.status && !filters.dueTodayOnly && !filters.dueInDays && !filters.query) return 'publicacao';
    if (filters.responsible === normalizedOwner && !filters.query && !filters.area && !filters.process && !filters.origin && !filters.status && !filters.priority && !filters.dueTodayOnly && !filters.dueInDays && filters.period === 'todos') return 'meus';
    return '';
  }, [filters, hasActiveFilter, user.email]);

  const calendarItems = useMemo(() => {
    const grouped = new Map<string, DeadlineViewItem[]>();
    sortedDeadlines.forEach((item) => {
      if (!grouped.has(item.dueDate)) grouped.set(item.dueDate, []);
      grouped.get(item.dueDate)?.push(item);
    });

    return Array.from(grouped.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, items]) => ({ date, items }));
  }, [sortedDeadlines]);

  async function loadDeadlines() {
    setLoading(true);
    setError('');

    try {
      const res = await api.getDeadlines();
      if (res.status !== 200 || !Array.isArray(res.data)) {
        setError(res.error || 'Nao foi possivel carregar prazos');
        setLoading(false);
        return;
      }

      setDeadlines(res.data as ApiDeadline[]);
      trackEvent('deadlines_loaded', { count: res.data.length, role: user.role });
    } catch (err) {
      setError((err as Error).message || 'Erro ao carregar prazos');
      captureException(err as Error, { context: 'loadDeadlines' });
    } finally {
      setLoading(false);
    }
  }

  function updateFilter<K extends keyof DeadlineFilters>(key: K, value: DeadlineFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
    setSuccess('Filtros limpos.');
  }

  function applyQuickView(view: PeriodFilterShortcut) {
    if (view === 'meus') {
      setFilters({
        ...EMPTY_FILTERS,
        responsible: getResponsibleLabel(user.email),
      });
      return;
    }

    setFilters(getQuickFilterState(view));
  }

  function saveFilter() {
    localStorage.setItem('lexora_deadlines_saved_filter', JSON.stringify(filters));
    setSuccess('Filtro salvo.');
  }

  function exportCsv(items: DeadlineViewItem[]) {
    const header = ['Prazo', 'Processo', 'Cliente', 'Origem', 'Vencimento', 'Risco', 'Status', 'Prioridade', 'Responsavel'];
    const rows = items.map((item) => [
      item.title,
      item.processLabel,
      item.client,
      getOriginLabel(item.origin),
      formatDate(item.dueDate),
      item.riskLabel,
      getStatusLabel(item.status),
      getPriorityLabel(item.priority),
      item.owner,
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((col) => `"${String(col).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'prazos-priorizados.csv';
    link.click();
    URL.revokeObjectURL(url);
    trackEvent('deadlines_exported', { count: items.length });
  }

  function toggleSelection(itemId: number) {
    setSelectedIds((prev) => (
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    ));
  }

  function selectFilteredEligible() {
    setSelectedIds(sortedDeadlines.filter((item) => item.massActionEligible).map((item) => item.id));
  }

  function clearSelection() {
    setSelectedIds([]);
  }

  function markProcessing(id: number, active: boolean) {
    setProcessingIds((prev) => (
      active
        ? Array.from(new Set([...prev, id]))
        : prev.filter((itemId) => itemId !== id)
    ));
  }

  async function concludeDeadline(item: DeadlineViewItem, reason: string, notes: string, mode: BulkActionMode) {
    markProcessing(item.id, true);
    setError('');

    try {
      const justification = [reason, notes].filter(Boolean).join(' - ');
      const res = await api.updateDeadline(item.id, {
        status: 'concluido',
        completionJustification: justification || reason || 'Conclusao manual',
      });
      if (res.status !== 200 || !res.data) {
        throw new Error(res.error || 'Nao foi possivel concluir o prazo');
      }

      setDeadlines((prev) => prev.map((deadline) => (deadline.id === item.id ? res.data : deadline)));
      setAuditLog((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
      setSuccess(mode === 'bulk' ? 'Conclusao em massa registrada com auditoria persistida.' : 'Prazo concluido com auditoria persistida.');
      trackEvent('deadline_completed', { id: item.id, mode, origin: item.origin });
    } catch (err) {
      setError((err as Error).message || 'Nao foi possivel concluir o prazo');
      captureException(err as Error, { context: 'concludeDeadline', deadlineId: item.id });
      throw err;
    } finally {
      markProcessing(item.id, false);
      setOpenMenuId(null);
    }
  }

  async function syncToAgenda(item: DeadlineViewItem) {
    markProcessing(item.id, true);
    setAgendaSyncMap((prev) => ({
      ...prev,
      [item.id]: {
        status: 'pending',
        message: 'Sincronizando com agenda operacional...',
        persisted: false,
        expectedContract: getIdleAgendaSyncState().expectedContract,
      },
    }));

    try {
      const res = await api.createAgendaEvent(buildAgendaPayload(item.agendaDraft));
      if (res.status !== 200 || !res.data) {
        throw new Error(res.error || 'Nao foi possivel sincronizar o prazo com a agenda');
      }

      setAgendaSyncMap((prev) => ({
        ...prev,
        [item.id]: buildAgendaSuccessState(res.data.id),
      }));
      setSuccess('Prazo enviado para a agenda operacional.');
      trackEvent('deadline_agenda_synced', { id: item.id, agendaId: res.data.id });
    } catch (err) {
      const message = (err as Error).message || 'Nao foi possivel sincronizar o prazo com a agenda';
      setAgendaSyncMap((prev) => ({
        ...prev,
        [item.id]: buildAgendaErrorState(message),
      }));
      setError(message);
      captureException(err as Error, { context: 'syncDeadlineToAgenda', deadlineId: item.id });
      throw err;
    } finally {
      markProcessing(item.id, false);
    }
  }

  async function runBulkAction(kind: BulkActionKind) {
    const actionableItems = selectedItems.filter((item) => item.massActionEligible);
    if (actionableItems.length === 0) {
      setError('Selecione ao menos um prazo elegivel para acao em massa.');
      return;
    }

    if (kind === 'complete' && !bulkReason) {
      setError('Selecione um motivo de auditoria para concluir em massa.');
      return;
    }

    if (kind === 'complete') {
      const res = await api.bulkDeadlineAction({
        action: {
          type: 'complete',
          deadlineIds: actionableItems.map((item) => item.id),
          reason: [bulkReason, bulkNotes].filter(Boolean).join(' - ') || bulkReason,
        },
      });

      if (res.status !== 200 || !res.data) {
        setError(res.error || 'Nao foi possivel concluir os prazos selecionados.');
        return;
      }

      const updatedById = new Map(
        res.data.items
          .filter((item) => item.status === 'updated' && item.deadline)
          .map((item) => [item.deadlineId, item.deadline as ApiDeadline]),
      );

      setDeadlines((prev) => prev.map((deadline) => updatedById.get(deadline.id) ?? deadline));
      setAuditLog((prev) => {
        const next = { ...prev };
        actionableItems.forEach((item) => delete next[item.id]);
        return next;
      });
      setSuccess(`${res.data.summary.updated} prazo(s) concluidos com auditoria persistida.${res.data.summary.failed > 0 ? ` ${res.data.summary.failed} falharam.` : ''}`);
      setSelectedIds((prev) => prev.filter((id) => !updatedById.has(id)));
      setBulkNotes('');
      trackEvent('deadline_bulk_completed', {
        requested: res.data.summary.requested,
        updated: res.data.summary.updated,
        failed: res.data.summary.failed,
        replayed: res.data.idempotency.replayed,
      });
      return;
    }

    let completed = 0;
    let failed = 0;
    for (const item of actionableItems) {
      try {
        await syncToAgenda(item);
        completed += 1;
      } catch {
        failed += 1;
      }
    }
    setSuccess(`${completed} prazo(s) sincronizados com a agenda.${failed > 0 ? ` ${failed} falharam.` : ''}`);
    setSelectedIds((prev) => prev.filter((id) => !actionableItems.some((item) => item.id === id)));
  }

  const visibleCriticalCount = sortedDeadlines.filter((item) => item.riskTone === 'warning').length;
  const visibleOverdueCount = sortedDeadlines.filter((item) => item.riskTone === 'danger').length;
  const visiblePublicationCount = sortedDeadlines.filter((item) => item.origin === 'publicacao').length;
  const selectedActionableCount = selectedItems.filter((item) => item.massActionEligible).length;

  if (loading) {
    return (
      <section className="deadlines-page" aria-label="Prazos">
        <div className="deadlines-loading" role="status">
          <RefreshCw size={16} className="spin" aria-hidden="true" />
          <p>Carregando prazos...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="deadlines-page" aria-label="Prazos">
      <header className="deadlines-header-card">
        <div className="deadlines-header-main">
          <p className="deadlines-eyebrow">Controle operacional</p>
          <h3>Priorize por risco e vencimento, conclua com auditoria e leve o prazo certo para a agenda.</h3>
          <p className="deadlines-subtitle">
            A tela organiza fila imediata, ações em massa auditáveis e contexto de publicação com suporte persistido no backend.
          </p>
          <div className="deadlines-header-summary" aria-label="Pulso dos prazos">
            <div className="deadlines-header-summary-card" data-tone="neutral">
              <span>Em exibicao</span>
              <strong>{sortedDeadlines.length}</strong>
            </div>
            <div className="deadlines-header-summary-card" data-tone={visibleCriticalCount > 0 ? 'warning' : 'neutral'}>
              <span>Janela critica</span>
              <strong>{visibleCriticalCount}</strong>
            </div>
            <div className="deadlines-header-summary-card" data-tone={visibleOverdueCount > 0 ? 'danger' : 'neutral'}>
              <span>Atrasados</span>
              <strong>{visibleOverdueCount}</strong>
            </div>
            <div className="deadlines-header-summary-card" data-tone="info">
              <span>Agenda criada</span>
              <strong>{kpis.agendaSynced}</strong>
            </div>
          </div>
        </div>

        <div className="deadlines-header-side">
          <div className="deadlines-header-actions">
            <button className="btn-primary" aria-label="Novo prazo">
              <Plus size={16} aria-hidden="true" />
              Novo Prazo
            </button>
            <button className="btn-secondary" aria-label="Ir para agenda" onClick={() => navigate('/agenda')}>
              <CalendarDays size={16} aria-hidden="true" />
              Abrir Agenda
            </button>
            <button className="btn-secondary" aria-label="Exportar prazos" onClick={() => exportCsv(sortedDeadlines)}>
              <Download size={16} aria-hidden="true" />
              Exportar
            </button>
          </div>

          <aside className="deadlines-focus-card" data-tone={focusDeadline?.riskTone ?? 'info'} aria-label="Foco do prazo">
            <span className="deadlines-focus-card-eyebrow">Proxima melhor acao</span>
            <strong>{focusDeadline?.title ?? 'Nenhum prazo priorizado'}</strong>
            <p>{focusDeadline ? `${focusDeadline.processTitle} · ${focusDeadline.client}` : 'Use filtros e atalhos para recuperar o recorte operacional.'}</p>
            <small>{focusDeadline ? `${focusDeadline.relativeDueLabel} · ${focusDeadline.owner}` : 'Sem item focal no recorte atual.'}</small>
            {focusDeadline && (
              <div className="deadlines-focus-card-meta">
                {statusBadge(focusDeadline.status)}
                {priorityBadge(focusDeadline.priority)}
              </div>
            )}
          </aside>
        </div>
      </header>

      <section className="deadlines-kpis" aria-label="Indicadores de prazos">
        <button type="button" className="deadline-kpi-card" onClick={() => applyQuickView('hoje')}>
          <p>Prazos hoje</p>
          <strong>{kpis.today}</strong>
          <span>Foco diario imediato</span>
        </button>
        <button type="button" className="deadline-kpi-card" onClick={() => setFilters({ ...EMPTY_FILTERS, period: 'semana' })}>
          <p>Proximos 7 dias</p>
          <strong>{kpis.week}</strong>
          <span>Cadencia semanal</span>
        </button>
        <button type="button" className="deadline-kpi-card warning" onClick={() => applyQuickView('criticos')}>
          <p>Criticos</p>
          <strong>{kpis.critical}</strong>
          <span>48h ou menos</span>
        </button>
        <button type="button" className="deadline-kpi-card danger" onClick={() => applyQuickView('atrasados')}>
          <p>Atrasados</p>
          <strong>{kpis.overdue}</strong>
          <span>Acao imediata</span>
        </button>
        <button type="button" className="deadline-kpi-card success" onClick={() => setFilters({ ...EMPTY_FILTERS, status: 'concluido' })}>
          <p>Auditaveis</p>
          <strong>{kpis.audited}</strong>
          <span>Concluidos com trilha</span>
        </button>
      </section>

      {error && (
        <div className="deadlines-alert error" role="alert">
          <AlertTriangle size={16} aria-hidden="true" />
          <span>{error}</span>
          <button className="btn-ghost" onClick={loadDeadlines}>Retry</button>
        </div>
      )}

      {success && (
        <div className="deadlines-alert success" role="status">
          <CheckCircle2 size={16} aria-hidden="true" />
          <span>{success}</span>
        </div>
      )}

      <section className="deadlines-ops-grid" aria-label="Operacao de prazos">
        <div className="deadlines-queue-card">
          <div className="deadlines-section-heading">
            <div>
              <p>Fila prioritaria</p>
              <h4>Risco, publicacao e vencimento no mesmo plano</h4>
            </div>
            <button className="btn-ghost" onClick={() => setSortBy('risco')}>
              <ShieldAlert size={14} aria-hidden="true" />
              Priorizar risco
            </button>
          </div>

          <div className="deadline-priority-strip">
            {topQueue.length === 0 && <p className="deadline-muted-text">Sem fila priorizada no recorte atual.</p>}
            {topQueue.map((item, index) => (
              <article key={item.id} className="deadline-priority-card" data-tone={item.riskTone}>
                <span>{index === 0 ? 'Agora' : index === 1 ? 'Em seguida' : 'Na sequencia'}</span>
                <strong>{item.title}</strong>
                <small>{item.relativeDueLabel} · {item.riskLabel}</small>
                <div className="deadline-inline-meta">
                  {statusBadge(item.status)}
                  {priorityBadge(item.priority)}
                </div>
              </article>
            ))}
          </div>
        </div>

        <aside className="deadlines-bulk-card">
          <div className="deadlines-section-heading">
            <div>
              <p>Acoes em massa seguras</p>
              <h4>Selecao com auditoria e agenda</h4>
            </div>
            <button className="btn-ghost" onClick={selectFilteredEligible}>
              <CheckCircle2 size={14} aria-hidden="true" />
              Selecionar recorte
            </button>
          </div>

          <div className="deadline-bulk-stats">
            <div>
              <span>Selecionados</span>
              <strong>{selectedIds.length}</strong>
            </div>
            <div>
              <span>Elegiveis</span>
              <strong>{selectedActionableCount}</strong>
            </div>
            <div>
              <span>Publicacoes</span>
              <strong>{visiblePublicationCount}</strong>
            </div>
          </div>

          <label className="deadline-field">
            <span>Motivo da conclusao</span>
            <select value={bulkReason} onChange={(event) => setBulkReason(event.target.value)}>
              {BULK_REASON_OPTIONS.map((reason) => (
                <option key={reason} value={reason}>{reason}</option>
              ))}
            </select>
          </label>

          <label className="deadline-field">
            <span>Observacao de auditoria</span>
            <textarea
              className="deadline-bulk-notes"
              value={bulkNotes}
              onChange={(event) => setBulkNotes(event.target.value)}
              placeholder="Explique o criterio usado na acao em massa."
            />
          </label>

          <div className="deadline-bulk-actions">
            <button className="btn-primary" onClick={() => void runBulkAction('complete')} disabled={selectedActionableCount === 0}>
              <CheckCircle2 size={14} aria-hidden="true" />
              Concluir selecionados
            </button>
            <button className="btn-secondary" onClick={() => void runBulkAction('schedule')} disabled={selectedActionableCount === 0}>
              <CalendarDays size={14} aria-hidden="true" />
              Enviar para agenda
            </button>
            <button className="btn-ghost" onClick={clearSelection} disabled={selectedIds.length === 0}>
              Limpar selecao
            </button>
          </div>

          <div className="deadline-contract-note">
            <strong>Contrato esperado</strong>
            <p>A conclusão em massa já usa `deadlines.bulkAction`. A sincronização de agenda ainda depende de `createAgendaEvent` até consolidarmos o vínculo prazo ↔ agenda no contrato principal.</p>
          </div>
        </aside>
      </section>

      <section className="deadlines-filters" aria-label="Busca e filtros de prazos">
        <div className="deadline-quick-views">
          <button type="button" className={`quick-view-chip${activeQuickView === 'todos' ? ' is-active' : ''}`} onClick={() => applyQuickView('todos')}>Todos</button>
          <button type="button" className={`quick-view-chip${activeQuickView === 'hoje' ? ' is-active' : ''}`} onClick={() => applyQuickView('hoje')}>Hoje</button>
          <button type="button" className={`quick-view-chip${activeQuickView === 'atrasados' ? ' is-active' : ''}`} onClick={() => applyQuickView('atrasados')}>Atrasados</button>
          <button type="button" className={`quick-view-chip${activeQuickView === 'criticos' ? ' is-active' : ''}`} onClick={() => applyQuickView('criticos')}>Criticos</button>
          <button type="button" className={`quick-view-chip${activeQuickView === 'publicacao' ? ' is-active' : ''}`} onClick={() => applyQuickView('publicacao')}>Publicacao</button>
          <button type="button" className={`quick-view-chip${activeQuickView === 'meus' ? ' is-active' : ''}`} onClick={() => applyQuickView('meus')}>Meus prazos</button>
        </div>

        <div className="filters-grid-top">
          <label className="deadline-field search">
            <span>Busca principal</span>
            <div className="input-icon-wrap">
              <Search size={14} aria-hidden="true" />
              <input
                type="search"
                value={filters.query}
                onChange={(event) => updateFilter('query', event.target.value)}
                placeholder="Processo, cliente, origem ou contexto"
              />
            </div>
          </label>

          <label className="deadline-field">
            <span>Periodo</span>
            <select value={filters.period} onChange={(event) => updateFilter('period', event.target.value as DeadlinePeriodFilter)}>
              <option value="todos">Todos</option>
              <option value="hoje">Hoje</option>
              <option value="semana">Semana</option>
              <option value="mes">Mes</option>
              <option value="atrasados">Atrasados</option>
            </select>
          </label>

          <label className="deadline-field">
            <span>Status</span>
            <select value={filters.status} onChange={(event) => updateFilter('status', event.target.value)}>
              <option value="">Todos</option>
              <option value="aberto">Aberto</option>
              <option value="critico">Critico</option>
              <option value="atrasado">Atrasado</option>
              <option value="concluido">Concluido</option>
            </select>
          </label>

          <label className="deadline-field">
            <span>Prioridade</span>
            <select value={filters.priority} onChange={(event) => updateFilter('priority', event.target.value)}>
              <option value="">Todas</option>
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="baixa">Baixa</option>
            </select>
          </label>

          <label className="deadline-field">
            <span>Responsavel</span>
            <select value={filters.responsible} onChange={(event) => updateFilter('responsible', event.target.value)}>
              <option value="">Todos</option>
              {owners.map((owner) => <option key={owner} value={owner}>{owner}</option>)}
            </select>
          </label>

          <div className="deadline-filter-actions compact">
            <button className="btn-ghost" onClick={() => setShowAdvancedFilters((prev) => !prev)}>
              <Filter size={14} aria-hidden="true" />
              {showAdvancedFilters ? 'Ocultar avancados' : 'Filtros avancados'}
            </button>
          </div>
        </div>

        {showAdvancedFilters && (
          <div className="filters-grid-bottom">
            <label className="deadline-field">
              <span>Area juridica</span>
              <select value={filters.area} onChange={(event) => updateFilter('area', event.target.value)}>
                <option value="">Todas</option>
                {areas.map((area) => <option key={area} value={area}>{area}</option>)}
              </select>
            </label>

            <label className="deadline-field">
              <span>Processo</span>
              <select value={filters.process} onChange={(event) => updateFilter('process', event.target.value)}>
                <option value="">Todos</option>
                {processes.map((process) => <option key={process.id} value={process.id}>{process.label}</option>)}
              </select>
            </label>

            <label className="deadline-field">
              <span>Origem do prazo</span>
              <select value={filters.origin} onChange={(event) => updateFilter('origin', event.target.value)}>
                <option value="">Todas</option>
                {ORIGINS.map((origin) => <option key={origin} value={origin}>{getOriginLabel(origin)}</option>)}
              </select>
            </label>

            <label className="deadline-checkline">
              <input
                type="checkbox"
                checked={filters.dueTodayOnly}
                onChange={(event) => updateFilter('dueTodayOnly', event.target.checked)}
              />
              Vencendo hoje
            </label>

            <label className="deadline-field">
              <span>Vencendo em ate</span>
              <select value={filters.dueInDays} onChange={(event) => updateFilter('dueInDays', event.target.value)}>
                <option value="">Qualquer prazo</option>
                <option value="1">1 dia</option>
                <option value="3">3 dias</option>
                <option value="7">7 dias</option>
                <option value="15">15 dias</option>
              </select>
            </label>

            <label className="deadline-field">
              <span>Ordenacao</span>
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value as DeadlineSortField)}>
                <option value="risco">Risco</option>
                <option value="vencimento">Vencimento</option>
                <option value="prioridade">Prioridade</option>
                <option value="status">Status</option>
              </select>
            </label>

            <div className="deadline-filter-actions">
              <button className="btn-ghost" onClick={clearFilters}>
                <Filter size={14} aria-hidden="true" />
                Limpar filtros
              </button>
              <button className="btn-ghost" onClick={saveFilter}>
                <Save size={14} aria-hidden="true" />
                Salvar filtro
              </button>
              <button className="btn-ghost" onClick={() => setViewMode((prev) => (prev === 'lista' ? 'calendario' : 'lista'))}>
                <CalendarDays size={14} aria-hidden="true" />
                {viewMode === 'lista' ? 'Lista / Calendario' : 'Calendario / Lista'}
              </button>
            </div>
          </div>
        )}

        <div className="deadline-filter-summary">
          <strong>{sortedDeadlines.length}</strong> prazo(s) na visao atual.
          {hasActiveFilter && <span className="active-filter-chip">Filtro ativo</span>}
        </div>
      </section>

      {viewItems.length === 0 && !error && (
        <div className="deadlines-empty" role="status">
          <div className="deadlines-empty-icon" aria-hidden="true">
            <CalendarDays size={18} />
          </div>
          <h3>Sem prazos cadastrados</h3>
          <p>Nao ha prazos vinculados a sua carteira no momento.</p>
        </div>
      )}

      {viewItems.length > 0 && sortedDeadlines.length === 0 && (
        <div className="deadlines-empty" role="status">
          <div className="deadlines-empty-icon" aria-hidden="true">
            <Filter size={18} />
          </div>
          <h3>Nenhum prazo corresponde aos filtros</h3>
          <p>Ajuste o recorte para ampliar os resultados.</p>
          <button className="btn-secondary" onClick={clearFilters}>Limpar filtros</button>
        </div>
      )}

      {sortedDeadlines.length > 0 && viewMode === 'lista' && (
        <section className="deadlines-table-shell" aria-label="Lista de prazos">
          <div className="deadlines-table-toolbar">
            <div>
              <strong>{sortedDeadlines.length}</strong>
              <span> prazo(s) priorizados por risco, vencimento e contexto operacional</span>
            </div>
            <div className="deadline-table-toolbar-meta">
              <span>{recentAudits.length} auditoria(s) recente(s)</span>
              <button className="btn-ghost" onClick={selectFilteredEligible}>
                Selecionar elegiveis
              </button>
            </div>
          </div>

          <table className="deadlines-table">
            <thead>
              <tr>
                <th scope="col" aria-label="Selecionar coluna">Sel.</th>
                <th scope="col">Prazo</th>
                <th scope="col">Risco e vencimento</th>
                <th scope="col">Automacao e agenda</th>
                <th scope="col">Status</th>
                <th scope="col">Responsavel</th>
                <th scope="col">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {pagedDeadlines.map((item) => {
                const isProcessing = processingIds.includes(item.id);
                const isSelected = selectedIds.includes(item.id);

                return (
                  <tr
                    key={item.id}
                    tabIndex={0}
                    role="button"
                    aria-label={`Abrir detalhe do prazo ${item.title}`}
                    onClick={() => {
                      setSelectedDeadlineId(item.id);
                      setOpenMenuId(null);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedDeadlineId(item.id);
                        setOpenMenuId(null);
                      }
                    }}
                  >
                    <td onClick={(event) => event.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={!item.massActionEligible || isProcessing}
                        onChange={() => toggleSelection(item.id)}
                        aria-label={`Selecionar prazo ${item.title}`}
                      />
                    </td>
                    <td>
                      <div className="deadline-primary">
                        <strong>{item.title}</strong>
                        <small>{item.processTitle} · {item.client}</small>
                        <span className="deadline-origin-line">{item.area} · {getOriginLabel(item.origin)}</span>
                      </div>
                    </td>
                    <td>
                      <div className={`deadline-risk-cell tone-${item.riskTone}`}>
                        <strong>{item.relativeDueLabel}</strong>
                        <small>{formatDate(item.dueDate)} · {item.riskLabel}</small>
                      </div>
                    </td>
                    <td>
                      <div className="deadline-context-cell">
                        <strong>{item.automationContext.label}</strong>
                        <small>{item.agendaSyncState.message}</small>
                      </div>
                    </td>
                    <td>
                      <div className="deadline-status-stack">
                        {statusBadge(item.status)}
                        {priorityBadge(item.priority)}
                      </div>
                    </td>
                    <td>
                      <div className="deadline-owner-cell">
                        <span>{item.owner}</span>
                        <small>{item.ownerLabel}</small>
                      </div>
                    </td>
                    <td>
                      <div className="deadline-row-actions" onClick={(event) => event.stopPropagation()}>
                        <button
                          className="icon-action"
                          aria-label={`Abrir menu de acoes do prazo ${item.title}`}
                          onClick={() => setOpenMenuId((prev) => (prev === item.id ? null : item.id))}
                        >
                          <MoreHorizontal size={16} aria-hidden="true" />
                        </button>
                        {openMenuId === item.id && (
                          <div className="deadline-row-menu" role="menu" aria-label="Menu de acoes">
                            <button onClick={() => setSelectedDeadlineId(item.id)}>Detalhe rapido</button>
                            <button disabled={isProcessing || item.status === 'concluido'} onClick={() => void concludeDeadline(item, 'Conclusao individual', 'Concluido pela linha operacional.', 'single')}>
                              Concluir prazo
                            </button>
                            <button disabled={isProcessing} onClick={() => void syncToAgenda(item)}>Enviar para agenda</button>
                            <button onClick={() => navigate(item.automationContext.linkedPath)}>{item.automationContext.actionLabel}</button>
                            <button onClick={() => navigate(`/processos/${item.processId}`)}>Abrir processo</button>
                            <button onClick={() => navigate('/tarefas')}>Criar tarefa</button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="deadlines-mobile-list" aria-label="Lista mobile de prazos">
            {pagedDeadlines.map((item) => (
              <article key={`mobile-${item.id}`} className="deadline-mobile-card">
                <div className="deadline-mobile-topline">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(item.id)}
                    disabled={!item.massActionEligible || processingIds.includes(item.id)}
                    onChange={() => toggleSelection(item.id)}
                    aria-label={`Selecionar prazo ${item.title}`}
                  />
                  <button
                    type="button"
                    className="deadline-mobile-main"
                    onClick={() => setSelectedDeadlineId(item.id)}
                    aria-label={`Abrir detalhe do prazo ${item.title}`}
                  >
                    <span className="deadline-mobile-kicker">{item.processLabel}</span>
                    <strong>{item.title}</strong>
                    <span>{item.processTitle} · {item.client}</span>
                  </button>
                </div>

                <div className="deadline-mobile-badges">
                  {statusBadge(item.status)}
                  {priorityBadge(item.priority)}
                </div>

                <dl className="deadline-mobile-grid">
                  <div>
                    <dt>Risco</dt>
                    <dd className={`tone-${item.riskTone}`}>
                      <strong>{item.relativeDueLabel}</strong>
                      <span>{item.riskLabel}</span>
                    </dd>
                  </div>
                  <div>
                    <dt>Agenda</dt>
                    <dd>
                      <strong>{item.agendaSyncState.status === 'synced' ? 'Sincronizado' : 'Pendente'}</strong>
                      <span>{item.agendaSyncState.message}</span>
                    </dd>
                  </div>
                  <div>
                    <dt>Origem</dt>
                    <dd>
                      <strong>{getOriginLabel(item.origin)}</strong>
                      <span>{item.automationContext.label}</span>
                    </dd>
                  </div>
                  <div>
                    <dt>Responsavel</dt>
                    <dd>
                      <strong>{item.owner}</strong>
                      <span>{item.area}</span>
                    </dd>
                  </div>
                </dl>

                <div className="deadline-mobile-actions">
                  <button className="btn-primary" onClick={() => void concludeDeadline(item, 'Conclusao mobile', 'Concluido via card mobile.', 'single')}>
                    <CheckCircle2 size={14} aria-hidden="true" />
                    Concluir
                  </button>
                  <button className="btn-secondary" onClick={() => void syncToAgenda(item)}>
                    <CalendarDays size={14} aria-hidden="true" />
                    Agenda
                  </button>
                </div>
              </article>
            ))}
          </div>

          {pageCount > 1 && (
            <div className="deadlines-pagination">
              <button className="btn-secondary" disabled={page === 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>
                <ChevronLeft size={14} aria-hidden="true" />
                Anterior
              </button>
              <span>Pagina {page} de {pageCount}</span>
              <button className="btn-secondary" disabled={page === pageCount} onClick={() => setPage((prev) => Math.min(pageCount, prev + 1))}>
                Proxima
                <ChevronRight size={14} aria-hidden="true" />
              </button>
            </div>
          )}
        </section>
      )}

      {sortedDeadlines.length > 0 && viewMode === 'calendario' && (
        <section className="deadlines-calendar-shell" aria-label="Calendario de prazos">
          <div className="calendar-mode-switch">
            <button className={`btn-ghost ${calendarMode === 'dia' ? 'active' : ''}`} onClick={() => setCalendarMode('dia')}>Dia</button>
            <button className={`btn-ghost ${calendarMode === 'semana' ? 'active' : ''}`} onClick={() => setCalendarMode('semana')}>Semana</button>
            <button className={`btn-ghost ${calendarMode === 'mes' ? 'active' : ''}`} onClick={() => setCalendarMode('mes')}>Mes</button>
          </div>

          <div className={`calendar-grid mode-${calendarMode}`}>
            {calendarItems.map(({ date, items }) => (
              <article key={date} className="calendar-cell">
                <header>
                  <h4>{formatDate(date)}</h4>
                  <span>{items.length}</span>
                </header>
                <div className="calendar-events">
                  {items.map((item) => (
                    <button key={item.id} className="calendar-event" onClick={() => setSelectedDeadlineId(item.id)}>
                      <span>{item.title}</span>
                      {statusBadge(item.status)}
                    </button>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="deadlines-audit-rail" aria-label="Auditoria recente">
        <div className="deadlines-section-heading">
          <div>
            <p>Auditoria recente</p>
            <h4>Concluidos com evidencias operacionais</h4>
          </div>
        </div>

        <div className="deadline-audit-list">
          {recentAudits.length === 0 && <p className="deadline-muted-text">Ainda nao ha trilha recente para o recorte atual.</p>}
          {recentAudits.map((item) => (
            <article key={`audit-${item.id}`} className="deadline-audit-item">
              <div>
                <strong>{item.title}</strong>
                <p>{item.completionAudit?.reason}</p>
              </div>
              <small>{item.completionAudit ? `${formatDateTime(item.completionAudit.completedAt)} · ${item.completionAudit.completedBy}` : ''}</small>
            </article>
          ))}
        </div>
      </section>

      {selectedDeadline && (
        <>
          <button className="deadline-drawer-backdrop" onClick={() => setSelectedDeadlineId(null)} aria-label="Fechar detalhe rapido" />
          <aside className="deadline-drawer" role="dialog" aria-modal="true" aria-labelledby="deadline-drawer-title">
            <header>
              <div>
                <small>Detalhe do prazo</small>
                <h3 id="deadline-drawer-title">{selectedDeadline.title}</h3>
                <p className="deadline-drawer-context">{selectedDeadline.processTitle} · {selectedDeadline.client}</p>
              </div>
              <button className="icon-action" onClick={() => setSelectedDeadlineId(null)} aria-label="Fechar drawer">
                <X size={15} aria-hidden="true" />
              </button>
            </header>

            <div className="deadline-drawer-body">
              <section className="deadline-drawer-top-metrics">
                <div>{statusBadge(selectedDeadline.status)}</div>
                <div>{priorityBadge(selectedDeadline.priority)}</div>
                <div className={`deadline-drawer-risk tone-${selectedDeadline.riskTone}`}>
                  <TimerReset size={14} aria-hidden="true" />
                  <span>{selectedDeadline.relativeDueLabel}</span>
                </div>
              </section>

              <dl className="deadline-detail-grid">
                <div><dt>Vencimento</dt><dd>{formatDate(selectedDeadline.dueDate)}</dd></div>
                <div><dt>Processo</dt><dd>{selectedDeadline.processLabel}</dd></div>
                <div><dt>Cliente</dt><dd>{selectedDeadline.client}</dd></div>
                <div><dt>Responsavel</dt><dd>{selectedDeadline.owner}</dd></div>
                <div><dt>Origem</dt><dd>{getOriginLabel(selectedDeadline.origin)}</dd></div>
                <div><dt>Area</dt><dd>{selectedDeadline.area}</dd></div>
              </dl>

              <section className="deadline-history-card">
                <h4>Contexto de automacao e publicacao</h4>
                <p>{selectedDeadline.automationContext.summary}</p>
                <div className="deadline-drawer-links">
                  <button className="btn-linklike" onClick={() => navigate(selectedDeadline.automationContext.linkedPath)}>
                    <ExternalLink size={14} aria-hidden="true" />
                    {selectedDeadline.automationContext.actionLabel}
                  </button>
                  {selectedDeadline.origin === 'publicacao' && (
                    <button className="btn-linklike" onClick={() => navigate(`/triagem?processId=${selectedDeadline.processId}`)}>
                      <ExternalLink size={14} aria-hidden="true" />
                      Abrir triagem
                    </button>
                  )}
                </div>
              </section>

              <section className="deadline-history-card">
                <h4>Agenda operacional</h4>
                <p>{selectedDeadline.agendaSyncState.message}</p>
                <p>Janela sugerida: {selectedDeadline.agendaDraft.startTime} - {selectedDeadline.agendaDraft.endTime} em {formatDate(selectedDeadline.agendaDraft.date)}.</p>
                <ul className="deadline-contract-list">
                  {selectedDeadline.agendaSyncState.expectedContract.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>

              <section className="deadline-checklist-card">
                <header>
                  <h4>Checklist operacional</h4>
                </header>
                <label><input type="checkbox" /> Validar anexos obrigatorios</label>
                <label><input type="checkbox" /> Registrar protocolo</label>
                <label><input type="checkbox" /> Atualizar andamento do processo</label>
              </section>

              <section className="deadline-history-card">
                <h4>Auditoria de conclusao</h4>
                {selectedDeadline.completionAudit ? (
                  <>
                    <p>Motivo: {selectedDeadline.completionAudit.reason}</p>
                    <p>Responsavel: {selectedDeadline.completionAudit.completedBy}</p>
                    <p>Quando: {formatDateTime(selectedDeadline.completionAudit.completedAt)}</p>
                    {selectedDeadline.completionAudit.notes && <p>Notas: {selectedDeadline.completionAudit.notes}</p>}
                    {!selectedDeadline.completionAudit.persisted && <p>Contrato esperado: persistir `completedBy`, `reason`, `notes` e `completionMode` no backend.</p>}
                  </>
                ) : (
                  <p>Nenhuma trilha de conclusao disponivel para este prazo.</p>
                )}
              </section>

              <section className="deadline-notes-card">
                <h4>Observacoes</h4>
                <p>{selectedDeadline.notes || 'Sem observacoes registradas.'}</p>
              </section>

              <div className="deadline-drawer-links">
                <button className="btn-linklike" onClick={() => navigate(`/processos/${selectedDeadline.processId}`)}>
                  <ExternalLink size={14} aria-hidden="true" />
                  Abrir processo
                </button>
                <button className="btn-linklike" onClick={() => navigate('/tarefas')}>
                  <FileText size={14} aria-hidden="true" />
                  Criar tarefa
                </button>
              </div>

              <div className="deadline-drawer-actions sticky">
                <button className="btn-primary" onClick={() => void concludeDeadline(selectedDeadline, 'Conclusao via drawer', 'Concluido a partir do detalhe rapido.', 'single')} disabled={selectedDeadline.status === 'concluido'}>
                  <CheckCircle2 size={15} aria-hidden="true" />
                  Concluir prazo
                </button>
                <button className="btn-secondary" onClick={() => void syncToAgenda(selectedDeadline)}>
                  <CalendarDays size={15} aria-hidden="true" />
                  Enviar para agenda
                </button>
                <button className="btn-secondary" onClick={() => navigate(selectedDeadline.automationContext.linkedPath)}>
                  <ExternalLink size={15} aria-hidden="true" />
                  Abrir contexto
                </button>
              </div>
            </div>
          </aside>
        </>
      )}
    </section>
  );
}
