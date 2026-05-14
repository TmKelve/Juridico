import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Calendar,
  CalendarPlus,
  CheckCircle2,
  ClipboardCheck,
  Download,
  ExternalLink,
  Filter,
  List,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Save,
  Search,
  UserRoundPlus,
  X,
} from 'lucide-react';
import { api } from './api';
import { captureException, trackEvent, trackPageView } from './monitoring';
import './Tasks.css';

interface TasksProps {
  user: { id: number; email: string; role: string };
}

interface ProcessRecord {
  id: number;
  title: string;
  client: string;
  phase: string;
  status: string;
  ownerId: number;
}

type TaskStatus = 'pendente' | 'em_andamento' | 'aguardando' | 'concluida' | 'atrasada';
type TaskPriority = 'baixa' | 'media' | 'alta' | 'critica';
type ViewMode = 'lista' | 'kanban';
type SortField = 'prazo' | 'prioridade' | 'status' | 'responsavel';

type TaskOrigin = 'processo' | 'prazo' | 'documento' | 'publicacao' | 'atendimento' | 'interno';

interface TaskItem {
  id: string;
  title: string;
  description: string;
  processId: number | null;
  processLabel: string;
  processTitle: string;
  client: string;
  origin: TaskOrigin;
  dueDate: string;
  status: TaskStatus;
  priority: TaskPriority;
  owner: string;
  createdBy: string;
  delegatedByMe: boolean;
  isMine: boolean;
  notes: string;
  linkedToDeadline: boolean;
  linkedToPublication: boolean;
  linkedToDocument: boolean;
  immediateAction: boolean;
}

interface TaskFilters {
  query: string;
  status: string;
  priority: string;
  owner: string;
  scope: string;
  process: string;
  client: string;
  prazo: string;
  origin: string;
  vinculada: string;
  period: string;
}

interface NewTaskForm {
  title: string;
  description: string;
  processId: string;
  client: string;
  origin: TaskOrigin;
  owner: string;
  priority: TaskPriority;
  dueDate: string;
  status: TaskStatus;
}

const STATUS_CFG: Record<TaskStatus, { label: string; variant: string }> = {
  pendente: { label: 'Pendente', variant: 'muted' },
  em_andamento: { label: 'Em andamento', variant: 'info' },
  aguardando: { label: 'Aguardando', variant: 'warning' },
  concluida: { label: 'Concluída', variant: 'success' },
  atrasada: { label: 'Atrasada', variant: 'error' },
};

const PRIORITY_CFG: Record<TaskPriority, { label: string; variant: string }> = {
  baixa: { label: 'Baixa', variant: 'low' },
  media: { label: 'Média', variant: 'medium' },
  alta: { label: 'Alta', variant: 'high' },
  critica: { label: 'Crítica', variant: 'critical' },
};

const ORIGIN_LABEL: Record<TaskOrigin, string> = {
  processo: 'Processo',
  prazo: 'Prazo',
  documento: 'Documento',
  publicacao: 'Publicação',
  atendimento: 'Atendimento',
  interno: 'Interno',
};

const EMPTY_FILTERS: TaskFilters = {
  query: '',
  status: '',
  priority: '',
  owner: '',
  scope: '',
  process: '',
  client: '',
  prazo: '',
  origin: '',
  vinculada: '',
  period: '',
};

const EMPTY_FORM: NewTaskForm = {
  title: '',
  description: '',
  processId: '',
  client: '',
  origin: 'interno',
  owner: '',
  priority: 'media',
  dueDate: '',
  status: 'pendente',
};

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR');
}

function isToday(iso: string) {
  return iso === toIsoDate(new Date());
}

function isOverdue(iso: string) {
  return new Date(`${iso}T00:00:00`).getTime() < new Date(toIsoDate(new Date())).getTime();
}

function daysDiffFromToday(iso: string) {
  const due = new Date(`${iso}T00:00:00`).getTime();
  const now = new Date(`${toIsoDate(new Date())}T00:00:00`).getTime();
  return Math.floor((due - now) / 86400000);
}

function makeTasks(processes: ProcessRecord[], userEmail: string): TaskItem[] {
  const owner = userEmail.split('@')[0];
  const base = new Date();
  const statuses: TaskStatus[] = ['pendente', 'em_andamento', 'aguardando', 'concluida', 'atrasada'];
  const priorities: TaskPriority[] = ['baixa', 'media', 'alta', 'critica'];
  const origins: TaskOrigin[] = ['processo', 'prazo', 'documento', 'publicacao', 'atendimento', 'interno'];

  return processes.slice(0, 20).map((p, idx) => {
    const due = toIsoDate(addDays(base, (idx % 11) - 4));
    const status = statuses[idx % statuses.length];
    const priority = priorities[idx % priorities.length];
    const origin = origins[idx % origins.length];
    const delegated = idx % 3 === 0;

    return {
      id: `tsk-${p.id}`,
      title: `${ORIGIN_LABEL[origin]}: ${p.title}`,
      description: 'Executar ação operacional com validação jurídica e retorno para o cliente quando necessário.',
      processId: p.id,
      processLabel: `#${p.id}`,
      processTitle: p.title,
      client: p.client,
      origin,
      dueDate: due,
      status: status === 'atrasada' && !isOverdue(due) ? 'pendente' : status,
      priority,
      owner: delegated ? `equipe-${(idx % 4) + 1}` : owner,
      createdBy: owner,
      delegatedByMe: delegated,
      isMine: !delegated,
      notes: idx % 2 === 0 ? 'Aguardar documento complementar para avanço.' : 'Priorizar alinhamento com cliente até o fim do dia.',
      linkedToDeadline: origin === 'prazo',
      linkedToPublication: origin === 'publicacao',
      linkedToDocument: origin === 'documento',
      immediateAction: priority === 'critica' || status === 'atrasada',
    };
  });
}

function StatusBadge({ status }: { status: TaskStatus }) {
  const cfg = STATUS_CFG[status];
  return <span className={`tsk-badge tsk-badge--${cfg.variant}`}>{cfg.label}</span>;
}

function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const cfg = PRIORITY_CFG[priority];
  return <span className={`tsk-priority tsk-priority--${cfg.variant}`}>{cfg.label}</span>;
}

function OriginChip({ origin }: { origin: TaskOrigin }) {
  return <span className="tsk-origin-chip">{ORIGIN_LABEL[origin]}</span>;
}

export function Tasks({ user }: TasksProps) {
  const navigate = useNavigate();

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [processes, setProcesses] = useState<ProcessRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [filters, setFilters] = useState<TaskFilters>(EMPTY_FILTERS);
  const [viewMode, setViewMode] = useState<ViewMode>('lista');
  const [sortBy, setSortBy] = useState<SortField>('prazo');
  const [sortDesc, setSortDesc] = useState(false);
  const [page, setPage] = useState(1);

  const [selected, setSelected] = useState<TaskItem | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NewTaskForm>(EMPTY_FORM);

  const ITEMS_PER_PAGE = 12;
  const isAdv = user.role === 'ADV';

  useEffect(() => {
    trackPageView('tarefas', { role: user.role });
    loadData();
  }, [user.role]);

  useEffect(() => {
    setPage(1);
  }, [filters, viewMode, sortBy, sortDesc]);

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(''), 3000);
    return () => clearTimeout(t);
  }, [success]);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const res = await api.getProcesses();
      if (res.status !== 200 || !Array.isArray(res.data)) {
        setError(res.error || 'Não foi possível carregar tarefas.');
        setLoading(false);
        return;
      }
      const scoped = isAdv
        ? (res.data as ProcessRecord[]).filter((p) => p.ownerId === user.id)
        : (res.data as ProcessRecord[]);
      setProcesses(scoped);
      const mapped = makeTasks(scoped, user.email);
      setTasks(mapped);
      trackEvent('tasks_loaded', { count: mapped.length });
    } catch (err) {
      setError((err as Error).message || 'Erro ao carregar tarefas.');
      captureException(err as Error, { context: 'loadTasks' });
    } finally {
      setLoading(false);
    }
  }

  function updateFilter<K extends keyof TaskFilters>(k: K, v: TaskFilters[K]) {
    setFilters((prev) => ({ ...prev, [k]: v }));
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
    setSuccess('Filtros limpos.');
  }

  function saveFilters() {
    localStorage.setItem('lexora_tasks_filter', JSON.stringify(filters));
    setSuccess('Filtro salvo.');
  }

  function markDone(id: string) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: 'concluida' } : t)));
    if (selected?.id === id) {
      setSelected((prev) => (prev ? { ...prev, status: 'concluida' } : null));
    }
    setOpenMenuId(null);
    setSuccess('Tarefa concluída.');
  }

  function reassign(id: string) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, owner: 'equipe-reatribuida', delegatedByMe: true } : t)));
    if (selected?.id === id) {
      setSelected((prev) => (prev ? { ...prev, owner: 'equipe-reatribuida', delegatedByMe: true } : null));
    }
    setOpenMenuId(null);
    setSuccess('Tarefa reatribuída.');
  }

  function quickComment() {
    setSuccess('Comentário registrado na tarefa.');
  }

  function exportCsv(items: TaskItem[]) {
    const header = ['Tarefa', 'Processo', 'Cliente', 'Origem', 'Prazo', 'Status', 'Prioridade', 'Responsável'];
    const rows = items.map((t) => [
      t.title,
      t.processLabel,
      t.client,
      ORIGIN_LABEL[t.origin],
      formatDate(t.dueDate),
      STATUS_CFG[t.status].label,
      PRIORITY_CFG[t.priority].label,
      t.owner,
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'tarefas.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  function submitForm(ev: React.FormEvent) {
    ev.preventDefault();
    const proc = processes.find((p) => String(p.id) === form.processId);
    const newTask: TaskItem = {
      id: `tsk-new-${Date.now()}`,
      title: form.title,
      description: form.description,
      processId: form.processId ? Number(form.processId) : null,
      processLabel: proc ? `#${proc.id}` : '—',
      processTitle: proc?.title || '',
      client: form.client || proc?.client || 'Não informado',
      origin: form.origin,
      dueDate: form.dueDate || toIsoDate(new Date()),
      status: form.status,
      priority: form.priority,
      owner: form.owner || user.email.split('@')[0],
      createdBy: user.email.split('@')[0],
      delegatedByMe: Boolean(form.owner && form.owner !== user.email.split('@')[0]),
      isMine: !form.owner || form.owner === user.email.split('@')[0],
      notes: form.description,
      linkedToDeadline: form.origin === 'prazo',
      linkedToPublication: form.origin === 'publicacao',
      linkedToDocument: form.origin === 'documento',
      immediateAction: form.priority === 'critica',
    };
    setTasks((prev) => [newTask, ...prev]);
    setShowForm(false);
    setForm(EMPTY_FORM);
    setSuccess('Nova tarefa criada.');
  }

  const kpis = useMemo(() => {
    const today = tasks.filter((t) => isToday(t.dueDate) && t.status !== 'concluida').length;
    const overdue = tasks.filter((t) => t.status !== 'concluida' && isOverdue(t.dueDate)).length;
    const high = tasks.filter((t) => t.priority === 'alta' || t.priority === 'critica').length;
    const delegated = tasks.filter((t) => t.delegatedByMe).length;
    const doneWeek = tasks.filter((t) => t.status === 'concluida' && Math.abs(daysDiffFromToday(t.dueDate)) <= 7).length;
    return { today, overdue, high, delegated, doneWeek };
  }, [tasks]);

  const uniqueOwners = useMemo(() => [...new Set(tasks.map((t) => t.owner))].sort(), [tasks]);
  const uniqueClients = useMemo(() => [...new Set(tasks.map((t) => t.client))].sort(), [tasks]);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (filters.query) {
        const q = filters.query.toLowerCase();
        const hay = `${t.title} ${t.client} ${t.processTitle} ${t.owner} ${t.notes} ${ORIGIN_LABEL[t.origin]}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filters.status && t.status !== filters.status) return false;
      if (filters.priority && t.priority !== filters.priority) return false;
      if (filters.owner && t.owner !== filters.owner) return false;
      if (filters.scope === 'minha' && !t.isMine) return false;
      if (filters.scope === 'delegada_por_mim' && !t.delegatedByMe) return false;
      if (filters.process && String(t.processId) !== filters.process) return false;
      if (filters.client && t.client !== filters.client) return false;
      if (filters.prazo === 'atrasado' && !isOverdue(t.dueDate)) return false;
      if (filters.prazo === 'hoje' && !isToday(t.dueDate)) return false;
      if (filters.origin && t.origin !== filters.origin) return false;

      if (filters.vinculada === 'prazo' && !t.linkedToDeadline) return false;
      if (filters.vinculada === 'publicacao' && !t.linkedToPublication) return false;
      if (filters.vinculada === 'documento' && !t.linkedToDocument) return false;

      if (filters.period === 'hoje' && !isToday(t.dueDate)) return false;
      if (filters.period === '7' && Math.abs(daysDiffFromToday(t.dueDate)) > 7) return false;
      if (filters.period === '30' && Math.abs(daysDiffFromToday(t.dueDate)) > 30) return false;

      return true;
    });
  }, [tasks, filters]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'prazo') cmp = a.dueDate.localeCompare(b.dueDate);
      else if (sortBy === 'prioridade') {
        const o: Record<TaskPriority, number> = { baixa: 0, media: 1, alta: 2, critica: 3 };
        cmp = o[a.priority] - o[b.priority];
      } else if (sortBy === 'status') cmp = a.status.localeCompare(b.status);
      else cmp = a.owner.localeCompare(b.owner);
      return sortDesc ? -cmp : cmp;
    });
    return arr;
  }, [filtered, sortBy, sortDesc]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / ITEMS_PER_PAGE));
  const pageItems = sorted.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  const hasActiveFilters = Object.values(filters).some((v) => (typeof v === 'boolean' ? v : v !== ''));

  const kanbanColumns = useMemo(() => {
    const columns: Array<{ status: TaskStatus; title: string }> = [
      { status: 'pendente', title: 'Pendentes' },
      { status: 'em_andamento', title: 'Em andamento' },
      { status: 'aguardando', title: 'Aguardando' },
      { status: 'concluida', title: 'Concluídas' },
    ];
    return columns.map((c) => ({
      ...c,
      items: sorted.filter((t) => (c.status === 'pendente' ? t.status === 'pendente' || t.status === 'atrasada' : t.status === c.status)),
    }));
  }, [sorted]);

  function renderRow(t: TaskItem) {
    const menuOpen = openMenuId === t.id;
    return (
      <tr
        key={t.id}
        className={`tsk-row${t.immediateAction ? ' tsk-row--urgent' : ''}`}
        onClick={() => setSelected(t)}
        tabIndex={0}
        role="button"
        aria-label={`Tarefa ${t.title}`}
        onKeyDown={(e) => e.key === 'Enter' && setSelected(t)}
      >
        <td className="tsk-col-task">
          <strong>{t.title}</strong>
          <span>{t.description}</span>
        </td>
        <td>
          <span className="tsk-process">{t.processLabel}</span>
          <span className="tsk-process-title">{t.processTitle || 'Sem vínculo'}</span>
        </td>
        <td>{t.client}</td>
        <td><OriginChip origin={t.origin} /></td>
        <td>
          <span className={`tsk-due${isOverdue(t.dueDate) && t.status !== 'concluida' ? ' tsk-due--overdue' : ''}`}>{formatDate(t.dueDate)}</span>
        </td>
        <td><StatusBadge status={t.status} /></td>
        <td><PriorityBadge priority={t.priority} /></td>
        <td>{t.owner}</td>
        <td className="tsk-col-actions" onClick={(e) => e.stopPropagation()}>
          <div className="tsk-menu-wrap">
            <button
              className="tsk-menu-trigger"
              onClick={() => setOpenMenuId(menuOpen ? null : t.id)}
              aria-expanded={menuOpen}
              aria-haspopup="true"
              aria-label={`Ações da tarefa ${t.title}`}
            >
              <MoreHorizontal size={14} />
            </button>
            {menuOpen && (
              <ul className="tsk-ctx-menu" role="menu">
                <li role="none"><button role="menuitem" onClick={() => { setSelected(t); setOpenMenuId(null); }}><Search size={13} /> Ver detalhe</button></li>
                <li role="none"><button role="menuitem" onClick={() => markDone(t.id)} disabled={t.status === 'concluida'}><CheckCircle2 size={13} /> Concluir</button></li>
                <li role="none"><button role="menuitem" onClick={() => reassign(t.id)}><UserRoundPlus size={13} /> Reatribuir</button></li>
                <li role="none"><button role="menuitem" onClick={() => quickComment()}><List size={13} /> Comentar</button></li>
                {t.processId && <li role="none"><button role="menuitem" onClick={() => navigate(`/processos/${t.processId}`)}><ExternalLink size={13} /> Abrir processo</button></li>}
              </ul>
            )}
          </div>
        </td>
      </tr>
    );
  }

  return (
    <div className="tasks-page" onClick={() => { if (openMenuId) setOpenMenuId(null); }}>
      <div className="tsk-header-card">
        <div>
          <p className="tsk-eyebrow">Operação Diária</p>
          <h2>Tarefas</h2>
          <p className="tsk-subtitle">Priorize entregas, conclua ações críticas e acompanhe tarefas delegadas com vínculo direto ao contexto jurídico.</p>
        </div>
        <div className="tsk-header-actions">
          <button className="btn-primary" onClick={() => setShowForm(true)} aria-label="Criar nova tarefa"><Plus size={14} /> Nova Tarefa</button>
          <button className="btn-secondary" onClick={() => setViewMode('kanban')} aria-label="Visualizar em kanban"><ClipboardCheck size={14} /> Ver Kanban</button>
          <button className="btn-secondary" onClick={() => exportCsv(sorted)} aria-label="Exportar tarefas"><Download size={14} /> Exportar</button>
        </div>
      </div>

      {error && (
        <div className="tsk-alert tsk-alert--error" role="alert">
          <AlertTriangle size={16} />
          <span>{error}</span>
          <button onClick={loadData} aria-label="Tentar novamente"><RefreshCw size={14} /> Tentar novamente</button>
        </div>
      )}
      {success && (
        <div className="tsk-alert tsk-alert--success" role="status" aria-live="polite">
          <CheckCircle2 size={16} />
          <span>{success}</span>
        </div>
      )}

      <div className="tsk-kpis" aria-label="Indicadores de tarefas">
        <div className="tsk-kpi-card"><p>Tarefas hoje</p><strong>{loading ? '—' : kpis.today}</strong></div>
        <div className="tsk-kpi-card tsk-kpi-card--danger"><p>Atrasadas</p><strong>{loading ? '—' : kpis.overdue}</strong></div>
        <div className="tsk-kpi-card tsk-kpi-card--warning"><p>Alta prioridade</p><strong>{loading ? '—' : kpis.high}</strong></div>
        <div className="tsk-kpi-card"><p>Delegadas</p><strong>{loading ? '—' : kpis.delegated}</strong></div>
        <div className="tsk-kpi-card tsk-kpi-card--success"><p>Concluídas semana</p><strong>{loading ? '—' : kpis.doneWeek}</strong></div>
      </div>

      <div className="tsk-filters">
        <div className="tsk-filters-top">
          <div className="tsk-field tsk-field--search">
            <label htmlFor="tsk-search" className="sr-only">Buscar tarefa</label>
            <span className="tsk-input-wrap">
              <Search size={14} />
              <input id="tsk-search" type="search" value={filters.query} onChange={(e) => updateFilter('query', e.target.value)} placeholder="Buscar por título, cliente, processo, responsável, observação ou origem..." />
            </span>
          </div>

          <div className="tsk-field"><label htmlFor="tsk-status">Status</label><select id="tsk-status" value={filters.status} onChange={(e) => updateFilter('status', e.target.value)}><option value="">Todos</option>{(Object.entries(STATUS_CFG) as Array<[TaskStatus, { label: string }]>).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
          <div className="tsk-field"><label htmlFor="tsk-priority">Prioridade</label><select id="tsk-priority" value={filters.priority} onChange={(e) => updateFilter('priority', e.target.value)}><option value="">Todas</option>{(Object.entries(PRIORITY_CFG) as Array<[TaskPriority, { label: string }]>).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
          <div className="tsk-field"><label htmlFor="tsk-owner">Responsável</label><select id="tsk-owner" value={filters.owner} onChange={(e) => updateFilter('owner', e.target.value)}><option value="">Todos</option>{uniqueOwners.map((o) => <option key={o} value={o}>{o}</option>)}</select></div>
          <div className="tsk-field"><label htmlFor="tsk-scope">Escopo</label><select id="tsk-scope" value={filters.scope} onChange={(e) => updateFilter('scope', e.target.value)}><option value="">Todos</option><option value="minha">Tarefa minha</option><option value="delegada_por_mim">Delegada por mim</option></select></div>
          <div className="tsk-field"><label htmlFor="tsk-process">Processo</label><select id="tsk-process" value={filters.process} onChange={(e) => updateFilter('process', e.target.value)}><option value="">Todos</option>{processes.map((p) => <option key={p.id} value={String(p.id)}>#{p.id} • {p.title}</option>)}</select></div>
          <div className="tsk-field"><label htmlFor="tsk-client">Cliente</label><select id="tsk-client" value={filters.client} onChange={(e) => updateFilter('client', e.target.value)}><option value="">Todos</option>{uniqueClients.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
          <div className="tsk-field"><label htmlFor="tsk-prazo">Prazo</label><select id="tsk-prazo" value={filters.prazo} onChange={(e) => updateFilter('prazo', e.target.value)}><option value="">Todos</option><option value="hoje">Hoje</option><option value="atrasado">Atrasado</option></select></div>
          <div className="tsk-field"><label htmlFor="tsk-origin">Origem</label><select id="tsk-origin" value={filters.origin} onChange={(e) => updateFilter('origin', e.target.value)}><option value="">Todas</option>{(Object.entries(ORIGIN_LABEL) as Array<[TaskOrigin, string]>).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          <div className="tsk-field"><label htmlFor="tsk-link">Vinculada a</label><select id="tsk-link" value={filters.vinculada} onChange={(e) => updateFilter('vinculada', e.target.value)}><option value="">Todas</option><option value="prazo">Prazo</option><option value="publicacao">Publicação</option><option value="documento">Documento</option></select></div>
          <div className="tsk-field"><label htmlFor="tsk-period">Período</label><select id="tsk-period" value={filters.period} onChange={(e) => updateFilter('period', e.target.value)}><option value="">Todos</option><option value="hoje">Hoje</option><option value="7">7 dias</option><option value="30">30 dias</option></select></div>
        </div>

        <div className="tsk-filters-bottom">
          <div className="tsk-filter-actions">
            {hasActiveFilters && <span className="tsk-filter-summary"><Filter size={12} /><strong>{filtered.length}</strong> de {tasks.length}</span>}
            <button className="btn-ghost" onClick={clearFilters}><X size={13} /> Limpar filtros</button>
            <button className="btn-ghost" onClick={saveFilters}><Save size={13} /> Salvar filtro</button>
          </div>

          <div className="tsk-view-toggle" role="group" aria-label="Modo de visualização">
            <button className={`tsk-view-btn${viewMode === 'lista' ? ' tsk-view-btn--active' : ''}`} onClick={() => setViewMode('lista')} aria-pressed={viewMode === 'lista'}><List size={13} /> Lista</button>
            <button className={`tsk-view-btn${viewMode === 'kanban' ? ' tsk-view-btn--active' : ''}`} onClick={() => setViewMode('kanban')} aria-pressed={viewMode === 'kanban'}><ClipboardCheck size={13} /> Kanban</button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="tsk-loading" aria-live="polite" aria-busy="true">
          <RefreshCw size={20} className="tsk-spin" />
          <span>Carregando tarefas...</span>
        </div>
      )}

      {!loading && !error && (
        <>
          {tasks.length === 0 && (
            <div className="tsk-empty">
              <ClipboardCheck size={32} />
              <h3>Nenhuma tarefa cadastrada</h3>
              <p>Crie a primeira tarefa para organizar sua operação diária.</p>
              <button className="btn-primary" onClick={() => setShowForm(true)}><Plus size={13} /> Nova tarefa</button>
            </div>
          )}

          {tasks.length > 0 && filtered.length === 0 && (
            <div className="tsk-empty">
              <Filter size={32} />
              <h3>Nenhuma tarefa para este filtro</h3>
              <p>Ajuste os critérios ou limpe os filtros.</p>
              <button className="btn-secondary" onClick={clearFilters}><X size={13} /> Limpar filtros</button>
            </div>
          )}

          {filtered.length > 0 && viewMode === 'lista' && (
            <div className="tsk-table-card">
              <div className="tsk-table-header">
                <span className="tsk-count-badge">{filtered.length} tarefa{filtered.length !== 1 ? 's' : ''}</span>
                <div className="tsk-sort-controls">
                  <label htmlFor="tsk-sort" className="sr-only">Ordenar por</label>
                  <select id="tsk-sort" value={sortBy} onChange={(e) => setSortBy(e.target.value as SortField)}>
                    <option value="prazo">Prazo</option>
                    <option value="prioridade">Prioridade</option>
                    <option value="status">Status</option>
                    <option value="responsavel">Responsável</option>
                  </select>
                  <button className="btn-ghost tsk-sort-dir" onClick={() => setSortDesc((d) => !d)}>{sortDesc ? '↓' : '↑'}</button>
                </div>
              </div>

              <div className="tsk-table-wrap">
                <table className="tsk-table" aria-label="Lista de tarefas">
                  <thead>
                    <tr>
                      <th>Tarefa</th>
                      <th>Processo</th>
                      <th>Cliente</th>
                      <th>Origem</th>
                      <th>Prazo</th>
                      <th>Status</th>
                      <th>Prioridade</th>
                      <th>Responsável</th>
                      <th><span className="sr-only">Ações</span></th>
                    </tr>
                  </thead>
                  <tbody>{pageItems.map((t) => renderRow(t))}</tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="tsk-pagination">
                  <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Anterior</button>
                  <span>{page} / {totalPages}</span>
                  <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Próximo</button>
                </div>
              )}
            </div>
          )}

          {filtered.length > 0 && viewMode === 'kanban' && (
            <div className="tsk-kanban" aria-label="Kanban de tarefas por status">
              {kanbanColumns.map((col) => (
                <section key={col.status} className="tsk-kanban-col">
                  <header>
                    <h4>{col.title}</h4>
                    <span>{col.items.length}</span>
                  </header>
                  <div className="tsk-kanban-list">
                    {col.items.map((t) => (
                      <article key={t.id} className="tsk-kanban-card" onClick={() => setSelected(t)} tabIndex={0} role="button" onKeyDown={(e) => e.key === 'Enter' && setSelected(t)}>
                        <strong>{t.title}</strong>
                        <p>{t.client} • {t.processLabel}</p>
                        <div className="tsk-kanban-meta">
                          <span><Calendar size={11} /> {formatDate(t.dueDate)}</span>
                          <PriorityBadge priority={t.priority} />
                        </div>
                        <div className="tsk-kanban-meta">
                          <span>{t.owner}</span>
                          <OriginChip origin={t.origin} />
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </>
      )}

      {selected && (
        <>
          <div className="tsk-drawer-overlay" onClick={() => setSelected(null)} />
          <aside className="tsk-drawer tsk-drawer--open" role="complementary" aria-label={`Detalhe da tarefa ${selected.title}`}>
            <div className="tsk-drawer-top">
              <div>
                <h3>{selected.title}</h3>
                <div className="tsk-drawer-head-meta">
                  <StatusBadge status={selected.status} />
                  <PriorityBadge priority={selected.priority} />
                  <OriginChip origin={selected.origin} />
                </div>
              </div>
              <button className="tsk-close" onClick={() => setSelected(null)} aria-label="Fechar"><X size={16} /></button>
            </div>

            <div className="tsk-drawer-body">
              <div className="tsk-drawer-row2">
                <div><span className="tsk-label">Processo</span><span className="tsk-value">{selected.processLabel} • {selected.processTitle || 'Sem vínculo'}</span></div>
                <div><span className="tsk-label">Cliente</span><span className="tsk-value">{selected.client}</span></div>
              </div>
              <div className="tsk-drawer-row2">
                <div><span className="tsk-label">Prazo</span><span className="tsk-value">{formatDate(selected.dueDate)}</span></div>
                <div><span className="tsk-label">Responsável</span><span className="tsk-value">{selected.owner}</span></div>
              </div>
              <div className="tsk-drawer-row2">
                <div><span className="tsk-label">Criador</span><span className="tsk-value">{selected.createdBy}</span></div>
                <div><span className="tsk-label">Ação imediata</span><span className={`tsk-value${selected.immediateAction ? ' tsk-value--alert' : ''}`}>{selected.immediateAction ? 'Sim' : 'Não'}</span></div>
              </div>
              <div><span className="tsk-label">Observações</span><p className="tsk-notes">{selected.notes}</p></div>
            </div>

            <div className="tsk-drawer-actions">
              <button className="btn-primary" onClick={() => markDone(selected.id)} disabled={selected.status === 'concluida'}><CheckCircle2 size={13} /> Concluir</button>
              <button className="btn-secondary" onClick={() => setSuccess('Edição rápida iniciada.')}><CalendarPlus size={13} /> Editar</button>
              <button className="btn-secondary" onClick={() => reassign(selected.id)}><UserRoundPlus size={13} /> Reatribuir</button>
              <button className="btn-secondary" onClick={() => quickComment()}><List size={13} /> Comentar</button>
              {selected.processId && <button className="btn-ghost" onClick={() => navigate(`/processos/${selected.processId}`)}><ExternalLink size={13} /> Abrir processo</button>}
              <button className="btn-ghost" onClick={() => navigate('/clientes')}><ExternalLink size={13} /> Abrir cliente</button>
              <button className="btn-ghost" onClick={() => {
                if (selected.origin === 'prazo') navigate('/prazos');
                else if (selected.origin === 'documento') navigate('/documentos');
                else if (selected.origin === 'publicacao') navigate('/publicacoes-intimacoes');
                else if (selected.origin === 'atendimento') navigate('/atendimentos');
                else navigate('/processos');
              }}><ExternalLink size={13} /> Abrir origem</button>
            </div>
          </aside>
        </>
      )}

      {showForm && (
        <>
          <div className="tsk-modal-overlay" onClick={() => setShowForm(false)} />
          <div className="tsk-modal" role="dialog" aria-modal="true" aria-labelledby="tsk-form-title">
            <div className="tsk-modal-header">
              <h3 id="tsk-form-title">Nova Tarefa</h3>
              <button onClick={() => setShowForm(false)} aria-label="Fechar formulário"><X size={16} /></button>
            </div>

            <form className="tsk-form" onSubmit={submitForm} noValidate>
              <div className="tsk-form-grid">
                <div className="tsk-form-field tsk-form-field--full">
                  <label htmlFor="task-title">Título <span>*</span></label>
                  <input id="task-title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
                </div>

                <div className="tsk-form-field tsk-form-field--full">
                  <label htmlFor="task-desc">Descrição</label>
                  <textarea id="task-desc" rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
                </div>

                <div className="tsk-form-field">
                  <label htmlFor="task-process">Processo vinculado</label>
                  <select id="task-process" value={form.processId} onChange={(e) => {
                    const p = processes.find((x) => String(x.id) === e.target.value);
                    setForm((f) => ({ ...f, processId: e.target.value, client: p?.client || f.client }));
                  }}>
                    <option value="">Selecionar</option>
                    {processes.map((p) => <option key={p.id} value={String(p.id)}>#{p.id} • {p.title}</option>)}
                  </select>
                </div>

                <div className="tsk-form-field">
                  <label htmlFor="task-client">Cliente vinculado</label>
                  <input id="task-client" value={form.client} onChange={(e) => setForm((f) => ({ ...f, client: e.target.value }))} />
                </div>

                <div className="tsk-form-field">
                  <label htmlFor="task-origin">Origem</label>
                  <select id="task-origin" value={form.origin} onChange={(e) => setForm((f) => ({ ...f, origin: e.target.value as TaskOrigin }))}>
                    {(Object.entries(ORIGIN_LABEL) as Array<[TaskOrigin, string]>).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>

                <div className="tsk-form-field">
                  <label htmlFor="task-owner">Responsável</label>
                  <input id="task-owner" placeholder={user.email.split('@')[0]} value={form.owner} onChange={(e) => setForm((f) => ({ ...f, owner: e.target.value }))} />
                </div>

                <div className="tsk-form-field">
                  <label htmlFor="task-priority">Prioridade</label>
                  <select id="task-priority" value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as TaskPriority }))}>
                    {(Object.entries(PRIORITY_CFG) as Array<[TaskPriority, { label: string }]>).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>

                <div className="tsk-form-field">
                  <label htmlFor="task-due">Prazo</label>
                  <input id="task-due" type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
                </div>

                <div className="tsk-form-field">
                  <label htmlFor="task-status">Status inicial</label>
                  <select id="task-status" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as TaskStatus }))}>
                    {(Object.entries(STATUS_CFG) as Array<[TaskStatus, { label: string }]>).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="tsk-form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={!form.title}><Plus size={13} /> Criar tarefa</button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
