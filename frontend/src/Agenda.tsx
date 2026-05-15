import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
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
  UserRound,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from './api';
import { captureException, trackEvent, trackPageView } from './monitoring';
import { ProcessCombobox } from './ProcessCombobox';
import './Agenda.css';

interface AgendaProps {
  user: { id: number; email: string; role: string };
}

interface ProcessRecord {
  id: number;
  title: string;
  client: string;
  phase: string;
  status: string;
  ownerId: number;
  owner?: { id: number; email: string; role: string };
}

type AgendaView = 'dia' | 'semana' | 'mes' | 'lista';
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
  id: string;
  title: string;
  type: AgendaEventType;
  status: AgendaEventStatus;
  priority: AgendaPriority;
  date: string;
  startTime: string;
  endTime: string;
  client: string;
  processId: number;
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

const EVENT_TYPE_LABEL: Record<AgendaEventType, string> = {
  audiencia: 'Audiencia',
  prazo_calendario: 'Prazo no calendario',
  reuniao_cliente: 'Reuniao com cliente',
  retorno_agendado: 'Retorno agendado',
  compromisso_interno: 'Compromisso interno',
  diligencia: 'Diligencia',
  protocolo: 'Protocolo',
  tarefa_horario: 'Tarefa com horario',
  evento_manual: 'Evento manual',
};

const STATUS_LABEL: Record<AgendaEventStatus, string> = {
  agendado: 'Agendado',
  confirmado: 'Confirmado',
  atencao: 'Atencao',
  realizado: 'Realizado',
  cancelado: 'Cancelado',
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
const CHANNELS = ['Presencial', 'Teams', 'Zoom', 'Telefone', 'Forum', 'Tribunal'];

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

function makeAgendaEvents(processes: ProcessRecord[], user: AgendaProps['user']) {
  const now = new Date();

  return processes.flatMap((process, index) => {
    const owner = process.owner?.email || user.email;
    const shift = ((process.id + index * 2) % 12) - 4;
    const baseDate = addDays(now, shift);
    const dateIso = toIsoDate(baseDate);

    const timeBase = TIME_RANGES[(process.id + index) % TIME_RANGES.length];
    const plusIndex = (TIME_RANGES.findIndex((t) => t === timeBase) + 1) % TIME_RANGES.length;
    const endBase = TIME_RANGES[plusIndex];

    const typeA = EVENT_TYPES[(process.id + index) % EVENT_TYPES.length];
    const typeB = EVENT_TYPES[(process.id + index + 3) % EVENT_TYPES.length];

    const first: AgendaEvent = {
      id: `ag-${process.id}-a`,
      title: `${EVENT_TYPE_LABEL[typeA]} - ${process.title}`,
      type: typeA,
      status: process.status === 'concluido' ? 'realizado' : 'agendado',
      priority: (process.id + index) % 3 === 0 ? 'alta' : (process.id + index) % 2 === 0 ? 'media' : 'baixa',
      date: dateIso,
      startTime: timeBase,
      endTime: endBase,
      client: process.client,
      processId: process.id,
      processLabel: `#${process.id} - ${process.title}`,
      responsible: owner,
      locationOrChannel: CHANNELS[(process.id + index) % CHANNELS.length],
      notes: 'Validar documentos de apoio e confirmar estrategia processual antes do horario.',
      origin: typeA === 'prazo_calendario' ? 'publicacao' : typeA === 'retorno_agendado' ? 'atendimento' : 'processo',
      isAudience: typeA === 'audiencia',
      isReturn: typeA === 'retorno_agendado',
      isDeadline: typeA === 'prazo_calendario',
      requiresAttention: typeA === 'audiencia' || typeA === 'retorno_agendado' || typeA === 'prazo_calendario',
    };

    const secondDate = toIsoDate(addDays(baseDate, ((process.id + index) % 4) - 1));
    const secondStart = TIME_RANGES[(process.id + index + 2) % TIME_RANGES.length];
    const secondEnd = TIME_RANGES[(process.id + index + 3) % TIME_RANGES.length];

    const second: AgendaEvent = {
      id: `ag-${process.id}-b`,
      title: `${EVENT_TYPE_LABEL[typeB]} - ${process.client}`,
      type: typeB,
      status: (process.id + index) % 5 === 0 ? 'confirmado' : 'agendado',
      priority: (process.id + index) % 4 === 0 ? 'alta' : 'media',
      date: secondDate,
      startTime: secondStart,
      endTime: secondEnd,
      client: process.client,
      processId: process.id,
      processLabel: `#${process.id} - ${process.title}`,
      responsible: owner,
      locationOrChannel: CHANNELS[(process.id + index + 2) % CHANNELS.length],
      notes: 'Consolidar proximo passo do caso e registrar atualizacao para equipe interna.',
      origin: typeB === 'evento_manual' ? 'manual' : 'processo',
      isAudience: typeB === 'audiencia',
      isReturn: typeB === 'retorno_agendado',
      isDeadline: typeB === 'prazo_calendario',
      requiresAttention: typeB === 'audiencia' || typeB === 'retorno_agendado' || typeB === 'prazo_calendario',
    };

    return [first, second];
  });
}

export function Agenda({ user }: AgendaProps) {
  const navigate = useNavigate();

  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [filters, setFilters] = useState<AgendaFilters>(EMPTY_FILTERS);
  const [view, setView] = useState<AgendaView>('semana');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<AgendaEvent | null>(null);

  const isAdv = user.role === 'ADV';

  useEffect(() => {
    trackPageView('agenda', { role: user.role });
    loadAgenda();
  }, [user.role]);

  function closeDrawer() {
    setSelectedEvent(null);
  }

  async function loadAgenda() {
    setLoading(true);
    setError('');

    try {
      const res = await api.getProcesses();
      if (res.status !== 200 || !Array.isArray(res.data)) {
        setError(res.error || 'Nao foi possivel carregar agenda.');
        setLoading(false);
        return;
      }

      const scoped = isAdv
        ? (res.data as ProcessRecord[]).filter((process) => process.ownerId === user.id)
        : (res.data as ProcessRecord[]);

      const mapped = makeAgendaEvents(scoped, user);
      const now = new Date();
      const normalized = mapped.map((event) => {
        const status = normalizeStatus(event, now);
        return {
          ...event,
          status,
          requiresAttention: event.requiresAttention || status === 'atencao',
        };
      });

      setEvents(normalized);
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
    const header = ['Evento', 'Tipo', 'Status', 'Cliente', 'Processo', 'Data', 'Hora', 'Responsavel'];
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
    link.download = 'agenda-advogado.csv';
    link.click();
    URL.revokeObjectURL(url);

    trackEvent('agenda_exported', { count: items.length });
  }

  function markAsDone(id: string) {
    setEvents((prev) => prev.map((event) => (event.id === id ? { ...event, status: 'realizado' } : event)));
    setSelectedEvent((prev) => (prev && prev.id === id ? { ...prev, status: 'realizado' } : prev));
    setSuccess('Evento marcado como realizado.');
    trackEvent('agenda_event_done', { id });
  }

  function cancelEvent(id: string) {
    setEvents((prev) => prev.map((event) => (event.id === id ? { ...event, status: 'cancelado' } : event)));
    setSelectedEvent((prev) => (prev && prev.id === id ? { ...prev, status: 'cancelado' } : prev));
    setSuccess('Evento cancelado.');
    trackEvent('agenda_event_cancelled', { id });
  }

  function rescheduleEvent(id: string) {
    setEvents((prev) => prev.map((event) => {
      if (event.id !== id) return event;
      const nextDate = addDays(new Date(`${event.date}T00:00:00`), 1);
      return {
        ...event,
        date: toIsoDate(nextDate),
        status: event.status === 'cancelado' ? 'agendado' : event.status,
      };
    }));

    setSelectedEvent((prev) => {
      if (!prev || prev.id !== id) return prev;
      const nextDate = addDays(new Date(`${prev.date}T00:00:00`), 1);
      return {
        ...prev,
        date: toIsoDate(nextDate),
        status: prev.status === 'cancelado' ? 'agendado' : prev.status,
      };
    });

    setSuccess('Evento remarcado para o proximo dia.');
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

  const clients = useMemo(() => Array.from(new Set(events.map((event) => event.client))), [events]);
  const responsibles = useMemo(() => Array.from(new Set(events.map((event) => event.responsible))), [events]);
  const processes = useMemo(() => {
    const map = new Map<string, string>();
    events.forEach((event) => map.set(String(event.processId), event.processLabel));
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [events]);
  const processOptions = useMemo(
    () => processes.map((process) => ({ value: String(process.id), label: process.label })),
    [processes],
  );

  const kpis = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now);
    const weekEnd = addDays(weekStart, 6);
    const weekStartIso = toIsoDate(weekStart);
    const weekEndIso = toIsoDate(weekEnd);

    let overlaps = 0;
    for (let i = 0; i < events.length; i += 1) {
      for (let j = i + 1; j < events.length; j += 1) {
        if (isOverlap(events[i], events[j])) overlaps += 1;
      }
    }

    return {
      today: events.filter((event) => sameDate(event.date, now)).length,
      audienceWeek: events.filter((event) => event.isAudience && event.date >= weekStartIso && event.date <= weekEndIso).length,
      pendingReturns: events.filter((event) => event.isReturn && event.status !== 'realizado' && event.status !== 'cancelado').length,
      deadlines: events.filter((event) => event.isDeadline).length,
      overlaps,
    };
  }, [events]);

  const dayItems = useMemo(() => sorted.filter((event) => sameDate(event.date, selectedDate)), [sorted, selectedDate]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate);
    return Array.from({ length: 7 }).map((_, index) => {
      const date = addDays(start, index);
      return {
        key: toIsoDate(date),
        label: date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' }),
        events: sorted.filter((event) => sameDate(event.date, date)),
      };
    });
  }, [selectedDate, sorted]);

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
        <div>
          <p className="agenda-eyebrow">Planejamento temporal</p>
          <h2>Agenda</h2>
          <p className="agenda-subtitle">
            Consolide compromissos, audiencias, prazos e retornos em uma visao unica para priorizar sua semana juridica.
          </p>
        </div>

        <div className="agenda-header-actions" role="toolbar" aria-label="Acoes da agenda">
          <button className="btn-primary" onClick={() => setSuccess('Fluxo de novo compromisso iniciado.')} aria-label="Novo compromisso">
            <Plus size={14} aria-hidden="true" />
            Novo Compromisso
          </button>
          <button className="btn-secondary" onClick={() => setSuccess('Fluxo de nova audiencia iniciado.')} aria-label="Nova audiencia">
            <CalendarClock size={14} aria-hidden="true" />
            Nova Audiencia
          </button>
          <button className="btn-secondary" onClick={() => setSuccess('Fluxo de novo retorno iniciado.')} aria-label="Novo retorno">
            <UserRound size={14} aria-hidden="true" />
            Novo Retorno
          </button>
          <button className="btn-secondary" onClick={() => exportCsv(sorted)} aria-label="Exportar agenda">
            <Download size={14} aria-hidden="true" />
            Exportar
          </button>
        </div>
      </header>

      <section className="agenda-kpis" aria-label="Indicadores da agenda">
        <article className="agenda-kpi-card"><p>Compromissos hoje</p><strong>{kpis.today}</strong></article>
        <article className="agenda-kpi-card"><p>Audiencias da semana</p><strong>{kpis.audienceWeek}</strong></article>
        <article className="agenda-kpi-card agenda-kpi-card--warning"><p>Retornos pendentes</p><strong>{kpis.pendingReturns}</strong></article>
        <article className="agenda-kpi-card"><p>Prazos no calendario</p><strong>{kpis.deadlines}</strong></article>
        <article className="agenda-kpi-card agenda-kpi-card--danger"><p>Conflitos / sobreposicoes</p><strong>{kpis.overlaps}</strong></article>
      </section>

      {error && (
        <div className="agenda-alert agenda-alert--error" role="alert">
          <AlertTriangle size={16} aria-hidden="true" />
          <span>{error}</span>
          <button onClick={loadAgenda} aria-label="Tentar novamente">
            <RefreshCw size={14} aria-hidden="true" />
            Retry
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
                placeholder="Cliente, processo, titulo ou observacao"
              />
            </div>
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

          <label className="agenda-field" htmlFor="agenda-period">
            <span>Periodo</span>
            <select id="agenda-period" value={filters.period} onChange={(event) => updateFilter('period', event.target.value as AgendaPeriod)}>
              <option value="hoje">Hoje</option>
              <option value="semana">Esta semana</option>
              <option value="mes">Este mes</option>
              <option value="proximos-30">Proximos 30 dias</option>
            </select>
          </label>

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
        </div>

        <div className="agenda-filter-row agenda-filter-row--bottom">
          <label className="agenda-field" htmlFor="agenda-responsible">
            <span>Responsavel</span>
            <select id="agenda-responsible" value={filters.responsible} onChange={(event) => updateFilter('responsible', event.target.value)}>
              <option value="">Todos</option>
              {responsibles.map((responsible) => (
                <option key={responsible} value={responsible}>{responsible}</option>
              ))}
            </select>
          </label>

          <label className="agenda-field" htmlFor="agenda-priority">
            <span>Prioridade</span>
            <select id="agenda-priority" value={filters.priority} onChange={(event) => updateFilter('priority', event.target.value)}>
              <option value="">Todas</option>
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="baixa">Baixa</option>
            </select>
          </label>

          <label className="agenda-checkline" htmlFor="agenda-audiencia">
            <input
              id="agenda-audiencia"
              type="checkbox"
              checked={filters.audienciaOnly}
              onChange={(event) => updateFilter('audienciaOnly', event.target.checked)}
            />
            Audiencia
          </label>

          <label className="agenda-checkline" htmlFor="agenda-retorno">
            <input
              id="agenda-retorno"
              type="checkbox"
              checked={filters.retornoOnly}
              onChange={(event) => updateFilter('retornoOnly', event.target.checked)}
            />
            Retorno
          </label>

          <label className="agenda-checkline" htmlFor="agenda-prazo">
            <input
              id="agenda-prazo"
              type="checkbox"
              checked={filters.prazoOnly}
              onChange={(event) => updateFilter('prazoOnly', event.target.checked)}
            />
            Prazo
          </label>

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

          <div className="agenda-view-toggle" role="tablist" aria-label="Alternar visao da agenda">
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
                {mode === 'dia' ? 'Dia' : mode === 'semana' ? 'Semana' : mode === 'mes' ? 'Mes' : 'Lista'}
              </button>
            ))}
          </div>
        </div>

        <div className="agenda-filter-summary">
          <strong>{sorted.length}</strong> evento(s) encontrados.
          {hasActiveFilter && <span className="agenda-chip">Filtro ativo</span>}
        </div>
      </section>

      {!error && events.length === 0 && (
        <section className="agenda-empty" role="status">
          <h3>Nenhum evento cadastrado</h3>
          <p>Crie compromissos, audiencias e retornos para iniciar sua agenda.</p>
          <button className="btn-primary" onClick={() => setSuccess('Fluxo de novo compromisso iniciado.')}>Novo Compromisso</button>
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
        <section className="agenda-main" aria-label="Calendario e lista de eventos">
          <header className="agenda-main-head">
            <div>
              <h3>Visao {view}</h3>
              <p>Data de referencia: {selectedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
            </div>
            <div className="agenda-main-head-actions">
              <button className="btn-ghost" onClick={() => setSelectedDate((prev) => addDays(prev, view === 'mes' ? -30 : -7))} aria-label="Periodo anterior">
                Periodo anterior
              </button>
              <button className="btn-ghost" onClick={() => setSelectedDate(new Date())} aria-label="Ir para hoje">
                Hoje
              </button>
              <button className="btn-ghost" onClick={() => setSelectedDate((prev) => addDays(prev, view === 'mes' ? 30 : 7))} aria-label="Proximo periodo">
                Proximo periodo
              </button>
            </div>
          </header>

          {view === 'dia' && (
            <div className="agenda-day-grid" role="list">
              {TIME_RANGES.map((hour) => {
                const eventsAtHour = dayItems.filter((event) => event.startTime === hour);
                return (
                  <article key={hour} className="agenda-hour-slot" role="listitem" aria-label={`Faixa de horario ${hour}`}>
                    <div className="agenda-hour-label">
                      <Clock3 size={13} aria-hidden="true" />
                      <span>{hour}</span>
                    </div>

                    <div className="agenda-hour-events">
                      {eventsAtHour.length === 0 ? (
                        <div className="agenda-hour-empty">Horario livre</div>
                      ) : (
                        eventsAtHour.map((event) => (
                          <button
                            key={event.id}
                            className="agenda-event-card"
                            onClick={() => setSelectedEvent(event)}
                            aria-label={`Abrir detalhe do evento ${event.title}`}
                          >
                            <div className="agenda-event-card-top">
                              <span className={`agenda-badge agenda-badge--type`}>{EVENT_TYPE_LABEL[event.type]}</span>
                              <span className={`agenda-badge agenda-badge--status agenda-status--${event.status}`}>{STATUS_LABEL[event.status]}</span>
                            </div>
                            <strong>{event.title}</strong>
                            <small>{event.startTime} - {event.endTime} • {event.client}</small>
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
            <div className="agenda-week-grid" role="list">
              {weekDays.map((day) => (
                <article key={day.key} className="agenda-week-column" role="listitem">
                  <header>
                    <strong>{day.label}</strong>
                    <span>{day.events.length} evento(s)</span>
                  </header>

                  <div className="agenda-week-events">
                    {day.events.length === 0 ? (
                      <div className="agenda-hour-empty">Sem eventos</div>
                    ) : (
                      day.events.map((event) => (
                        <button
                          key={event.id}
                          className="agenda-event-card agenda-event-card--compact"
                          onClick={() => setSelectedEvent(event)}
                          aria-label={`Abrir detalhe do evento ${event.title}`}
                        >
                          <div className="agenda-event-card-top">
                            <span className="agenda-badge agenda-badge--type">{EVENT_TYPE_LABEL[event.type]}</span>
                            <span className={`agenda-badge agenda-badge--status agenda-status--${event.status}`}>{STATUS_LABEL[event.status]}</span>
                          </div>
                          <strong>{event.title}</strong>
                          <small>{event.startTime} - {event.endTime}</small>
                        </button>
                      ))
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}

          {view === 'mes' && (
            <div className="agenda-month-grid" role="grid" aria-label="Visao mensal da agenda">
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
                      <span className="agenda-badge agenda-badge--type">{EVENT_TYPE_LABEL[event.type]}</span>
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
          <button className="agenda-drawer-overlay" onClick={closeDrawer} aria-label="Fechar detalhe rapido" />

          <aside className="agenda-drawer" role="dialog" aria-modal="true" aria-labelledby="agenda-drawer-title">
            <div className="agenda-drawer-head">
              <div>
                <h3 id="agenda-drawer-title">{selectedEvent.title}</h3>
                <div className="agenda-drawer-badges">
                  <span className="agenda-badge agenda-badge--type">{EVENT_TYPE_LABEL[selectedEvent.type]}</span>
                  <span className={`agenda-badge agenda-badge--status agenda-status--${selectedEvent.status}`}>{STATUS_LABEL[selectedEvent.status]}</span>
                </div>
              </div>
              <button className="agenda-close" onClick={closeDrawer} aria-label="Fechar detalhe">
                <X size={16} aria-hidden="true" />
              </button>
            </div>

            <div className="agenda-drawer-body">
              <div className="agenda-drawer-grid2">
                <div><span>Cliente</span><strong>{selectedEvent.client}</strong></div>
                <div><span>Processo</span><strong>{selectedEvent.processLabel}</strong></div>
              </div>
              <div className="agenda-drawer-grid2">
                <div><span>Data</span><strong>{formatPtDate(selectedEvent.date)}</strong></div>
                <div><span>Hora</span><strong>{selectedEvent.startTime} - {selectedEvent.endTime}</strong></div>
              </div>
              <div className="agenda-drawer-grid2">
                <div><span>Local / Canal</span><strong>{selectedEvent.locationOrChannel}</strong></div>
                <div><span>Responsavel</span><strong>{selectedEvent.responsible}</strong></div>
              </div>
              <div><span>Origem do evento</span><strong>{selectedEvent.origin}</strong></div>
              <div><span>Observacoes</span><p>{selectedEvent.notes}</p></div>
            </div>

            <div className="agenda-drawer-actions" role="toolbar" aria-label="Acoes rapidas do evento">
              <button className="btn-primary" onClick={() => setSuccess('Fluxo de edicao iniciado.')} aria-label="Editar evento">
                <Edit3 size={13} aria-hidden="true" />
                Editar
              </button>
              <button className="btn-secondary" onClick={() => markAsDone(selectedEvent.id)} aria-label="Marcar como realizado">
                <CheckCircle2 size={13} aria-hidden="true" />
                Realizado
              </button>
              <button className="btn-secondary" onClick={() => rescheduleEvent(selectedEvent.id)} aria-label="Remarcar evento">
                <CalendarClock size={13} aria-hidden="true" />
                Remarcar
              </button>
              <button className="btn-secondary" onClick={() => cancelEvent(selectedEvent.id)} aria-label="Cancelar evento">
                <X size={13} aria-hidden="true" />
                Cancelar
              </button>
              <button className="btn-ghost" onClick={() => navigate(`/processos/${selectedEvent.processId}`)} aria-label="Abrir processo">
                <ExternalLink size={13} aria-hidden="true" />
                Abrir processo
              </button>
              <button className="btn-ghost" onClick={() => navigate('/clientes')} aria-label="Abrir cliente">
                <ExternalLink size={13} aria-hidden="true" />
                Abrir cliente
              </button>
              <button className="btn-ghost" onClick={() => navigate('/tarefas')} aria-label="Criar tarefa">
                <Plus size={13} aria-hidden="true" />
                Criar tarefa
              </button>
              <button className="btn-ghost" onClick={() => setSuccess('Observacao registrada no historico.')} aria-label="Registrar observacao">
                <Save size={13} aria-hidden="true" />
                Registrar observacao
              </button>
            </div>
          </aside>
        </>
      )}
    </section>
  );
}
