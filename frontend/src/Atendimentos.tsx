import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Calendar,
  CalendarPlus,
  CheckCircle2,
  ClipboardList,
  Download,
  ExternalLink,
  Filter,
  Globe,
  Inbox,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Phone,
  Plus,
  RefreshCw,
  Save,
  Search,
  User,
  X,
} from 'lucide-react';
import { api } from './api';
import { captureException, trackEvent, trackPageView } from './monitoring';
import './Atendimentos.css';

interface AtendimentosProps {
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

type AtendStatus = 'aberto' | 'resolvido' | 'aguardando_cliente' | 'sem_resposta' | 'agendado';
type Canal = 'whatsapp' | 'telefone' | 'email' | 'presencial' | 'portal' | 'interno';
type TipoAtendimento = 'consulta' | 'urgencia' | 'rotina' | 'triagem' | 'acompanhamento';
type Priority = 'alta' | 'media' | 'baixa';
type ViewMode = 'lista' | 'conversa' | 'timeline';
type SortField = 'data' | 'status' | 'cliente' | 'prioridade';

interface AtendimentoItem {
  id: string;
  processId: number;
  processLabel: string;
  processTitle: string;
  client: string;
  canal: Canal;
  tipo: TipoAtendimento;
  assunto: string;
  resumo: string;
  observacoes: string;
  status: AtendStatus;
  priority: Priority;
  responsavel: string;
  area: string;
  dataHora: string;
  proximoPasso: string;
  retornoAgendado: string | null;
  critico: boolean;
}

interface AtendimentoFilters {
  query: string;
  client: string;
  process: string;
  canal: string;
  status: string;
  responsible: string;
  period: string;
  area: string;
  pendingRetorno: boolean;
  semProximoPasso: boolean;
  priority: string;
}

interface NewAtendForm {
  client: string;
  processId: string;
  canal: string;
  tipo: string;
  dataHora: string;
  assunto: string;
  resumo: string;
  observacoes: string;
  status: string;
  proximoPasso: string;
  retornoAgendado: string;
  responsavel: string;
}

interface AtendimentosRouteState {
  openForm?: boolean;
  source?: 'clientes';
  prefill?: Partial<NewAtendForm>;
}

const EMPTY_FILTERS: AtendimentoFilters = {
  query: '',
  client: '',
  process: '',
  canal: '',
  status: '',
  responsible: '',
  period: '',
  area: '',
  pendingRetorno: false,
  semProximoPasso: false,
  priority: '',
};

const EMPTY_FORM: NewAtendForm = {
  client: '',
  processId: '',
  canal: '',
  tipo: '',
  dataHora: '',
  assunto: '',
  resumo: '',
  observacoes: '',
  status: 'aberto',
  proximoPasso: '',
  retornoAgendado: '',
  responsavel: '',
};

const AREAS = ['Trabalhista', 'Civel', 'Tributario', 'Empresarial', 'Previdenciario'];
const CANAIS: Canal[] = ['whatsapp', 'telefone', 'email', 'presencial', 'portal', 'interno'];
const TIPOS: TipoAtendimento[] = ['consulta', 'urgencia', 'rotina', 'triagem', 'acompanhamento'];
const ASSUNTOS = [
  'Dúvida sobre andamento do processo',
  'Solicitação de documentos pendentes',
  'Informações sobre data de audiência',
  'Prazo e pagamento de custas',
  'Resultado de diligência judicial',
  'Atualização de dados de contato',
  'Urgência: notificação recebida',
  'Solicitação de extensão de prazo',
  'Conferência de petição',
  'Orientação sobre acordo extrajudicial',
];

const STATUS_CFG: Record<AtendStatus, { label: string; variant: string }> = {
  aberto:            { label: 'Aberto',              variant: 'info'    },
  resolvido:         { label: 'Resolvido',            variant: 'success' },
  aguardando_cliente:{ label: 'Ag. cliente',          variant: 'warning' },
  sem_resposta:      { label: 'Sem resposta',         variant: 'error'   },
  agendado:          { label: 'Retorno agendado',     variant: 'brand'   },
};

const CANAL_LABEL: Record<Canal, string> = {
  whatsapp:   'WhatsApp',
  telefone:   'Telefone',
  email:      'E-mail',
  presencial: 'Presencial',
  portal:     'Portal',
  interno:    'Interno',
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatDateShort(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR');
}

function isSameDate(iso: string, date: Date) {
  return iso.slice(0, 10) === toIsoDate(date);
}

function isWithinDays(iso: string, days: number) {
  const from = new Date(iso);
  const now = new Date();
  const diff = (from.getTime() - now.getTime()) / 864e5;
  return diff <= days && diff >= -days;
}

// ─── mock data builder ────────────────────────────────────────────────────────

function makeAtendimentos(processes: ProcessRecord[], userEmail: string): AtendimentoItem[] {
  const base = new Date();
  const ownerLabel = userEmail.split('@')[0];

  return processes.flatMap((process, index) => {
    const area = AREAS[(process.id + index) % AREAS.length];
    const isCritico = (process.id + index) % 5 === 0;
    const d1 = addDays(base, -((process.id + index) % 8));
    const d2 = addDays(base, -((process.id + index * 2) % 14));

    const a1: AtendimentoItem = {
      id: `atd-${process.id}-1`,
      processId: process.id,
      processLabel: `#${process.id}`,
      processTitle: process.title,
      client: process.client,
      canal: CANAIS[(process.id + index) % CANAIS.length],
      tipo: TIPOS[(process.id + index) % TIPOS.length],
      assunto: ASSUNTOS[(process.id + index) % ASSUNTOS.length],
      resumo: `Cliente entrou em contato via ${CANAL_LABEL[CANAIS[(process.id + index) % CANAIS.length]]} solicitando ${ASSUNTOS[(process.id + index) % ASSUNTOS.length].toLowerCase()}.`,
      observacoes: 'Cliente demonstrou preocupação com o prazo. Necessário retorno em até 24h.',
      status: (
        (process.id + index) % 5 === 0 ? 'sem_resposta' :
        (process.id + index) % 4 === 0 ? 'aguardando_cliente' :
        (process.id + index) % 3 === 0 ? 'resolvido' : 'aberto'
      ) as AtendStatus,
      priority: isCritico ? 'alta' : (process.id + index) % 3 === 0 ? 'media' : 'baixa',
      responsavel: ownerLabel,
      area,
      dataHora: `${toIsoDate(d1)}T${String(9 + (process.id % 9)).padStart(2, '0')}:${String((process.id * 7) % 60).padStart(2, '0')}:00`,
      proximoPasso: (process.id + index) % 4 === 0
        ? ''
        : `Retornar com posicionamento sobre ${ASSUNTOS[(process.id + index + 1) % ASSUNTOS.length].toLowerCase()}.`,
      retornoAgendado: (process.id + index) % 3 === 0
        ? toIsoDate(addDays(base, (process.id % 5) + 1))
        : null,
      critico: isCritico,
    };

    const a2: AtendimentoItem = {
      id: `atd-${process.id}-2`,
      processId: process.id,
      processLabel: `#${process.id}`,
      processTitle: process.title,
      client: process.client,
      canal: CANAIS[(process.id + index + 2) % CANAIS.length],
      tipo: TIPOS[(process.id + index + 1) % TIPOS.length],
      assunto: ASSUNTOS[(process.id + index + 3) % ASSUNTOS.length],
      resumo: `Segundo contato do cliente sobre andamento geral do processo ${process.title}.`,
      observacoes: 'Cliente solicita posicionamento até o fim da semana.',
      status: (
        (process.id + index) % 7 === 0 ? 'agendado' :
        (process.id + index) % 2 === 0 ? 'aberto' : 'aguardando_cliente'
      ) as AtendStatus,
      priority: (process.id + index) % 2 === 0 ? 'media' : 'baixa',
      responsavel: ownerLabel,
      area,
      dataHora: `${toIsoDate(d2)}T${String(13 + (process.id % 5)).padStart(2, '0')}:${String((process.id * 11) % 60).padStart(2, '0')}:00`,
      proximoPasso: `Agendar reunião de alinhamento com ${process.client}.`,
      retornoAgendado: (process.id + index) % 7 === 0
        ? toIsoDate(addDays(base, 3))
        : null,
      critico: false,
    };

    return [a1, a2];
  });
}

// ─── sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: AtendStatus }) {
  const cfg = STATUS_CFG[status];
  return (
    <span className={`atend-badge atend-badge--${cfg.variant}`} aria-label={`Status: ${cfg.label}`}>
      {cfg.label}
    </span>
  );
}

function PriorityDot({ priority }: { priority: Priority }) {
  const labels: Record<Priority, string> = { alta: 'Alta', media: 'Média', baixa: 'Baixa' };
  return (
    <span className={`atend-priority-dot atend-priority-dot--${priority}`} title={`Prioridade ${labels[priority]}`} aria-label={`Prioridade ${labels[priority]}`} />
  );
}

function CanalIcon({ canal }: { canal: Canal }) {
  const icons: Record<Canal, React.ReactNode> = {
    whatsapp:   <MessageSquare size={13} />,
    telefone:   <Phone size={13} />,
    email:      <Mail size={13} />,
    presencial: <User size={13} />,
    portal:     <Globe size={13} />,
    interno:    <Inbox size={13} />,
  };
  return (
    <span className={`atend-canal-chip atend-canal--${canal}`} aria-label={`Canal: ${CANAL_LABEL[canal]}`}>
      {icons[canal]}
      <span>{CANAL_LABEL[canal]}</span>
    </span>
  );
}

// ─── main component ────────────────────────────────────────────────────────────

export function Atendimentos({ user }: AtendimentosProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const [atendimentos, setAtendimentos]   = useState<AtendimentoItem[]>([]);
  const [processes, setProcesses]         = useState<ProcessRecord[]>([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState('');
  const [success, setSuccess]             = useState('');

  const [filters, setFilters]             = useState<AtendimentoFilters>(EMPTY_FILTERS);
  const [viewMode, setViewMode]           = useState<ViewMode>('lista');
  const [sortBy, setSortBy]               = useState<SortField>('data');
  const [sortDesc, setSortDesc]           = useState(true);
  const [page, setPage]                   = useState(1);
  const [selectedItem, setSelectedItem]   = useState<AtendimentoItem | null>(null);
  const [openMenuId, setOpenMenuId]       = useState<string | null>(null);
  const [showForm, setShowForm]           = useState(false);
  const [form, setForm]                   = useState<NewAtendForm>(EMPTY_FORM);

  const isAdv = user.role === 'ADV';
  const ITEMS_PER_PAGE = 12;

  useEffect(() => {
    trackPageView('atendimentos', { role: user.role });
    loadData();
  }, [user.role]);

  useEffect(() => {
    setPage(1);
  }, [filters, sortBy, sortDesc, viewMode]);

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(''), 3000);
      return () => clearTimeout(t);
    }
  }, [success]);

  useEffect(() => {
    const routeState = location.state as AtendimentosRouteState | null;
    if (!routeState?.openForm) return;

    setForm({
      ...EMPTY_FORM,
      responsavel: user.email.split('@')[0],
      ...routeState.prefill,
    });
    setShowForm(true);

    if (routeState.prefill?.client) {
      setSuccess(`Novo atendimento preparado para ${routeState.prefill.client}.`);
    }

    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate, user.email]);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const res = await api.getProcesses();
      if (res.status !== 200 || !Array.isArray(res.data)) {
        setError(res.error || 'Não foi possível carregar atendimentos.');
        setLoading(false);
        return;
      }
      const scoped = isAdv
        ? (res.data as ProcessRecord[]).filter((p) => p.ownerId === user.id)
        : (res.data as ProcessRecord[]);
      setProcesses(scoped);
      const items = makeAtendimentos(scoped, user.email);
      setAtendimentos(items);
      trackEvent('atendimentos_loaded', { count: items.length, role: user.role });
    } catch (err) {
      setError((err as Error).message || 'Erro ao carregar atendimentos');
      captureException(err as Error, { context: 'loadAtendimentos' });
    } finally {
      setLoading(false);
    }
  }

  function updateFilter<K extends keyof AtendimentoFilters>(key: K, value: AtendimentoFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
    setSuccess('Filtros limpos.');
  }

  function saveFilters() {
    localStorage.setItem('lexora_atd_filter', JSON.stringify(filters));
    setSuccess('Filtro salvo.');
  }

  function markResolved(id: string) {
    setAtendimentos((prev) => prev.map((a) => a.id === id ? { ...a, status: 'resolvido' } : a));
    setOpenMenuId(null);
    if (selectedItem?.id === id) setSelectedItem((prev) => prev ? { ...prev, status: 'resolvido' } : null);
    setSuccess('Atendimento marcado como resolvido.');
  }

  function scheduleReturn(id: string) {
    const tomorrow = toIsoDate(addDays(new Date(), 1));
    setAtendimentos((prev) => prev.map((a) => a.id === id ? { ...a, status: 'agendado', retornoAgendado: tomorrow } : a));
    setOpenMenuId(null);
    setSuccess('Retorno agendado para amanhã.');
  }

  function createTask(id: string) {
    const atd = atendimentos.find((a) => a.id === id);
    trackEvent('atd_create_task', { id, processId: atd?.processId ?? 0 });
    setOpenMenuId(null);
    setSuccess('Tarefa criada vinculada ao atendimento.');
  }

  function exportCsv(items: AtendimentoItem[]) {
    const header = ['Cliente', 'Processo', 'Canal', 'Assunto', 'Data', 'Status', 'Responsável', 'Próximo Passo'];
    const rows = items.map((a) => [
      a.client, a.processLabel, CANAL_LABEL[a.canal], a.assunto,
      formatDateTime(a.dataHora), STATUS_CFG[a.status].label, a.responsavel, a.proximoPasso,
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'atendimentos.csv'; link.click();
    URL.revokeObjectURL(url);
    trackEvent('atendimentos_exported', { count: items.length });
  }

  function submitForm(ev: React.FormEvent) {
    ev.preventDefault();
    const newItem: AtendimentoItem = {
      id: `atd-new-${Date.now()}`,
      processId: Number(form.processId) || 0,
      processLabel: form.processId ? `#${form.processId}` : '—',
      processTitle: processes.find((p) => String(p.id) === form.processId)?.title || '',
      client: form.client,
      canal: (form.canal as Canal) || 'interno',
      tipo: (form.tipo as TipoAtendimento) || 'rotina',
      assunto: form.assunto,
      resumo: form.resumo,
      observacoes: form.observacoes,
      status: (form.status as AtendStatus) || 'aberto',
      priority: 'media',
      responsavel: form.responsavel || user.email.split('@')[0],
      area: 'Civel',
      dataHora: form.dataHora || new Date().toISOString(),
      proximoPasso: form.proximoPasso,
      retornoAgendado: form.retornoAgendado || null,
      critico: false,
    };
    setAtendimentos((prev) => [newItem, ...prev]);
    setShowForm(false);
    setForm(EMPTY_FORM);
    setSuccess('Atendimento registrado com sucesso.');
    trackEvent('atd_created', { canal: newItem.canal, tipo: newItem.tipo });
  }

  // ─── computed values ──────────────────────────────────────────────────────

  const kpis = useMemo(() => {
    const now = new Date();
    const hoje = atendimentos.filter((a) => isSameDate(a.dataHora, now));
    const pendentes = atendimentos.filter((a) => a.status === 'aguardando_cliente' || a.status === 'sem_resposta');
    const semResposta = atendimentos.filter((a) => a.status === 'sem_resposta');
    const semana = atendimentos.filter((a) => isWithinDays(a.dataHora, 7));
    const criticos = atendimentos.filter((a) => a.critico);
    return { hoje: hoje.length, pendentes: pendentes.length, semResposta: semResposta.length, semana: semana.length, criticos: criticos.length };
  }, [atendimentos]);

  const uniqueClients    = useMemo(() => [...new Set(atendimentos.map((a) => a.client))].sort(), [atendimentos]);
  const uniqueResponsaveis = useMemo(() => [...new Set(atendimentos.map((a) => a.responsavel))].sort(), [atendimentos]);

  const filtered = useMemo(() => {
    return atendimentos.filter((a) => {
      if (filters.query) {
        const q = filters.query.toLowerCase();
        const hay = `${a.client} ${a.processLabel} ${a.canal} ${a.assunto} ${a.resumo} ${a.observacoes}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filters.client    && a.client       !== filters.client)            return false;
      if (filters.process   && String(a.processId) !== filters.process)      return false;
      if (filters.canal     && a.canal         !== filters.canal)            return false;
      if (filters.status    && a.status        !== filters.status)           return false;
      if (filters.responsible && a.responsavel !== filters.responsible)      return false;
      if (filters.area      && a.area          !== filters.area)             return false;
      if (filters.priority  && a.priority      !== filters.priority)         return false;

      if (filters.period === 'hoje') {
        if (!isSameDate(a.dataHora, new Date())) return false;
      } else if (filters.period === 'semana') {
        if (!isWithinDays(a.dataHora, 7)) return false;
      } else if (filters.period === 'mes') {
        if (!isWithinDays(a.dataHora, 30)) return false;
      }

      if (filters.pendingRetorno && a.status !== 'aguardando_cliente' && a.status !== 'sem_resposta') return false;
      if (filters.semProximoPasso && a.proximoPasso.trim() !== '') return false;

      return true;
    });
  }, [atendimentos, filters]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'data')       cmp = a.dataHora.localeCompare(b.dataHora);
      else if (sortBy === 'cliente') cmp = a.client.localeCompare(b.client);
      else if (sortBy === 'status') cmp = a.status.localeCompare(b.status);
      else if (sortBy === 'prioridade') {
        const order: Record<Priority, number> = { alta: 0, media: 1, baixa: 2 };
        cmp = order[a.priority] - order[b.priority];
      }
      return sortDesc ? -cmp : cmp;
    });
    return arr;
  }, [filtered, sortBy, sortDesc]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / ITEMS_PER_PAGE));
  const pageItems  = sorted.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  // group by client for Conversa mode
  const byClient = useMemo(() => {
    const map = new Map<string, AtendimentoItem[]>();
    for (const a of sorted) {
      if (!map.has(a.client)) map.set(a.client, []);
      map.get(a.client)!.push(a);
    }
    return map;
  }, [sorted]);

  const hasActiveFilters = Object.entries(filters).some(([k, v]) =>
    k !== 'period' ? (typeof v === 'boolean' ? v : v !== '') : v !== ''
  );
  const atendimentosSemResposta = atendimentos.filter((item) => item.status === 'sem_resposta').length;
  const processosCriticos = atendimentos.filter((item) => item.critico).length;
  const retornosOperacionais = atendimentos.filter(
    (item) => item.status === 'aguardando_cliente' || item.status === 'sem_resposta' || item.status === 'agendado',
  ).length;

  // ─── render helpers ─────────────────────────────────────────────────────

  function renderRow(item: AtendimentoItem) {
    const isMenuOpen = openMenuId === item.id;
    return (
      <tr
        key={item.id}
        className={`atend-table-row${item.critico ? ' atend-table-row--critico' : ''}`}
        onClick={() => setSelectedItem(item)}
        tabIndex={0}
        aria-label={`Atendimento de ${item.client}: ${item.assunto}`}
        onKeyDown={(e) => e.key === 'Enter' && setSelectedItem(item)}
      >
        <td className="atend-td-client">
          <span className="atend-client-name">{item.client}</span>
          <span className="atend-client-area">{item.area}</span>
        </td>
        <td className="atend-td-process">
          <span className="atend-process-label">{item.processLabel}</span>
          <span className="atend-process-title">{item.processTitle}</span>
        </td>
        <td><CanalIcon canal={item.canal} /></td>
        <td className="atend-td-assunto">
          <span className="atend-assunto-text">{item.assunto}</span>
          <span className="atend-resumo-preview">{item.resumo}</span>
        </td>
        <td className="atend-td-data">
          {formatDateTime(item.dataHora)}
        </td>
        <td className="atend-td-responsavel">{item.responsavel}</td>
        <td><StatusBadge status={item.status} /></td>
        <td className="atend-td-next">
          {item.proximoPasso
            ? <span className="atend-next-step">{item.proximoPasso}</span>
            : <span className="atend-next-step atend-next-step--empty" aria-label="Sem próximo passo definido">—</span>
          }
        </td>
        <td
          className="atend-td-actions"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="atend-menu-wrap">
            <button
              className="atend-menu-trigger"
              aria-label="Ações do atendimento"
              aria-expanded={isMenuOpen}
              aria-haspopup="true"
              onClick={() => setOpenMenuId(isMenuOpen ? null : item.id)}
            >
              <MoreHorizontal size={15} />
            </button>

            {isMenuOpen && (
              <ul className="atend-ctx-menu" role="menu">
                <li role="none">
                  <button role="menuitem" onClick={() => { setSelectedItem(item); setOpenMenuId(null); }}>
                    <Search size={13} /> Ver detalhe
                  </button>
                </li>
                <li role="none">
                  <button role="menuitem" onClick={() => markResolved(item.id)}>
                    <CheckCircle2 size={13} /> Marcar resolvido
                  </button>
                </li>
                <li role="none">
                  <button role="menuitem" onClick={() => scheduleReturn(item.id)}>
                    <CalendarPlus size={13} /> Agendar retorno
                  </button>
                </li>
                <li role="none">
                  <button role="menuitem" onClick={() => createTask(item.id)}>
                    <ClipboardList size={13} /> Criar tarefa
                  </button>
                </li>
                <li role="none">
                  <button role="menuitem" onClick={() => { navigate(`/processos/${item.processId}`); setOpenMenuId(null); }}>
                    <ExternalLink size={13} /> Abrir processo
                  </button>
                </li>
              </ul>
            )}
          </div>
        </td>
      </tr>
    );
  }

  // ─── JSX ─────────────────────────────────────────────────────────────────

  return (
    <div
      className="atendimentos-page"
      onClick={() => { if (openMenuId) setOpenMenuId(null); }}
    >

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="atend-header-card">
        <div className="atend-header-content">
          <p className="atend-eyebrow">Carteira relacional</p>
          <h2>Trate retornos, registre interações e destrave próximos passos.</h2>
          <p className="atend-subtitle">
            Centralize os contatos do cliente, priorize quem está sem retorno e acione processo ou tarefa sem sair da operação.
          </p>
        </div>
        <div className="atend-header-actions">
          <button
            className="btn-primary"
            onClick={() => setShowForm(true)}
            aria-label="Registrar novo atendimento"
          >
            <Plus size={14} /> Novo Atendimento
          </button>
          <button
            className="btn-secondary"
            onClick={() => { setForm((f) => ({ ...f, status: 'agendado' })); setShowForm(true); }}
            aria-label="Agendar retorno para cliente"
          >
            <CalendarPlus size={14} /> Agendar Retorno
          </button>
          <button
            className="btn-secondary"
            onClick={() => exportCsv(sorted)}
            aria-label="Exportar atendimentos como CSV"
          >
            <Download size={14} /> Exportar
          </button>
        </div>
      </div>

      {/* ── Alerts ──────────────────────────────────────────────── */}
      {error && (
        <div className="atend-alert atend-alert--error" role="alert">
          <AlertTriangle size={16} />
          <span>{error}</span>
          <button onClick={() => loadData()} aria-label="Tentar novamente">
            <RefreshCw size={14} /> Tentar novamente
          </button>
        </div>
      )}
      {success && (
        <div className="atend-alert atend-alert--success" role="status" aria-live="polite">
          <CheckCircle2 size={16} />
          <span>{success}</span>
        </div>
      )}

      {/* ── KPI Cards ───────────────────────────────────────────── */}
      <div className="atend-kpis" aria-label="Indicadores de atendimento">
        <div className="atend-kpi-card">
          <p>Atendimentos hoje</p>
          <strong>{loading ? '—' : kpis.hoje}</strong>
        </div>
        <div className="atend-kpi-card atend-kpi-card--warning">
          <p>Retornos operacionais</p>
          <strong>{loading ? '—' : retornosOperacionais}</strong>
        </div>
        <div className="atend-kpi-card atend-kpi-card--danger">
          <p>Clientes sem resposta</p>
          <strong>{loading ? '—' : atendimentosSemResposta}</strong>
        </div>
        <div className="atend-kpi-card">
          <p>Interações na semana</p>
          <strong>{loading ? '—' : kpis.semana}</strong>
        </div>
      </div>

      <div className="atend-operational-strip" aria-label="Resumo operacional de atendimento">
        <div className="atend-operational-pill atend-operational-pill--critical">
          <span>Processos críticos</span>
          <strong>{loading ? '—' : processosCriticos}</strong>
        </div>
        <div className="atend-operational-pill">
          <span>Retornos pendentes</span>
          <strong>{loading ? '—' : kpis.pendentes}</strong>
        </div>
        <div className="atend-operational-note">
          <AlertTriangle size={14} aria-hidden="true" />
          <span>Use a visualização de conversa para tratar clientes sem resposta antes de abrir novos registros.</span>
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────────────────── */}
      <div className="atend-filters">
        <div className="atend-filters-top">
          {/* Search */}
          <div className="atend-field atend-field--search">
            <label htmlFor="atd-search" className="sr-only">Buscar atendimento</label>
            <span className="atend-input-wrap">
              <Search size={14} aria-hidden="true" />
              <input
                id="atd-search"
                type="search"
                placeholder="Buscar por cliente, processo, canal, assunto…"
                value={filters.query}
                onChange={(e) => updateFilter('query', e.target.value)}
              />
            </span>
          </div>

          {/* Client */}
          <div className="atend-field">
            <label htmlFor="atd-client">Cliente</label>
            <select id="atd-client" value={filters.client} onChange={(e) => updateFilter('client', e.target.value)}>
              <option value="">Todos</option>
              {uniqueClients.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Process */}
          <div className="atend-field">
            <label htmlFor="atd-process">Processo</label>
            <select id="atd-process" value={filters.process} onChange={(e) => updateFilter('process', e.target.value)}>
              <option value="">Todos</option>
              {processes.map((p) => <option key={p.id} value={String(p.id)}>#{p.id} · {p.title}</option>)}
            </select>
          </div>

          {/* Status */}
          <div className="atend-field">
            <label htmlFor="atd-status">Status</label>
            <select id="atd-status" value={filters.status} onChange={(e) => updateFilter('status', e.target.value)}>
              <option value="">Todos</option>
              {(Object.entries(STATUS_CFG) as [AtendStatus, { label: string; variant: string }][]).map(([k, v]) =>
                <option key={k} value={k}>{v.label}</option>
              )}
            </select>
          </div>

          {/* Period */}
          <div className="atend-field">
            <label htmlFor="atd-period">Período</label>
            <select id="atd-period" value={filters.period} onChange={(e) => updateFilter('period', e.target.value)}>
              <option value="">Todos</option>
              <option value="hoje">Hoje</option>
              <option value="semana">Esta semana</option>
              <option value="mes">Este mês</option>
            </select>
          </div>

        </div>

        <div className="atend-filters-secondary">
          <div className="atend-field">
            <label htmlFor="atd-canal">Canal</label>
            <select id="atd-canal" value={filters.canal} onChange={(e) => updateFilter('canal', e.target.value)}>
              <option value="">Todos</option>
              {CANAIS.map((c) => <option key={c} value={c}>{CANAL_LABEL[c]}</option>)}
            </select>
          </div>

          <div className="atend-field">
            <label htmlFor="atd-resp">Responsável</label>
            <select id="atd-resp" value={filters.responsible} onChange={(e) => updateFilter('responsible', e.target.value)}>
              <option value="">Todos</option>
              {uniqueResponsaveis.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div className="atend-field">
            <label htmlFor="atd-area">Área</label>
            <select id="atd-area" value={filters.area} onChange={(e) => updateFilter('area', e.target.value)}>
              <option value="">Todas</option>
              {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>

        <div className="atend-filters-bottom">
          {/* Toggles */}
          <label className="atend-checkline">
            <input
              type="checkbox"
              checked={filters.pendingRetorno}
              onChange={(e) => updateFilter('pendingRetorno', e.target.checked)}
              aria-label="Mostrar apenas atendimentos com retorno pendente"
            />
            Com retorno pendente
          </label>
          <label className="atend-checkline">
            <input
              type="checkbox"
              checked={filters.semProximoPasso}
              onChange={(e) => updateFilter('semProximoPasso', e.target.checked)}
              aria-label="Mostrar apenas atendimentos sem próximo passo"
            />
            Sem próximo passo
          </label>

          {/* Filter actions */}
          <div className="atend-filter-actions">
            {hasActiveFilters && (
              <span className="atend-filter-summary">
                <Filter size={12} />
                <strong>{filtered.length}</strong> de {atendimentos.length}
              </span>
            )}
            <button className="btn-ghost" onClick={clearFilters} aria-label="Limpar todos os filtros">
              <X size={13} /> Limpar
            </button>
            <button className="btn-ghost" onClick={saveFilters} aria-label="Salvar filtro atual">
              <Save size={13} /> Salvar filtro
            </button>
          </div>

        </div>
      </div>

      {/* ── Loading ──────────────────────────────────────────────── */}
      {loading && (
        <div className="atend-loading" aria-live="polite" aria-busy="true">
          <RefreshCw size={20} className="atend-spin" aria-hidden="true" />
          <span>Carregando atendimentos…</span>
        </div>
      )}

      {/* ── Content ──────────────────────────────────────────────── */}
      {!loading && !error && (
        <>
          {/* Empty states */}
          {atendimentos.length === 0 && (
            <div className="atend-empty">
              <MessageSquare size={32} aria-hidden="true" />
              <h3>Nenhum atendimento registrado</h3>
              <p>Registre o primeiro atendimento para começar a acompanhar o histórico relacional dos seus processos.</p>
              <button className="btn-primary" onClick={() => setShowForm(true)}>
                <Plus size={14} /> Novo Atendimento
              </button>
            </div>
          )}

          {atendimentos.length > 0 && filtered.length === 0 && (
            <div className="atend-empty">
              <Filter size={32} aria-hidden="true" />
              <h3>Nenhum atendimento para este filtro</h3>
              <p>Ajuste os critérios de busca ou limpe os filtros para ver todos os atendimentos.</p>
              <button className="btn-secondary" onClick={clearFilters}>
                <X size={13} /> Limpar filtros
              </button>
            </div>
          )}

          {filtered.length > 0 && (
            <div className="atend-content-header">
              <div className="atend-table-header-main">
                <span className="atend-count-badge">
                  {filtered.length} atendimento{filtered.length !== 1 ? 's' : ''}
                </span>
                <p className="atend-table-subtitle">Trabalhe a fila por prioridade, retorno e contexto do processo.</p>
              </div>
              <div className="atend-table-header-controls">
                <div className="atend-view-toggle" role="group" aria-label="Modo de visualização">
                  {(['lista', 'conversa', 'timeline'] as ViewMode[]).map((mode) => {
                    const labels = { lista: 'Lista', conversa: 'Conversa', timeline: 'Timeline' };
                    return (
                      <button
                        key={mode}
                        className={`atend-view-btn${viewMode === mode ? ' atend-view-btn--active' : ''}`}
                        onClick={() => setViewMode(mode)}
                        aria-pressed={viewMode === mode}
                      >
                        {labels[mode]}
                      </button>
                    );
                  })}
                </div>
                <div className="atend-sort-controls">
                  <label htmlFor="atd-sort" className="sr-only">Ordenar por</label>
                  <select
                    id="atd-sort"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortField)}
                    aria-label="Ordenar por"
                  >
                    <option value="data">Data</option>
                    <option value="cliente">Cliente</option>
                    <option value="status">Status</option>
                    <option value="prioridade">Prioridade</option>
                  </select>
                  <button
                    className="btn-ghost atend-sort-dir"
                    onClick={() => setSortDesc((d) => !d)}
                    aria-label={sortDesc ? 'Ordem decrescente (clique para crescente)' : 'Ordem crescente (clique para decrescente)'}
                  >
                    {sortDesc ? '↓' : '↑'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Lista mode ─────────────────────────────────────── */}
          {filtered.length > 0 && viewMode === 'lista' && (
            <div className="atend-table-card">
              <div className="atend-table-wrap">
                <table className="atend-table" aria-label="Lista de atendimentos">
                  <thead>
                    <tr>
                      <th scope="col">Cliente</th>
                      <th scope="col">Processo</th>
                      <th scope="col">Canal</th>
                      <th scope="col">Assunto / Resumo</th>
                      <th scope="col">Data</th>
                      <th scope="col">Responsável</th>
                      <th scope="col">Status</th>
                      <th scope="col">Próximo passo</th>
                      <th scope="col"><span className="sr-only">Ações</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((item) => renderRow(item))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="atend-pagination" aria-label="Paginação">
                  <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} aria-label="Página anterior">Anterior</button>
                  <span aria-live="polite">{page} / {totalPages}</span>
                  <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} aria-label="Próxima página">Próximo</button>
                </div>
              )}
            </div>
          )}

          {/* ── Conversa mode ──────────────────────────────────── */}
          {filtered.length > 0 && viewMode === 'conversa' && (
            <div className="atend-conversa-list" aria-label="Atendimentos agrupados por cliente">
              {[...byClient.entries()].map(([client, items]) => (
                <div key={client} className="atend-conversa-client">
                  <div className="atend-conversa-header">
                    <span className="atend-conversa-avatar" aria-hidden="true">
                      {client.charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <strong>{client}</strong>
                      <span>{items.length} interaç{items.length !== 1 ? 'ões' : 'ão'}</span>
                    </div>
                    {items.some((a) => a.status === 'sem_resposta') && (
                      <span className="atend-badge atend-badge--error" aria-label="Cliente sem resposta">Sem resposta</span>
                    )}
                  </div>
                  <div className="atend-conversa-thread">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="atend-conversa-item"
                        onClick={() => setSelectedItem(item)}
                        tabIndex={0}
                        role="button"
                        aria-label={`Atendimento: ${item.assunto}`}
                        onKeyDown={(e) => e.key === 'Enter' && setSelectedItem(item)}
                      >
                        <div className="atend-conversa-item-meta">
                          <CanalIcon canal={item.canal} />
                          <span className="atend-conversa-date">{formatDateTime(item.dataHora)}</span>
                          <StatusBadge status={item.status} />
                          <PriorityDot priority={item.priority} />
                        </div>
                        <p className="atend-conversa-assunto">{item.assunto}</p>
                        <p className="atend-conversa-resumo">{item.resumo}</p>
                        {item.proximoPasso && (
                          <p className="atend-conversa-next">
                            <strong>Próx.:</strong> {item.proximoPasso}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Timeline mode ───────────────────────────────────── */}
          {filtered.length > 0 && viewMode === 'timeline' && (
            <div className="atend-timeline-card">
              <div className="atend-timeline" aria-label="Timeline de atendimentos">
                {sorted.map((item, idx) => {
                  const prevDate = idx > 0 ? sorted[idx - 1].dataHora.slice(0, 10) : null;
                  const currDate = item.dataHora.slice(0, 10);
                  const showDateLabel = currDate !== prevDate;
                  return (
                    <div key={item.id}>
                      {showDateLabel && (
                        <div className="atend-timeline-date-label" aria-label={`Data: ${formatDateShort(currDate)}`}>
                          <Calendar size={12} aria-hidden="true" /> {formatDateShort(currDate)}
                        </div>
                      )}
                      <div
                        className={`atend-timeline-item${item.critico ? ' atend-timeline-item--critico' : ''}`}
                        onClick={() => setSelectedItem(item)}
                        tabIndex={0}
                        role="button"
                        aria-label={`Atendimento de ${item.client}: ${item.assunto}`}
                        onKeyDown={(e) => e.key === 'Enter' && setSelectedItem(item)}
                      >
                        <div className={`atend-timeline-dot atend-timeline-dot--${STATUS_CFG[item.status].variant}`} aria-hidden="true" />
                        <div className="atend-timeline-content">
                          <div className="atend-timeline-top">
                            <strong>{item.client}</strong>
                            <CanalIcon canal={item.canal} />
                            <span className="atend-timeline-time">{item.dataHora.slice(11, 16)}</span>
                            <StatusBadge status={item.status} />
                            <PriorityDot priority={item.priority} />
                          </div>
                          <p className="atend-timeline-assunto">{item.assunto}</p>
                          <p className="atend-timeline-resumo">{item.resumo}</p>
                          {item.proximoPasso && (
                            <p className="atend-timeline-next">
                              <strong>Próx.:</strong> {item.proximoPasso}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Drawer ───────────────────────────────────────────────── */}
      {selectedItem && (
        <>
          <div
            className="atend-drawer-overlay"
            onClick={() => setSelectedItem(null)}
            aria-hidden="true"
          />
          <aside
            className="atend-drawer atend-drawer--open"
            aria-label={`Detalhe do atendimento: ${selectedItem.client}`}
            role="complementary"
          >
            <div className="atend-drawer-top">
              <div className="atend-drawer-heading">
                <span className="atend-drawer-kicker">Atendimento</span>
                <h3>{selectedItem.client}</h3>
              </div>
              <button
                className="atend-drawer-close"
                onClick={() => setSelectedItem(null)}
                aria-label="Fechar detalhe"
              >
                <X size={16} />
              </button>
            </div>

            <div className="atend-drawer-body">
              <div className="atend-drawer-hero">
                <div className="atend-drawer-hero-top">
                  <CanalIcon canal={selectedItem.canal} />
                  <StatusBadge status={selectedItem.status} />
                  <span className="atend-drawer-priority">
                    <PriorityDot priority={selectedItem.priority} />
                    {selectedItem.priority.charAt(0).toUpperCase() + selectedItem.priority.slice(1)}
                  </span>
                </div>
                <p className="atend-drawer-hero-subject">{selectedItem.assunto}</p>
                <p className="atend-drawer-hero-summary">{selectedItem.resumo}</p>
              </div>

              <div className="atend-drawer-next-card">
                <span className="atend-drawer-label">Próximo passo</span>
                <p className="atend-drawer-next-text">
                  {selectedItem.proximoPasso || <em>Não definido. Este atendimento ainda precisa de encaminhamento operacional.</em>}
                </p>
              </div>

              <div className="atend-drawer-meta-grid">
                <div className="atend-drawer-section">
                  <span className="atend-drawer-label">Processo</span>
                  <span className="atend-drawer-value">
                    {selectedItem.processLabel} · {selectedItem.processTitle}
                  </span>
                </div>
                <div className="atend-drawer-section">
                  <span className="atend-drawer-label">Responsável</span>
                  <span className="atend-drawer-value">{selectedItem.responsavel}</span>
                </div>
                <div className="atend-drawer-section">
                  <span className="atend-drawer-label">Data / Hora</span>
                  <span className="atend-drawer-value">{formatDateTime(selectedItem.dataHora)}</span>
                </div>
                <div className="atend-drawer-section">
                  <span className="atend-drawer-label">Tipo</span>
                  <span className="atend-drawer-value">{selectedItem.tipo}</span>
                </div>
              </div>

              {selectedItem.observacoes && (
                <div className="atend-drawer-section">
                  <span className="atend-drawer-label">Observações</span>
                  <p className="atend-drawer-text atend-drawer-text--obs">{selectedItem.observacoes}</p>
                </div>
              )}
              {selectedItem.retornoAgendado && (
                <div className="atend-drawer-section">
                  <span className="atend-drawer-label">Retorno agendado</span>
                  <span className="atend-drawer-value">
                    <Calendar size={13} aria-hidden="true" /> {formatDateShort(selectedItem.retornoAgendado)}
                  </span>
                </div>
              )}
            </div>

            <div className="atend-drawer-actions">
              <button
                className="btn-primary"
                onClick={() => markResolved(selectedItem.id)}
                aria-label="Marcar este atendimento como resolvido"
                disabled={selectedItem.status === 'resolvido'}
              >
                <CheckCircle2 size={13} /> Marcar resolvido
              </button>
              <button
                className="btn-secondary"
                onClick={() => scheduleReturn(selectedItem.id)}
                aria-label="Agendar retorno para este cliente"
              >
                <CalendarPlus size={13} /> Agendar retorno
              </button>
              <button
                className="btn-secondary"
                onClick={() => createTask(selectedItem.id)}
                aria-label="Criar tarefa a partir deste atendimento"
              >
                <ClipboardList size={13} /> Criar tarefa
              </button>
              <button
                className="btn-ghost"
                onClick={() => navigate(`/processos/${selectedItem.processId}`)}
                aria-label={`Abrir processo ${selectedItem.processLabel}`}
              >
                <ExternalLink size={13} /> Abrir processo
              </button>
            </div>
          </aside>
        </>
      )}

      {/* ── Form Modal ───────────────────────────────────────────── */}
      {showForm && (
        <>
          <div className="atend-modal-overlay" onClick={() => setShowForm(false)} aria-hidden="true" />
          <div
            className="atend-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="atend-form-title"
          >
            <div className="atend-modal-header">
              <h3 id="atend-form-title">Novo Atendimento</h3>
              <button onClick={() => setShowForm(false)} aria-label="Fechar formulário">
                <X size={16} />
              </button>
            </div>

            <form className="atend-form" onSubmit={submitForm} noValidate>
              <div className="atend-form-grid">
                <div className="atend-form-field atend-form-field--full">
                  <label htmlFor="form-client">Cliente <span aria-hidden="true">*</span></label>
                  <input
                    id="form-client"
                    type="text"
                    list="atd-clients-list"
                    placeholder="Nome do cliente"
                    value={form.client}
                    onChange={(e) => setForm((f) => ({ ...f, client: e.target.value }))}
                    required
                    aria-required="true"
                  />
                  <datalist id="atd-clients-list">
                    {uniqueClients.map((c) => <option key={c} value={c} />)}
                  </datalist>
                </div>

                <div className="atend-form-field">
                  <label htmlFor="form-process">Processo vinculado</label>
                  <select id="form-process" value={form.processId} onChange={(e) => setForm((f) => ({ ...f, processId: e.target.value }))}>
                    <option value="">Selecionar processo</option>
                    {processes.map((p) => <option key={p.id} value={String(p.id)}>#{p.id} · {p.title}</option>)}
                  </select>
                </div>

                <div className="atend-form-field">
                  <label htmlFor="form-canal">Canal <span aria-hidden="true">*</span></label>
                  <select id="form-canal" value={form.canal} onChange={(e) => setForm((f) => ({ ...f, canal: e.target.value }))} required aria-required="true">
                    <option value="">Selecionar canal</option>
                    {CANAIS.map((c) => <option key={c} value={c}>{CANAL_LABEL[c]}</option>)}
                  </select>
                </div>

                <div className="atend-form-field">
                  <label htmlFor="form-tipo">Tipo</label>
                  <select id="form-tipo" value={form.tipo} onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}>
                    <option value="">Selecionar tipo</option>
                    {TIPOS.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>

                <div className="atend-form-field">
                  <label htmlFor="form-datahora">Data / Hora</label>
                  <input
                    id="form-datahora"
                    type="datetime-local"
                    value={form.dataHora}
                    onChange={(e) => setForm((f) => ({ ...f, dataHora: e.target.value }))}
                  />
                </div>

                <div className="atend-form-field">
                  <label htmlFor="form-status">Status</label>
                  <select id="form-status" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                    {(Object.entries(STATUS_CFG) as [AtendStatus, { label: string; variant: string }][]).map(([k, v]) =>
                      <option key={k} value={k}>{v.label}</option>
                    )}
                  </select>
                </div>

                <div className="atend-form-field">
                  <label htmlFor="form-responsavel">Responsável</label>
                  <input
                    id="form-responsavel"
                    type="text"
                    placeholder={user.email.split('@')[0]}
                    value={form.responsavel}
                    onChange={(e) => setForm((f) => ({ ...f, responsavel: e.target.value }))}
                  />
                </div>

                <div className="atend-form-field atend-form-field--full">
                  <label htmlFor="form-assunto">Assunto <span aria-hidden="true">*</span></label>
                  <input
                    id="form-assunto"
                    type="text"
                    placeholder="Assunto ou motivo do contato"
                    value={form.assunto}
                    onChange={(e) => setForm((f) => ({ ...f, assunto: e.target.value }))}
                    required
                    aria-required="true"
                  />
                </div>

                <div className="atend-form-field atend-form-field--full">
                  <label htmlFor="form-resumo">Resumo do atendimento</label>
                  <textarea
                    id="form-resumo"
                    rows={3}
                    placeholder="Descreva o que foi tratado no atendimento"
                    value={form.resumo}
                    onChange={(e) => setForm((f) => ({ ...f, resumo: e.target.value }))}
                  />
                </div>

                <div className="atend-form-field atend-form-field--full">
                  <label htmlFor="form-obs">Observações</label>
                  <textarea
                    id="form-obs"
                    rows={2}
                    placeholder="Pontos importantes, alertas ou contexto adicional"
                    value={form.observacoes}
                    onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
                  />
                </div>

                <div className="atend-form-field atend-form-field--full">
                  <label htmlFor="form-proximo">Próximo passo</label>
                  <input
                    id="form-proximo"
                    type="text"
                    placeholder="O que deve ser feito após este atendimento?"
                    value={form.proximoPasso}
                    onChange={(e) => setForm((f) => ({ ...f, proximoPasso: e.target.value }))}
                  />
                </div>

                <div className="atend-form-field">
                  <label htmlFor="form-retorno">Retorno agendado</label>
                  <input
                    id="form-retorno"
                    type="date"
                    value={form.retornoAgendado}
                    onChange={(e) => setForm((f) => ({ ...f, retornoAgendado: e.target.value }))}
                  />
                </div>
              </div>

              <div className="atend-form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={!form.client || !form.canal || !form.assunto}>
                  <Plus size={14} /> Registrar Atendimento
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
