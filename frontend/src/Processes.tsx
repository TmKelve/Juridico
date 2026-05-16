import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Download,
  FilePlus2,
  Filter,
  FolderOpen,
  KanbanSquare,
  Loader2,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldAlert,
  Timer,
  UserRound,
  X,
} from 'lucide-react';
import { api } from './api';
import { captureException, trackEvent, trackPageView } from './monitoring';
import './Processes.css';

interface Process {
  id: number;
  title: string;
  processNumber?: string | null;
  client: string;
  phase: string;
  status: string;
  ownerId: number;
  owner?: { id: number; email: string; role: string };
}

interface ProcessFormData {
  title: string;
  processNumber: string;
  client: string;
  phase: string;
  status: string;
}

interface ProcessesProps {
  user: { id: number; email: string; role: string };
}

type Priority = 'alta' | 'media' | 'baixa';
type ViewMode = 'table' | 'kanban';
type PrazoFiltro = 'todos' | 'critico' | 'hoje' | '7dias';
type SortField = 'nextDeadline' | 'priority' | 'lastMovement';
type SortDirection = 'asc' | 'desc';
type FilterPresetKey = 'critical_today' | 'stale_15' | 'pending_docs' | 'new_publications';
type ProcessEntryMode = 'novo' | 'andamento';
type KanbanStage =
  | 'aguardando_acao'
  | 'aguardando_documentos'
  | 'protocolar'
  | 'aguardando_audiencia'
  | 'em_acompanhamento'
  | 'bloqueado'
  | 'encerrado';

interface EnrichedProcess extends Process {
  area: string;
  tribunal: string;
  party: string;
  priority: Priority;
  nextDeadlineAt: Date;
  lastMovementAt: Date;
  pendingDocuments: number;
  hasNewPublication: boolean;
  hasFutureHearing: boolean;
  operationalStatus: KanbanStage;
  nextStep: string;
}

interface ProcessFilters {
  query: string;
  area: string;
  phase: string;
  tribunal: string;
  priority: string;
  status: string;
  prazo: PrazoFiltro;
  pendingDocsOnly: boolean;
  newPublicationOnly: boolean;
  staleDays: string;
}

const AREAS = ['Trabalhista', 'Civel', 'Tributario', 'Empresarial', 'Previdenciario'];
const TRIBUNAIS = ['TRT 2', 'TRF 3', 'TJSP', 'TST', 'STJ'];
const PARTIES = ['Reclamante', 'Reclamada', 'Autor', 'Reu', 'Embargante'];
const PHASES = ['Inicial', 'Contestacao', 'Instrucao', 'Sentenca', 'Recurso'];
const KANBAN_COLUMNS: Array<{ key: KanbanStage; label: string }> = [
  { key: 'aguardando_acao', label: 'Aguardando Acao' },
  { key: 'aguardando_documentos', label: 'Aguardando Documentos' },
  { key: 'protocolar', label: 'Protocolar' },
  { key: 'aguardando_audiencia', label: 'Aguardando Audiencia' },
  { key: 'em_acompanhamento', label: 'Em Acompanhamento' },
  { key: 'bloqueado', label: 'Bloqueado' },
  { key: 'encerrado', label: 'Encerrado' },
];

const EMPTY_FILTERS: ProcessFilters = {
  query: '',
  area: '',
  phase: '',
  tribunal: '',
  priority: '',
  status: '',
  prazo: 'todos',
  pendingDocsOnly: false,
  newPublicationOnly: false,
  staleDays: '',
};

const PRIORITY_ORDER: Record<Priority, number> = { alta: 0, media: 1, baixa: 2 };
const SAVED_FILTERS_KEY = 'lexora_processes_saved_filter';
const LEGACY_SAVED_FILTERS_KEY = 'lexora_adv_saved_filter';
const FILTERS_COMPACT_KEY = 'lexora_processes_filters_compact';
const FILTER_PRESETS: Array<{ key: FilterPresetKey; label: string }> = [
  { key: 'critical_today', label: 'Criticos hoje' },
  { key: 'stale_15', label: 'Sem atualizacao 15d' },
  { key: 'pending_docs', label: 'Com pendencias docs' },
  { key: 'new_publications', label: 'Com publicacao nova' },
];

function parseStoredFilters(rawValue: string | null): ProcessFilters | null {
  if (!rawValue) return null;

  try {
    const parsed = JSON.parse(rawValue) as Partial<ProcessFilters>;

    return {
      query: typeof parsed.query === 'string' ? parsed.query : EMPTY_FILTERS.query,
      area: typeof parsed.area === 'string' ? parsed.area : EMPTY_FILTERS.area,
      phase: typeof parsed.phase === 'string' ? parsed.phase : EMPTY_FILTERS.phase,
      tribunal: typeof parsed.tribunal === 'string' ? parsed.tribunal : EMPTY_FILTERS.tribunal,
      priority: typeof parsed.priority === 'string' ? parsed.priority : EMPTY_FILTERS.priority,
      status: typeof parsed.status === 'string' ? parsed.status : EMPTY_FILTERS.status,
      prazo: parsed.prazo === 'todos' || parsed.prazo === 'critico' || parsed.prazo === 'hoje' || parsed.prazo === '7dias'
        ? parsed.prazo
        : EMPTY_FILTERS.prazo,
      pendingDocsOnly: typeof parsed.pendingDocsOnly === 'boolean' ? parsed.pendingDocsOnly : EMPTY_FILTERS.pendingDocsOnly,
      newPublicationOnly: typeof parsed.newPublicationOnly === 'boolean' ? parsed.newPublicationOnly : EMPTY_FILTERS.newPublicationOnly,
      staleDays: typeof parsed.staleDays === 'string' ? parsed.staleDays : EMPTY_FILTERS.staleDays,
    };
  } catch {
    return null;
  }
}

function addDays(base: Date, days: number) {
  const date = new Date(base);
  date.setDate(date.getDate() + days);
  return date;
}

function dayDiff(target: Date, base: Date) {
  const ms = target.getTime() - base.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function mapOperationalStatus(process: Process, hasFutureHearing: boolean, pendingDocuments: number): KanbanStage {
  const normalizedStatus = process.status.toLowerCase();

  if (normalizedStatus === 'concluido') return 'encerrado';
  if (normalizedStatus === 'pausado') return 'bloqueado';
  if (pendingDocuments > 0) return 'aguardando_documentos';
  if (hasFutureHearing) return 'aguardando_audiencia';

  const normalizedPhase = process.phase.toLowerCase();
  if (normalizedPhase.includes('inicial')) return 'aguardando_acao';
  if (normalizedPhase.includes('contestacao') || normalizedPhase.includes('recurso')) return 'protocolar';
  return 'em_acompanhamento';
}

function getNextStep(status: KanbanStage) {
  const map: Record<KanbanStage, string> = {
    aguardando_acao: 'Registrar andamento hoje',
    aguardando_documentos: 'Solicitar documento ao cliente',
    protocolar: 'Preparar peca e protocolar',
    aguardando_audiencia: 'Revisar pauta e provas',
    em_acompanhamento: 'Monitorar publicacoes e prazo',
    bloqueado: 'Destravar pendencia interna',
    encerrado: 'Arquivar e concluir pendencias',
  };

  return map[status];
}

function formatDate(date: Date) {
  return date.toLocaleDateString('pt-BR');
}

function formatDueContext(target: Date) {
  const diff = dayDiff(target, new Date());
  if (diff < 0) return { label: `Vencido há ${Math.abs(diff)} dia(s)`, tone: 'error' };
  if (diff === 0) return { label: 'Vence hoje', tone: 'error' };
  if (diff === 1) return { label: 'Vence amanhã', tone: 'warning' };
  if (diff <= 7) return { label: `Vence em ${diff} dia(s)`, tone: 'warning' };
  return { label: 'Prazo futuro', tone: 'neutral' };
}

function formatStaleContext(target: Date) {
  const diff = Math.abs(dayDiff(target, new Date()));
  if (diff === 0) return 'Movimentado hoje';
  if (diff === 1) return 'Há 1 dia';
  return `Há ${diff} dias`;
}

function enrichProcess(process: Process, index: number): EnrichedProcess {
  const today = new Date();
  const area = AREAS[(process.id + index) % AREAS.length];
  const tribunal = TRIBUNAIS[(process.id + index * 2) % TRIBUNAIS.length];
  const party = PARTIES[(process.id + index * 3) % PARTIES.length];
  const deadlineOffset = ((process.id + index) % 14) - 3;
  const nextDeadlineAt = addDays(today, deadlineOffset);
  const staleOffset = ((process.id * 3 + index) % 26) + 1;
  const lastMovementAt = addDays(today, -staleOffset);
  const pendingDocuments = (process.id + index) % 3;
  const hasNewPublication = (process.id + index) % 4 === 0;
  const hasFutureHearing = (process.id + index) % 5 === 0;

  let priority: Priority = 'media';
  if (deadlineOffset <= 1 || pendingDocuments >= 2) priority = 'alta';
  if (deadlineOffset >= 6 && pendingDocuments === 0) priority = 'baixa';

  const operationalStatus = mapOperationalStatus(process, hasFutureHearing, pendingDocuments);

  return {
    ...process,
    area,
    tribunal,
    party,
    priority,
    nextDeadlineAt,
    lastMovementAt,
    pendingDocuments,
    hasNewPublication,
    hasFutureHearing,
    operationalStatus,
    nextStep: getNextStep(operationalStatus),
  };
}

export function Processes({ user }: ProcessesProps) {
  const navigate = useNavigate();
  const [processes, setProcesses] = useState<Process[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [entryMode, setEntryMode] = useState<ProcessEntryMode>('novo');
  const [formData, setFormData] = useState<ProcessFormData>({
    title: '',
    processNumber: '',
    client: '',
    phase: 'Inicial',
    status: 'ativo',
  });
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [lookupInfo, setLookupInfo] = useState<{ alreadyRegistered: boolean; existingId?: number | null } | null>(null);

  const [filters, setFilters] = useState<ProcessFilters>(EMPTY_FILTERS);
  const [sortBy, setSortBy] = useState<SortField>('nextDeadline');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProcess, setSelectedProcess] = useState<EnrichedProcess | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);
  const [clientSuggestionIndex, setClientSuggestionIndex] = useState(-1);
  const [isFiltersCompact, setIsFiltersCompact] = useState(false);

  const isAdvogado = user.role === 'ADV';
  const itemsPerPage = 10;

  useEffect(() => {
    trackPageView('processes', { role: user.role, view: 'meus_processos' });
    loadProcesses();
  }, [user.role]);

  useEffect(() => {
    const storedFilters = parseStoredFilters(localStorage.getItem(SAVED_FILTERS_KEY))
      ?? parseStoredFilters(localStorage.getItem(LEGACY_SAVED_FILTERS_KEY));

    if (!storedFilters) return;

    setFilters(storedFilters);

    if (localStorage.getItem(LEGACY_SAVED_FILTERS_KEY)) {
      localStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(storedFilters));
      localStorage.removeItem(LEGACY_SAVED_FILTERS_KEY);
    }

    trackEvent('meus_processos_filter_restored');
  }, []);

  useEffect(() => {
    const savedCompactMode = localStorage.getItem(FILTERS_COMPACT_KEY);
    if (!savedCompactMode) return;
    setIsFiltersCompact(savedCompactMode === '1');
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters, sortBy, sortDirection]);

  useEffect(() => {
    if (!showForm || editingId || entryMode !== 'andamento') return;

    const normalized = formData.processNumber.replace(/\D/g, '');
    if (normalized.length < 8) {
      setLookupLoading(false);
      setLookupError('');
      setLookupInfo(null);
      return;
    }

    const handle = window.setTimeout(async () => {
      setLookupLoading(true);
      setLookupError('');

      try {
        const res = await api.lookupProcess(normalized);
        if (res.status === 200 && res.data?.process) {
          setFormData((prev) => ({
            ...prev,
            processNumber: normalized,
            title: res.data.process.title,
            client: res.data.process.client,
            phase: res.data.process.phase,
            status: res.data.process.status,
          }));
          setLookupInfo({
            alreadyRegistered: res.data.alreadyRegistered,
            existingId: res.data.alreadyRegistered ? res.data.process.id : null,
          });
        } else {
          setLookupInfo(null);
          setLookupError(res.error || 'Nenhum dado encontrado para esse numero de processo');
        }
      } catch (err) {
        setLookupInfo(null);
        setLookupError((err as Error).message);
      } finally {
        setLookupLoading(false);
      }
    }, 450);

    return () => window.clearTimeout(handle);
  }, [editingId, entryMode, formData.processNumber, showForm]);

  function resetFormState(nextMode: ProcessEntryMode = 'novo') {
    setEditingId(null);
    setEntryMode(nextMode);
    setLookupLoading(false);
    setLookupError('');
    setLookupInfo(null);
    setFormData({
      title: '',
      processNumber: '',
      client: '',
      phase: 'Inicial',
      status: 'ativo',
    });
  }

  async function loadProcesses() {
    setLoading(true);
    setError('');

    try {
      const res = await api.getProcesses();
      if (res.status === 200) {
        setProcesses(Array.isArray(res.data) ? res.data : []);
        trackEvent('meus_processos_loaded', { count: res.data?.length || 0, role: user.role });
      } else {
        setError(res.error || 'Erro ao carregar processos');
      }
    } catch (err) {
      const message = (err as Error).message;
      setError(message);
      captureException(err as Error, { context: 'loadProcesses' });
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.title || !formData.client) {
      setError('Titulo e cliente sao obrigatorios');
      return;
    }

    if (entryMode === 'andamento' && !editingId && !formData.processNumber.trim()) {
      setError('Informe o numero do processo para cadastrar um processo em andamento.');
      return;
    }

    if (lookupInfo?.alreadyRegistered && lookupInfo.existingId && !editingId) {
      setError('Esse numero de processo ja esta cadastrado na carteira.');
      return;
    }

    try {
      let res;
      if (editingId) {
        res = await api.updateProcess(editingId, formData);
        trackEvent('process_updated', { id: editingId });
      } else {
        res = await api.createProcess(formData);
        trackEvent('process_created', { title: formData.title });
      }

      if (res.status === 200 || res.status === 201) {
        setSuccess(editingId ? 'Processo atualizado com sucesso.' : 'Processo criado com sucesso.');
        setShowForm(false);
        resetFormState('novo');
        await loadProcesses();
      } else {
        setError(res.error || 'Erro ao salvar processo');
      }
    } catch (err) {
      setError((err as Error).message);
      captureException(err as Error, { context: 'handleSubmit' });
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Tem certeza que deseja excluir este processo?')) return;

    try {
      const res = await api.deleteProcess(id);
      if (res.status === 204) {
        setSuccess('Processo removido com sucesso.');
        await loadProcesses();
      } else {
        setError(res.error || 'Erro ao excluir processo');
      }
    } catch (err) {
      setError((err as Error).message);
      captureException(err as Error, { context: 'handleDelete' });
    }
  }

  function handleEdit(process: EnrichedProcess) {
    if (user.role !== 'ADM' && user.role !== 'FIN' && process.ownerId !== user.id) {
      setError('Voce nao tem permissao para editar este processo');
      return;
    }

    setFormData({
      title: process.title,
      processNumber: process.processNumber ?? '',
      client: process.client,
      phase: process.phase,
      status: process.status,
    });
    setEntryMode(process.processNumber ? 'andamento' : 'novo');
    setLookupError('');
    setLookupInfo(null);
    setEditingId(process.id);
    setShowForm(true);
    setMenuOpenId(null);
  }

  function updateFilter<K extends keyof ProcessFilters>(key: K, value: ProcessFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function saveCurrentFilter() {
    localStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(filters));
    setSuccess('Filtro salvo.');
    trackEvent('meus_processos_filter_saved');
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
    setSuccess('Filtros limpos.');
  }

  function toggleFiltersDensity() {
    setIsFiltersCompact((prev) => {
      const next = !prev;
      localStorage.setItem(FILTERS_COMPACT_KEY, next ? '1' : '0');
      trackEvent('meus_processos_filters_density_toggled', { mode: next ? 'compact' : 'expanded' });
      return next;
    });
  }

  function applyQuickPreset(preset: FilterPresetKey) {
    if (preset === 'critical_today') {
      setFilters({ ...EMPTY_FILTERS, prazo: 'hoje', priority: 'alta' });
      setSuccess('Preset aplicado: Criticos hoje.');
    }
    if (preset === 'stale_15') {
      setFilters({ ...EMPTY_FILTERS, staleDays: '15' });
      setSuccess('Preset aplicado: Sem atualizacao 15 dias.');
    }
    if (preset === 'pending_docs') {
      setFilters({ ...EMPTY_FILTERS, pendingDocsOnly: true });
      setSuccess('Preset aplicado: Processos com documentos pendentes.');
    }
    if (preset === 'new_publications') {
      setFilters({ ...EMPTY_FILTERS, newPublicationOnly: true });
      setSuccess('Preset aplicado: Processos com publicacao nova.');
    }
    trackEvent('meus_processos_quick_preset_applied', { preset });
  }

  function exportCsv() {
    const header = ['Processo', 'Cliente', 'Area', 'Fase', 'Proximo Prazo', 'Status', 'Ultima Movimentacao', 'Prioridade'];
    const rows = sortedProcesses.map((process) => [
      String(process.id),
      process.client,
      process.area,
      process.phase,
      formatDate(process.nextDeadlineAt),
      process.operationalStatus,
      formatDate(process.lastMovementAt),
      process.priority,
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'meus-processos.csv';
    link.click();
    URL.revokeObjectURL(url);

    trackEvent('meus_processos_export_csv', { count: rows.length });
  }

  const scopedProcesses = useMemo(() => {
    if (!isAdvogado) return processes;
    return processes.filter((process) => process.ownerId === user.id);
  }, [isAdvogado, processes, user.id]);

  const knownClients = useMemo(() => {
    return Array.from(
      new Set(
        processes
          .map((process) => process.client.trim())
          .filter((client) => client.length > 0)
      )
    ).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [processes]);

  const clientExists = useMemo(() => {
    const normalizedClient = formData.client.trim().toLowerCase();
    if (!normalizedClient) return false;
    return knownClients.some((client) => client.toLowerCase() === normalizedClient);
  }, [formData.client, knownClients]);

  const clientSuggestions = useMemo(() => {
    const query = formData.client.trim().toLowerCase();
    if (!query) return [];

    return knownClients
      .filter((client) => client.toLowerCase().includes(query))
      .slice(0, 6);
  }, [formData.client, knownClients]);

  const showClientShortcut = formData.client.trim().length >= 3 && !clientExists;
  const isClientSuggestionOpen = showForm && clientSuggestions.length > 0 && !clientExists;
  const processLookupReady = entryMode === 'novo' || editingId !== null || (!!formData.title && !!formData.client && !lookupInfo?.alreadyRegistered);

  useEffect(() => {
    setClientSuggestionIndex(-1);
  }, [formData.client, showForm]);

  const enrichedProcesses = useMemo(
    () => scopedProcesses.map((process, index) => enrichProcess(process, index)),
    [scopedProcesses]
  );

  const filteredProcesses = useMemo(() => {
    const today = new Date();

    return enrichedProcesses.filter((process) => {
      if (filters.query) {
        const query = filters.query.toLowerCase();
        const source = `${process.id} ${process.title} ${process.client} ${process.tribunal} ${process.party}`.toLowerCase();
        if (!source.includes(query)) return false;
      }

      if (filters.area && process.area !== filters.area) return false;
      if (filters.phase && process.phase !== filters.phase) return false;
      if (filters.tribunal && process.tribunal !== filters.tribunal) return false;
      if (filters.priority && process.priority !== filters.priority) return false;
      if (filters.status && process.operationalStatus !== filters.status) return false;
      if (filters.pendingDocsOnly && process.pendingDocuments === 0) return false;
      if (filters.newPublicationOnly && !process.hasNewPublication) return false;

      if (filters.staleDays) {
        const staleLimit = Number(filters.staleDays);
        const staleDays = Math.abs(dayDiff(process.lastMovementAt, today));
        if (staleDays < staleLimit) return false;
      }

      if (filters.prazo !== 'todos') {
        const diff = dayDiff(process.nextDeadlineAt, today);
        if (filters.prazo === 'critico' && diff > 1) return false;
        if (filters.prazo === 'hoje' && diff !== 0) return false;
        if (filters.prazo === '7dias' && (diff < 0 || diff > 7)) return false;
      }

      return true;
    });
  }, [enrichedProcesses, filters]);

  const sortedProcesses = useMemo(() => {
    const sorted = [...filteredProcesses];

    sorted.sort((a, b) => {
      if (sortBy === 'nextDeadline') {
        return a.nextDeadlineAt.getTime() - b.nextDeadlineAt.getTime();
      }
      if (sortBy === 'lastMovement') {
        return b.lastMovementAt.getTime() - a.lastMovementAt.getTime();
      }
      return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    });

    if (sortDirection === 'desc') sorted.reverse();
    return sorted;
  }, [filteredProcesses, sortBy, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedProcesses.length / itemsPerPage));

  const paginatedProcesses = useMemo(
    () => sortedProcesses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage),
    [currentPage, sortedProcesses]
  );

  const kanbanGroups = useMemo(() => {
    return KANBAN_COLUMNS.reduce<Record<KanbanStage, EnrichedProcess[]>>((acc, column) => {
      acc[column.key] = sortedProcesses.filter((process) => process.operationalStatus === column.key);
      return acc;
    }, {
      aguardando_acao: [],
      aguardando_documentos: [],
      protocolar: [],
      aguardando_audiencia: [],
      em_acompanhamento: [],
      bloqueado: [],
      encerrado: [],
    });
  }, [sortedProcesses]);

  const kpiData = useMemo(() => {
    const today = new Date();
    const total = enrichedProcesses.length;
    const awaitingAction = enrichedProcesses.filter((process) => process.operationalStatus === 'aguardando_acao').length;
    const critical = enrichedProcesses.filter((process) => dayDiff(process.nextDeadlineAt, today) <= 1).length;
    const stale = enrichedProcesses.filter((process) => Math.abs(dayDiff(process.lastMovementAt, today)) >= 7).length;
    const highPriority = enrichedProcesses.filter((process) => process.priority === 'alta').length;

    return [
      { label: 'Total de processos', value: total, description: 'Carteira completa', icon: FolderOpen, tone: 'primary', onClick: () => clearFilters() },
      { label: 'Aguardando ação', value: awaitingAction, description: awaitingAction === 0 ? 'Nenhum caso parado' : 'Responsabilidade interna pendente', icon: Timer, tone: 'info', onClick: () => updateFilter('status', 'aguardando_acao') },
      { label: 'Prazo crítico', value: critical, description: critical === 0 ? 'Sem urgências hoje' : 'Exigem priorização', icon: ShieldAlert, tone: 'error', onClick: () => setFilters({ ...EMPTY_FILTERS, prazo: 'critico' }) },
      { label: 'Sem atualização', value: stale, description: stale === 0 ? 'Carteira atualizada' : 'Sem movimentação recente', icon: RefreshCw, tone: 'warning', onClick: () => setFilters({ ...EMPTY_FILTERS, staleDays: '15' }) },
      { label: 'Alta prioridade', value: highPriority, description: highPriority === 0 ? 'Sem casos quentes' : 'Acompanhamento próximo', icon: UserRound, tone: 'success', onClick: () => updateFilter('priority', 'alta') },
    ];
  }, [enrichedProcesses]);

  const hasActiveFilter = useMemo(() => {
    return filters.query !== '' ||
      filters.area !== '' ||
      filters.phase !== '' ||
      filters.tribunal !== '' ||
      filters.priority !== '' ||
      filters.status !== '' ||
      filters.prazo !== 'todos' ||
      filters.pendingDocsOnly ||
      filters.newPublicationOnly ||
      filters.staleDays !== '';
  }, [filters]);

  const activePresetMap = useMemo<Record<FilterPresetKey, boolean>>(() => ({
    critical_today: filters.prazo === 'hoje' && filters.priority === 'alta' && filters.query === '' && filters.area === '' && filters.phase === '' && filters.tribunal === '' && filters.status === '' && !filters.pendingDocsOnly && !filters.newPublicationOnly && filters.staleDays === '',
    stale_15: filters.staleDays === '15' && filters.query === '' && filters.area === '' && filters.phase === '' && filters.tribunal === '' && filters.priority === '' && filters.status === '' && filters.prazo === 'todos' && !filters.pendingDocsOnly && !filters.newPublicationOnly,
    pending_docs: filters.pendingDocsOnly && filters.query === '' && filters.area === '' && filters.phase === '' && filters.tribunal === '' && filters.priority === '' && filters.status === '' && filters.prazo === 'todos' && filters.staleDays === '' && !filters.newPublicationOnly,
    new_publications: filters.newPublicationOnly && filters.query === '' && filters.area === '' && filters.phase === '' && filters.tribunal === '' && filters.priority === '' && filters.status === '' && filters.prazo === 'todos' && filters.staleDays === '' && !filters.pendingDocsOnly,
  }), [filters]);

  const emptyWithoutData = !loading && !error && enrichedProcesses.length === 0;
  const emptyWithFilter = !loading && !error && enrichedProcesses.length > 0 && sortedProcesses.length === 0;
  const selectedProcessPrimaryAction = selectedProcess ? getPrimaryDrawerAction(selectedProcess) : null;
  const selectedProcessDueContext = selectedProcess ? formatDueContext(selectedProcess.nextDeadlineAt) : null;

  function openProcessDetail(processId: number) {
    setSelectedProcess(null);
    setMenuOpenId(null);
    navigate(`/processos/${processId}`);
  }

  function renderStatusBadge(status: KanbanStage) {
    const labels: Record<KanbanStage, string> = {
      aguardando_acao: 'Aguardando acao',
      aguardando_documentos: 'Aguardando documentos',
      protocolar: 'Protocolar',
      aguardando_audiencia: 'Aguardando audiencia',
      em_acompanhamento: 'Em acompanhamento',
      bloqueado: 'Bloqueado',
      encerrado: 'Encerrado',
    };

    return (
      <span className={`process-badge status-${status}`}>
        <Circle size={9} aria-hidden="true" />
        {labels[status]}
      </span>
    );
  }

  function renderPriorityBadge(priority: Priority) {
    const labels: Record<Priority, string> = {
      alta: 'Alta',
      media: 'Media',
      baixa: 'Baixa',
    };

    return (
      <span className={`process-badge priority-${priority}`}>
        {labels[priority]}
      </span>
    );
  }

  function getPrimaryDrawerAction(process: EnrichedProcess) {
    if (process.operationalStatus === 'aguardando_documentos') {
      return { label: 'Solicitar documento', secondary: 'Anexar documento' };
    }

    if (dayDiff(process.nextDeadlineAt, new Date()) <= 1) {
      return { label: 'Ver prazo', secondary: 'Criar tarefa' };
    }

    if (Math.abs(dayDiff(process.lastMovementAt, new Date())) >= 15) {
      return { label: 'Registrar andamento', secondary: 'Criar tarefa' };
    }

    return { label: 'Abrir detalhe completo', secondary: 'Registrar andamento' };
  }

  if (loading) {
    return (
      <section className="my-processes-page" aria-label="Meus processos">
        <div className="my-processes-loading" role="status" aria-live="polite">
          <Loader2 size={20} className="spin" aria-hidden="true" />
          <p>Carregando sua carteira de processos...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="my-processes-page" aria-label="Meus processos">
      <header className="my-processes-header">
        <div>
          <p className="my-processes-eyebrow">Operacao juridica</p>
          <h2>Carteira e prioridades</h2>
          <p className="my-processes-subtitle">
            Visualize sua carteira, priorize urgencias e avance cada caso com contexto rapido.
          </p>
        </div>
        <div className="my-processes-header-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setShowForm((prev) => !prev);
              if (!showForm) {
                resetFormState('novo');
              }
            }}
          >
            <Plus size={16} aria-hidden="true" />
            Novo Processo
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setViewMode((prev) => (prev === 'table' ? 'kanban' : 'table'))}
          >
            <KanbanSquare size={16} aria-hidden="true" />
            {viewMode === 'table' ? 'Ver Kanban' : 'Ver Tabela'}
          </button>
          <button type="button" className="btn-secondary" onClick={exportCsv}>
            <Download size={16} aria-hidden="true" />
            Exportar
          </button>
        </div>
      </header>

      <section className="my-processes-kpis" aria-label="Resumo da carteira">
        {kpiData.map((kpi) => (
          <button key={kpi.label} type="button" className="my-processes-kpi-card" data-kpi-color={kpi.tone} onClick={kpi.onClick}>
            <div className="kpi-card-top">
              <strong>{kpi.value}</strong>
              <span className="kpi-card-icon" aria-hidden="true">
                <kpi.icon size={16} />
              </span>
            </div>
            <p>{kpi.label}</p>
            <small>{kpi.description}</small>
          </button>
        ))}
      </section>

      {error && (
        <div className="my-processes-alert my-processes-alert-error" role="alert">
          <AlertTriangle size={16} aria-hidden="true" />
          <span>{error}</span>
          <button type="button" className="btn-ghost" onClick={loadProcesses}>Tentar novamente</button>
        </div>
      )}

      {success && (
        <div className="my-processes-alert my-processes-alert-success" role="status">
          <CheckCircle2 size={16} aria-hidden="true" />
          <span>{success}</span>
        </div>
      )}

      {showForm && (
        <section className="my-processes-form" aria-label="Formulario de processo">
          <div className="process-form-head">
            <div>
              <h3>{editingId ? 'Editar processo' : 'Novo processo'}</h3>
              <p>{editingId ? 'Atualize o cadastro e o contexto operacional do processo.' : 'Escolha entre processo novo ou processo ja em andamento antes de concluir o cadastro.'}</p>
            </div>
            {!editingId && (
              <div className="process-entry-switch" role="tablist" aria-label="Tipo de cadastro do processo">
                <button
                  type="button"
                  className={`process-entry-chip${entryMode === 'novo' ? ' is-active' : ''}`}
                  onClick={() => resetFormState('novo')}
                  aria-pressed={entryMode === 'novo'}
                >
                  Processo novo
                </button>
                <button
                  type="button"
                  className={`process-entry-chip${entryMode === 'andamento' ? ' is-active' : ''}`}
                  onClick={() => resetFormState('andamento')}
                  aria-pressed={entryMode === 'andamento'}
                >
                  Ja em andamento
                </button>
              </div>
            )}
          </div>
          <form onSubmit={handleSubmit}>
            {entryMode === 'andamento' && !editingId && (
              <div className="process-lookup-panel">
                <label htmlFor="process-number">
                  Numero do processo
                  <div className="filter-input-wrap">
                    {lookupLoading ? <Loader2 size={15} className="spin" aria-hidden="true" /> : <Search size={15} aria-hidden="true" />}
                    <input
                      id="process-number"
                      type="text"
                      value={formData.processNumber}
                      onChange={(event) => setFormData((prev) => ({ ...prev, processNumber: event.target.value }))}
                      placeholder="Digite o numero do processo"
                    />
                  </div>
                </label>
                <p className="lookup-helper">Ao digitar o numero, a tela consulta os dados disponiveis para pre-preencher o processo.</p>
                {lookupError && <p className="lookup-feedback lookup-feedback-error">{lookupError}</p>}
                {lookupInfo?.alreadyRegistered && (
                  <div className="lookup-feedback lookup-feedback-warning">
                    <span>Esse processo ja esta cadastrado na carteira.</span>
                    {lookupInfo.existingId ? (
                      <button type="button" className="btn-ghost" onClick={() => openProcessDetail(lookupInfo.existingId!)}>Abrir processo existente</button>
                    ) : null}
                  </div>
                )}
                {lookupInfo && !lookupInfo.alreadyRegistered && !lookupError && (
                  <p className="lookup-feedback lookup-feedback-success">Dados localizados. Revise o cadastro antes de salvar.</p>
                )}
              </div>
            )}
            <div className="form-grid">
              <label htmlFor="process-title">
                Titulo
                <input
                  id="process-title"
                  type="text"
                  value={formData.title}
                  onChange={(event) => setFormData((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="Ex: Revisional de contrato"
                  disabled={entryMode === 'andamento' && !editingId && !processLookupReady}
                />
              </label>
              {editingId && (
                <label htmlFor="process-number-edit">
                  Numero do processo
                  <input
                    id="process-number-edit"
                    type="text"
                    value={formData.processNumber}
                    onChange={(event) => setFormData((prev) => ({ ...prev, processNumber: event.target.value }))}
                    placeholder="Opcional"
                  />
                </label>
              )}
              <label htmlFor="process-client">
                Cliente
                <div className="client-search-field">
                  <input
                    id="process-client"
                    type="search"
                    value={formData.client}
                    onChange={(event) => setFormData((prev) => ({ ...prev, client: event.target.value }))}
                    onKeyDown={(event) => {
                      if (!isClientSuggestionOpen) return;

                      if (event.key === 'ArrowDown') {
                        event.preventDefault();
                        setClientSuggestionIndex((prev) => (
                          prev < clientSuggestions.length - 1 ? prev + 1 : 0
                        ));
                        return;
                      }

                      if (event.key === 'ArrowUp') {
                        event.preventDefault();
                        setClientSuggestionIndex((prev) => (
                          prev > 0 ? prev - 1 : clientSuggestions.length - 1
                        ));
                        return;
                      }

                      if (event.key === 'Enter' && clientSuggestionIndex >= 0) {
                        event.preventDefault();
                        const selectedClient = clientSuggestions[clientSuggestionIndex];
                        if (!selectedClient) return;
                        setFormData((prev) => ({ ...prev, client: selectedClient }));
                        setClientSuggestionIndex(-1);
                        return;
                      }

                      if (event.key === 'Escape') {
                        setClientSuggestionIndex(-1);
                      }
                    }}
                    placeholder="Busque cliente por nome"
                    aria-expanded={isClientSuggestionOpen}
                    aria-controls="process-client-suggestions"
                    disabled={entryMode === 'andamento' && !editingId && !processLookupReady}
                  />
                  {isClientSuggestionOpen && (
                    <div
                      id="process-client-suggestions"
                      className="client-suggestion-list"
                      role="listbox"
                      aria-label="Sugestoes de clientes"
                    >
                      {clientSuggestions.map((client, index) => (
                        <button
                          key={client}
                          type="button"
                          role="option"
                          aria-selected={clientSuggestionIndex === index}
                          className={`client-suggestion-item${clientSuggestionIndex === index ? ' is-active' : ''}`}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            setFormData((prev) => ({ ...prev, client }));
                            setClientSuggestionIndex(-1);
                          }}
                        >
                          {client}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <small className="client-field-helper">
                  Vincule o processo a um cliente ja conhecido ou siga para Clientes se precisar cadastrar um novo.
                </small>
                {showClientShortcut && (
                  <button
                    type="button"
                    className="btn-ghost client-shortcut-btn"
                    onClick={() => {
                      trackEvent('meus_processos_go_to_client_register');
                      navigate('/clientes');
                    }}
                  >
                    Cliente nao encontrado. Cadastrar em Clientes
                  </button>
                )}
              </label>
              <label htmlFor="process-phase">
                Fase
                <select
                  id="process-phase"
                  value={formData.phase}
                  onChange={(event) => setFormData((prev) => ({ ...prev, phase: event.target.value }))}
                  disabled={entryMode === 'andamento' && !editingId && !processLookupReady}
                >
                  {PHASES.map((phase) => (
                    <option key={phase} value={phase}>{phase}</option>
                  ))}
                </select>
              </label>
              <label htmlFor="process-status">
                Status
                <select
                  id="process-status"
                  value={formData.status}
                  onChange={(event) => setFormData((prev) => ({ ...prev, status: event.target.value }))}
                  disabled={entryMode === 'andamento' && !editingId && !processLookupReady}
                >
                  <option value="ativo">Ativo</option>
                  <option value="pausado">Pausado</option>
                  <option value="concluido">Concluido</option>
                </select>
              </label>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-primary">
                <FilePlus2 size={16} aria-hidden="true" />
                {editingId ? 'Atualizar' : 'Criar'}
              </button>
              <button type="button" className="btn-secondary" onClick={() => { setShowForm(false); resetFormState('novo'); }}>
                Cancelar
              </button>
            </div>
          </form>
        </section>
      )}

      <section className={`my-processes-filters${isFiltersCompact ? ' is-compact' : ''}`} aria-label="Busca e filtros">
        <div className="filters-head">
          <div>
            <p className="filters-eyebrow">Refinar carteira</p>
            <h3>Filtros operacionais</h3>
          </div>
          <div className="filters-head-meta">
            {hasActiveFilter && <span className="filters-active-pill">Filtros ativos</span>}
            <span className="filters-total-pill">{sortedProcesses.length} em exibicao</span>
            <button type="button" className="btn-ghost btn-filter-density" onClick={toggleFiltersDensity}>
              <Filter size={14} aria-hidden="true" />
              {isFiltersCompact ? 'Mais filtros' : 'Ocultar filtros extras'}
            </button>
          </div>
        </div>

        <div className="filter-presets" role="toolbar" aria-label="Presets de filtros rapidos">
          {FILTER_PRESETS.map((preset) => (
            <button
              key={preset.key}
              type="button"
              className={`filter-preset-btn${activePresetMap[preset.key] ? ' is-active' : ''}`}
              onClick={() => applyQuickPreset(preset.key)}
              aria-pressed={activePresetMap[preset.key]}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="filters-top-row filter-row-card">
          <label htmlFor="filter-query" className="filter-field filter-field-search filter-cascade-item">
            <span>Busca</span>
            <div className="filter-input-wrap">
              <Search size={15} aria-hidden="true" />
              <input id="filter-query" type="search" value={filters.query} onChange={(event) => updateFilter('query', event.target.value)} placeholder="Numero, cliente, assunto, tribunal ou parte" />
            </div>
          </label>
          <label htmlFor="filter-area" className="filter-field filter-cascade-item">
            <span>Area juridica</span>
            <select id="filter-area" value={filters.area} onChange={(event) => updateFilter('area', event.target.value)}><option value="">Todas</option>{AREAS.map((area) => <option key={area} value={area}>{area}</option>)}</select>
          </label>
          <label htmlFor="filter-phase" className="filter-field filter-cascade-item">
            <span>Fase processual</span>
            <select id="filter-phase" value={filters.phase} onChange={(event) => updateFilter('phase', event.target.value)}><option value="">Todas</option>{PHASES.map((phase) => <option key={phase} value={phase}>{phase}</option>)}</select>
          </label>
          <label htmlFor="filter-court" className="filter-field filter-cascade-item">
            <span>Tribunal</span>
            <select id="filter-court" value={filters.tribunal} onChange={(event) => updateFilter('tribunal', event.target.value)}><option value="">Todos</option>{TRIBUNAIS.map((court) => <option key={court} value={court}>{court}</option>)}</select>
          </label>
        </div>

        <div className="filters-bottom-row filter-row-card">
          <label htmlFor="filter-priority" className="filter-field filter-cascade-item"><span>Prioridade</span><select id="filter-priority" value={filters.priority} onChange={(event) => updateFilter('priority', event.target.value)}><option value="">Todas</option><option value="alta">Alta</option><option value="media">Media</option><option value="baixa">Baixa</option></select></label>
          <label htmlFor="filter-status" className="filter-field filter-cascade-item"><span>Status operacional</span><select id="filter-status" value={filters.status} onChange={(event) => updateFilter('status', event.target.value)}><option value="">Todos</option>{KANBAN_COLUMNS.map((column) => (<option key={column.key} value={column.key}>{column.label}</option>))}</select></label>
          <label htmlFor="filter-prazo" className="filter-field filter-cascade-item"><span>Prazo</span><select id="filter-prazo" value={filters.prazo} onChange={(event) => updateFilter('prazo', event.target.value as PrazoFiltro)}><option value="todos">Todos</option><option value="critico">Critico</option><option value="hoje">Hoje</option><option value="7dias">Proximos 7 dias</option></select></label>
          <label htmlFor="filter-stale" className="filter-field filter-cascade-item"><span>Sem atualizacao ha</span><select id="filter-stale" value={filters.staleDays} onChange={(event) => updateFilter('staleDays', event.target.value)}><option value="">Qualquer periodo</option><option value="7">7 dias</option><option value="15">15 dias</option><option value="30">30 dias</option></select></label>
          <div className="filter-toggle-group filter-cascade-item" role="group" aria-label="Filtros booleanos">
            <label className="filter-toggle-chip"><input type="checkbox" checked={filters.pendingDocsOnly} onChange={(event) => updateFilter('pendingDocsOnly', event.target.checked)} /><span>Documento pendente</span></label>
            <label className="filter-toggle-chip"><input type="checkbox" checked={filters.newPublicationOnly} onChange={(event) => updateFilter('newPublicationOnly', event.target.checked)} /><span>Publicacao nova</span></label>
          </div>
          <label htmlFor="filter-sort" className="filter-field filter-cascade-item"><span>Ordenacao</span><select id="filter-sort" value={sortBy} onChange={(event) => setSortBy(event.target.value as SortField)}><option value="nextDeadline">Prazo</option><option value="priority">Prioridade</option><option value="lastMovement">Ultima movimentacao</option></select></label>
          <label htmlFor="filter-sort-direction" className="filter-field filter-cascade-item"><span>Direcao</span><select id="filter-sort-direction" value={sortDirection} onChange={(event) => setSortDirection(event.target.value as SortDirection)}><option value="asc">Ascendente</option><option value="desc">Descendente</option></select></label>
          <div className="filter-actions filter-cascade-item">
            <button type="button" className="btn-ghost btn-filter-clear" onClick={clearFilters}><Filter size={14} aria-hidden="true" />Limpar filtros</button>
            <button type="button" className="btn-ghost" onClick={saveCurrentFilter}><Save size={14} aria-hidden="true" />Salvar filtro</button>
            <button type="button" className="btn-ghost" onClick={() => setViewMode((prev) => (prev === 'table' ? 'kanban' : 'table'))}><KanbanSquare size={14} aria-hidden="true" />{viewMode === 'table' ? 'Tabela / Kanban' : 'Kanban / Tabela'}</button>
          </div>
        </div>

        <div className="filter-result-line">
          <strong>{sortedProcesses.length}</strong> processo(s) na visao atual.
          {hasActiveFilter && <span className="filter-chip-active">Filtro ativo</span>}
        </div>
      </section>

      {emptyWithoutData && (
        <div className="my-processes-empty" role="status">
          <h3>Nenhum processo cadastrado</h3>
          <p>Comece criando o primeiro processo da sua carteira para visualizar prazos e prioridades.</p>
          <button type="button" className="btn-primary" onClick={() => { resetFormState('novo'); setShowForm(true); }}>Criar primeiro processo</button>
        </div>
      )}

      {emptyWithFilter && (
        <div className="my-processes-empty" role="status">
          <h3>Nenhum resultado para os filtros aplicados</h3>
          <p>Ajuste os filtros para ampliar sua visao da carteira.</p>
          <button type="button" className="btn-secondary" onClick={clearFilters}>Limpar filtros</button>
        </div>
      )}

      {!emptyWithoutData && !emptyWithFilter && viewMode === 'table' && (
        <section className="my-processes-table-wrapper" aria-label="Tabela de processos">
          <div className="processes-table-toolbar">
            <div className="processes-table-summary">
              <strong>{sortedProcesses.length}</strong>
              <span>processo(s) na carteira atual</span>
            </div>
            <div className="processes-table-controls">
              <label htmlFor="filter-sort">
                Ordenação
                <select id="filter-sort" value={sortBy} onChange={(event) => setSortBy(event.target.value as SortField)}>
                  <option value="nextDeadline">Próximo prazo</option>
                  <option value="priority">Prioridade</option>
                  <option value="lastMovement">Última movimentação</option>
                </select>
              </label>
              <button type="button" className="btn-secondary" onClick={() => setViewMode((prev) => (prev === 'table' ? 'kanban' : 'table'))}>
                <KanbanSquare size={14} aria-hidden="true" />
                Ver Kanban
              </button>
            </div>
          </div>
          <table className="my-processes-table">
            <thead>
              <tr>
                <th scope="col">Processo</th>
                <th scope="col">Fase</th>
                <th scope="col">Proximo prazo</th>
                <th scope="col">Situação</th>
                <th scope="col">Ultima movimentacao</th>
                <th scope="col">Responsável</th>
                <th scope="col">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProcesses.map((process) => (
                <tr
                  key={process.id}
                  tabIndex={0}
                  role="button"
                  aria-label={`Abrir detalhe rapido do processo ${process.id} do cliente ${process.client}`}
                  onClick={() => {
                    setSelectedProcess(process);
                    setMenuOpenId(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setSelectedProcess(process);
                      setMenuOpenId(null);
                    }
                  }}
                >
                  <td>
                    <div className="process-primary">
                      <strong>#{process.id} · {process.title}</strong>
                      <span>{process.client} · {process.area}</span>
                      <small>{process.processNumber ? `Nº ${process.processNumber}` : process.party}</small>
                    </div>
                  </td>
                  <td>
                    <div className="process-meta-stack">
                      <strong>{process.phase}</strong>
                      <span>{process.tribunal}</span>
                    </div>
                  </td>
                  <td>
                    <div className="process-meta-stack">
                      <strong className={dayDiff(process.nextDeadlineAt, new Date()) <= 1 ? 'text-critical' : ''}>{formatDate(process.nextDeadlineAt)}</strong>
                      <span className={`deadline-context deadline-context--${formatDueContext(process.nextDeadlineAt).tone}`}>{formatDueContext(process.nextDeadlineAt).label}</span>
                    </div>
                  </td>
                  <td>
                    <div className="process-status-cell">
                      {renderStatusBadge(process.operationalStatus)}
                      {renderPriorityBadge(process.priority)}
                    </div>
                  </td>
                  <td>
                    <div className="process-meta-stack">
                      <strong>{formatDate(process.lastMovementAt)}</strong>
                      <span>{formatStaleContext(process.lastMovementAt)}</span>
                    </div>
                  </td>
                  <td>{process.owner?.email ?? '—'}</td>
                  <td className="table-cell-actions">
                    <div className="row-actions" onClick={(event) => event.stopPropagation()}>
                      <button type="button" className="btn-link-inline" onClick={() => setSelectedProcess(process)}>Abrir</button>
                      <button type="button" className="btn-link-inline" onClick={() => openProcessDetail(process.id)}>Detalhe</button>
                      <button
                        type="button"
                        className="row-actions-trigger"
                        aria-label={`Abrir menu de acoes do processo ${process.id}`}
                        onClick={() => setMenuOpenId((prev) => (prev === process.id ? null : process.id))}
                      >
                        <MoreHorizontal size={16} aria-hidden="true" />
                      </button>
                      {menuOpenId === process.id && (
                        <div className="row-action-menu" role="menu" aria-label="Menu de acoes">
                          <button type="button" onClick={() => setSelectedProcess(process)}>Detalhe rapido</button>
                          <button type="button" onClick={() => openProcessDetail(process.id)}>Abrir detalhe</button>
                          <button type="button">Registrar andamento</button>
                          <button type="button">Criar tarefa</button>
                          <button type="button">Anexar documento</button>
                          <button type="button">Registrar atendimento</button>
                          <button type="button" onClick={() => handleEdit(process)}>Editar</button>
                          <button type="button" onClick={() => handleDelete(process.id)}>Excluir</button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="my-processes-pagination">
              <button
                type="button"
                className="btn-secondary"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              >
                <ChevronLeft size={14} aria-hidden="true" />
                Anterior
              </button>
              <span>Pagina {currentPage} de {totalPages}</span>
              <button
                type="button"
                className="btn-secondary"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              >
                Proxima
                <ChevronRight size={14} aria-hidden="true" />
              </button>
            </div>
          )}
        </section>
      )}

      {!emptyWithoutData && !emptyWithFilter && viewMode === 'kanban' && (
        <section className="my-processes-kanban" aria-label="Kanban de processos">
          {KANBAN_COLUMNS.map((column) => (
            <article key={column.key} className="kanban-column" data-stage={column.key}>
              <header className="kanban-column-head">
                <h3>{column.label}</h3>
                <span className="kanban-column-count">{kanbanGroups[column.key].length}</span>
              </header>
              <div className="kanban-cards">
                {kanbanGroups[column.key].length === 0 && (
                  <p className="kanban-empty">Sem processos nesta coluna.</p>
                )}
                {kanbanGroups[column.key].map((process) => (
                  <button
                    key={process.id}
                    type="button"
                    className="kanban-card"
                    data-priority={process.priority}
                    onClick={() => setSelectedProcess(process)}
                    aria-label={`Abrir detalhe rapido do processo ${process.id}`}
                  >
                    <div className="kanban-card-headline">
                      <small className="kanban-card-id">Processo #{process.id}</small>
                      <strong className="kanban-card-client">{process.client}</strong>
                    </div>
                    <p className="kanban-card-matter">{process.title}</p>
                    <div className="kanban-card-meta">
                      {renderPriorityBadge(process.priority)}
                      <time dateTime={process.nextDeadlineAt.toISOString()}>{formatDate(process.nextDeadlineAt)}</time>
                    </div>
                    <small className="kanban-card-next-step">{process.nextStep}</small>
                  </button>
                ))}
              </div>
            </article>
          ))}
        </section>
      )}

      {selectedProcess && (
        <>
          <button
            type="button"
            className="drawer-backdrop"
            aria-label="Fechar detalhe rapido"
            onClick={() => setSelectedProcess(null)}
          />
          <aside className="process-quick-drawer" role="dialog" aria-modal="true" aria-labelledby="quick-drawer-title">
            <header className="process-quick-drawer-head">
              <div>
                <small>Detalhe rapido</small>
                <h3 id="quick-drawer-title">Processo #{selectedProcess.id}</h3>
              </div>
              <button type="button" className="icon-action" onClick={() => setSelectedProcess(null)} aria-label="Fechar drawer">
                <X size={16} aria-hidden="true" />
              </button>
            </header>

            <div className="process-quick-drawer-body">
              <section className="drawer-hero">
                <p className="drawer-hero-client">{selectedProcess.client}</p>
                <p className="drawer-hero-matter">{selectedProcess.title}</p>
                <div className="drawer-hero-badges">
                  {renderStatusBadge(selectedProcess.operationalStatus)}
                  {renderPriorityBadge(selectedProcess.priority)}
                </div>
              </section>

              <section className="drawer-risk-summary">
                <div>
                  <span>Próximo prazo</span>
                  <strong>{formatDate(selectedProcess.nextDeadlineAt)}</strong>
                  {selectedProcessDueContext && (
                    <small className={`deadline-context deadline-context--${selectedProcessDueContext.tone}`}>{selectedProcessDueContext.label}</small>
                  )}
                </div>
                <div>
                  <span>Última movimentação</span>
                  <strong>{formatDate(selectedProcess.lastMovementAt)}</strong>
                  <small>{formatStaleContext(selectedProcess.lastMovementAt)}</small>
                </div>
              </section>

              <section className="drawer-facts-grid" aria-label="Resumo rapido do processo">
                <article className="drawer-fact-card">
                  <span>Area</span>
                  <strong>{selectedProcess.area}</strong>
                </article>
                <article className="drawer-fact-card">
                  <span>Fase atual</span>
                  <strong>{selectedProcess.phase}</strong>
                </article>
                <article className="drawer-fact-card">
                  <span>Proximo prazo</span>
                  <strong>{formatDate(selectedProcess.nextDeadlineAt)}</strong>
                </article>
                <article className="drawer-fact-card">
                  <span>Ultima movimentacao</span>
                  <strong>{formatDate(selectedProcess.lastMovementAt)}</strong>
                </article>
                <article className="drawer-fact-card">
                  <span>Documentos pendentes</span>
                  <strong>{selectedProcess.pendingDocuments}</strong>
                </article>
                <article className="drawer-fact-card">
                  <span>Audiencia futura</span>
                  <strong>{selectedProcess.hasFutureHearing ? 'Sim' : 'Nao'}</strong>
                </article>
              </section>

              <section className="drawer-fact-list" aria-label="Indicadores adicionais">
                <div>
                  <span>Publicacao recente</span>
                  <strong>{selectedProcess.hasNewPublication ? 'Sim' : 'Nao'}</strong>
                </div>
              </section>

              <div className="drawer-next-step">
                <h4>Proximo passo</h4>
                <p>{selectedProcess.nextStep}</p>
              </div>

              <div className="drawer-checklist">
                <h4>Checklist operacional</h4>
                <label><input type="checkbox" readOnly checked={selectedProcess.pendingDocuments === 0} /> Solicitar documento</label>
                <label><input type="checkbox" readOnly checked={!selectedProcess.hasNewPublication} /> Revisar publicações</label>
                <label><input type="checkbox" readOnly checked={dayDiff(selectedProcess.nextDeadlineAt, new Date()) > 1} /> Conferir prazo crítico</label>
                <label><input type="checkbox" readOnly checked={Math.abs(dayDiff(selectedProcess.lastMovementAt, new Date())) < 15} /> Registrar andamento</label>
              </div>

              <div className="drawer-actions">
                <button type="button" className="btn-primary" onClick={() => openProcessDetail(selectedProcess.id)}>{selectedProcessPrimaryAction?.label ?? 'Abrir detalhe completo'}</button>
                <button type="button" className="btn-secondary">{selectedProcessPrimaryAction?.secondary ?? 'Registrar andamento'}</button>
                <button type="button" className="btn-secondary">Anexar documento</button>
                <button type="button" className="btn-secondary">Registrar atendimento</button>
              </div>
            </div>
          </aside>
        </>
      )}
    </section>
  );
}




