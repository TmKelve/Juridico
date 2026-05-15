import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Save,
  Search,
  X,
} from 'lucide-react';
import { api, type ApiDeadline } from './api';
import { captureException, trackEvent, trackPageView } from './monitoring';
import './Deadlines.css';

interface DeadlinesProps {
  user: { id: number; email: string; role: string };
}

type DeadlineStatus = 'aberto' | 'critico' | 'atrasado' | 'concluido';
type Priority = 'alta' | 'media' | 'baixa';
type ViewMode = 'lista' | 'calendario';
type CalendarMode = 'dia' | 'semana' | 'mes';
type PeriodFilter = 'todos' | 'hoje' | 'semana' | 'mes' | 'atrasados';
type SortField = 'vencimento' | 'prioridade' | 'status';

type DeadlineItem = ApiDeadline;

interface DeadlineFilters {
  query: string;
  period: PeriodFilter;
  status: string;
  priority: string;
  responsible: string;
  area: string;
  process: string;
  origin: string;
  dueTodayOnly: boolean;
  dueInDays: string;
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
const STATUS_ORDER: Record<DeadlineStatus, number> = { atrasado: 0, critico: 1, aberto: 2, concluido: 3 };
const PRIORITY_ORDER: Record<Priority, number> = { alta: 0, media: 1, baixa: 2 };

function diffInDays(fromIso: string, toDate: Date) {
  const from = new Date(`${fromIso}T00:00:00`);
  const diff = from.getTime() - toDate.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatDate(isoDate: string) {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString('pt-BR');
}

export function Deadlines({ user }: DeadlinesProps) {
  const [deadlines, setDeadlines] = useState<DeadlineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [filters, setFilters] = useState<DeadlineFilters>(EMPTY_FILTERS);
  const [viewMode, setViewMode] = useState<ViewMode>('lista');
  const [calendarMode, setCalendarMode] = useState<CalendarMode>('semana');
  const [sortBy, setSortBy] = useState<SortField>('vencimento');
  const [page, setPage] = useState(1);
  const [selectedDeadline, setSelectedDeadline] = useState<DeadlineItem | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  const itemsPerPage = 10;

  useEffect(() => {
    trackPageView('deadlines', { role: user.role });
    loadDeadlines();
  }, [user.role]);

  useEffect(() => {
    setPage(1);
  }, [filters, sortBy]);

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

      const loadedDeadlines = res.data as ApiDeadline[];
      setDeadlines(loadedDeadlines);
      trackEvent('deadlines_loaded', { count: loadedDeadlines.length, role: user.role });
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

  function saveFilter() {
    localStorage.setItem('lexora_deadlines_saved_filter', JSON.stringify(filters));
    setSuccess('Filtro salvo.');
  }

  async function concludeDeadline(id: number) {
    const res = await api.updateDeadline(id, { status: 'concluido' });
    if (res.status !== 200 || !res.data) {
      setError(res.error || 'Nao foi possivel concluir o prazo');
      return;
    }

    setDeadlines((prev) => prev.map((item) => (item.id === id ? res.data : item)));
    setSelectedDeadline((prev) => (prev?.id === id ? res.data : prev));
    setSuccess('Prazo concluido com sucesso.');
    setOpenMenuId(null);
  }

  function exportCsv(items: DeadlineItem[]) {
    const header = ['Prazo', 'Processo', 'Cliente', 'Origem', 'Vencimento', 'Status', 'Prioridade', 'Responsavel'];
    const rows = items.map((item) => [
      item.title,
      item.processLabel,
      item.client,
      item.origin,
      formatDate(item.dueDate),
      item.status,
      item.priority,
      item.owner,
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((col) => `"${String(col).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'prazos-advogado.csv';
    link.click();
    URL.revokeObjectURL(url);

    trackEvent('deadlines_exported', { count: items.length });
  }

  const filteredDeadlines = useMemo(() => {
    const now = new Date();

    return deadlines.filter((item) => {
      if (filters.query) {
        const q = filters.query.toLowerCase();
        const text = `${item.title} ${item.processLabel} ${item.processTitle} ${item.client} ${item.origin} ${item.owner} ${item.notes}`.toLowerCase();
        if (!text.includes(q)) return false;
      }

      if (filters.period === 'hoje' && diffInDays(item.dueDate, now) !== 0) return false;
      if (filters.period === 'semana' && (diffInDays(item.dueDate, now) < 0 || diffInDays(item.dueDate, now) > 7)) return false;
      if (filters.period === 'mes' && (diffInDays(item.dueDate, now) < 0 || diffInDays(item.dueDate, now) > 30)) return false;
      if (filters.period === 'atrasados' && diffInDays(item.dueDate, now) >= 0) return false;

      if (filters.status && item.status !== filters.status) return false;
      if (filters.priority && item.priority !== filters.priority) return false;
      if (filters.responsible && item.owner !== filters.responsible) return false;
      if (filters.area && item.area !== filters.area) return false;
      if (filters.process && String(item.processId) !== filters.process) return false;
      if (filters.origin && item.origin !== filters.origin) return false;
      if (filters.dueTodayOnly && diffInDays(item.dueDate, now) !== 0) return false;

      if (filters.dueInDays) {
        const maxDays = Number(filters.dueInDays);
        const delta = diffInDays(item.dueDate, now);
        if (delta < 0 || delta > maxDays) return false;
      }

      return true;
    });
  }, [deadlines, filters]);

  const sortedDeadlines = useMemo(() => {
    const sorted = [...filteredDeadlines];

    sorted.sort((a, b) => {
      if (sortBy === 'vencimento') {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      if (sortBy === 'prioridade') {
        return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      }
      return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    });

    return sorted;
  }, [filteredDeadlines, sortBy]);

  const pageCount = Math.max(1, Math.ceil(sortedDeadlines.length / itemsPerPage));
  const pagedDeadlines = sortedDeadlines.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const kpis = useMemo(() => {
    const now = new Date();
    return {
      today: deadlines.filter((item) => diffInDays(item.dueDate, now) === 0).length,
      week: deadlines.filter((item) => {
        const delta = diffInDays(item.dueDate, now);
        return delta >= 0 && delta <= 7;
      }).length,
      critical: deadlines.filter((item) => item.status === 'critico').length,
      overdue: deadlines.filter((item) => item.status === 'atrasado').length,
      done: deadlines.filter((item) => item.status === 'concluido').length,
    };
  }, [deadlines]);

  const owners = useMemo(() => Array.from(new Set(deadlines.map((item) => item.owner))), [deadlines]);
  const processes = useMemo(() => {
    const map = new Map<string, string>();
    deadlines.forEach((item) => map.set(String(item.processId), item.processLabel));
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [deadlines]);
  const areas = useMemo(() => Array.from(new Set(deadlines.map((item) => item.area).filter(Boolean))), [deadlines]);

  const hasActiveFilter = useMemo(() => JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS), [filters]);

  const calendarItems = useMemo(() => {
    const grouped = new Map<string, DeadlineItem[]>();
    sortedDeadlines.forEach((item) => {
      if (!grouped.has(item.dueDate)) grouped.set(item.dueDate, []);
      grouped.get(item.dueDate)?.push(item);
    });

    return Array.from(grouped.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, items]) => ({ date, items }));
  }, [sortedDeadlines]);

  function statusBadge(status: DeadlineStatus) {
    const labels: Record<DeadlineStatus, string> = {
      aberto: 'Aberto',
      critico: 'Critico',
      atrasado: 'Atrasado',
      concluido: 'Concluido',
    };

    return <span className={`deadline-badge status-${status}`}>{labels[status]}</span>;
  }

  function priorityBadge(priority: Priority) {
    const labels: Record<Priority, string> = {
      alta: 'Alta',
      media: 'Media',
      baixa: 'Baixa',
    };
    return <span className={`deadline-badge priority-${priority}`}>{labels[priority]}</span>;
  }

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
        <div>
          <p className="deadlines-eyebrow">Controle operacional</p>
          <h2>Prazos</h2>
          <p className="deadlines-subtitle">
            Visualize, priorize e conclua seus prazos com rapidez para manter todos os casos em movimento.
          </p>
        </div>
        <div className="deadlines-header-actions">
          <button className="btn-primary" aria-label="Novo prazo">
            <Plus size={16} aria-hidden="true" />
            Novo Prazo
          </button>
          <button className="btn-secondary" aria-label="Ver agenda" onClick={() => setViewMode('calendario')}>
            <CalendarDays size={16} aria-hidden="true" />
            Ver Agenda
          </button>
          <button className="btn-secondary" aria-label="Exportar prazos" onClick={() => exportCsv(sortedDeadlines)}>
            <Download size={16} aria-hidden="true" />
            Exportar
          </button>
        </div>
      </header>

      <section className="deadlines-kpis" aria-label="Indicadores de prazos">
        <article className="deadline-kpi-card"><p>Prazos hoje</p><strong>{kpis.today}</strong></article>
        <article className="deadline-kpi-card"><p>Prazos esta semana</p><strong>{kpis.week}</strong></article>
        <article className="deadline-kpi-card warning"><p>Prazos criticos</p><strong>{kpis.critical}</strong></article>
        <article className="deadline-kpi-card danger"><p>Prazos atrasados</p><strong>{kpis.overdue}</strong></article>
        <article className="deadline-kpi-card success"><p>Prazos concluidos</p><strong>{kpis.done}</strong></article>
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

      <section className="deadlines-filters" aria-label="Busca e filtros de prazos">
        <div className="filters-grid-top">
          <label className="deadline-field search">
            <span>Busca</span>
            <div className="input-icon-wrap">
              <Search size={14} aria-hidden="true" />
              <input
                type="search"
                value={filters.query}
                onChange={(event) => updateFilter('query', event.target.value)}
                placeholder="Processo, cliente, descricao ou origem"
              />
            </div>
          </label>

          <label className="deadline-field">
            <span>Periodo</span>
            <select value={filters.period} onChange={(event) => updateFilter('period', event.target.value as PeriodFilter)}>
              <option value="todos">Todos</option>
              <option value="hoje">Hoje</option>
              <option value="semana">Esta semana</option>
              <option value="mes">Este mes</option>
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
        </div>

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
              {ORIGINS.map((origin) => <option key={origin} value={origin}>{origin}</option>)}
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
            <span>Vencendo em X dias</span>
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
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value as SortField)}>
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

        <div className="deadline-filter-summary">
          <strong>{sortedDeadlines.length}</strong> prazo(s) na visao atual.
          {hasActiveFilter && <span className="active-filter-chip">Filtro ativo</span>}
        </div>
      </section>

      {deadlines.length === 0 && !error && (
        <div className="deadlines-empty" role="status">
          <h3>Sem prazos cadastrados</h3>
          <p>Nao ha prazos vinculados a sua carteira no momento.</p>
        </div>
      )}

      {deadlines.length > 0 && sortedDeadlines.length === 0 && (
        <div className="deadlines-empty" role="status">
          <h3>Nenhum prazo corresponde aos filtros</h3>
          <p>Ajuste os filtros para ampliar os resultados.</p>
          <button className="btn-secondary" onClick={clearFilters}>Limpar filtros</button>
        </div>
      )}

      {sortedDeadlines.length > 0 && viewMode === 'lista' && (
        <section className="deadlines-table-shell" aria-label="Lista de prazos">
          <table className="deadlines-table">
            <thead>
              <tr>
                <th scope="col">Prazo</th>
                <th scope="col">Processo</th>
                <th scope="col">Cliente</th>
                <th scope="col">Origem</th>
                <th scope="col">Vencimento</th>
                <th scope="col">Status</th>
                <th scope="col">Prioridade</th>
                <th scope="col">Responsavel</th>
                <th scope="col">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {pagedDeadlines.map((item) => (
                <tr
                  key={String(item.id)}
                  tabIndex={0}
                  role="button"
                  aria-label={`Abrir detalhe do prazo ${item.title}`}
                  onClick={() => {
                    setSelectedDeadline(item);
                    setOpenMenuId(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setSelectedDeadline(item);
                      setOpenMenuId(null);
                    }
                  }}
                >
                  <td>
                    <div className="deadline-primary">
                      <strong>{item.title}</strong>
                      <small>{item.area}</small>
                    </div>
                  </td>
                  <td>{item.processLabel}</td>
                  <td>{item.client}</td>
                  <td>{item.origin}</td>
                  <td>{formatDate(item.dueDate)}</td>
                  <td>{statusBadge(item.status)}</td>
                  <td>{priorityBadge(item.priority)}</td>
                  <td>{item.owner}</td>
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
                          <button onClick={() => setSelectedDeadline(item)}>Detalhe rapido</button>
                          <button onClick={() => concludeDeadline(item.id)}>Concluir prazo</button>
                          <button onClick={() => setSuccess('Edicao rapida iniciada.')}>Editar</button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

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
                    <button key={String(item.id)} className="calendar-event" onClick={() => setSelectedDeadline(item)}>
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

      {selectedDeadline && (
        <>
          <button className="deadline-drawer-backdrop" onClick={() => setSelectedDeadline(null)} aria-label="Fechar detalhe rapido" />
          <aside className="deadline-drawer" role="dialog" aria-modal="true" aria-labelledby="deadline-drawer-title">
            <header>
              <div>
                <small>Detalhe rapido</small>
                <h3 id="deadline-drawer-title">{selectedDeadline.title}</h3>
              </div>
              <button className="icon-action" onClick={() => setSelectedDeadline(null)} aria-label="Fechar drawer">
                <X size={15} aria-hidden="true" />
              </button>
            </header>

            <div className="deadline-drawer-body">
              <dl>
                <div><dt>Processo vinculado</dt><dd>{selectedDeadline.processLabel}</dd></div>
                <div><dt>Cliente</dt><dd>{selectedDeadline.client}</dd></div>
                <div><dt>Origem</dt><dd>{selectedDeadline.origin}</dd></div>
                <div><dt>Data de vencimento</dt><dd>{formatDate(selectedDeadline.dueDate)}</dd></div>
                <div><dt>Status</dt><dd>{statusBadge(selectedDeadline.status)}</dd></div>
                <div><dt>Prioridade</dt><dd>{priorityBadge(selectedDeadline.priority)}</dd></div>
                <div><dt>Responsavel</dt><dd>{selectedDeadline.owner}</dd></div>
                <div><dt>Observacoes</dt><dd>{selectedDeadline.notes}</dd></div>
              </dl>

              <div className="deadline-drawer-actions">
                <button className="btn-primary" onClick={() => concludeDeadline(selectedDeadline.id)}>
                  <CheckCircle2 size={15} aria-hidden="true" />
                  Concluir prazo
                </button>
                <button className="btn-secondary">Editar</button>
                <button className="btn-secondary">Abrir processo</button>
                <button className="btn-secondary">Criar tarefa</button>
                <button className="btn-secondary">Registrar observacao</button>
              </div>
            </div>
          </aside>
        </>
      )}
    </section>
  );
}
