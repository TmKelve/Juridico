import { useEffect, useEffectEvent, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Download,
  Edit3,
  ExternalLink,
  Filter,
  List,
  Plus,
  RefreshCw,
  Save,
  Search,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api, type ApiAgendaEvent } from './api';
import { captureException, trackEvent, trackPageView } from './monitoring';
import { ProcessCombobox } from './ProcessCombobox';
import './Agenda.css';

interface AgendaProps {
  user: { id: number; email: string; role: string };
}

type AgendaView = 'dia' | 'semana' | 'mes' | 'lista';
type WeekLayout = 'compacta' | 'completa';
type AgendaPeriod = 'hoje' | 'semana' | 'mes' | 'proximos-30';
type AgendaEventType =
  | 'audiencia'
  | 'prazo_calendario'
  | 'reuniao_cliente'
  | 'retorno_agendado'
  | 'compromisso_interno'
  | 'diligencia'
  | 'protocolo'
  | 'tarefa_horario'
  | 'evento_manual';

type AgendaEventStatus = 'agendado' | 'confirmado' | 'atencao' | 'realizado' | 'cancelado';
type AgendaPriority = 'alta' | 'media' | 'baixa';

interface AgendaEvent {
  id: number;
  title: string;
  type: AgendaEventType;
  status: AgendaEventStatus;
  priority: AgendaPriority;
  date: string;
  startTime: string;
  endTime: string;
  client: string;
  processId: number | null;
  processLabel: string;
  responsible: string;
  locationOrChannel: string;
  notes: string;
  origin: 'processo' | 'publicacao' | 'atendimento' | 'manual';
  isAudience: boolean;
  isReturn: boolean;
  isDeadline: boolean;
  requiresAttention: boolean;
}

interface AgendaFilters {
  search: string;
  type: string;
  period: AgendaPeriod;
  client: string;
  process: string;
  responsible: string;
  priority: string;
  audienciaOnly: boolean;
  retornoOnly: boolean;
  prazoOnly: boolean;
}

interface AgendaCreateDraft {
  title: string;
  type: AgendaEventType;
  date: string;
  startTime: string;
  endTime: string;
  processId: string;
  client: string;
  responsible: string;
  locationOrChannel: string;
  notes: string;
  priority: AgendaPriority;
}

const EMPTY_FILTERS: AgendaFilters = {
  search: '',
  type: '',
  period: 'semana',
  client: '',
  process: '',
  responsible: '',
  priority: '',
  audienciaOnly: false,
  retornoOnly: false,
  prazoOnly: false,
};

const EMPTY_CREATE_DRAFT: AgendaCreateDraft = {
  title: '',
  type: 'compromisso_interno',
  date: '',
  startTime: '09:00',
  endTime: '10:00',
  processId: '',
  client: '',
  responsible: '',
  locationOrChannel: '',
  notes: '',
  priority: 'media',
};

const EVENT_TYPE_LABEL: Record<AgendaEventType, string> = {
  audiencia: 'Audiência',
  prazo_calendario: 'Prazo',
  reuniao_cliente: 'Reunião',
  retorno_agendado: 'Retorno',
  compromisso_interno: 'Compromisso',
  diligencia: 'Diligência',
  protocolo: 'Protocolo',
  tarefa_horario: 'Tarefa',
  evento_manual: 'Manual',
};

const STATUS_LABEL: Record<AgendaEventStatus, string> = {
  agendado: 'Agendado',
  confirmado: 'Confirmado',
  atencao: 'Atenção',
  realizado: 'Realizado',
  cancelado: 'Cancelado',
};

const PRIORITY_LABEL: Record<AgendaPriority, string> = {
  alta: 'Alta prioridade',
  media: 'Prioridade média',
  baixa: 'Baixa prioridade',
};

const STATUS_ORDER: Record<AgendaEventStatus, number> = {
  atencao: 0,
  confirmado: 1,
  agendado: 2,
  realizado: 3,
  cancelado: 4,
};

const PRIORITY_ORDER: Record<AgendaPriority, number> = {
  alta: 0,
  media: 1,
  baixa: 2,
};

const EVENT_TYPES: AgendaEventType[] = [
  'audiencia',
  'prazo_calendario',
  'reuniao_cliente',
  'retorno_agendado',
  'compromisso_interno',
  'diligencia',
  'protocolo',
  'tarefa_horario',
  'evento_manual',
];

const TIME_RANGES = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
const DEFAULT_CHANNEL_BY_TYPE: Record<AgendaEventType, string> = {
  audiencia: 'Fórum',
  prazo_calendario: 'Operação interna',
  reuniao_cliente: 'Teams',
  retorno_agendado: 'Telefone',
  compromisso_interno: 'Interno',
  diligencia: 'Presencial',
  protocolo: 'Tribunal',
  tarefa_horario: 'Interno',
  evento_manual: 'A definir',
};

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(base: Date, days: number) {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

function formatPtDate(isoDate: string) {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatViewLabel(view: AgendaView) {
  if (view === 'dia') return 'Visão diária';
  if (view === 'semana') return 'Visão semanal';
  if (view === 'mes') return 'Visão mensal';
  return 'Visão em lista';
}

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function sameDate(a: string, b: Date) {
  return a === toIsoDate(b);
}

function dayDiffFromToday(isoDate: string, now: Date) {
  const start = new Date(`${isoDate}T00:00:00`);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.floor((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function normalizeStatus(event: AgendaEvent, now: Date) {
  if (event.status === 'realizado' || event.status === 'cancelado') return event.status;
  const diff = dayDiffFromToday(event.date, now);
  if (diff < 0) return 'atencao' as AgendaEventStatus;
  if (diff === 0 && event.priority === 'alta') return 'atencao' as AgendaEventStatus;
  return event.status;
}

function isOverlap(a: AgendaEvent, b: AgendaEvent) {
  if (a.date !== b.date) return false;
  if (a.id === b.id) return false;
  return a.startTime === b.startTime;
}

function mapApiAgendaEvent(event: ApiAgendaEvent): AgendaEvent {
  return {
    ...event,
    locationOrChannel: event.locationOrChannel || DEFAULT_CHANNEL_BY_TYPE[event.type],
    notes: event.notes || '',
  };
}

function normalizeAgendaEvent(event: AgendaEvent, now: Date) {
  const status = normalizeStatus(event, now);
  return {
    ...event,
    status,
    requiresAttention: event.requiresAttention || status === 'atencao',
  };
}

export function Agenda({ user }: AgendaProps) {
  const navigate = useNavigate();

  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filters, setFilters] = useState<AgendaFilters>(EMPTY_FILTERS);
  const [view, setView] = useState<AgendaView>('semana');
  const [weekLayout, setWeekLayout] = useState<WeekLayout>('compacta');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [processCatalog, setProcessCatalog] = useState<Array<{ id: number; title: string; client: string }>>([]);
  const [createDraft, setCreateDraft] = useState<AgendaCreateDraft>(EMPTY_CREATE_DRAFT);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<AgendaEvent | null>(null);
  const loadAgendaOnMount = useEffectEvent(loadAgenda);

  useEffect(() => {
    trackPageView('agenda', { role: user.role });
    loadAgendaOnMount();
  }, [user.role]);

  function closeDrawer() {
    setSelectedEvent(null);
  }

  function openCreateModal(type: AgendaEventType) {
    setCreateDraft({
      ...EMPTY_CREATE_DRAFT,
      type,
      date: toIsoDate(selectedDate),
      title: type === 'audiencia' ? 'Audiência' : 'Compromisso',
      locationOrChannel: DEFAULT_CHANNEL_BY_TYPE[type],
      responsible: user.email.split('@')[0],
      priority: type === 'audiencia' ? 'alta' : 'media',
      startTime: type === 'audiencia' ? '10:00' : '09:00',
      endTime: type === 'audiencia' ? '11:00' : '10:00',
    });
    setCreateMenuOpen(false);
    setShowCreateModal(true);
  }

  function closeCreateModal() {
    setShowCreateModal(false);
    setCreateDraft(EMPTY_CREATE_DRAFT);
  }

  async function loadAgenda() {
    setLoading(true);
    setError('');

    try {
      const [agendaRes, processesRes] = await Promise.all([api.getAgenda(), api.getProcesses()]);
      if (agendaRes.status !== 200 || !Array.isArray(agendaRes.data)) {
        setError(agendaRes.error || 'Não foi possível carregar a agenda.');
        setLoading(false);
        return;
      }

      const now = new Date();
      const normalized = (agendaRes.data as ApiAgendaEvent[]).map((event) => normalizeAgendaEvent(mapApiAgendaEvent(event), now));
      setEvents(normalized);
      if (processesRes.status === 200 && Array.isArray(processesRes.data)) {
        setProcessCatalog((processesRes.data as Array<{ id: number; title: string; client: string }>).map((process) => ({
          id: process.id,
          title: process.title,
          client: process.client,
        })));
      }
      trackEvent('agenda_loaded', { count: normalized.length, role: user.role });
    } catch (err) {
      setError((err as Error).message || 'Erro ao carregar agenda.');
      captureException(err as Error, { context: 'loadAgenda' });
    } finally {
      setLoading(false);
    }
  }

  function updateFilter<K extends keyof AgendaFilters>(key: K, value: AgendaFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
    setSuccess('Filtros limpos.');
  }

  function saveFilters() {
    localStorage.setItem('lexora_agenda_saved_filter', JSON.stringify(filters));
    setSuccess('Filtro salvo.');
  }

  function exportCsv(items: AgendaEvent[]) {
    const header = ['Evento', 'Tipo', 'Status', 'Cliente', 'Processo', 'Data', 'Hora', 'Responsável'];
    const rows = items.map((event) => [
      event.title,
      EVENT_TYPE_LABEL[event.type],
      STATUS_LABEL[event.status],
      event.client,
      event.processLabel,
      formatPtDate(event.date),
      `${event.startTime} - ${event.endTime}`,
      event.responsible,
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((col) => `"${String(col).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'agenda-juridica.csv';
    link.click();
    URL.revokeObjectURL(url);

    trackEvent('agenda_exported', { count: items.length });
  }

  function mergeUpdatedEvent(updated: ApiAgendaEvent) {
    const next = normalizeAgendaEvent(mapApiAgendaEvent(updated), new Date());
    setEvents((prev) => prev.map((event) => (event.id === next.id ? next : event)));
    setSelectedEvent((prev) => (prev && prev.id === next.id ? next : prev));
  }

  async function submitCreateEvent() {
    if (!createDraft.title.trim()) {
      setError('Informe o título do evento.');
      return;
    }

    if (!createDraft.date) {
      setError('Informe a data do evento.');
      return;
    }

    const createRes = await api.createAgendaEvent({
      title: createDraft.title.trim(),
      type: createDraft.type,
      date: createDraft.date,
      startTime: createDraft.startTime,
      endTime: createDraft.endTime,
      priority: createDraft.priority,
      processId: createDraft.processId ? Number(createDraft.processId) : undefined,
      client: createDraft.client.trim() || undefined,
      responsible: createDraft.responsible.trim() || undefined,
      locationOrChannel: createDraft.locationOrChannel.trim() || DEFAULT_CHANNEL_BY_TYPE[createDraft.type],
      notes: createDraft.notes.trim() || undefined,
      origin: 'manual',
    });

    if (createRes.status !== 201) {
      setError(createRes.error || 'Não foi possível criar o evento.');
      return;
    }

    const next = normalizeAgendaEvent(mapApiAgendaEvent(createRes.data as ApiAgendaEvent), new Date());
    setEvents((prev) => [...prev, next]);
    setSelectedEvent(next);
    setSuccess('Evento criado na agenda.');
    closeCreateModal();
    trackEvent('agenda_event_created', { type: createDraft.type });
  }

  async function markAsDone(id: number) {
    const response = await api.updateAgendaEvent(id, { status: 'realizado' });
    if (response.status !== 200) {
      setError(response.error || 'Não foi possível marcar o evento como realizado.');
      return;
    }

    mergeUpdatedEvent(response.data as ApiAgendaEvent);
    setSuccess('Evento marcado como realizado.');
    trackEvent('agenda_event_done', { id });
  }

  async function cancelEvent(id: number) {
    const response = await api.updateAgendaEvent(id, { status: 'cancelado' });
    if (response.status !== 200) {
      setError(response.error || 'Não foi possível cancelar o evento.');
      return;
    }

    mergeUpdatedEvent(response.data as ApiAgendaEvent);
    setSuccess('Evento cancelado.');
    trackEvent('agenda_event_cancelled', { id });
  }

  async function rescheduleEvent(id: number) {
    const current = events.find((event) => event.id === id);
    if (!current) return;

    const nextDate = addDays(new Date(`${current.date}T00:00:00`), 1);
    const response = await api.updateAgendaEvent(id, {
      date: toIsoDate(nextDate),
      status: current.status === 'cancelado' ? 'agendado' : current.status,
    });

    if (response.status !== 200) {
      setError(response.error || 'Não foi possível remarcar o evento.');
      return;
    }

    mergeUpdatedEvent(response.data as ApiAgendaEvent);
    setSuccess('Evento remarcado para o próximo dia.');
    trackEvent('agenda_event_rescheduled', { id });
  }

  const filtered = useMemo(() => {
    const now = new Date();

    return events.filter((event) => {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const text = `${event.title} ${event.client} ${event.processLabel} ${event.notes}`.toLowerCase();
        if (!text.includes(q)) return false;
      }

      if (filters.type && event.type !== filters.type) return false;
      if (filters.client && event.client !== filters.client) return false;
      if (filters.process && String(event.processId) !== filters.process) return false;
      if (filters.responsible && event.responsible !== filters.responsible) return false;
      if (filters.priority && event.priority !== filters.priority) return false;
      if (filters.audienciaOnly && !event.isAudience) return false;
      if (filters.retornoOnly && !event.isReturn) return false;
      if (filters.prazoOnly && !event.isDeadline) return false;

      const diff = dayDiffFromToday(event.date, now);
      if (filters.period === 'hoje' && diff !== 0) return false;
      if (filters.period === 'semana' && (diff < 0 || diff > 7)) return false;
      if (filters.period === 'mes' && (diff < 0 || diff > 30)) return false;
      if (filters.period === 'proximos-30' && (diff < 0 || diff > 30)) return false;

      return true;
    });
  }, [events, filters]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      if (a.startTime !== b.startTime) return a.startTime.localeCompare(b.startTime);
      if (a.priority !== b.priority) return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    });
    return list;
  }, [filtered]);

  const hasActiveFilter = useMemo(() => JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS), [filters]);
  const activeFilterChips = useMemo(() => {
    const chips: string[] = [];
    if (filters.search) chips.push(`Busca: ${filters.search}`);
    if (filters.type) chips.push(`Tipo: ${EVENT_TYPE_LABEL[filters.type as AgendaEventType]}`);
    if (filters.client) chips.push(`Cliente: ${filters.client}`);
    if (filters.process) chips.push(`Processo: ${filters.process}`);
    if (filters.responsible) chips.push(`Responsável: ${filters.responsible}`);
    if (filters.priority) chips.push(`Prioridade: ${filters.priority}`);
    if (filters.audienciaOnly) chips.push('Audiências');
    if (filters.retornoOnly) chips.push('Retornos');
    if (filters.prazoOnly) chips.push('Prazos');
    return chips;
  }, [filters]);

  const clients = useMemo(() => Array.from(new Set(events.map((event) => event.client))), [events]);
  const responsibles = useMemo(() => Array.from(new Set(events.map((event) => event.responsible))), [events]);
  const processes = useMemo(() => {
    if (processCatalog.length > 0) {
      return processCatalog.map((process) => ({
        id: String(process.id),
        label: `#${process.id} - ${process.title}`,
      }));
    }

    const map = new Map<string, string>();
    events.forEach((event) => {
      if (event.processId) map.set(String(event.processId), event.processLabel);
    });
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [events, processCatalog]);
  const processOptions = useMemo(() => processes.map((process) => ({ value: process.id, label: process.label })), [processes]);

  const overlapEventIds = useMemo(() => {
    const ids = new Set<number>();
    for (let i = 0; i < events.length; i += 1) {
      for (let j = i + 1; j < events.length; j += 1) {
        if (isOverlap(events[i], events[j])) {
          ids.add(events[i].id);
          ids.add(events[j].id);
        }
      }
    }
    return ids;
  }, [events]);

  const kpis = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now);
    const weekEnd = addDays(weekStart, 6);
    const weekStartIso = toIsoDate(weekStart);
    const weekEndIso = toIsoDate(weekEnd);

    return {
      today: events.filter((event) => sameDate(event.date, now)).length,
      audienceWeek: events.filter((event) => event.isAudience && event.date >= weekStartIso && event.date <= weekEndIso).length,
      pendingReturns: events.filter((event) => event.isReturn && event.status !== 'realizado' && event.status !== 'cancelado').length,
      deadlines: events.filter((event) => event.isDeadline).length,
      overlaps: overlapEventIds.size,
    };
  }, [events, overlapEventIds]);

  const dayItems = useMemo(() => sorted.filter((event) => sameDate(event.date, selectedDate)), [sorted, selectedDate]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate);
    return Array.from({ length: 7 }).map((_, index) => {
      const date = addDays(start, index);
      return {
        key: toIsoDate(date),
        weekdayLabel: date.toLocaleDateString('pt-BR', { weekday: 'short' }),
        dayNumber: date.toLocaleDateString('pt-BR', { day: '2-digit' }),
        isToday: sameDate(toIsoDate(date), new Date()),
        isWeekend: [0, 6].includes(date.getDay()),
        events: sorted.filter((event) => sameDate(event.date, date)),
      };
    });
  }, [selectedDate, sorted]);

  const weekBusinessDays = useMemo(() => weekDays.filter((day) => !day.isWeekend), [weekDays]);
  const weekWeekendDays = useMemo(() => weekDays.filter((day) => day.isWeekend), [weekDays]);
  const visibleWeekDays = weekLayout === 'compacta' ? weekBusinessDays : weekDays;

  const monthGrid = useMemo(() => {
    const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const firstCell = startOfWeek(monthStart);

    return Array.from({ length: 35 }).map((_, index) => {
      const date = addDays(firstCell, index);
      const iso = toIsoDate(date);
      return {
        key: iso,
        inMonth: date.getMonth() === selectedDate.getMonth(),
        day: date.getDate(),
        events: sorted.filter((event) => event.date === iso),
      };
    });
  }, [selectedDate, sorted]);
  const visibleTodayCount = sorted.filter((event) => dayDiffFromToday(event.date, new Date()) === 0).length;
  const visibleAttentionCount = sorted.filter((event) => event.status === 'atencao' || event.requiresAttention).length;
  const visibleDeadlineCount = sorted.filter((event) => event.isDeadline).length;
  const focusEvent = sorted.find((event) => event.status === 'atencao' || event.requiresAttention)
    ?? sorted.find((event) => event.priority === 'alta')
    ?? sorted[0]
    ?? null;
  const focusTone = focusEvent?.status === 'atencao' || focusEvent?.requiresAttention
    ? 'warning'
    : focusEvent?.priority === 'alta'
      ? 'critical'
      : 'neutral';
  const focusMeta = focusEvent
    ? `${formatPtDate(focusEvent.date)} · ${focusEvent.startTime}–${focusEvent.endTime} · ${focusEvent.responsible}`
    : 'Nenhum evento focal para este recorte.';
  const headerSummaryItems = [
    { label: 'Em exibição', value: sorted.length, tone: 'neutral' },
    { label: 'Hoje', value: visibleTodayCount, tone: visibleTodayCount > 0 ? 'info' : 'neutral' },
    { label: 'Atenção', value: visibleAttentionCount, tone: visibleAttentionCount > 0 ? 'warning' : 'neutral' },
    { label: 'Prazos', value: visibleDeadlineCount, tone: visibleDeadlineCount > 0 ? 'critical' : 'neutral' },
  ] as const;

  if (loading) {
    return (
      <section className="agenda-page" aria-label="Agenda">
        <div className="agenda-loading" role="status" aria-busy="true">
          <RefreshCw size={16} className="spin" aria-hidden="true" />
          <p>Carregando agenda operacional...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="agenda-page" aria-label="Agenda">
      <header className="agenda-header-card">
        <div className="agenda-header-main">
          <p className="agenda-eyebrow">Planejamento temporal</p>
          <p className="agenda-summary-head">
            <strong>{sorted.length}</strong> evento(s) na carteira atual • <strong>{kpis.pendingReturns}</strong> retorno(s) pendente(s) • <strong>{kpis.overlaps}</strong> conflito(s)
          </p>
          <p className="agenda-subtitle">
            Consolide compromissos, audiências, prazos e retornos em uma leitura operacional única, com foco no que exige ação agora.
          </p>
          <div className="agenda-header-summary" aria-label="Pulso da agenda">
            {headerSummaryItems.map((item) => (
              <div key={item.label} className="agenda-header-summary-card" data-tone={item.tone}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="agenda-header-side">
          <div className="agenda-header-actions" role="toolbar" aria-label="Ações da agenda">
            <button className="btn-primary" onClick={() => openCreateModal('compromisso_interno')} aria-label="Novo compromisso">
              <Plus size={14} aria-hidden="true" />
              Novo compromisso
            </button>

            <div className="agenda-create-menu">
              <button className="btn-secondary" onClick={() => setCreateMenuOpen((prev) => !prev)} aria-label="Abrir menu de novos eventos" aria-expanded={createMenuOpen}>
                <CalendarClock size={14} aria-hidden="true" />
                Mais eventos
                {createMenuOpen ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
              </button>
              {createMenuOpen && (
                <div className="agenda-create-menu-popover" role="menu" aria-label="Criar novo evento">
                  <button type="button" role="menuitem" onClick={() => openCreateModal('audiencia')}>Nova audiência</button>
                  <button type="button" role="menuitem" onClick={() => { setCreateMenuOpen(false); navigate('/atendimentos'); }}>Novo retorno</button>
                  <button type="button" role="menuitem" onClick={() => { setCreateMenuOpen(false); navigate('/prazos'); }}>Novo prazo</button>
                  <button type="button" role="menuitem" onClick={() => { setCreateMenuOpen(false); navigate('/tarefas'); }}>Nova tarefa</button>
                </div>
              )}
            </div>

            <button className="btn-ghost" onClick={() => exportCsv(sorted)} aria-label="Exportar agenda">
              <Download size={14} aria-hidden="true" />
              Exportar
            </button>
          </div>
          <aside className="agenda-focus-card" data-tone={focusTone} aria-label="Foco do período">
            <span className="agenda-focus-card-eyebrow">Próxima melhor ação</span>
            <strong>{focusEvent ? focusEvent.title : 'Nenhum foco aberto'}</strong>
            <p>{focusEvent ? `${focusEvent.client} · ${EVENT_TYPE_LABEL[focusEvent.type]}` : 'Use filtros e trocas de visão para identificar o próximo evento prioritário.'}</p>
            <small>{focusMeta}</small>
          </aside>
        </div>
      </header>

      <section className="agenda-kpis" aria-label="Indicadores da agenda">
        <article className={`agenda-kpi-card${kpis.today > 0 ? ' agenda-kpi-card--warning' : ''}`}>
          <p>Compromissos hoje</p>
          <strong>{kpis.today}</strong>
          <small>Foco imediato</small>
        </article>
        <article className="agenda-kpi-card">
          <p>Audiências da semana</p>
          <strong>{kpis.audienceWeek}</strong>
          <small>Ritos presenciais</small>
        </article>
        <article className={`agenda-kpi-card${kpis.pendingReturns > 0 ? ' agenda-kpi-card--warning' : ' agenda-kpi-card--success'}`}>
          <p>Retornos pendentes</p>
          <strong>{kpis.pendingReturns}</strong>
          <small>Exigem acompanhamento</small>
        </article>
        <article className="agenda-kpi-card">
          <p>Prazos no calendário</p>
          <strong>{kpis.deadlines}</strong>
          <small>Vinculados a entrega</small>
        </article>
        <article className={`agenda-kpi-card${kpis.overlaps > 0 ? ' agenda-kpi-card--danger' : ' agenda-kpi-card--success'}`}>
          <p>Conflitos</p>
          <strong>{kpis.overlaps}</strong>
          <small>{kpis.overlaps > 0 ? 'Há sobreposição' : 'Nenhuma sobreposição'}</small>
        </article>
      </section>

      {error && (
        <div className="agenda-alert agenda-alert--error" role="alert">
          <AlertTriangle size={16} aria-hidden="true" />
          <span>{error}</span>
          <button onClick={loadAgenda} aria-label="Tentar novamente">
            <RefreshCw size={14} aria-hidden="true" />
            Tentar novamente
          </button>
        </div>
      )}

      {success && (
        <div className="agenda-alert agenda-alert--success" role="status">
          <CheckCircle2 size={16} aria-hidden="true" />
          <span>{success}</span>
        </div>
      )}

      <section className="agenda-filters" aria-label="Busca e filtros da agenda">
        <div className="agenda-priority-strip" aria-label="Leitura do recorte atual">
          <div className="agenda-priority-card" data-tone={visibleAttentionCount > 0 ? 'warning' : 'neutral'}>
            <span>Exigem atenção</span>
            <strong>{visibleAttentionCount}</strong>
            <small>{visibleAttentionCount > 0 ? 'eventos com risco temporal' : 'sem alerta imediato'}</small>
          </div>
          <div className="agenda-priority-card" data-tone={kpis.overlaps > 0 ? 'critical' : 'neutral'}>
            <span>Conflitos</span>
            <strong>{kpis.overlaps}</strong>
            <small>{kpis.overlaps > 0 ? 'sobreposições detectadas' : 'agenda sem choque'}</small>
          </div>
          <div className="agenda-priority-card" data-tone="info">
            <span>Modo atual</span>
            <strong>{formatViewLabel(view)}</strong>
            <small>{view === 'semana' ? `layout ${weekLayout}` : 'leitura ativa do período'}</small>
          </div>
        </div>

        <div className="agenda-filter-row agenda-filter-row--top">
          <label className="agenda-field agenda-field--search" htmlFor="agenda-search">
            <span>Buscar evento</span>
            <div className="agenda-input-icon">
              <Search size={14} aria-hidden="true" />
              <input
                id="agenda-search"
                type="search"
                value={filters.search}
                onChange={(event) => updateFilter('search', event.target.value)}
                placeholder="Cliente, processo, título ou observação"
              />
            </div>
          </label>

          <label className="agenda-field" htmlFor="agenda-period">
            <span>Período</span>
            <select id="agenda-period" value={filters.period} onChange={(event) => updateFilter('period', event.target.value as AgendaPeriod)}>
              <option value="hoje">Hoje</option>
              <option value="semana">Esta semana</option>
              <option value="mes">Este mês</option>
              <option value="proximos-30">Próximos 30 dias</option>
            </select>
          </label>

          <label className="agenda-field" htmlFor="agenda-type">
            <span>Tipo de evento</span>
            <select id="agenda-type" value={filters.type} onChange={(event) => updateFilter('type', event.target.value)}>
              <option value="">Todos</option>
              {EVENT_TYPES.map((type) => (
                <option key={type} value={type}>{EVENT_TYPE_LABEL[type]}</option>
              ))}
            </select>
          </label>

          <label className="agenda-field" htmlFor="agenda-responsible">
            <span>Responsável</span>
            <select id="agenda-responsible" value={filters.responsible} onChange={(event) => updateFilter('responsible', event.target.value)}>
              <option value="">Todos</option>
              {responsibles.map((responsible) => (
                <option key={responsible} value={responsible}>{responsible}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="agenda-filter-toolbar">
          <button type="button" className="btn-ghost agenda-advanced-toggle" onClick={() => setShowAdvancedFilters((prev) => !prev)} aria-expanded={showAdvancedFilters}>
            <Filter size={13} aria-hidden="true" />
            Filtros avançados
            {showAdvancedFilters ? <ChevronUp size={13} aria-hidden="true" /> : <ChevronDown size={13} aria-hidden="true" />}
          </button>

          <div className="agenda-filter-actions">
            <button className="btn-ghost" onClick={clearFilters} aria-label="Limpar filtros">
              <Filter size={13} aria-hidden="true" />
              Limpar filtros
            </button>
            <button className="btn-ghost" onClick={saveFilters} aria-label="Salvar filtro">
              <Save size={13} aria-hidden="true" />
              Salvar filtro
            </button>
          </div>
        </div>

        {showAdvancedFilters && (
          <div className="agenda-filter-row agenda-filter-row--bottom">
            <label className="agenda-field" htmlFor="agenda-client">
              <span>Cliente</span>
              <select id="agenda-client" value={filters.client} onChange={(event) => updateFilter('client', event.target.value)}>
                <option value="">Todos</option>
                {clients.map((client) => (
                  <option key={client} value={client}>{client}</option>
                ))}
              </select>
            </label>

            <label className="agenda-field" htmlFor="agenda-process">
              <span>Processo</span>
              <ProcessCombobox id="agenda-process" value={filters.process} onChange={(value) => updateFilter('process', value)} options={processOptions} placeholder="Buscar processo" emptyLabel="Todos" />
            </label>

            <label className="agenda-field" htmlFor="agenda-priority">
              <span>Prioridade</span>
              <select id="agenda-priority" value={filters.priority} onChange={(event) => updateFilter('priority', event.target.value)}>
                <option value="">Todas</option>
                <option value="alta">Alta</option>
                <option value="media">Média</option>
                <option value="baixa">Baixa</option>
              </select>
            </label>

            <label className="agenda-checkline" htmlFor="agenda-audiencia">
              <input id="agenda-audiencia" type="checkbox" checked={filters.audienciaOnly} onChange={(event) => updateFilter('audienciaOnly', event.target.checked)} />
              Audiência
            </label>

            <label className="agenda-checkline" htmlFor="agenda-retorno">
              <input id="agenda-retorno" type="checkbox" checked={filters.retornoOnly} onChange={(event) => updateFilter('retornoOnly', event.target.checked)} />
              Retorno
            </label>

            <label className="agenda-checkline" htmlFor="agenda-prazo">
              <input id="agenda-prazo" type="checkbox" checked={filters.prazoOnly} onChange={(event) => updateFilter('prazoOnly', event.target.checked)} />
              Prazo
            </label>
          </div>
        )}

        <div className="agenda-filter-summary">
          <div className="agenda-filter-summary-copy">
            <strong>{sorted.length}</strong> evento(s) encontrados.
            {hasActiveFilter && <span className="agenda-chip">Filtro ativo</span>}
          </div>
          <div className="agenda-filter-summary-chips">
            {activeFilterChips.map((chip) => (
              <span key={chip} className="agenda-chip agenda-chip--muted">{chip}</span>
            ))}
          </div>
        </div>
      </section>

      {!error && events.length === 0 && (
        <section className="agenda-empty" role="status">
          <h3>Nenhum evento cadastrado</h3>
          <p>Crie compromissos, audiências e retornos para iniciar sua agenda.</p>
          <button className="btn-primary" onClick={() => openCreateModal('compromisso_interno')}>Novo compromisso</button>
        </section>
      )}

      {!error && events.length > 0 && sorted.length === 0 && (
        <section className="agenda-empty" role="status">
          <h3>Nenhum evento corresponde aos filtros</h3>
          <p>Revise os filtros para ampliar os resultados da agenda.</p>
          <button className="btn-secondary" onClick={clearFilters}>Limpar filtros</button>
        </section>
      )}

      {!error && sorted.length > 0 && (
        <section className="agenda-main" aria-label="Calendário e lista de eventos">
          <header className="agenda-main-head">
            <div>
              <h3>{formatViewLabel(view)}</h3>
              <p>Data de referência: {selectedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
            </div>

            <div className="agenda-main-head-actions">
              <div className="agenda-view-toggle" role="tablist" aria-label="Alternar visão da agenda">
                {(['dia', 'semana', 'mes', 'lista'] as AgendaView[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    role="tab"
                    aria-selected={view === mode}
                    className={`agenda-view-btn${view === mode ? ' agenda-view-btn--active' : ''}`}
                    onClick={() => setView(mode)}
                  >
                    {mode === 'lista' ? <List size={13} aria-hidden="true" /> : <CalendarDays size={13} aria-hidden="true" />}
                    {mode === 'dia' ? 'Dia' : mode === 'semana' ? 'Semana' : mode === 'mes' ? 'Mês' : 'Lista'}
                  </button>
                ))}
              </div>

              {view === 'semana' && (
                <div className="agenda-view-toggle agenda-view-toggle--soft" role="tablist" aria-label="Alternar densidade semanal">
                  {(['compacta', 'completa'] as WeekLayout[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      role="tab"
                      aria-selected={weekLayout === mode}
                      className={`agenda-view-btn${weekLayout === mode ? ' agenda-view-btn--active' : ''}`}
                      onClick={() => setWeekLayout(mode)}
                    >
                      {mode === 'compacta' ? 'Semana compacta' : 'Semana completa'}
                    </button>
                  ))}
                </div>
              )}

              <button className="btn-ghost" onClick={() => setSelectedDate((prev) => addDays(prev, view === 'mes' ? -30 : -7))} aria-label="Período anterior">
                Período anterior
              </button>
              <button className="btn-ghost" onClick={() => setSelectedDate(new Date())} aria-label="Ir para hoje">
                Hoje
              </button>
              <button className="btn-ghost" onClick={() => setSelectedDate((prev) => addDays(prev, view === 'mes' ? 30 : 7))} aria-label="Próximo período">
                Próximo período
              </button>
            </div>
          </header>

          <div className="agenda-main-summary" aria-label="Resumo da visão atual">
            <div className="agenda-main-summary-card">
              <span>Leitura ativa</span>
              <strong>{formatViewLabel(view)}</strong>
              <small>{sorted.length} evento(s) ordenados no período</small>
            </div>
            <div className="agenda-main-summary-card">
              <span>Data de referência</span>
              <strong>{selectedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</strong>
              <small>{selectedDate.toLocaleDateString('pt-BR', { weekday: 'long' })}</small>
            </div>
            <div className="agenda-main-summary-card">
              <span>Risco visível</span>
              <strong>{visibleAttentionCount}</strong>
              <small>{kpis.overlaps > 0 ? `${kpis.overlaps} conflito(s) na agenda` : 'sem conflito de horário'}</small>
            </div>
          </div>

          {view === 'dia' && (
            <div className="agenda-day-grid" role="list">
              {TIME_RANGES.map((hour) => {
                const eventsAtHour = dayItems.filter((event) => event.startTime === hour);
                return (
                  <article key={hour} className="agenda-hour-slot" role="listitem" aria-label={`Faixa de horário ${hour}`}>
                    <div className="agenda-hour-label">
                      <Clock3 size={13} aria-hidden="true" />
                      <span>{hour}</span>
                    </div>

                    <div className="agenda-hour-events">
                      {eventsAtHour.length === 0 ? (
                        <div className="agenda-hour-empty">Horário livre</div>
                      ) : (
                        eventsAtHour.map((event) => (
                          <button
                            key={event.id}
                            className={`agenda-event-card${overlapEventIds.has(event.id) ? ' agenda-event-card--conflict' : ''}`}
                            onClick={() => setSelectedEvent(event)}
                            aria-label={`Abrir detalhe do evento ${event.title}`}
                          >
                            <div className="agenda-event-card-meta">
                              <span className={`agenda-badge agenda-badge--type agenda-type--${event.type}`}>{EVENT_TYPE_LABEL[event.type]}</span>
                              <span className="agenda-time-badge">{event.startTime}–{event.endTime}</span>
                            </div>
                            <strong>{event.title}</strong>
                            <p>{event.client}</p>
                            <small>{event.processLabel} • {STATUS_LABEL[event.status]}</small>
                          </button>
                        ))
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {view === 'semana' && (
            <>
              <div className={`agenda-week-grid agenda-week-grid--${weekLayout}`} role="list">
                {visibleWeekDays.map((day) => (
                  <article key={day.key} className={`agenda-week-column${day.isToday ? ' agenda-week-column--today' : ''}`} role="listitem">
                    <header>
                      <div className="agenda-week-column-title">
                        <strong>{day.weekdayLabel}, {day.dayNumber}</strong>
                        {day.isToday && <span className="agenda-day-badge">Hoje</span>}
                      </div>
                      <span>{day.events.length} evento(s)</span>
                    </header>

                    <div className="agenda-week-events">
                      {day.events.length === 0 ? (
                        <div className="agenda-hour-empty">Sem eventos</div>
                      ) : (
                        day.events.map((event) => (
                          <button
                            key={event.id}
                            className={`agenda-event-card agenda-event-card--compact agenda-type-surface--${event.type}${overlapEventIds.has(event.id) ? ' agenda-event-card--conflict' : ''}`}
                            onClick={() => setSelectedEvent(event)}
                            aria-label={`Abrir detalhe do evento ${event.title}`}
                          >
                            <div className="agenda-event-card-meta">
                              <span className={`agenda-badge agenda-badge--type agenda-type--${event.type}`}>{EVENT_TYPE_LABEL[event.type]}</span>
                              <span className="agenda-time-badge">{event.startTime}–{event.endTime}</span>
                            </div>
                            <strong>{event.title}</strong>
                            <p>{event.client}</p>
                            <small>{event.processLabel}</small>
                            <div className="agenda-event-card-bottom">
                              <span className={`agenda-badge agenda-badge--status agenda-status--${event.status}`}>{STATUS_LABEL[event.status]}</span>
                              {event.priority === 'alta' && <span className="agenda-badge agenda-badge--priority">{PRIORITY_LABEL[event.priority]}</span>}
                              {overlapEventIds.has(event.id) && <span className="agenda-badge agenda-badge--conflict">Conflito</span>}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </article>
                ))}
              </div>

              {weekLayout === 'compacta' && (
                <div className="agenda-weekend-strip" aria-label="Resumo de sábado e domingo">
                  {weekWeekendDays.map((day) => (
                    <article key={day.key} className={`agenda-weekend-card${day.isToday ? ' agenda-week-column--today' : ''}`}>
                      <header>
                        <div className="agenda-week-column-title">
                          <strong>{day.weekdayLabel}, {day.dayNumber}</strong>
                          {day.isToday && <span className="agenda-day-badge">Hoje</span>}
                        </div>
                        <span>{day.events.length} evento(s)</span>
                      </header>
                      <div className="agenda-weekend-list">
                        {day.events.length === 0 ? (
                          <div className="agenda-hour-empty">Sem eventos</div>
                        ) : (
                          day.events.map((event) => (
                            <button key={event.id} className={`agenda-weekend-item${overlapEventIds.has(event.id) ? ' agenda-weekend-item--conflict' : ''}`} onClick={() => setSelectedEvent(event)}>
                              <span>{event.startTime}</span>
                              <strong>{event.title}</strong>
                            </button>
                          ))
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}

          {view === 'mes' && (
            <div className="agenda-month-grid" role="grid" aria-label="Visão mensal da agenda">
              {monthGrid.map((cell) => (
                <article key={cell.key} className={`agenda-month-cell${cell.inMonth ? '' : ' agenda-month-cell--outside'}`} role="gridcell">
                  <header>
                    <strong>{cell.day}</strong>
                    <span>{cell.events.length}</span>
                  </header>
                  <div className="agenda-month-events">
                    {cell.events.slice(0, 2).map((event) => (
                      <button
                        key={event.id}
                        className="agenda-mini-event"
                        onClick={() => setSelectedEvent(event)}
                        aria-label={`Abrir detalhe do evento ${event.title}`}
                      >
                        <span>{event.startTime}</span>
                        <strong>{event.title}</strong>
                      </button>
                    ))}
                    {cell.events.length > 2 && <small>+{cell.events.length - 2} evento(s)</small>}
                  </div>
                </article>
              ))}
            </div>
          )}

          {view === 'lista' && (
            <div className="agenda-list" role="list">
              {sorted.map((event) => (
                <article key={event.id} className="agenda-list-row" role="listitem">
                  <div className="agenda-list-main">
                    <div className="agenda-list-title-row">
                      <strong>{event.title}</strong>
                      <span className={`agenda-badge agenda-badge--type agenda-type--${event.type}`}>{EVENT_TYPE_LABEL[event.type]}</span>
                      <span className={`agenda-badge agenda-badge--status agenda-status--${event.status}`}>{STATUS_LABEL[event.status]}</span>
                    </div>
                    <p>{formatPtDate(event.date)} • {event.startTime} - {event.endTime} • {event.client}</p>
                    <small>{event.processLabel} • {event.responsible} • Origem: {event.origin}</small>
                  </div>
                  <button className="btn-ghost" onClick={() => setSelectedEvent(event)} aria-label={`Abrir detalhe de ${event.title}`}>
                    Ver detalhe
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {selectedEvent && (
        <>
          <button className="agenda-drawer-overlay" onClick={closeDrawer} aria-label="Fechar detalhe rápido" />

          <aside className="agenda-drawer" role="dialog" aria-modal="true" aria-labelledby="agenda-drawer-title">
            <div className="agenda-drawer-head">
              <div>
                <p className="agenda-eyebrow">Detalhe do evento</p>
                <h3 id="agenda-drawer-title">{selectedEvent.title}</h3>
                <div className="agenda-drawer-badges">
                  <span className={`agenda-badge agenda-badge--type agenda-type--${selectedEvent.type}`}>{EVENT_TYPE_LABEL[selectedEvent.type]}</span>
                  <span className={`agenda-badge agenda-badge--status agenda-status--${selectedEvent.status}`}>{STATUS_LABEL[selectedEvent.status]}</span>
                  {selectedEvent.priority === 'alta' && <span className="agenda-badge agenda-badge--priority">{PRIORITY_LABEL[selectedEvent.priority]}</span>}
                </div>
              </div>
              <button className="agenda-close" onClick={closeDrawer} aria-label="Fechar detalhe">
                <X size={16} aria-hidden="true" />
              </button>
            </div>

            <div className="agenda-drawer-body">
              <section className="agenda-drawer-section">
                <h4>Quando e onde</h4>
                <div className="agenda-drawer-grid2">
                  <div><span>Data</span><strong>{formatPtDate(selectedEvent.date)}</strong></div>
                  <div><span>Horário</span><strong>{selectedEvent.startTime} - {selectedEvent.endTime}</strong></div>
                </div>
                <div className="agenda-drawer-grid2">
                  <div><span>Local / canal</span><strong>{selectedEvent.locationOrChannel}</strong></div>
                  <div><span>Responsável</span><strong>{selectedEvent.responsible}</strong></div>
                </div>
              </section>

              <section className="agenda-drawer-section">
                <h4>Contexto</h4>
                <div className="agenda-drawer-grid2">
                  <div><span>Cliente</span><strong>{selectedEvent.client}</strong></div>
                  <div><span>Processo</span><strong>{selectedEvent.processLabel}</strong></div>
                </div>
              </section>

              <section className="agenda-drawer-section">
                <h4>Observações</h4>
                <p>{selectedEvent.notes || 'Sem observações registradas.'}</p>
              </section>

              {overlapEventIds.has(selectedEvent.id) && (
                <section className="agenda-drawer-section agenda-drawer-section--warning">
                  <h4>Conflito identificado</h4>
                  <p>Este compromisso sobrepõe outro evento no mesmo horário. Use “Remarcar” para redistribuir a agenda.</p>
                </section>
              )}

              <div className="agenda-drawer-links">
                <button
                  className="btn-ghost"
                  onClick={() => selectedEvent.processId && navigate(`/processos/${selectedEvent.processId}`)}
                  aria-label="Abrir processo"
                  disabled={!selectedEvent.processId}
                >
                  <ExternalLink size={13} aria-hidden="true" />
                  Abrir processo
                </button>
                <button className="btn-ghost" onClick={() => navigate('/clientes')} aria-label="Abrir cliente">
                  <ExternalLink size={13} aria-hidden="true" />
                  Abrir cliente
                </button>
              </div>
            </div>

            <div className="agenda-drawer-footer" role="toolbar" aria-label="Ações rápidas do evento">
              <button className="btn-primary" onClick={() => markAsDone(selectedEvent.id)} aria-label="Marcar como realizado">
                <CheckCircle2 size={13} aria-hidden="true" />
                Marcar como realizado
              </button>
              <button className="btn-secondary" onClick={() => setSuccess('Fluxo de edição iniciado.')} aria-label="Editar evento">
                <Edit3 size={13} aria-hidden="true" />
                Editar
              </button>
              <div className="agenda-drawer-footer-secondary">
                <button className="btn-ghost" onClick={() => rescheduleEvent(selectedEvent.id)} aria-label="Remarcar evento">
                  <CalendarClock size={13} aria-hidden="true" />
                  Remarcar
                </button>
                <button className="btn-ghost agenda-btn-danger" onClick={() => cancelEvent(selectedEvent.id)} aria-label="Cancelar evento">
                  <X size={13} aria-hidden="true" />
                  Cancelar
                </button>
              </div>
            </div>
          </aside>
        </>
      )}

      {showCreateModal && (
        <>
          <button className="agenda-drawer-overlay" onClick={closeCreateModal} aria-label="Fechar criação de evento" />
          <aside className="agenda-drawer agenda-drawer--form" role="dialog" aria-modal="true" aria-labelledby="agenda-create-title">
            <div className="agenda-drawer-head">
              <div>
                <p className="agenda-eyebrow">Novo evento</p>
                <h3 id="agenda-create-title">{createDraft.type === 'audiencia' ? 'Nova audiência' : 'Novo compromisso'}</h3>
              </div>
              <button className="agenda-close" onClick={closeCreateModal} aria-label="Fechar formulário">
                <X size={16} aria-hidden="true" />
              </button>
            </div>

            <div className="agenda-drawer-body">
              <section className="agenda-drawer-section agenda-form-grid">
                <label className="agenda-field">
                  <span>Título</span>
                  <input value={createDraft.title} onChange={(event) => setCreateDraft((prev) => ({ ...prev, title: event.target.value }))} />
                </label>
                <label className="agenda-field">
                  <span>Data</span>
                  <input type="date" value={createDraft.date} onChange={(event) => setCreateDraft((prev) => ({ ...prev, date: event.target.value }))} />
                </label>
                <label className="agenda-field">
                  <span>Início</span>
                  <input type="time" value={createDraft.startTime} onChange={(event) => setCreateDraft((prev) => ({ ...prev, startTime: event.target.value }))} />
                </label>
                <label className="agenda-field">
                  <span>Fim</span>
                  <input type="time" value={createDraft.endTime} onChange={(event) => setCreateDraft((prev) => ({ ...prev, endTime: event.target.value }))} />
                </label>
                <label className="agenda-field">
                  <span>Processo</span>
                  <ProcessCombobox
                    id="agenda-create-process"
                    value={createDraft.processId}
                    onChange={(value) => {
                      const selectedProcess = processCatalog.find((process) => String(process.id) === value);
                      setCreateDraft((prev) => ({
                        ...prev,
                        processId: value,
                        client: selectedProcess?.client ?? prev.client,
                      }));
                    }}
                    options={processOptions}
                    placeholder="Buscar processo"
                    emptyLabel="Sem vínculo"
                  />
                </label>
                <label className="agenda-field">
                  <span>Cliente</span>
                  <input value={createDraft.client} onChange={(event) => setCreateDraft((prev) => ({ ...prev, client: event.target.value }))} />
                </label>
                <label className="agenda-field">
                  <span>Responsável</span>
                  <input value={createDraft.responsible} onChange={(event) => setCreateDraft((prev) => ({ ...prev, responsible: event.target.value }))} />
                </label>
                <label className="agenda-field">
                  <span>Local / canal</span>
                  <input value={createDraft.locationOrChannel} onChange={(event) => setCreateDraft((prev) => ({ ...prev, locationOrChannel: event.target.value }))} />
                </label>
                <label className="agenda-field">
                  <span>Prioridade</span>
                  <select value={createDraft.priority} onChange={(event) => setCreateDraft((prev) => ({ ...prev, priority: event.target.value as AgendaPriority }))}>
                    <option value="alta">Alta</option>
                    <option value="media">Média</option>
                    <option value="baixa">Baixa</option>
                  </select>
                </label>
                <label className="agenda-field agenda-field--full">
                  <span>Observações</span>
                  <textarea value={createDraft.notes} onChange={(event) => setCreateDraft((prev) => ({ ...prev, notes: event.target.value }))} rows={4} />
                </label>
              </section>
            </div>

            <div className="agenda-drawer-footer" role="toolbar" aria-label="Ações de criação de evento">
              <button className="btn-primary" onClick={submitCreateEvent}>Salvar evento</button>
              <button className="btn-secondary" onClick={closeCreateModal}>Cancelar</button>
            </div>
          </aside>
        </>
      )}
    </section>
  );
}
