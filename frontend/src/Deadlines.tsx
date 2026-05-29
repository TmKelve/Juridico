import { useEffect, useEffectEvent, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
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
import './Dashboard.css';
import './Processes.css';
import './Publications.css';
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

  // removed focusDeadline
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

  // removed visibleCriticalCount and visibleOverdueCount
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
      <header className="dl-hero" aria-label="Cabeçalho de prazos">
        <div className="dl-hero-copy">
          <p className="dl-hero-eyebrow">Controle Operacional</p>
          <h1 className="dl-hero-title">Prazos</h1>
          <p className="dl-hero-subtitle">Priorize por risco e vencimento, conclua com auditoria e leve o prazo certo para a agenda.</p>
          <div className="dl-hero-chips" aria-label="Pulso dos prazos">
            {kpis.overdue > 0 && (
              <div className="dl-hero-chip" data-tone="critical">
                <strong>{kpis.overdue}</strong><span>Atrasados</span>
              </div>
            )}
            {kpis.critical > 0 && (
              <div className="dl-hero-chip" data-tone="warning">
                <strong>{kpis.critical}</strong><span>Críticos</span>
              </div>
            )}
            {kpis.today > 0 && (
              <div className="dl-hero-chip" data-tone="brand">
                <strong>{kpis.today}</strong><span>Hoje</span>
              </div>
            )}
            {(kpis.overdue > 0 || kpis.critical > 0 || kpis.today > 0) && (
              <span className="dl-hero-chips-sep" aria-hidden="true" />
            )}
            <div
              className="dl-hero-pulse"
              data-tone={kpis.overdue > 0 ? 'critical' : kpis.critical > 0 ? 'warning' : 'ok'}
            >
              <span className="dl-hero-pulse-dot" aria-hidden="true" />
              <span>{kpis.overdue > 0 ? 'Ação imediata' : kpis.critical > 0 ? 'Atenção crítica' : 'Em dia'}</span>
            </div>
          </div>
        </div>
        <div className="dl-hero-actions">
          <button type="button" className="btn-primary" aria-label="Novo prazo">
            <Plus size={15} aria-hidden="true" /> Novo Prazo
          </button>
          <button type="button" className="btn-secondary" aria-label="Ir para agenda" onClick={() => navigate('/agenda')}>
            <CalendarDays size={15} aria-hidden="true" /> Abrir Agenda
          </button>
          <button type="button" className="btn-secondary" aria-label="Exportar prazos" onClick={() => exportCsv(sortedDeadlines)}>
            <Download size={15} aria-hidden="true" /> Exportar
          </button>
          <button type="button" className="btn-secondary" aria-label="Atualizar prazos" onClick={loadDeadlines}>
            <RefreshCw size={15} aria-hidden="true" /> Atualizar
          </button>
        </div>
      </header>

      <section className="dl-kpis" aria-label="Indicadores de prazos">
        <button type="button" className="metric-card" data-kpi-color="primary"
          onClick={() => applyQuickView('hoje')}
          aria-label={`Prazos hoje: ${kpis.today}`}
        >
          <div className="metric-top-row">
            <p className="metric-value">{kpis.today}</p>
            <div className="metric-icon" aria-hidden="true"><CalendarDays size={16} /></div>
          </div>
          <p className="metric-label">Prazos hoje</p>
          <p className="metric-microtext">Foco diário imediato</p>
        </button>
        <button type="button" className="metric-card" data-kpi-color="info"
          onClick={() => setFilters({ ...EMPTY_FILTERS, period: 'semana' })}
          aria-label={`Próximos 7 dias: ${kpis.week}`}
        >
          <div className="metric-top-row">
            <p className="metric-value">{kpis.week}</p>
            <div className="metric-icon" aria-hidden="true"><CalendarDays size={16} /></div>
          </div>
          <p className="metric-label">Próximos 7 dias</p>
          <p className="metric-microtext">Cadência semanal</p>
        </button>
        <button type="button" className="metric-card" data-kpi-color="warning"
          onClick={() => applyQuickView('criticos')}
          aria-label={`Críticos: ${kpis.critical}`}
        >
          <div className="metric-top-row">
            <p className="metric-value">{kpis.critical}</p>
            <div className="metric-icon" aria-hidden="true"><ShieldAlert size={16} /></div>
          </div>
          <p className="metric-label">Críticos</p>
          <p className="metric-microtext">48h ou menos</p>
        </button>
        <button type="button" className="metric-card" data-kpi-color="error"
          onClick={() => applyQuickView('atrasados')}
          aria-label={`Atrasados: ${kpis.overdue}`}
        >
          <div className="metric-top-row">
            <p className="metric-value">{kpis.overdue}</p>
            <div className="metric-icon" aria-hidden="true"><AlertTriangle size={16} /></div>
          </div>
          <p className="metric-label">Atrasados</p>
          <p className="metric-microtext">Ação imediata</p>
        </button>
        <button type="button" className="metric-card" data-kpi-color="success"
          onClick={() => setFilters({ ...EMPTY_FILTERS, status: 'concluido' })}
          aria-label={`Auditáveis: ${kpis.audited}`}
        >
          <div className="metric-top-row">
            <p className="metric-value">{kpis.audited}</p>
            <div className="metric-icon" aria-hidden="true"><CheckCircle2 size={16} /></div>
          </div>
          <p className="metric-label">Auditáveis</p>
          <p className="metric-microtext">Concluídos com trilha</p>
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

      <section className="deadlines-ops-grid" aria-label="Fila e ações em massa">
        {/* Fila prioritária */}
        <div className="deadlines-queue-card">
          <div className="dl-ops-head">
            <div>
              <p className="dl-ops-eyebrow">Fila prioritária</p>
              <h3 className="dl-ops-title">Próximas ações por risco</h3>
            </div>
            <label className="dl-sort-label" aria-label="Ordenar lista por">
              <select
                className="dl-sort-inline"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as DeadlineSortField)}
              >
                <option value="risco">Por risco</option>
                <option value="vencimento">Por vencimento</option>
                <option value="prioridade">Por prioridade</option>
                <option value="status">Por status</option>
              </select>
            </label>
          </div>

          <div className="deadline-priority-strip">
            {topQueue.length === 0 && (
              <p className="deadline-muted-text">Sem fila priorizada no recorte atual.</p>
            )}
            {topQueue.map((item, index) => (
              <article
                key={item.id}
                className="deadline-priority-card"
                data-tone={item.riskTone}
                onClick={() => setSelectedDeadlineId(item.id)}
                tabIndex={0}
                role="button"
                aria-label={`Abrir detalhe: ${item.title}`}
                onKeyDown={(e) => e.key === 'Enter' && setSelectedDeadlineId(item.id)}
              >
                <span className="dl-priority-label">
                  {index === 0 ? 'Agora' : index === 1 ? 'Em seguida' : 'Na sequência'}
                </span>
                <strong className="dl-priority-title">{item.title}</strong>
                <p className="dl-priority-context">{item.client}</p>
                <small>{item.relativeDueLabel} · {item.riskLabel}</small>
                <div className="deadline-inline-meta">
                  {statusBadge(item.status)}
                  {priorityBadge(item.priority)}
                </div>
              </article>
            ))}
          </div>
        </div>

        {/* Ações em massa — progressive disclosure */}
        <aside className="deadlines-bulk-card">
          <div className="dl-ops-head">
            <div>
              <p className="dl-ops-eyebrow">Ações em massa</p>
              <h3 className="dl-ops-title">
                {selectedIds.length > 0
                  ? `${selectedIds.length} prazo${selectedIds.length !== 1 ? 's' : ''} selecionado${selectedIds.length !== 1 ? 's' : ''}`
                  : 'Selecione prazos na lista'}
              </h3>
            </div>
            {selectedIds.length === 0 ? (
              <button type="button" className="btn-ghost" onClick={selectFilteredEligible}>
                <CheckCircle2 size={14} aria-hidden="true" />
                Selecionar elegíveis
              </button>
            ) : (
              <button type="button" className="btn-ghost" onClick={clearSelection}>
                <X size={14} aria-hidden="true" />
                Limpar
              </button>
            )}
          </div>

          {/* Estado vazio: nada selecionado */}
          {selectedIds.length === 0 && (
            <div className="dl-bulk-empty">
              <div className="dl-bulk-stats-row">
                <div className="dl-bulk-stat">
                  <span>Elegíveis</span>
                  <strong>{sortedDeadlines.filter((i) => i.massActionEligible).length}</strong>
                </div>
                <div className="dl-bulk-stat">
                  <span>Publicações</span>
                  <strong>{visiblePublicationCount}</strong>
                </div>
                <div className="dl-bulk-stat">
                  <span>Auditados</span>
                  <strong>{kpis.audited}</strong>
                </div>
              </div>
              <p className="dl-bulk-hint">
                Marque os checkboxes na lista para habilitar conclusão auditada ou envio para agenda em massa.
              </p>
              <button type="button" className="btn-secondary dl-bulk-cta" onClick={selectFilteredEligible}>
                <CheckCircle2 size={13} aria-hidden="true" />
                Selecionar todos elegíveis
              </button>
            </div>
          )}

          {/* Estado ativo: itens selecionados */}
          {selectedIds.length > 0 && (
            <>
              <div className="deadline-bulk-stats">
                <div>
                  <span>Selecionados</span>
                  <strong>{selectedIds.length}</strong>
                </div>
                <div>
                  <span>Elegíveis</span>
                  <strong>{selectedActionableCount}</strong>
                </div>
                <div>
                  <span>Publicações</span>
                  <strong>{visiblePublicationCount}</strong>
                </div>
              </div>

              <label className="deadline-field">
                <span>Motivo da conclusão</span>
                <select value={bulkReason} onChange={(e) => setBulkReason(e.target.value)}>
                  {BULK_REASON_OPTIONS.map((reason) => (
                    <option key={reason} value={reason}>{reason}</option>
                  ))}
                </select>
              </label>

              <label className="deadline-field">
                <span>Observação de auditoria</span>
                <textarea
                  className="deadline-bulk-notes"
                  value={bulkNotes}
                  onChange={(e) => setBulkNotes(e.target.value)}
                  placeholder="Explique o critério usado na ação em massa."
                />
              </label>

              <div className="deadline-bulk-actions">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => void runBulkAction('complete')}
                  disabled={selectedActionableCount === 0}
                >
                  <CheckCircle2 size={14} aria-hidden="true" />
                  Concluir {selectedActionableCount} prazo{selectedActionableCount !== 1 ? 's' : ''}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => void runBulkAction('schedule')}
                  disabled={selectedActionableCount === 0}
                >
                  <CalendarDays size={14} aria-hidden="true" />
                  Enviar para agenda
                </button>
              </div>
            </>
          )}
        </aside>
      </section>

      <section
        className={`my-processes-filters${showAdvancedFilters ? '' : ' is-compact'}`}
        aria-label="Busca e filtros de prazos"
      >
        <div className="filters-head">
          <div>
            <p className="filters-eyebrow">Refinar prazos</p>
            <h3>Filtros operacionais</h3>
          </div>
          <div className="filters-head-meta">
            {hasActiveFilter && <span className="filters-active-pill">Filtros ativos</span>}
            <span className="filters-total-pill">{sortedDeadlines.length} em exibição</span>
            <div className="dl-view-toggle" role="group" aria-label="Modo de visualização">
              <button type="button" className={`dl-view-btn${viewMode === 'lista' ? ' dl-view-btn--active' : ''}`} onClick={() => setViewMode('lista')} aria-pressed={viewMode === 'lista'}>Lista</button>
              <button type="button" className={`dl-view-btn${viewMode === 'calendario' ? ' dl-view-btn--active' : ''}`} onClick={() => setViewMode('calendario')} aria-pressed={viewMode === 'calendario'}>Calendário</button>
            </div>
            <button type="button" className="btn-ghost btn-filter-density" onClick={() => setShowAdvancedFilters((v) => !v)} aria-expanded={showAdvancedFilters}>
              <Filter size={14} aria-hidden="true" />
              {showAdvancedFilters ? 'Menos filtros' : 'Mais filtros'}
            </button>
          </div>
        </div>

        <div className="filter-presets" role="toolbar" aria-label="Presets de filtros rápidos">
          <button type="button" className={`filter-preset-btn${activeQuickView === 'todos' ? ' is-active' : ''}`} onClick={() => applyQuickView('todos')}>Todos</button>
          <button type="button" className={`filter-preset-btn${activeQuickView === 'hoje' ? ' is-active' : ''}`} onClick={() => applyQuickView('hoje')}>Hoje</button>
          <button type="button" className={`filter-preset-btn${activeQuickView === 'atrasados' ? ' is-active' : ''}`} onClick={() => applyQuickView('atrasados')}>Atrasados</button>
          <button type="button" className={`filter-preset-btn${activeQuickView === 'criticos' ? ' is-active' : ''}`} onClick={() => applyQuickView('criticos')}>Críticos</button>
          <button type="button" className={`filter-preset-btn${activeQuickView === 'publicacao' ? ' is-active' : ''}`} onClick={() => applyQuickView('publicacao')}>Publicação</button>
          <button type="button" className={`filter-preset-btn${activeQuickView === 'meus' ? ' is-active' : ''}`} onClick={() => applyQuickView('meus')}>Meus prazos</button>
        </div>

        <div className="filters-top-row filter-row-card">
          <label htmlFor="dl-search" className="filter-field filter-field-search filter-cascade-item">
            <span>Busca</span>
            <div className="filter-input-wrap">
              <Search size={14} aria-hidden="true" />
              <input id="dl-search" type="search" value={filters.query} onChange={(e) => updateFilter('query', e.target.value)} placeholder="Processo, cliente, origem ou contexto" />
            </div>
          </label>
          <label htmlFor="dl-period" className="filter-field filter-cascade-item">
            <span>Período</span>
            <select id="dl-period" value={filters.period} onChange={(e) => updateFilter('period', e.target.value as DeadlinePeriodFilter)}>
              <option value="todos">Todos</option>
              <option value="hoje">Hoje</option>
              <option value="semana">Semana</option>
              <option value="mes">Mês</option>
              <option value="atrasados">Atrasados</option>
            </select>
          </label>
          <label htmlFor="dl-status" className="filter-field filter-cascade-item">
            <span>Status</span>
            <select id="dl-status" value={filters.status} onChange={(e) => updateFilter('status', e.target.value)}>
              <option value="">Todos</option>
              <option value="aberto">Aberto</option>
              <option value="critico">Crítico</option>
              <option value="atrasado">Atrasado</option>
              <option value="concluido">Concluído</option>
            </select>
          </label>
          <label htmlFor="dl-priority" className="filter-field filter-cascade-item">
            <span>Prioridade</span>
            <select id="dl-priority" value={filters.priority} onChange={(e) => updateFilter('priority', e.target.value)}>
              <option value="">Todas</option>
              <option value="alta">Alta</option>
              <option value="media">Média</option>
              <option value="baixa">Baixa</option>
            </select>
          </label>
        </div>

        {showAdvancedFilters && (
          <div className="filters-bottom-row filter-row-card">
            <label htmlFor="dl-responsible" className="filter-field filter-cascade-item">
              <span>Responsável</span>
              <select id="dl-responsible" value={filters.responsible} onChange={(e) => updateFilter('responsible', e.target.value)}>
                <option value="">Todos</option>
                {owners.map((owner) => <option key={owner} value={owner}>{owner}</option>)}
              </select>
            </label>
            <label htmlFor="dl-area" className="filter-field filter-cascade-item">
              <span>Área jurídica</span>
              <select id="dl-area" value={filters.area} onChange={(e) => updateFilter('area', e.target.value)}>
                <option value="">Todas</option>
                {areas.map((area) => <option key={area} value={area}>{area}</option>)}
              </select>
            </label>
            <label htmlFor="dl-process" className="filter-field filter-cascade-item">
              <span>Processo</span>
              <select id="dl-process" value={filters.process} onChange={(e) => updateFilter('process', e.target.value)}>
                <option value="">Todos</option>
                {processes.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </label>
            <label htmlFor="dl-origin" className="filter-field filter-cascade-item">
              <span>Origem</span>
              <select id="dl-origin" value={filters.origin} onChange={(e) => updateFilter('origin', e.target.value)}>
                <option value="">Todas</option>
                {ORIGINS.map((origin) => <option key={origin} value={origin}>{getOriginLabel(origin)}</option>)}
              </select>
            </label>
            <label htmlFor="dl-due-days" className="filter-field filter-cascade-item">
              <span>Vencendo em até</span>
              <select id="dl-due-days" value={filters.dueInDays} onChange={(e) => updateFilter('dueInDays', e.target.value)}>
                <option value="">Qualquer</option>
                <option value="1">1 dia</option>
                <option value="3">3 dias</option>
                <option value="7">7 dias</option>
                <option value="15">15 dias</option>
              </select>
            </label>
            <label htmlFor="dl-sort" className="filter-field filter-cascade-item">
              <span>Ordenação</span>
              <select id="dl-sort" value={sortBy} onChange={(e) => setSortBy(e.target.value as DeadlineSortField)}>
                <option value="risco">Risco</option>
                <option value="vencimento">Vencimento</option>
                <option value="prioridade">Prioridade</option>
                <option value="status">Status</option>
              </select>
            </label>
            <div className="filter-toggle-group filter-cascade-item" role="group" style={{ gridColumn: 'span 2' }}>
              <label className="filter-toggle-chip">
                <input type="checkbox" checked={filters.dueTodayOnly} onChange={(e) => updateFilter('dueTodayOnly', e.target.checked)} />
                <span>Vencendo hoje</span>
              </label>
            </div>
            <div className="filter-actions filter-cascade-item" style={{ gridColumn: 'span 4' }}>
              <button type="button" className="btn-ghost btn-filter-clear" onClick={clearFilters}>
                <Filter size={14} aria-hidden="true" /> Limpar filtros
              </button>
              <button type="button" className="btn-ghost" onClick={saveFilter}>
                <Save size={14} aria-hidden="true" /> Salvar filtro
              </button>
            </div>
          </div>
        )}
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
          <div className="dl-list-toolbar">
            <div className="dl-list-toolbar-left">
              <span className="pub-count-badge">
                {sortedDeadlines.length} prazo{sortedDeadlines.length !== 1 ? 's' : ''}
              </span>
              <span className="dl-list-toolbar-sub">priorizados por risco, vencimento e contexto</span>
            </div>
            <div className="dl-list-toolbar-right">
              <span className="dl-list-toolbar-audit">{recentAudits.length} auditoria(s) recente(s)</span>
              <button type="button" className="btn-ghost" onClick={selectFilteredEligible}>
                <CheckCircle2 size={13} aria-hidden="true" /> Selecionar elegíveis
              </button>
            </div>
          </div>

          {/* Cabeçalho da rich-list */}
          <div className="dl-list-header" aria-hidden="true">
            <span /> {/* checkbox */}
            <span className="dl-list-col-label">Prazo / Processo</span>
            <span className="dl-list-col-label">Risco · Vencimento</span>
            <span className="dl-list-col-label">Status · Prioridade</span>
            <span />
          </div>

          {/* Rich-list */}
          <div className="dl-list" role="list" aria-label="Lista de prazos">
            {pagedDeadlines.map((item) => {
              const isProcessing = processingIds.includes(item.id);
              const isSelected = selectedIds.includes(item.id);
              const isMenuOpen = openMenuId === item.id;

              return (
                <div
                  key={item.id}
                  role="row"
                  className={`dl-row${isSelected ? ' dl-row--selected' : ''}${item.status === 'concluido' ? ' dl-row--done' : ''}`}
                  data-risk={item.riskTone}
                  onClick={() => { setSelectedDeadlineId(item.id); setOpenMenuId(null); }}
                  tabIndex={0}
                  aria-label={`Prazo ${item.title} — ${item.processLabel} — vence ${item.relativeDueLabel}`}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedDeadlineId(item.id); setOpenMenuId(null); } }}
                >
                  {/* Checkbox */}
                  <div className="dl-row-check" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={!item.massActionEligible || isProcessing}
                      onChange={() => toggleSelection(item.id)}
                      aria-label={`Selecionar prazo ${item.title}`}
                    />
                  </div>

                  {/* O QUÊ — título + processo + cliente */}
                  <div className="dl-row-left">
                    <span className="dl-row-title">{item.title}</span>
                    <span className="dl-row-proc">{item.processLabel} · {item.processTitle}</span>
                    <span className="dl-row-client">{item.client}</span>
                    {item.area && <span className="dl-row-area-tag">{item.area}</span>}
                  </div>

                  {/* RISCO — data + label colorido */}
                  <div className="dl-row-risk">
                    <span className={`dl-row-due-label tone-${item.riskTone}`}>{item.relativeDueLabel}</span>
                    <span className="dl-row-date">{formatDate(item.dueDate)}</span>
                    <span className="dl-row-risk-label">{item.riskLabel}</span>
                  </div>

                  {/* STATUS + PRIORIDADE + ORIGIN */}
                  <div className="dl-row-right">
                    <div className="dl-row-badges">
                      {statusBadge(item.status)}
                      {priorityBadge(item.priority)}
                    </div>
                    <div className="dl-row-meta-bottom">
                      <span className="dl-row-origin-tag">{getOriginLabel(item.origin)}</span>
                      {item.agendaSyncState.status === 'synced' && (
                        <span className="dl-row-synced" title="Sincronizado com agenda">
                          <CalendarDays size={10} aria-hidden="true" /> Agenda
                        </span>
                      )}
                    </div>
                  </div>

                  {/* AÇÕES */}
                  <div className="dl-row-actions" onClick={(e) => e.stopPropagation()}>
                    <div className="pub-menu-wrap">
                      <button
                        className="pub-menu-trigger"
                        aria-label={`Ações para prazo ${item.title}`}
                        aria-expanded={isMenuOpen}
                        aria-haspopup="true"
                        onClick={() => setOpenMenuId(isMenuOpen ? null : item.id)}
                      >
                        <MoreHorizontal size={15} />
                      </button>
                      {isMenuOpen && (
                        <ul className="pub-ctx-menu" role="menu">
                          <li role="none">
                            <button role="menuitem" onClick={() => { setSelectedDeadlineId(item.id); setOpenMenuId(null); }}>
                              <BookOpen size={13} /> Ver detalhe
                            </button>
                          </li>
                          <li role="none">
                            <button role="menuitem" disabled={isProcessing || item.status === 'concluido'} onClick={() => void concludeDeadline(item, 'Conclusão individual', 'Concluído pela linha operacional.', 'single')}>
                              <CheckCircle2 size={13} /> Concluir prazo
                            </button>
                          </li>
                          <li role="none">
                            <button role="menuitem" disabled={isProcessing} onClick={() => void syncToAgenda(item)}>
                              <CalendarDays size={13} /> Enviar para agenda
                            </button>
                          </li>
                          <li role="none">
                            <button role="menuitem" onClick={() => navigate(item.automationContext.linkedPath)}>
                              <ExternalLink size={13} /> {item.automationContext.actionLabel}
                            </button>
                          </li>
                          <li role="none">
                            <button role="menuitem" onClick={() => navigate(`/processos/${item.processId}`)}>
                              <ExternalLink size={13} /> Abrir processo
                            </button>
                          </li>
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

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
          <button className="deadline-drawer-backdrop" onClick={() => setSelectedDeadlineId(null)} aria-label="Fechar detalhe" />
          <aside
            className="deadline-drawer"
            data-risk={selectedDeadline.riskTone}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dl-drawer-title"
          >
            {/* ── Hero ── */}
            <div className="dl-drawer-hero">
              <div className="dl-drawer-hero-content">
                <div className="dl-drawer-hero-tags">
                  {statusBadge(selectedDeadline.status)}
                  {priorityBadge(selectedDeadline.priority)}
                  <div className={`deadline-drawer-risk tone-${selectedDeadline.riskTone}`}>
                    <TimerReset size={12} aria-hidden="true" />
                    <span>{selectedDeadline.relativeDueLabel}</span>
                  </div>
                </div>
                <h3 id="dl-drawer-title" className="dl-drawer-hero-title">{selectedDeadline.title}</h3>
                <p className="dl-drawer-hero-meta">
                  <span>{selectedDeadline.processLabel}</span>
                  <span className="dl-drawer-hero-dot" aria-hidden="true" />
                  <span>{selectedDeadline.processTitle}</span>
                  <span className="dl-drawer-hero-dot" aria-hidden="true" />
                  <span>{selectedDeadline.client}</span>
                </p>
                <p className="dl-drawer-hero-due">
                  Vence em <strong>{formatDate(selectedDeadline.dueDate)}</strong>
                  {selectedDeadline.owner && <> · <span>{selectedDeadline.owner}</span></>}
                </p>
              </div>
              <button className="dl-close-btn" onClick={() => setSelectedDeadlineId(null)} aria-label="Fechar drawer">
                <X size={16} />
              </button>
            </div>

            {/* ── Quick actions ── */}
            <div className="dl-drawer-quickbar">
              <button
                type="button"
                className={`pub-qbtn pub-qbtn--primary${selectedDeadline.status === 'concluido' ? ' pub-qbtn--done' : ''}`}
                onClick={() => void concludeDeadline(selectedDeadline, 'Conclusão via drawer', 'Concluído a partir do detalhe rápido.', 'single')}
                disabled={selectedDeadline.status === 'concluido'}
              >
                <CheckCircle2 size={14} /> <span>Concluir prazo</span>
              </button>
              <button
                type="button"
                className="pub-qbtn"
                onClick={() => void syncToAgenda(selectedDeadline)}
              >
                <CalendarDays size={14} /> <span>Enviar agenda</span>
              </button>
              <div className="pub-qbtn-spacer" aria-hidden="true" />
              <button
                type="button"
                className="pub-qbtn pub-qbtn--ghost"
                onClick={() => navigate(selectedDeadline.automationContext.linkedPath)}
                title={selectedDeadline.automationContext.actionLabel}
              >
                <ExternalLink size={14} /> <span>{selectedDeadline.automationContext.actionLabel}</span>
              </button>
              <button
                type="button"
                className="pub-qbtn pub-qbtn--ghost"
                onClick={() => navigate(`/processos/${selectedDeadline.processId}`)}
              >
                <ExternalLink size={14} /> <span>Processo</span>
              </button>
            </div>

            {/* ── Body ── */}
            <div className="dl-drawer-body">

              {/* Metadata */}
              <div className="pub-drawer-meta-grid">
                <div className="pub-drawer-meta-item">
                  <span className="pub-drawer-meta-label">Vencimento</span>
                  <span className={`pub-drawer-meta-val${selectedDeadline.riskTone === 'danger' ? ' pub-drawer-meta-val--alert' : ''}`}>
                    {formatDate(selectedDeadline.dueDate)}
                  </span>
                </div>
                <div className="pub-drawer-meta-item">
                  <span className="pub-drawer-meta-label">Responsável</span>
                  <span className="pub-drawer-meta-val">{selectedDeadline.owner}</span>
                </div>
                <div className="pub-drawer-meta-item">
                  <span className="pub-drawer-meta-label">Cliente</span>
                  <span className="pub-drawer-meta-val">{selectedDeadline.client}</span>
                </div>
                <div className="pub-drawer-meta-item">
                  <span className="pub-drawer-meta-label">Área</span>
                  <span className="pub-drawer-meta-val">{selectedDeadline.area || '—'}</span>
                </div>
                <div className="pub-drawer-meta-item">
                  <span className="pub-drawer-meta-label">Origem</span>
                  <span className="pub-drawer-meta-val">{getOriginLabel(selectedDeadline.origin)}</span>
                </div>
                <div className="pub-drawer-meta-item">
                  <span className="pub-drawer-meta-label">Agenda</span>
                  <span className={`pub-drawer-meta-val${selectedDeadline.agendaSyncState.status === 'synced' ? '' : ''}`}>
                    {selectedDeadline.agendaSyncState.status === 'synced' ? '✓ Sincronizado' : 'Pendente'}
                  </span>
                </div>
              </div>

              {/* Contexto de automação */}
              <div className="pub-drawer-section">
                <span className="pub-drawer-section-eyebrow">Contexto de automação</span>
                <p className="pub-drawer-resumo-text">{selectedDeadline.automationContext.summary}</p>
                {selectedDeadline.origin === 'publicacao' && (
                  <button className="btn-linklike" onClick={() => navigate(`/triagem?processId=${selectedDeadline.processId}`)}>
                    <ExternalLink size={13} aria-hidden="true" /> Abrir triagem
                  </button>
                )}
              </div>

              {/* Agenda operacional */}
              <div className="pub-drawer-section">
                <span className="pub-drawer-section-eyebrow">Agenda operacional</span>
                <p className="pub-drawer-resumo-text">{selectedDeadline.agendaSyncState.message}</p>
                <p className="dl-drawer-agenda-window">
                  Janela sugerida: {selectedDeadline.agendaDraft.startTime} – {selectedDeadline.agendaDraft.endTime} em {formatDate(selectedDeadline.agendaDraft.date)}
                </p>
              </div>

              {/* Checklist */}
              <div className="pub-drawer-section">
                <span className="pub-drawer-section-eyebrow">Checklist operacional</span>
                <div className="dl-checklist">
                  <label className="dl-check-item"><input type="checkbox" /> <span>Validar anexos obrigatórios</span></label>
                  <label className="dl-check-item"><input type="checkbox" /> <span>Registrar protocolo</span></label>
                  <label className="dl-check-item"><input type="checkbox" /> <span>Atualizar andamento do processo</span></label>
                </div>
              </div>

              {/* Auditoria */}
              <div className="pub-drawer-section">
                <span className="pub-drawer-section-eyebrow">Auditoria de conclusão</span>
                {selectedDeadline.completionAudit ? (
                  <div className="pub-drawer-meta-grid">
                    <div className="pub-drawer-meta-item">
                      <span className="pub-drawer-meta-label">Motivo</span>
                      <span className="pub-drawer-meta-val">{selectedDeadline.completionAudit.reason}</span>
                    </div>
                    <div className="pub-drawer-meta-item">
                      <span className="pub-drawer-meta-label">Responsável</span>
                      <span className="pub-drawer-meta-val">{selectedDeadline.completionAudit.completedBy}</span>
                    </div>
                    <div className="pub-drawer-meta-item pub-drawer-meta-item--full">
                      <span className="pub-drawer-meta-label">Quando</span>
                      <span className="pub-drawer-meta-val">{formatDateTime(selectedDeadline.completionAudit.completedAt)}</span>
                    </div>
                    {selectedDeadline.completionAudit.notes && (
                      <div className="pub-drawer-meta-item pub-drawer-meta-item--full">
                        <span className="pub-drawer-meta-label">Notas</span>
                        <span className="pub-drawer-meta-val">{selectedDeadline.completionAudit.notes}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="dl-drawer-empty-text">Nenhuma trilha de conclusão disponível para este prazo.</p>
                )}
              </div>

              {/* Observações */}
              {selectedDeadline.notes && (
                <div className="pub-drawer-section">
                  <span className="pub-drawer-section-eyebrow">Observações</span>
                  <p className="pub-drawer-resumo-text">{selectedDeadline.notes}</p>
                </div>
              )}

              {/* Link criar tarefa */}
              <div className="dl-drawer-link-row">
                <button className="btn-linklike" onClick={() => navigate('/tarefas')}>
                  <FileText size={13} aria-hidden="true" /> Criar tarefa vinculada
                </button>
              </div>
            </div>
          </aside>
        </>
      )}
    </section>
  );
}
