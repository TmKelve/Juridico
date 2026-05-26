import { useEffect, useEffectEvent, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Calendar,
  CalendarPlus,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Clock,
  Download,
  ExternalLink,
  Filter,
  LayoutGrid,
  List,
  MessageSquare,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Save,
  Search,
  TriangleAlert,
  UserRoundPlus,
  X,
  Zap,
} from 'lucide-react';
import { api, type ApiTask } from './api';
import { captureException, trackEvent, trackPageView } from './monitoring';
import { ProcessCombobox } from './ProcessCombobox';
import { EmptyState, FilterBar, PriorityBadge as ProductPriorityBadge, StatusPill } from './components/product';
import './Tasks.css';
import './Dashboard.css';
import './Processes.css';

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
type TaskWorkflowStage = 'captura' | 'planejamento' | 'execucao' | 'aguardando' | 'conclusao';
type TaskFollowupState = 'idle' | 'scheduled' | 'pending_dispatch' | 'dispatched' | 'acknowledged';
type RawTaskStatus = TaskStatus | 'backlog' | 'triagem' | 'em_execucao' | 'aguardando_cliente' | 'aguardando_interno' | 'cancelada';

interface TaskItem {
  id: string;
  title: string;
  description: string;
  processId: number | null;
  processLabel: string;
  processTitle: string;
  client: string;
  origin: TaskOrigin;
  dueDate: string | null;
  status: TaskStatus;
  rawStatus: RawTaskStatus;
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
  linkedToAttendance: boolean;
  linkedAttendanceId: number | null;
  workflowStage: TaskWorkflowStage | null;
  followupState: TaskFollowupState | null;
  slaDueAt: string | null;
  breached: boolean;
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

function formatDate(iso: string | null | undefined) {
  if (!iso) return 'Sem data';
  return new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR');
}

function isToday(iso: string | null | undefined) {
  if (!iso) return false;
  return iso === toIsoDate(new Date());
}

function isOverdue(iso: string | null | undefined) {
  if (!iso) return false;
  return new Date(`${iso}T00:00:00`).getTime() < new Date(toIsoDate(new Date())).getTime();
}

function daysDiffFromToday(iso: string | null | undefined) {
  if (!iso) return Number.POSITIVE_INFINITY;
  const due = new Date(`${iso}T00:00:00`).getTime();
  const now = new Date(`${toIsoDate(new Date())}T00:00:00`).getTime();
  return Math.floor((due - now) / 86400000);
}

function getRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function readString(record: Record<string, unknown> | null, key: string) {
  const value = record?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readBoolean(record: Record<string, unknown> | null, key: string) {
  const value = record?.[key];
  return typeof value === 'boolean' ? value : null;
}

function readNumber(record: Record<string, unknown> | null, key: string) {
  const value = record?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizeTaskStatus(rawStatus: string | null | undefined, breached: boolean): TaskStatus {
  switch (rawStatus) {
    case 'backlog':
    case 'triagem':
      return 'pendente';
    case 'em_execucao':
      return 'em_andamento';
    case 'aguardando_cliente':
    case 'aguardando_interno':
      return 'aguardando';
    case 'cancelada':
      return 'concluida';
    case 'concluida':
      return 'concluida';
    case 'atrasada':
      return 'atrasada';
    case 'pendente':
    case 'em_andamento':
    case 'aguardando':
      return rawStatus;
    default:
      return breached ? 'atrasada' : 'pendente';
  }
}

function normalizeTaskPriority(rawPriority: string | null | undefined): TaskPriority {
  if (rawPriority === 'baixa' || rawPriority === 'media' || rawPriority === 'alta' || rawPriority === 'critica') {
    return rawPriority;
  }
  return 'media';
}

function extractLinkedEntity(record: Record<string, unknown> | null, entityType: string) {
  const links = record?.linkedEntities;
  if (!Array.isArray(links)) return null;

  for (const entry of links) {
    const link = getRecord(entry);
    if (readString(link, 'entityType') === entityType) {
      return readNumber(link, 'entityId');
    }
  }

  return null;
}

function mapApiTask(task: ApiTask, userEmail: string): TaskItem {
  const actorLabel = userEmail.split('@')[0];
  const raw = getRecord(task);
  const breached = readBoolean(raw, 'breached') ?? false;
  const rawStatus = (readString(raw, 'status') ?? task.status) as RawTaskStatus;
  const dueDate = readString(raw, 'dueDate') ?? task.dueDate ?? null;
  const linkedAttendanceId = extractLinkedEntity(raw, 'attendance');
  const owner = readString(raw, 'ownerLabel') ?? task.owner;
  const createdBy = readString(raw, 'createdBy') ?? task.createdBy;

  return {
    id: String(task.id),
    title: task.title,
    description: task.description,
    processId: task.processId,
    processLabel: task.processLabel,
    processTitle: task.processTitle,
    client: task.client,
    origin: task.origin,
    dueDate,
    status: normalizeTaskStatus(rawStatus, breached || isOverdue(dueDate)),
    rawStatus,
    priority: normalizeTaskPriority(readString(raw, 'priority') ?? task.priority),
    owner,
    createdBy,
    delegatedByMe: createdBy === actorLabel && owner !== actorLabel,
    isMine: owner === actorLabel,
    notes: task.notes,
    linkedToDeadline: readBoolean(raw, 'linkedToDeadline') ?? task.linkedToDeadline,
    linkedToPublication: readBoolean(raw, 'linkedToPublication') ?? task.linkedToPublication,
    linkedToDocument: readBoolean(raw, 'linkedToDocument') ?? task.linkedToDocument,
    immediateAction: task.immediateAction || breached,
    linkedToAttendance: linkedAttendanceId !== null || task.origin === 'atendimento',
    linkedAttendanceId,
    workflowStage: readString(raw, 'workflowStage') as TaskWorkflowStage | null,
    followupState: readString(raw, 'followupState') as TaskFollowupState | null,
    slaDueAt: readString(raw, 'slaDueAt'),
    breached,
  };
}

function StatusBadge({ status }: { status: TaskStatus }) {
  const cfg = STATUS_CFG[status];
  const toneByVariant: Record<string, 'neutral' | 'info' | 'warning' | 'positive' | 'critical'> = {
    muted: 'neutral',
    info: 'info',
    warning: 'warning',
    success: 'positive',
    error: 'critical',
  };
  return <StatusPill tone={toneByVariant[cfg.variant]}>{cfg.label}</StatusPill>;
}

function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const cfg = PRIORITY_CFG[priority];
  const levelByVariant: Record<string, 'low' | 'medium' | 'high' | 'urgent'> = {
    low: 'low',
    medium: 'medium',
    high: 'high',
    critical: 'urgent',
  };
  return <ProductPriorityBadge priority={levelByVariant[cfg.variant]} label={cfg.label} />;
}

const ORIGIN_CHIP_CLASS: Record<TaskOrigin, string> = {
  processo:    'tsk-origin-chip tsk-origin-chip--processo',
  prazo:       'tsk-origin-chip tsk-origin-chip--prazo',
  documento:   'tsk-origin-chip tsk-origin-chip--documento',
  publicacao:  'tsk-origin-chip tsk-origin-chip--publicacao',
  atendimento: 'tsk-origin-chip tsk-origin-chip--atendimento',
  interno:     'tsk-origin-chip tsk-origin-chip--interno',
};

function OriginChip({ origin }: { origin: TaskOrigin }) {
  return <span className={ORIGIN_CHIP_CLASS[origin]}>{ORIGIN_LABEL[origin]}</span>;
}

function AutomationContext({ task }: { task: TaskItem }) {
  const tags: string[] = [];
  if (task.linkedToPublication) tags.push('Publicação');
  if (task.linkedToDeadline) tags.push('Prazo');
  if (task.linkedToDocument) tags.push('Documento');
  if (task.linkedToAttendance) tags.push('Atendimento');
  if (task.immediateAction) tags.push('Ação imediata');
  if (task.breached) tags.push('SLA rompido');

  if (!tags.length) return null;

  return (
    <div className="tsk-drawer-head-meta">
      {tags.map((tag) => (
        <span key={tag} className="tsk-origin-chip">{tag}</span>
      ))}
    </div>
  );
}

const WORKFLOW_STAGE_LABEL: Record<TaskWorkflowStage, string> = {
  captura: 'Captura',
  planejamento: 'Planejamento',
  execucao: 'Execução',
  aguardando: 'Aguardando',
  conclusao: 'Conclusão',
};

const FOLLOWUP_STATE_LABEL: Record<TaskFollowupState, string> = {
  idle: 'Sem follow-up',
  scheduled: 'Follow-up agendado',
  pending_dispatch: 'Follow-up pendente',
  dispatched: 'Follow-up disparado',
  acknowledged: 'Follow-up confirmado',
};

const RAW_STATUS_LABEL: Record<Exclude<RawTaskStatus, TaskStatus>, string> = {
  backlog: 'Backlog',
  triagem: 'Triagem',
  em_execucao: 'Em execução',
  aguardando_cliente: 'Aguardando cliente',
  aguardando_interno: 'Aguardando interno',
  cancelada: 'Cancelada',
};

function OperationalContext({ task }: { task: TaskItem }) {
  const chips: string[] = [];

  if (task.workflowStage) chips.push(WORKFLOW_STAGE_LABEL[task.workflowStage]);
  if (task.followupState) chips.push(FOLLOWUP_STATE_LABEL[task.followupState]);
  if (task.rawStatus in RAW_STATUS_LABEL) chips.push(RAW_STATUS_LABEL[task.rawStatus as Exclude<RawTaskStatus, TaskStatus>]);

  if (!chips.length && !task.slaDueAt) return null;

  return (
    <div className="tsk-operational-meta">
      {chips.map((chip) => (
        <span key={chip} className="tsk-operational-chip">{chip}</span>
      ))}
      {task.slaDueAt && (
        <span className={`tsk-operational-chip${task.breached ? ' is-danger' : ''}`}>
          SLA {new Date(task.slaDueAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
        </span>
      )}
    </div>
  );
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
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  const ITEMS_PER_PAGE = 12;
  const isAdv = user.role === 'ADV';
  const loadDataOnMount = useEffectEvent(loadData);

  useEffect(() => {
    trackPageView('tarefas', { role: user.role });
    loadDataOnMount();
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
      const [processesRes, tasksRes] = await Promise.all([api.getProcesses(), api.getTasks()]);
      if (processesRes.status !== 200 || !Array.isArray(processesRes.data)) {
        setError(processesRes.error || 'Não foi possível carregar tarefas.');
        setLoading(false);
        return;
      }
      if (tasksRes.status !== 200 || !Array.isArray(tasksRes.data)) {
        setError(tasksRes.error || 'Não foi possível carregar tarefas.');
        setLoading(false);
        return;
      }

      const scoped = isAdv
        ? (processesRes.data as ProcessRecord[]).filter((p) => p.ownerId === user.id)
        : (processesRes.data as ProcessRecord[]);
      setProcesses(scoped);
      const mapped = (tasksRes.data as ApiTask[]).map((task) => mapApiTask(task, user.email));
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

  async function markDone(id: string) {
    const res = await api.updateTask(Number(id), { status: 'concluida' });
    if (res.status !== 200 || !res.data) {
      setError(res.error || 'Não foi possível concluir a tarefa.');
      return;
    }

    const next = mapApiTask(res.data, user.email);
    setTasks((prev) => prev.map((t) => (t.id === id ? next : t)));
    if (selected?.id === id) setSelected(next);
    setOpenMenuId(null);
    setSuccess('Tarefa concluída.');
  }

  async function reassign(id: string) {
    const res = await api.updateTask(Number(id), { owner: 'equipe-reatribuida' });
    if (res.status !== 200 || !res.data) {
      setError(res.error || 'Não foi possível reatribuir a tarefa.');
      return;
    }

    const next = mapApiTask(res.data, user.email);
    setTasks((prev) => prev.map((t) => (t.id === id ? next : t)));
    if (selected?.id === id) setSelected(next);
    setOpenMenuId(null);
    setSuccess('Tarefa reatribuída.');
  }

  function quickComment() {
    setSuccess('Comentário registrado na tarefa.');
  }

  function applyKpiFilter(target: 'today' | 'overdue' | 'high' | 'delegated' | 'doneWeek') {
    setFilters(() => {
      if (target === 'today') return { ...EMPTY_FILTERS, period: 'hoje' };
      if (target === 'overdue') return { ...EMPTY_FILTERS, prazo: 'atrasado' };
      if (target === 'high') return { ...EMPTY_FILTERS, priority: 'alta' };
      if (target === 'delegated') return { ...EMPTY_FILTERS, scope: 'delegada_por_mim' };
      return { ...EMPTY_FILTERS, status: 'concluida', period: '7' };
    });
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

  async function submitForm(ev: React.FormEvent) {
    ev.preventDefault();
    const proc = processes.find((p) => String(p.id) === form.processId);
    const res = await api.createTask({
      title: form.title,
      description: form.description,
      processId: form.processId ? Number(form.processId) : undefined,
      client: form.client || proc?.client || '',
      origin: form.origin,
      owner: form.owner || undefined,
      priority: form.priority,
      dueDate: form.dueDate || toIsoDate(new Date()),
      status: form.status,
      notes: form.description,
      immediateAction: form.priority === 'critica',
    });

    if (res.status !== 201 || !res.data) {
      setError(res.error || 'Não foi possível criar a tarefa.');
      return;
    }

    const newTask = mapApiTask(res.data, user.email);
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
  const processOptions = useMemo(
    () => processes.map((p) => ({ value: String(p.id), label: `#${p.id} · ${p.title}`, searchText: `${p.client} ${p.phase}` })),
    [processes],
  );

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (filters.query) {
        const q = filters.query.toLowerCase();
        const hay = `${t.title} ${t.client} ${t.processTitle} ${t.owner} ${t.notes} ${ORIGIN_LABEL[t.origin]} ${t.rawStatus} ${t.workflowStage ?? ''} ${t.followupState ?? ''}`.toLowerCase();
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
      if (filters.vinculada === 'atendimento' && !t.linkedToAttendance) return false;

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
      if (sortBy === 'prazo') cmp = (a.dueDate ?? '9999-12-31').localeCompare(b.dueDate ?? '9999-12-31');
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
  const activeKpi = useMemo(() => {
    if (filters.period === 'hoje') return 'today';
    if (filters.prazo === 'atrasado') return 'overdue';
    if (filters.priority === 'alta') return 'high';
    if (filters.scope === 'delegada_por_mim') return 'delegated';
    if (filters.status === 'concluida' && filters.period === '7') return 'doneWeek';
    return null;
  }, [filters]);

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
    const isLateOrUrgent = t.immediateAction || (isOverdue(t.dueDate) && t.status !== 'concluida');
    const isDueToday = isToday(t.dueDate) && t.status !== 'concluida';

    let rowClass = 'tsk-row';
    if (isLateOrUrgent) rowClass += ' tsk-row--urgent';
    else if (isDueToday) rowClass += ' tsk-row--today';

    const dueCls = `tsk-due${isOverdue(t.dueDate) && t.status !== 'concluida' ? ' tsk-due--overdue' : isDueToday ? ' tsk-due--today' : ''}`;

    return (
      <tr
        key={t.id}
        className={rowClass}
        onClick={() => setSelected(t)}
        tabIndex={0}
        role="button"
        aria-label={`Tarefa ${t.title}`}
        onKeyDown={(e) => e.key === 'Enter' && setSelected(t)}
      >
        <td className="tsk-col-task">
          <strong>{t.title}</strong>
          {t.description && <span>{t.description}</span>}
          <OperationalContext task={t} />
        </td>
        <td className="tsk-col-context">
          <strong>{t.client || '—'}</strong>
          <span>{t.processLabel ? `${t.processLabel} • ${t.processTitle || 'Sem vínculo'}` : 'Sem processo'}</span>
        </td>
        <td><OriginChip origin={t.origin} /></td>
        <td>
          <span className={dueCls}>
            {isDueToday && <Clock size={11} style={{ marginRight: 3, verticalAlign: 'middle' }} />}
            {formatDate(t.dueDate)}
          </span>
        </td>
        <td><StatusBadge status={t.status} /></td>
        <td><PriorityBadge priority={t.priority} /></td>
        <td>
          <span className="tsk-owner-cell">
            {t.isMine && <span className="tsk-owner-dot tsk-owner-dot--mine" title="Minha tarefa" />}
            {t.delegatedByMe && <span className="tsk-owner-dot tsk-owner-dot--delegated" title="Delegada por mim" />}
            {t.owner}
          </span>
        </td>
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
                <li role="none"><button role="menuitem" onClick={() => quickComment()}><MessageSquare size={13} /> Comentar</button></li>
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

      {/* Hero header */}
      <header className="tsk-hero" aria-label="Cabeçalho de tarefas">
        <div className="tsk-hero-copy">
          <p className="tsk-hero-eyebrow">OPERAÇÃO</p>
          <h1 className="tsk-hero-title">Tarefas</h1>
          <p className="tsk-hero-subtitle">Gerencie tarefas operacionais, prazos e responsabilidades da equipe.</p>
        </div>
        <div className="tsk-hero-actions">
          <button className="btn-primary" onClick={() => setShowForm(true)} aria-label="Criar nova tarefa">
            <Plus size={16} /> Nova Tarefa
          </button>
          <button className="btn-secondary" onClick={() => exportCsv(sorted)} aria-label="Exportar tarefas">
            <Download size={16} /> Exportar
          </button>
        </div>
      </header>

      {/* KPI cards */}
      <section className="tsk-kpis" aria-label="Indicadores de tarefas">
        <button type="button" className="metric-card" data-kpi-color="primary" onClick={() => applyKpiFilter('today')} aria-pressed={activeKpi === 'today'} aria-label={`Tarefas hoje: ${kpis.today}`}>
          <div className="metric-top-row">
            <p className="metric-value">{loading ? '—' : kpis.today}</p>
            <div className="metric-icon" aria-hidden="true"><Clock size={16} /></div>
          </div>
          <p className="metric-label">Tarefas hoje</p>
          <p className="metric-microtext">Com vencimento no turno atual</p>
        </button>
        <button type="button" className="metric-card" data-kpi-color="error" onClick={() => applyKpiFilter('overdue')} aria-pressed={activeKpi === 'overdue'} aria-label={`Atrasadas: ${kpis.overdue}`}>
          <div className="metric-top-row">
            <p className="metric-value">{loading ? '—' : kpis.overdue}</p>
            <div className="metric-icon" aria-hidden="true"><TriangleAlert size={16} /></div>
          </div>
          <p className="metric-label">Atrasadas</p>
          <p className="metric-microtext">Exigem atenção imediata</p>
        </button>
        <button type="button" className="metric-card" data-kpi-color="warning" onClick={() => applyKpiFilter('high')} aria-pressed={activeKpi === 'high'} aria-label={`Alta prioridade: ${kpis.high}`}>
          <div className="metric-top-row">
            <p className="metric-value">{loading ? '—' : kpis.high}</p>
            <div className="metric-icon" aria-hidden="true"><Zap size={16} /></div>
          </div>
          <p className="metric-label">Alta prioridade</p>
          <p className="metric-microtext">Acompanhamento próximo</p>
        </button>
        <button type="button" className="metric-card" data-kpi-color="info" onClick={() => applyKpiFilter('delegated')} aria-pressed={activeKpi === 'delegated'} aria-label={`Delegadas: ${kpis.delegated}`}>
          <div className="metric-top-row">
            <p className="metric-value">{loading ? '—' : kpis.delegated}</p>
            <div className="metric-icon" aria-hidden="true"><UserRoundPlus size={16} /></div>
          </div>
          <p className="metric-label">Delegadas</p>
          <p className="metric-microtext">Atribuídas a outros</p>
        </button>
        <button type="button" className="metric-card" data-kpi-color="success" onClick={() => applyKpiFilter('doneWeek')} aria-pressed={activeKpi === 'doneWeek'} aria-label={`Concluídas semana: ${kpis.doneWeek}`}>
          <div className="metric-top-row">
            <p className="metric-value">{loading ? '—' : kpis.doneWeek}</p>
            <div className="metric-icon" aria-hidden="true"><CheckCircle2 size={16} /></div>
          </div>
          <p className="metric-label">Concluídas semana</p>
          <p className="metric-microtext">Entregas desta semana</p>
        </button>
      </section>

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

      {/* Painel de filtros — padrão visual Processos */}
      <section className={`my-processes-filters tsk-filters${filtersExpanded ? '' : ' is-compact'}`} aria-label="Busca e filtros de tarefas">

        {/* Cabeçalho do painel */}
        <div className="filters-head">
          <div>
            <p className="filters-eyebrow">Refinar tarefas</p>
            <h3>Filtros de tarefas</h3>
          </div>
          <div className="filters-head-meta">
            {hasActiveFilters && <span className="filters-active-pill">Filtros ativos</span>}
            <span className="filters-total-pill">{filtered.length} em exibição</span>
            <div className="tsk-view-toggle" role="group" aria-label="Modo de visualização">
              <button
                className={`tsk-view-btn${viewMode === 'lista' ? ' tsk-view-btn--active' : ''}`}
                onClick={() => setViewMode('lista')}
                aria-pressed={viewMode === 'lista'}
                type="button"
              >
                <List size={13} /> Lista
              </button>
              <button
                className={`tsk-view-btn${viewMode === 'kanban' ? ' tsk-view-btn--active' : ''}`}
                onClick={() => setViewMode('kanban')}
                aria-pressed={viewMode === 'kanban'}
                type="button"
              >
                <LayoutGrid size={13} /> Kanban
              </button>
            </div>
            <button
              type="button"
              className={`btn-ghost btn-filter-density${filtersExpanded ? ' is-open' : ''}`}
              onClick={() => setFiltersExpanded((v) => !v)}
              aria-expanded={filtersExpanded}
            >
              <Filter size={14} aria-hidden="true" />
              {filtersExpanded ? 'Menos filtros' : 'Mais filtros'}
            </button>
          </div>
        </div>

        {/* Chips de acesso rápido */}
        <div className="filter-presets" role="toolbar" aria-label="Presets de filtros rápidos">
          <button type="button" className="filter-preset-btn" onClick={() => applyKpiFilter('overdue')}>Atrasadas</button>
          <button type="button" className="filter-preset-btn" onClick={() => applyKpiFilter('high')}>Alta prioridade</button>
          <button type="button" className="filter-preset-btn" onClick={() => applyKpiFilter('today')}>Hoje</button>
          <button type="button" className="filter-preset-btn" onClick={() => applyKpiFilter('delegated')}>Delegadas</button>
          <button type="button" className="filter-preset-btn" onClick={() => applyKpiFilter('doneWeek')}>Concluídas semana</button>
        </div>

        {/* Linha principal: busca + filtros rápidos */}
        <div className="filters-top-row filter-row-card">
          <label htmlFor="tsk-search" className="filter-field filter-field-search filter-cascade-item">
            <span>Busca</span>
            <div className="filter-input-wrap">
              <Search size={14} aria-hidden="true" />
              <input
                id="tsk-search"
                type="search"
                placeholder="Título, cliente, processo, responsável..."
                value={filters.query}
                onChange={(e) => updateFilter('query', e.target.value)}
                aria-label="Buscar tarefa"
              />
            </div>
          </label>
          <label htmlFor="tsk-status" className="filter-field filter-cascade-item">
            <span>Status</span>
            <select id="tsk-status" value={filters.status} onChange={(e) => updateFilter('status', e.target.value)}>
              <option value="">Todos</option>
              {(Object.entries(STATUS_CFG) as Array<[TaskStatus, { label: string }]>).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </label>
          <label htmlFor="tsk-priority" className="filter-field filter-cascade-item">
            <span>Prioridade</span>
            <select id="tsk-priority" value={filters.priority} onChange={(e) => updateFilter('priority', e.target.value)}>
              <option value="">Todas</option>
              {(Object.entries(PRIORITY_CFG) as Array<[TaskPriority, { label: string }]>).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </label>
          <label htmlFor="tsk-prazo" className="filter-field filter-cascade-item">
            <span>Prazo</span>
            <select id="tsk-prazo" value={filters.prazo} onChange={(e) => updateFilter('prazo', e.target.value)}>
              <option value="">Todos</option>
              <option value="hoje">Hoje</option>
              <option value="atrasado">Atrasado</option>
            </select>
          </label>
        </div>

        {/* Filtros avançados (expansíveis) */}
        {filtersExpanded && (
          <div className="filters-bottom-row filter-row-card">
            <label htmlFor="tsk-owner" className="filter-field filter-cascade-item">
              <span>Responsável</span>
              <select id="tsk-owner" value={filters.owner} onChange={(e) => updateFilter('owner', e.target.value)}>
                <option value="">Todos</option>
                {uniqueOwners.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </label>
            <label htmlFor="tsk-scope" className="filter-field filter-cascade-item">
              <span>Escopo</span>
              <select id="tsk-scope" value={filters.scope} onChange={(e) => updateFilter('scope', e.target.value)}>
                <option value="">Todos</option>
                <option value="minha">Tarefa minha</option>
                <option value="delegada_por_mim">Delegada por mim</option>
              </select>
            </label>
            <label htmlFor="tsk-process" className="filter-field filter-cascade-item" style={{ gridColumn: 'span 4' }}>
              <span>Processo</span>
              <ProcessCombobox id="tsk-process" value={filters.process} onChange={(value) => updateFilter('process', value)} options={processOptions} placeholder="Buscar processo" emptyLabel="Todos" />
            </label>
            <label htmlFor="tsk-client" className="filter-field filter-cascade-item">
              <span>Cliente</span>
              <select id="tsk-client" value={filters.client} onChange={(e) => updateFilter('client', e.target.value)}>
                <option value="">Todos</option>
                {uniqueClients.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label htmlFor="tsk-origin" className="filter-field filter-cascade-item">
              <span>Origem</span>
              <select id="tsk-origin" value={filters.origin} onChange={(e) => updateFilter('origin', e.target.value)}>
                <option value="">Todas</option>
                {(Object.entries(ORIGIN_LABEL) as Array<[TaskOrigin, string]>).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <label htmlFor="tsk-link" className="filter-field filter-cascade-item">
              <span>Vinculada a</span>
              <select id="tsk-link" value={filters.vinculada} onChange={(e) => updateFilter('vinculada', e.target.value)}>
                <option value="">Todas</option>
                <option value="prazo">Prazo</option>
                <option value="publicacao">Publicação</option>
                <option value="documento">Documento</option>
                <option value="atendimento">Atendimento</option>
              </select>
            </label>
            <label htmlFor="tsk-period" className="filter-field filter-cascade-item">
              <span>Período</span>
              <select id="tsk-period" value={filters.period} onChange={(e) => updateFilter('period', e.target.value)}>
                <option value="">Todos</option>
                <option value="hoje">Hoje</option>
                <option value="7">7 dias</option>
                <option value="30">30 dias</option>
              </select>
            </label>
            <div className="filter-actions filter-cascade-item">
              <button type="button" className="btn-ghost btn-filter-clear" onClick={clearFilters}><Filter size={14} aria-hidden="true" />Limpar filtros</button>
              <button type="button" className="btn-ghost" onClick={saveFilters}><Save size={14} aria-hidden="true" />Salvar filtro</button>
            </div>
          </div>
        )}

      </section>

      {loading && (
        <div className="tsk-loading" aria-live="polite" aria-busy="true">
          <RefreshCw size={20} className="tsk-spin" />
          <span>Carregando tarefas...</span>
        </div>
      )}

      {!loading && !error && (
        <>
          {tasks.length === 0 && (
            <EmptyState
              className="tsk-empty"
              icon={<ClipboardCheck size={32} />}
              title="Nenhuma tarefa cadastrada"
              description="Crie a primeira tarefa para organizar sua operação diária."
              actionLabel="Nova tarefa"
              onAction={() => setShowForm(true)}
            />
          )}

          {tasks.length > 0 && filtered.length === 0 && (
            <EmptyState
              className="tsk-empty"
              icon={<Filter size={32} />}
              title="Nenhuma tarefa para este filtro"
              description="Ajuste os critérios ou limpe os filtros."
              actionLabel="Limpar filtros"
              onAction={clearFilters}
            />
          )}

          {filtered.length > 0 && viewMode === 'lista' && (
            <div className="tsk-table-card">
              <div className="tsk-table-header">
                <div className="tsk-table-header-copy">
                  <span className="tsk-count-badge">{filtered.length} tarefa{filtered.length !== 1 ? 's' : ''}</span>
                  <p className="tsk-table-subtitle">Trabalhe a fila por prazo, prioridade e responsabilidade.</p>
                </div>
                <div className="tsk-table-header-controls">
                  <div className="tsk-sort-controls">
                    <label htmlFor="tsk-sort" className="sr-only">Ordenar por</label>
                    <select id="tsk-sort" value={sortBy} onChange={(e) => setSortBy(e.target.value as SortField)}>
                      <option value="prazo">Prazo</option>
                      <option value="prioridade">Prioridade</option>
                      <option value="status">Status</option>
                      <option value="responsavel">Responsável</option>
                    </select>
                    <button className="btn-ghost tsk-sort-dir" onClick={() => setSortDesc((d) => !d)} aria-label={sortDesc ? 'Ordem decrescente' : 'Ordem crescente'}>{sortDesc ? '↓' : '↑'}</button>
                  </div>
                </div>
              </div>

              <div className="tsk-table-wrap">
                <table className="tsk-table" aria-label="Lista de tarefas">
                  <thead>
                    <tr>
                      <th>Tarefa</th>
                      <th>Contexto</th>
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
                <section key={col.status} className={`tsk-kanban-col tsk-kanban-col--${col.status}`}>
                  <header>
                    <h4>{col.title}</h4>
                    <span>{col.items.length}</span>
                  </header>
                  <div className="tsk-kanban-list">
                    {col.items.map((t) => {
                      const isUrgent = t.immediateAction || (isOverdue(t.dueDate) && t.status !== 'concluida');
                      const isDueToday = isToday(t.dueDate) && t.status !== 'concluida';
                      return (
                        <article
                          key={t.id}
                          className={`tsk-kanban-card${isUrgent ? ' tsk-kanban-card--urgent' : isDueToday ? ' tsk-kanban-card--today' : ''}`}
                          onClick={() => setSelected(t)}
                          tabIndex={0}
                          role="button"
                          onKeyDown={(e) => e.key === 'Enter' && setSelected(t)}
                        >
                          <div className="tsk-kanban-card-title">
                            <strong>{t.title}</strong>
                            {isUrgent && <span className="tsk-kanban-urgent-dot" aria-label="Urgente" />}
                          </div>
                          <p>{t.client}{t.processLabel ? ` · ${t.processLabel}` : ''}</p>
                          <div className="tsk-kanban-meta">
                            <span className={isOverdue(t.dueDate) && t.status !== 'concluida' ? 'tsk-due--overdue' : isDueToday ? 'tsk-due--today' : ''}>
                              <Calendar size={11} /> {formatDate(t.dueDate)}
                            </span>
                            <PriorityBadge priority={t.priority} />
                          </div>
                          <div className="tsk-kanban-meta">
                            <span className="tsk-owner-label">{t.owner}</span>
                            <OriginChip origin={t.origin} />
                          </div>
                          <OperationalContext task={t} />
                        </article>
                      );
                    })}
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
              <div className="tsk-drawer-row2">
                <div><span className="tsk-label">Fluxo</span><span className="tsk-value">{selected.workflowStage ? WORKFLOW_STAGE_LABEL[selected.workflowStage] : 'Compatível com legado'}</span></div>
                <div><span className="tsk-label">Follow-up</span><span className="tsk-value">{selected.followupState ? FOLLOWUP_STATE_LABEL[selected.followupState] : 'Sem contexto novo'}</span></div>
              </div>
              {(selected.slaDueAt || selected.rawStatus !== selected.status) && (
                <div className="tsk-drawer-row2">
                  <div><span className="tsk-label">Status de origem</span><span className="tsk-value">{selected.rawStatus in RAW_STATUS_LABEL ? RAW_STATUS_LABEL[selected.rawStatus as Exclude<RawTaskStatus, TaskStatus>] : STATUS_CFG[selected.status].label}</span></div>
                  <div><span className={`tsk-label${selected.breached ? ' tsk-label--alert' : ''}`}>SLA</span><span className={`tsk-value${selected.breached ? ' tsk-value--alert' : ''}`}>{selected.slaDueAt ? new Date(selected.slaDueAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Sem SLA publicado'}</span></div>
                </div>
              )}
              <AutomationContext task={selected} />
              <div><span className="tsk-label">Observações</span><p className="tsk-notes">{selected.notes}</p></div>
            </div>

            <div className="tsk-drawer-actions">
              {/* Ação primária */}
              <button
                className="btn-primary"
                onClick={() => markDone(selected.id)}
                disabled={selected.status === 'concluida'}
              >
                <CheckCircle2 size={14} />
                {selected.status === 'concluida' ? 'Concluída' : 'Marcar como concluída'}
              </button>

              {/* Ações secundárias */}
              <div className="tsk-drawer-secondary-actions">
                <button className="btn-secondary" onClick={() => setSuccess('Edição rápida iniciada.')}><CalendarPlus size={13} /> Editar</button>
                <button className="btn-secondary" onClick={() => reassign(selected.id)}><UserRoundPlus size={13} /> Reatribuir</button>
                <button className="btn-secondary" onClick={() => quickComment()}><MessageSquare size={13} /> Comentar</button>
              </div>

              {/* Links de navegação */}
              <div className="tsk-drawer-links">
                {selected.processId && (
                  <button className="btn-ghost" onClick={() => navigate(`/processos/${selected.processId}`)}>
                    <ExternalLink size={12} /> Processo
                  </button>
                )}
                <button className="btn-ghost" onClick={() => navigate('/clientes')}>
                  <ExternalLink size={12} /> Cliente
                </button>
                <button className="btn-ghost" onClick={() => {
                  if (selected.origin === 'prazo') navigate('/prazos');
                  else if (selected.origin === 'documento') navigate('/documentos');
                  else if (selected.origin === 'publicacao') navigate('/publicacoes-intimacoes');
                  else if (selected.origin === 'atendimento') navigate('/atendimentos');
                  else navigate('/processos');
                }}>
                  <ExternalLink size={12} /> Origem ({ORIGIN_LABEL[selected.origin]})
                </button>
                {selected.linkedToPublication && (
                  <button className="btn-ghost" onClick={() => navigate(`/triagem?processId=${selected.processId ?? ''}`)}>
                    <ExternalLink size={12} /> Triagem
                  </button>
                )}
              </div>
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
                  <ProcessCombobox
                    id="task-process"
                    value={form.processId}
                    onChange={(value) => {
                      const p = processes.find((x) => String(x.id) === value);
                      setForm((f) => ({ ...f, processId: value, client: p?.client || f.client }));
                    }}
                    options={processOptions}
                    placeholder="Pesquisar processo"
                    emptyLabel="Selecionar processo"
                  />
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
