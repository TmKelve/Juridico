import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  AlertTriangle,
  Bot,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Columns3,
  CircleDollarSign,
  CircleX,
  ClipboardCheck,
  Clock,
  ClockAlert,
  FileText,
  FileSearch,
  Flag,
  FolderOpen,
  Inbox,
  Plus,
  RefreshCw,
  ShieldAlert,
  SlidersHorizontal,
  Target,
  Trophy,
  TrendingUp,
  UserPlus,
  X,
} from 'lucide-react';
import { DrawerSection, EmptyState, ExecutiveCard, FilterBar, KanbanColumn, KpiCard, OpportunityCard, PageHeader, Timeline } from './components/product';
import { Button, Tabs, TabsContent, TabsList, TabsTrigger, Textarea } from './components/ui';
import { api, type ApiCrmLead, type ApiCrmOpportunity } from './api';
import { captureException, trackEvent, trackPageView } from './monitoring';
import './CrmJuridico.css';

interface CrmJuridicoProps {
  user: { id: number; email: string; role: string };
}

type TabKey = 'leads' | 'opportunities';
type DrawerTabKey = 'overview' | 'history' | 'commercial' | 'documents' | 'process';
type NextActionTone = 'neutral' | 'warning' | 'success';

const LEAD_STATUS = ['novo', 'qualificado', 'contatado', 'convertido', 'perdido'] as const;
const OPPORTUNITY_STATUS = ['acao_recomendada', 'em_contato', 'proposta_enviada', 'negociacao', 'ganha', 'perdida'] as const;
const DRAWER_TABS: Array<{ key: DrawerTabKey; label: string }> = [
  { key: 'overview', label: 'Visão geral' },
  { key: 'history', label: 'Histórico' },
  { key: 'commercial', label: 'Comercial' },
  { key: 'documents', label: 'Documentos' },
  { key: 'process', label: 'Processo' },
];
const OPPORTUNITY_STAGE_LABELS: Record<(typeof OPPORTUNITY_STATUS)[number], string> = {
  acao_recomendada: 'Ação recomendada',
  em_contato: 'Em contato',
  proposta_enviada: 'Proposta enviada',
  negociacao: 'Negociação',
  ganha: 'Ganha',
  perdida: 'Perdida',
};
const CONTACT_KIND_LABELS: Record<string, string> = {
  contato: 'Contato inicial',
  follow_up: 'Follow-up',
  reuniao: 'Reunião',
  proposta: 'Envio de proposta',
  documentos: 'Retorno de documentos',
  ligacao: 'Ligação',
  whatsapp: 'WhatsApp',
  email: 'E-mail',
  conversao: 'Conversão',
};

const COMMERCIAL_STATUS_OPTIONS = [
  { value: 'acao_recomendada', label: 'Não definido' },
  { value: 'em_contato', label: 'Em contato' },
  { value: 'proposta_enviada', label: 'Proposta enviada' },
  { value: 'negociacao', label: 'Negociação' },
  { value: 'ganha', label: 'Convertido' },
  { value: 'perdida', label: 'Perdido' },
];

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function formatDateTimeLocal(iso: string | null) {
  if (!iso) return '';
  const date = new Date(iso);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function matchesNextContactFilter(nextContactAt: string | null, filter: string) {
  if (!filter) return true;
  if (filter === 'sem_contato') return !nextContactAt;
  if (!nextContactAt) return false;
  const contactDate = new Date(nextContactAt);
  if (filter === 'hoje') return contactDate.toDateString() === new Date().toDateString();
  if (filter === 'vencido') return contactDate < new Date() && contactDate.toDateString() !== new Date().toDateString();
  if (filter === 'futuro') return contactDate > new Date();
  return true;
}

function getNextContactState(nextContactAt: string | null) {
  if (!nextContactAt) return 'none';
  const contactDate = new Date(nextContactAt);
  const today = new Date();
  if (contactDate.toDateString() === today.toDateString()) return 'today';
  if (contactDate < today) return 'overdue';
  return 'future';
}

function getNextContactText(nextContactAt: string | null) {
  const state = getNextContactState(nextContactAt);
  if (!nextContactAt) return 'Sem próximo contato';
  if (state === 'overdue') return `Follow-up vencido em ${formatDateTime(nextContactAt)}`;
  if (state === 'today') return `Follow-up previsto para hoje, ${formatDateTime(nextContactAt)}`;
  return `Próximo contato ${formatDateTime(nextContactAt)}`;
}

function getSummaryPreview(summary: string) {
  if (summary.length <= 120) return summary;
  return `${summary.slice(0, 117)}...`;
}

function formatSourceLabel(source: string) {
  if (source === 'publicacao_automatizada') return 'Publicação automatizada';
  return source
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getLeadStatusLabel(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function getOpportunityEmptyState(column: (typeof OPPORTUNITY_STATUS)[number]) {
  if (column === 'ganha') {
    return {
      icon: Trophy,
      title: 'Nenhuma oportunidade ganha ainda.',
      description: 'As conversões fechadas aparecerão aqui.',
    };
  }

  if (column === 'perdida') {
    return {
      icon: CircleX,
      title: 'Nenhuma oportunidade perdida.',
      description: 'Motivos de perda serão registrados para análise.',
    };
  }

  return {
    icon: Inbox,
    title: 'Sem oportunidades neste estágio.',
    description: 'Mova uma oportunidade para cá ou crie uma nova entrada.',
  };
}

function getOpportunityTimeline(item: ApiCrmOpportunity) {
  const createdAt = formatDateTime(item.createdAt);
  return [
    {
      key: 'identified',
      icon: Bot,
      title: 'Oportunidade identificada',
      meta: `Sistema · ${createdAt}`,
    },
    {
      key: 'publication',
      icon: FileSearch,
      title: 'Publicação analisada',
      meta: `Motor de triagem · ${createdAt}`,
    },
    {
      key: 'action',
      icon: CheckCircle2,
      title: 'Ação recomendada criada',
      meta: `Sistema · ${createdAt}`,
    },
    ...(item.responsible ? [] : [{
      key: 'waiting-owner',
      icon: Clock,
      title: 'Aguardando responsável',
      meta: 'Gestão comercial · Pendente',
    }]),
    ...item.contactEvents.map((event) => ({
      key: `contact-${event.id}`,
      icon: CalendarClock,
      title: CONTACT_KIND_LABELS[event.kind] ?? event.kind,
      meta: `${event.createdBy || 'Equipe'} · ${formatDateTime(event.createdAt)}`,
      body: event.summary,
    })),
  ];
}

export function CrmJuridico({ user }: CrmJuridicoProps) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>('opportunities');
  const [drawerTab, setDrawerTab] = useState<DrawerTabKey>('overview');
  const [leads, setLeads] = useState<ApiCrmLead[]>([]);
  const [opportunities, setOpportunities] = useState<ApiCrmOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [responsibleFilter, setResponsibleFilter] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [nextContactFilter, setNextContactFilter] = useState('');
  const [criticalOnly, setCriticalOnly] = useState(false);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [selectedLead, setSelectedLead] = useState<ApiCrmLead | null>(null);
  const [selectedOpportunity, setSelectedOpportunity] = useState<ApiCrmOpportunity | null>(null);
  const [contactNote, setContactNote] = useState('');
  const [contactKind, setContactKind] = useState('contato');
  const [nextContactDraft, setNextContactDraft] = useState('');
  const [showOpportunityConversion, setShowOpportunityConversion] = useState(false);
  const [showConvertConfirmDialog, setShowConvertConfirmDialog] = useState(false);
  const [showNewOpportunityDialog, setShowNewOpportunityDialog] = useState(false);
  const [conversionForm, setConversionForm] = useState({
    clientName: '',
    processTitle: '',
    processNumber: '',
    processPhase: 'Inicial',
    processStatus: 'Ativo',
  });
  const [newOpportunityForm, setNewOpportunityForm] = useState({
    personName: '',
    clientName: '',
    cpf: '',
    source: 'publicacao_automatizada',
    summary: '',
    responsible: '',
    nextContactAt: '',
  });

  useEffect(() => {
    trackPageView('crm_juridico', { role: user.role });
    void loadData();
  }, [user.role]);

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => setSuccess(''), 3000);
    return () => clearTimeout(timer);
  }, [success]);

  useEffect(() => {
    setDrawerTab('overview');
  }, [tab, selectedLead?.id, selectedOpportunity?.id]);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [leadRes, oppRes] = await Promise.all([api.getCrmLeads(), api.getCrmOpportunities()]);
      if (leadRes.status !== 200 || !Array.isArray(leadRes.data)) {
        setError(leadRes.error || 'Não foi possível carregar os leads.');
        return;
      }
      if (oppRes.status !== 200 || !Array.isArray(oppRes.data)) {
        setError(oppRes.error || 'Não foi possível carregar as oportunidades.');
        return;
      }
      setLeads(leadRes.data);
      setOpportunities(oppRes.data);
    } catch (err) {
      setError((err as Error).message || 'Erro ao carregar CRM jurídico.');
      captureException(err as Error, { context: 'crm_load' });
    } finally {
      setLoading(false);
    }
  }

  async function updateLeadStatus(item: ApiCrmLead, status: string) {
    const response = await api.updateCrmLead(item.id, { status });
    if (response.status !== 200 || !response.data) {
      setError(response.error || 'Não foi possível atualizar o lead.');
      return;
    }
    setLeads((prev) => prev.map((entry) => entry.id === item.id ? response.data as ApiCrmLead : entry));
    if (selectedLead?.id === item.id) setSelectedLead(response.data as ApiCrmLead);
    setSuccess('Lead atualizado.');
  }

  async function updateOpportunityStatus(item: ApiCrmOpportunity, status: string) {
    const response = await api.updateCrmOpportunity(item.id, { status });
    if (response.status !== 200 || !response.data) {
      setError(response.error || 'Não foi possível atualizar a oportunidade.');
      return;
    }
    setOpportunities((prev) => prev.map((entry) => entry.id === item.id ? response.data as ApiCrmOpportunity : entry));
    if (selectedOpportunity?.id === item.id) setSelectedOpportunity(response.data as ApiCrmOpportunity);
    setSuccess('Oportunidade atualizada.');
  }

  async function convertLead(item: ApiCrmLead) {
    const response = await api.convertCrmLead(item.id);
    if (response.status !== 201 && response.status !== 200 || !response.data) {
      setError(response.error || 'Não foi possível converter o lead.');
      return;
    }
    setLeads((prev) => prev.map((entry) => entry.id === item.id ? response.data.lead : entry));
    setOpportunities((prev) => [response.data.opportunity, ...prev]);
    setSelectedLead(response.data.lead);
    setSelectedOpportunity(response.data.opportunity);
    setTab('opportunities');
    setSuccess('Lead convertido em oportunidade.');
    trackEvent('crm_lead_converted', { leadId: item.id, opportunityId: response.data.opportunity.id });
  }

  async function updateLeadOwner(item: ApiCrmLead, responsible: string) {
    const response = await api.updateCrmLead(item.id, {
      responsible,
      nextContactAt: nextContactDraft || null,
    });
    if (response.status !== 200 || !response.data) {
      setError(response.error || 'Não foi possível atualizar o lead.');
      return;
    }
    setLeads((prev) => prev.map((entry) => entry.id === item.id ? response.data as ApiCrmLead : entry));
    setSelectedLead(response.data as ApiCrmLead);
    setSuccess('Lead atualizado.');
  }

  async function updateOpportunityOwner(item: ApiCrmOpportunity, responsible: string) {
    const nextResponsible = responsible.trim();
    if (item.status !== 'acao_recomendada' && !nextResponsible) {
      setError('Defina um responsável antes de avançar a oportunidade.');
      return;
    }
    if (item.status === 'em_contato' && !nextContactDraft) {
      setError('Informe o próximo contato para manter a oportunidade em contato.');
      return;
    }

    const response = await api.updateCrmOpportunity(item.id, {
      responsible: nextResponsible,
      nextContactAt: nextContactDraft || null,
      status: item.status,
    });
    if (response.status !== 200 || !response.data) {
      setError(response.error || 'Não foi possível atualizar a oportunidade.');
      return;
    }
    setOpportunities((prev) => prev.map((entry) => entry.id === item.id ? response.data as ApiCrmOpportunity : entry));
    setSelectedOpportunity(response.data as ApiCrmOpportunity);
    setSuccess('Oportunidade atualizada.');
  }

  function validateCommercialDraft(item: ApiCrmOpportunity, action: 'save' | 'history') {
    const nextResponsible = item.responsible?.trim() ?? '';
    const nextContact = nextContactDraft?.trim() || item.nextContactAt || '';

    if (item.status !== 'acao_recomendada' && !nextResponsible) {
      setError('Defina um responsável para avançar ou manter a oportunidade fora de "Ação recomendada".');
      return false;
    }

    if (item.status === 'em_contato' && !nextContact) {
      setError('Informe o próximo contato para oportunidades em "Em contato".');
      return false;
    }

    if (action === 'history' && !contactNote.trim()) {
      setError('Resumo do contato é obrigatório para registrar histórico.');
      return false;
    }

    return true;
  }

  async function addLeadContactEvent(item: ApiCrmLead) {
    const summary = contactNote.trim();
    if (!summary) {
      setError('Informe um resumo do contato.');
      return;
    }
    const response = await api.addCrmLeadContactEvent(item.id, {
      summary,
      kind: contactKind,
      nextContactAt: nextContactDraft || null,
    });
    if (response.status !== 201 || !response.data) {
      setError(response.error || 'Não foi possível registrar o contato.');
      return;
    }
    setLeads((prev) => prev.map((entry) => entry.id === item.id ? response.data as ApiCrmLead : entry));
    setSelectedLead(response.data as ApiCrmLead);
    setContactNote('');
    setContactKind('contato');
    setNextContactDraft(formatDateTimeLocal((response.data as ApiCrmLead).nextContactAt));
    setSuccess('Contato registrado.');
  }

  async function addOpportunityContactEvent(item: ApiCrmOpportunity) {
    const summary = contactNote.trim();
    if (!summary) {
      setError('Informe um resumo do contato.');
      return;
    }
    const response = await api.addCrmOpportunityContactEvent(item.id, {
      summary,
      kind: contactKind,
      nextContactAt: nextContactDraft || null,
    });
    if (response.status !== 201 || !response.data) {
      setError(response.error || 'Não foi possível registrar o contato.');
      return;
    }
    setOpportunities((prev) => prev.map((entry) => entry.id === item.id ? response.data as ApiCrmOpportunity : entry));
    setSelectedOpportunity(response.data as ApiCrmOpportunity);
    setContactNote('');
    setContactKind('contato');
    setNextContactDraft(formatDateTimeLocal((response.data as ApiCrmOpportunity).nextContactAt));
    setSuccess('Contato registrado.');
  }

  useEffect(() => {
    const selected = tab === 'leads' ? selectedLead : selectedOpportunity;
    setContactNote('');
    setContactKind('contato');
    setNextContactDraft(formatDateTimeLocal(selected?.nextContactAt ?? null));
  }, [tab, selectedLead?.id, selectedOpportunity?.id]);

  useEffect(() => {
    if (!selectedOpportunity) return;
    setConversionForm({
      clientName: selectedOpportunity.client || selectedOpportunity.personName,
      processTitle: selectedOpportunity.summary.slice(0, 120) || `Novo processo - ${selectedOpportunity.personName}`,
      processNumber: '',
      processPhase: 'Inicial',
      processStatus: 'Ativo',
    });
    setShowOpportunityConversion(false);
    setShowConvertConfirmDialog(false);
  }, [selectedOpportunity?.id]);

  const filteredLeads = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((item) => {
      const matchesSearch = !q || [item.personName, item.client, item.cpf, item.summary, item.source].join(' ').toLowerCase().includes(q);
      const matchesResponsible = !responsibleFilter || item.responsible === responsibleFilter;
      const matchesStage = !stageFilter || item.status === stageFilter;
      const matchesNextContact = matchesNextContactFilter(item.nextContactAt, nextContactFilter);
      const matchesCritical = !criticalOnly || item.hasCriticalTriage;
      return matchesSearch && matchesResponsible && matchesStage && matchesNextContact && matchesCritical;
    });
  }, [criticalOnly, leads, nextContactFilter, responsibleFilter, search, stageFilter]);

  const filteredOpportunities = useMemo(() => {
    const q = search.trim().toLowerCase();
    return opportunities.filter((item) => {
      const matchesSearch = !q || [item.personName, item.client, item.cpf, item.summary, item.source].join(' ').toLowerCase().includes(q);
      const matchesResponsible = !responsibleFilter || item.responsible === responsibleFilter;
      const matchesStage = !stageFilter || item.status === stageFilter;
      const matchesNextContact = matchesNextContactFilter(item.nextContactAt, nextContactFilter);
      const matchesCritical = !criticalOnly || item.hasCriticalTriage;
      return matchesSearch && matchesResponsible && matchesStage && matchesNextContact && matchesCritical;
    });
  }, [criticalOnly, nextContactFilter, opportunities, responsibleFilter, search, stageFilter]);

  useEffect(() => {
    if (tab === 'leads') {
      if (filteredLeads.length > 0 && !filteredLeads.some((item) => item.id === selectedLead?.id)) {
        setSelectedLead(filteredLeads[0]);
      }
      return;
    }
    if (filteredOpportunities.length > 0 && !filteredOpportunities.some((item) => item.id === selectedOpportunity?.id)) {
      setSelectedOpportunity(filteredOpportunities[0]);
    }
  }, [filteredLeads, filteredOpportunities, selectedLead?.id, selectedOpportunity?.id, tab]);

  const responsibleOptions = useMemo(() => {
    const values = new Set<string>();
    [...leads, ...opportunities].forEach((item) => {
      if (item.responsible) values.add(item.responsible);
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [leads, opportunities]);

  const commercialResponsibleOptions = useMemo(() => {
    const values = new Set<string>(responsibleOptions);
    if (user.email) values.add(user.email);
    if (selectedLead?.responsible) values.add(selectedLead.responsible);
    if (selectedOpportunity?.responsible) values.add(selectedOpportunity.responsible);
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [responsibleOptions, selectedLead?.responsible, selectedOpportunity?.responsible, user.email]);

  const kpis = useMemo(() => ({
    newLeads: leads.filter((item) => item.status === 'novo').length,
    convertedLeads: leads.filter((item) => item.status === 'convertido').length,
    activeOpportunities: opportunities.filter((item) => !['ganha', 'perdida'].includes(item.status)).length,
    actionRecommendedOpportunities: opportunities.filter((item) => item.status === 'acao_recomendada').length,
    wonOpportunities: opportunities.filter((item) => item.status === 'ganha').length,
    overdueFollowUps: [...leads, ...opportunities].filter((item) => getNextContactState(item.nextContactAt) === 'overdue').length,
  }), [leads, opportunities]);

  const kpiCards = useMemo(() => ([
    {
      key: 'new-leads',
      label: 'Leads novos',
      value: kpis.newLeads,
      subtext: kpis.newLeads === 0 ? 'Sem novos leads hoje' : 'Leads entrando na fila',
      tone: 'blue',
      icon: UserPlus,
    },
    {
      key: 'converted-leads',
      label: 'Leads convertidos',
      value: kpis.convertedLeads,
      subtext: kpis.convertedLeads === 0 ? 'Nenhuma conversão no período' : 'Leads qualificados convertidos',
      tone: 'green',
      icon: CheckCircle2,
    },
    {
      key: 'active-opportunities',
      label: 'Oportunidades ativas',
      value: kpis.activeOpportunities,
      subtext: `${kpis.actionRecommendedOpportunities} em ação recomendada`,
      tone: 'indigo',
      icon: BriefcaseBusiness,
    },
    {
      key: 'won-opportunities',
      label: 'Ganhos',
      value: 'R$ 0,00',
      subtext: kpis.wonOpportunities === 0 ? 'Nenhum ganho registrado' : 'Casos convertidos em ganho',
      tone: 'green',
      icon: CircleDollarSign,
    },
    {
      key: 'overdue-follow-ups',
      label: 'Follow-up vencido',
      value: kpis.overdueFollowUps,
      subtext: kpis.overdueFollowUps === 0 ? 'Operação em dia' : 'Ativar recuperação imediata',
      tone: kpis.overdueFollowUps > 0 ? 'amber' : 'slate',
      icon: ClockAlert,
    },
  ]), [kpis]);

  const opportunitiesByStage = useMemo(() => (
    OPPORTUNITY_STATUS.map((status) => ({
      status,
      label: OPPORTUNITY_STAGE_LABELS[status],
      items: filteredOpportunities.filter((item) => item.status === status),
    }))
  ), [filteredOpportunities]);

  async function convertOpportunity(item: ApiCrmOpportunity) {
    if (!item.responsible?.trim()) {
      setError('Defina um responsável antes de converter em cliente + processo.');
      return;
    }
    if (item.status === 'em_contato' && !item.nextContactAt && !nextContactDraft) {
      setError('O estágio em contato exige próximo contato antes da conversão.');
      return;
    }
    const response = await api.convertCrmOpportunity(item.id, {
      clientId: item.clientId,
      clientName: conversionForm.clientName,
      processTitle: conversionForm.processTitle,
      processNumber: conversionForm.processNumber,
      processPhase: conversionForm.processPhase,
      processStatus: conversionForm.processStatus,
      summary: item.summary,
      confirmConversion: true,
    });
    if (response.status !== 201 || !response.data) {
      setError(response.error || 'Não foi possível converter a oportunidade.');
      return;
    }
    setOpportunities((prev) => prev.map((entry) => entry.id === item.id ? response.data!.opportunity : entry));
    setSelectedOpportunity(response.data.opportunity);
    setShowOpportunityConversion(false);
    setShowConvertConfirmDialog(false);
    setSuccess(`Oportunidade convertida em cliente e processo #${response.data.process.id}.`);
  }

  async function createOpportunity() {
    if (!newOpportunityForm.personName.trim()) {
      setError('Informe o nome do contato.');
      return;
    }
    if (!newOpportunityForm.summary.trim()) {
      setError('Informe o resumo da oportunidade.');
      return;
    }

    const response = await api.createCrmOpportunity({
      personName: newOpportunityForm.personName.trim(),
      clientName: newOpportunityForm.clientName.trim() || undefined,
      cpf: newOpportunityForm.cpf.trim() || undefined,
      source: newOpportunityForm.source,
      summary: newOpportunityForm.summary.trim(),
      responsible: newOpportunityForm.responsible.trim() || undefined,
      nextContactAt: newOpportunityForm.nextContactAt || null,
    });

    if (response.status !== 201 || !response.data) {
      setError(response.error || 'Não foi possível criar a oportunidade.');
      return;
    }

    setOpportunities((prev) => [response.data, ...prev]);
    setSelectedOpportunity(response.data);
    setTab('opportunities');
    setShowNewOpportunityDialog(false);
    setSuccess('Nova oportunidade criada.');
    setNewOpportunityForm({
      personName: '',
      clientName: '',
      cpf: '',
      source: 'publicacao_automatizada',
      summary: '',
      responsible: '',
      nextContactAt: '',
    });
  }

  const activeFilters = [
    responsibleFilter ? { key: 'responsible', label: `Responsável: ${responsibleFilter}` } : null,
    stageFilter ? { key: 'stage', label: `Etapa: ${tab === 'opportunities' ? (OPPORTUNITY_STAGE_LABELS[stageFilter as keyof typeof OPPORTUNITY_STAGE_LABELS] ?? stageFilter) : stageFilter}` } : null,
    nextContactFilter ? {
      key: 'nextContact',
      label: `Próximo contato: ${nextContactFilter === 'hoje' ? 'Hoje' : nextContactFilter === 'futuro' ? 'Futuro' : nextContactFilter === 'vencido' ? 'Vencido' : 'Sem contato'}`,
    } : null,
    criticalOnly ? { key: 'critical', label: 'Somente triagem crítica' } : null,
  ].filter(Boolean) as Array<{ key: string; label: string }>;

  const executiveStrip = useMemo(() => {
    if (tab === 'leads') {
      const overdueLeads = filteredLeads.filter((item) => getNextContactState(item.nextContactAt) === 'overdue').length;
      return [
        {
          key: 'priorities',
          eyebrow: 'Prioridades',
          title: `${filteredLeads.filter((item) => item.status === 'novo' || item.status === 'qualificado').length} entradas para qualificar`,
          body: `${filteredLeads.filter((item) => item.hasCriticalTriage).length} lead(s) com triagem crítica e ${filteredLeads.filter((item) => !item.responsible).length} sem responsável.`,
          tone: 'warning',
          badge: 'Atenção',
          icon: Flag,
          linkLabel: 'Ver prioridades',
        },
        {
          key: 'alerts',
          eyebrow: 'Alertas',
          title: `${overdueLeads} follow-ups vencidos`,
          body: `${filteredLeads.filter((item) => !item.nextContactAt).length} lead(s) sem próxima cadência definida.`,
          tone: overdueLeads > 0 ? 'warning' : 'success',
          icon: AlertTriangle,
          linkLabel: 'Ver alertas',
        },
        {
          key: 'next-actions',
          eyebrow: 'Próximas ações',
          title: `${filteredLeads.filter((item) => ['qualificado', 'contatado'].includes(item.status)).length} lead(s) prontos para avançar`,
          body: 'Priorize qualificação, registre objeções e converta os casos aderentes para o funil de oportunidade.',
          tone: 'success',
          icon: CheckCircle2,
          linkLabel: 'Revisar cadências',
        },
      ];
    }

    const closingOpportunities = filteredOpportunities.filter((item) => item.status === 'negociacao' || item.status === 'proposta_enviada').length;
    const missingResponsible = filteredOpportunities.filter((item) => !item.responsible).length;
    const overdueOpportunities = filteredOpportunities.filter((item) => getNextContactState(item.nextContactAt) === 'overdue').length;
    const todayContacts = filteredOpportunities.filter((item) => getNextContactState(item.nextContactAt) === 'today').length;
    const readyToConvert = filteredOpportunities.filter((item) => !item.convertedProcessId && ['negociacao', 'ganha'].includes(item.status)).length;
    const missingCadence = filteredOpportunities.filter((item) => !item.nextContactAt).length;

    return [
      {
        key: 'priorities',
        eyebrow: 'Prioridades',
        title: `${closingOpportunities} oportunidades em fase de fechamento`,
        body: `${missingResponsible} oportunidades sem responsável definido.`,
        tone: 'warning',
        badge: 'Atenção',
        icon: Flag,
        linkLabel: 'Ver prioridades',
      },
      {
        key: 'alerts',
        eyebrow: 'Alertas',
        title: `${overdueOpportunities} follow-ups vencidos`,
        body: todayContacts > 0 ? `${todayContacts} contato(s) previstos para hoje exigem ação antes do fim do dia.` : 'Nenhum contato pendente para hoje.',
        tone: overdueOpportunities > 0 ? 'warning' : 'success',
        icon: AlertTriangle,
        linkLabel: 'Ver alertas',
      },
      {
        key: 'next-actions',
        eyebrow: 'Próximas ações',
        title: `${readyToConvert} casos prontos para conversão operacional`,
        body: `${missingCadence} oportunidades ainda sem próxima cadência definida.`,
        tone: 'success',
        icon: CheckCircle2,
        linkLabel: 'Revisar cadências',
      },
    ];
  }, [filteredLeads, filteredOpportunities, tab]);

  function clearFilter(key: string) {
    if (key === 'responsible') setResponsibleFilter('');
    if (key === 'stage') setStageFilter('');
    if (key === 'nextContact') setNextContactFilter('');
    if (key === 'critical') setCriticalOnly(false);
  }

  const selectedLeadNextAction = selectedLead ? (() => {
    if (['qualificado', 'contatado'].includes(selectedLead.status)) {
      return {
        eyebrow: 'Próxima melhor ação',
        title: 'Converter este lead em oportunidade',
        description: 'O lead já passou da qualificação inicial. Faça a conversão para mover a negociação para o pipeline principal.',
        cta: 'Converter agora',
        tone: 'success' as NextActionTone,
        onClick: () => void convertLead(selectedLead),
      };
    }
    if (!selectedLead.responsible) {
      return {
        eyebrow: 'Próxima melhor ação',
        title: 'Definir responsável e cadência',
        description: 'Sem dono claro, o lead perde velocidade. Atribua a carteira e registre o próximo contato.',
        cta: 'Abrir gestão comercial',
        tone: 'warning' as NextActionTone,
        onClick: () => setDrawerTab('commercial'),
      };
    }
    if (getNextContactState(selectedLead.nextContactAt) === 'overdue' || !selectedLead.contactEvents.length) {
      return {
        eyebrow: 'Próxima melhor ação',
        title: 'Registrar avanço comercial',
        description: 'Atualize o histórico, documente objeções e reposicione a próxima interação para manter o lead aquecido.',
        cta: 'Registrar contato',
        tone: 'warning' as NextActionTone,
        onClick: () => setDrawerTab('commercial'),
      };
    }
    return {
      eyebrow: 'Próxima melhor ação',
      title: 'Reforçar contexto antes da próxima abordagem',
      description: 'Revise a triagem e valide o próximo passo com base no motivo do contato e no estágio de interesse atual.',
      cta: 'Ver visão geral',
      tone: 'neutral' as NextActionTone,
      onClick: () => setDrawerTab('overview'),
    };
  })() : null;

  const selectedOpportunityNextAction = selectedOpportunity ? (() => {
    if (selectedOpportunity.convertedProcessId) {
      return {
        eyebrow: 'Próxima melhor ação',
        title: 'Abrir o processo derivado',
        description: 'A oportunidade já foi operacionalizada. Siga para o processo para acompanhar prazos, documentos e execução jurídica.',
        cta: 'Abrir processo',
        tone: 'success' as NextActionTone,
        onClick: () => navigate(`/processos/${selectedOpportunity.convertedProcessId}`),
      };
    }
    if (['negociacao', 'ganha'].includes(selectedOpportunity.status)) {
      return {
        eyebrow: 'Próxima melhor ação',
        title: 'Converter em cliente e processo',
        description: 'O caso já tem maturidade comercial. Prepare a abertura operacional com cliente, título e fase inicial do processo.',
        cta: 'Preparar conversão',
        tone: 'success' as NextActionTone,
        onClick: () => {
          setDrawerTab('process');
          setShowOpportunityConversion(true);
        },
      };
    }
    if (getNextContactState(selectedOpportunity.nextContactAt) === 'overdue') {
      return {
        eyebrow: 'Próxima melhor ação',
        title: 'Recuperar follow-up vencido',
        description: 'A oportunidade está sem avanço dentro do prazo esperado. Registre contato e redefina a próxima cadência imediatamente.',
        cta: 'Atualizar comercial',
        tone: 'warning' as NextActionTone,
        onClick: () => setDrawerTab('commercial'),
      };
    }
    if (!selectedOpportunity.responsible || !selectedOpportunity.nextContactAt) {
      return {
        eyebrow: 'Próxima melhor ação',
        title: 'Definir dono e próximo passo',
        description: 'Sem responsável ou próximo contato, a negociação perde previsibilidade. Estruture a carteira antes de avançar estágio.',
        cta: 'Abrir gestão comercial',
        tone: 'warning' as NextActionTone,
        onClick: () => setDrawerTab('commercial'),
      };
    }
    return {
      eyebrow: 'Próxima melhor ação',
      title: 'Sustentar o avanço do pipeline',
      description: 'Valide objeções, ajuste a narrativa comercial e mantenha a oportunidade com cadência clara até a etapa seguinte.',
      cta: 'Ver resumo',
      tone: 'neutral' as NextActionTone,
      onClick: () => setDrawerTab('overview'),
    };
  })() : null;

  const selectedOpportunityReadyToConvert = Boolean(
    selectedOpportunity?.responsible?.trim()
      && (selectedOpportunity.status !== 'em_contato' || selectedOpportunity.nextContactAt || nextContactDraft),
  );

  function buildProcessesContextUrl(item: ApiCrmOpportunity | ApiCrmLead) {
    const params = new URLSearchParams();
    if (item.personName) params.set('q', item.personName);
    if (item.cpf) params.set('cpf', item.cpf);
    return `/processos${params.size ? `?${params.toString()}` : ''}`;
  }

  function buildDocumentsContextUrl(item: ApiCrmOpportunity | ApiCrmLead) {
    const params = new URLSearchParams();
    if (item.personName) params.set('client', item.personName);
    if (item.cpf) params.set('q', item.cpf);
    return `/documentos${params.size ? `?${params.toString()}` : ''}`;
  }

  const tabValue = tab === 'opportunities' ? 'opportunities' : 'leads';

  return (
    <div className="crm-page">
      <section className="crm-hero">
        <PageHeader
          title="CRM Jurídico"
          subtitle="Consolide leads, oportunidades derivadas da triagem e próximos passos comerciais sem perder o contexto jurídico."
          actions={(
            <div className="crm-hero__actions">
              <Button variant="outline" onClick={() => void loadData()}>
                <RefreshCw size={14} />
                Atualizar dados
              </Button>
              <Button onClick={() => setShowNewOpportunityDialog(true)}>
                <Plus size={14} />
                Nova oportunidade
              </Button>
            </div>
          )}
        />
      </section>

      <section className="crm-kpis">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <KpiCard
              key={card.key}
              className={`crm-kpi crm-kpi--${card.tone}`}
              label={card.label}
              value={String(card.value)}
              delta={card.subtext}
              trend={card.tone === 'amber' ? 'down' : card.tone === 'green' ? 'up' : 'neutral'}
              icon={<Icon size={16} />}
            />
          );
        })}
      </section>

      <section className="crm-workspace">
        <div className="crm-main">
          <section className="crm-executive-strip">
            {executiveStrip.map((item) => {
              const StripIcon = item.icon;
              return (
                <ExecutiveCard
                  key={item.key}
                  className={`crm-executive-card crm-executive-card--${item.tone}`}
                  title={item.title}
                  description={item.body}
                  footer={(
                    <Button
                      variant="ghost"
                      size="sm"
                      className="crm-inline-link"
                      onClick={() => {
                        setTab('opportunities');
                        if (item.key === 'alerts') {
                          setNextContactFilter('vencido');
                        } else if (item.key === 'next-actions') {
                          setNextContactFilter('sem_contato');
                        }
                      }}
                    >
                      {item.linkLabel}
                      <ChevronRight size={14} />
                    </Button>
                  )}
                >
                  <div className="crm-executive-card__top">
                    <span className={`crm-executive-card__icon crm-executive-card__icon--${item.tone}`}>
                      <StripIcon size={16} />
                    </span>
                    <span className="crm-executive-card__label">{item.eyebrow}</span>
                    {item.badge ? <span className="crm-chip crm-chip--warning">{item.badge}</span> : null}
                  </div>
                </ExecutiveCard>
              );
            })}
          </section>

          <div className="crm-toolbar">
            <Tabs value={tabValue} onValueChange={(value) => setTab(value as TabKey)}>
              <TabsList className="crm-tabs-list">
                <TabsTrigger value="opportunities">Oportunidades <span>{filteredOpportunities.length}</span></TabsTrigger>
                <TabsTrigger value="leads">Leads <span>{filteredLeads.length}</span></TabsTrigger>
              </TabsList>
              <TabsContent value="opportunities" className="crm-tabs-content" />
              <TabsContent value="leads" className="crm-tabs-content" />
            </Tabs>
            <FilterBar
              className="crm-filterbar"
              searchPlaceholder="Buscar por nome, cliente, CPF, origem ou resumo..."
              searchValue={search}
              searchAriaLabel="Buscar no CRM jurídico"
              onSearchChange={setSearch}
              actions={(
                <>
                  <Button variant={showMoreFilters ? 'default' : 'outline'} onClick={() => setShowMoreFilters((prev) => !prev)}>
                    <SlidersHorizontal size={14} />
                    Mais filtros
                  </Button>
                  <Button type="button" variant="ghost" aria-label="Configurar colunas do CRM">
                    <Columns3 size={15} />
                  </Button>
                </>
              )}
            >
              <select className="crm-filter-select" value={responsibleFilter} onChange={(event) => setResponsibleFilter(event.target.value)}>
                <option value="">Todos responsáveis</option>
                {responsibleOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </FilterBar>
          </div>

          {showMoreFilters ? (
            <div className="crm-filters-advanced">
              <label className="crm-inline-field">
                <span>{tab === 'opportunities' ? 'Etapa' : 'Status'}</span>
                <select className="crm-filter-select" value={stageFilter} onChange={(event) => setStageFilter(event.target.value)}>
                  <option value="">Todos</option>
                  {(tab === 'opportunities' ? OPPORTUNITY_STATUS : LEAD_STATUS).map((status) => (
                    <option key={status} value={status}>
                      {tab === 'opportunities' ? OPPORTUNITY_STAGE_LABELS[status as keyof typeof OPPORTUNITY_STAGE_LABELS] : status}
                    </option>
                  ))}
                </select>
              </label>
              <label className="crm-inline-field">
                <span>Próximo contato</span>
                <select className="crm-filter-select" value={nextContactFilter} onChange={(event) => setNextContactFilter(event.target.value)}>
                  <option value="">Todos</option>
                  <option value="hoje">Hoje</option>
                  <option value="vencido">Vencido</option>
                  <option value="futuro">Futuro</option>
                  <option value="sem_contato">Sem contato</option>
                </select>
              </label>
              <label className="crm-inline-field">
                <span>Triagem</span>
                <button
                  type="button"
                  className={`btn-secondary ${criticalOnly ? 'is-active' : ''}`}
                  onClick={() => setCriticalOnly((prev) => !prev)}
                >
                  Somente triagem crítica
                </button>
              </label>
            </div>
          ) : null}

          {activeFilters.length > 0 ? (
            <div className="crm-filter-chips">
              {activeFilters.map((filter) => (
                <button key={filter.key} className="crm-filter-chip" onClick={() => clearFilter(filter.key)}>
                  {filter.label} ×
                </button>
              ))}
            </div>
          ) : null}

          {success && <div className="crm-feedback crm-feedback--success">{success}</div>}
          {error && <div className="crm-feedback crm-feedback--error">{error}</div>}

          {loading ? (
            <EmptyState
              className="crm-empty"
              icon={<RefreshCw size={22} />}
              title="Carregando CRM jurídico"
              description="Buscando leads, oportunidades e cadências comerciais."
            />
          ) : tab === 'leads' ? (
            filteredLeads.length === 0 ? (
              <EmptyState
                className="crm-empty"
                icon={<Inbox size={22} />}
                title="Nenhum lead encontrado"
                description="Ajuste os filtros ou aguarde novas entradas da triagem para qualificação."
                actionLabel="Limpar filtros"
                onAction={() => {
                  setSearch('');
                  setResponsibleFilter('');
                  setStageFilter('');
                  setNextContactFilter('');
                  setCriticalOnly(false);
                }}
              />
            ) : (
              <div className="crm-list">
                {filteredLeads.map((item) => (
                  <article key={item.id} className={`crm-card ${selectedLead?.id === item.id ? 'is-selected' : ''}`} onClick={() => setSelectedLead(item)}>
                    <div className="crm-card__header">
                      <strong>{item.personName}</strong>
                      <span className={`crm-status crm-status--${item.status}`}>{getLeadStatusLabel(item.status)}</span>
                    </div>
                    <p>{item.client || 'Sem cliente vinculado'} · {item.source}</p>
                    <small>{item.cpf || 'CPF não informado'}</small>
                    <div className="crm-card__summary">{getSummaryPreview(item.summary)}</div>
                    <div className="crm-card__meta">
                      <span>{item.triageCount} triagem(ns)</span>
                      {item.responsible ? <span>{item.responsible}</span> : <span className="crm-card__warning">Sem responsável</span>}
                      {item.hasCriticalTriage ? <span className="crm-flag"><ShieldAlert size={12} /> crítica</span> : null}
                    </div>
                    <div className="crm-card__meta">
                      <span className={`crm-next-contact crm-next-contact--${getNextContactState(item.nextContactAt)}`}>{getNextContactText(item.nextContactAt)}</span>
                    </div>
                    <div className="crm-card__actions">
                      <select
                        value={item.status}
                        aria-label={`Alterar status de ${item.personName}`}
                        onChange={(event) => void updateLeadStatus(item, event.target.value)}
                        onClick={(event) => event.stopPropagation()}
                      >
                        {LEAD_STATUS.map((status) => <option key={status} value={status}>{getLeadStatusLabel(status)}</option>)}
                      </select>
                      <button className="btn-primary" onClick={(event) => { event.stopPropagation(); void convertLead(item); }}>Converter</button>
                    </div>
                  </article>
                ))}
              </div>
            )
          ) : filteredOpportunities.length === 0 ? (
            <EmptyState
              className="crm-empty"
              icon={<BriefcaseBusiness size={22} />}
              title="Nenhuma oportunidade encontrada"
              description="Revise a busca e os filtros ou cadastre uma oportunidade manual para iniciar a carteira."
              actionLabel="Nova oportunidade"
              onAction={() => setShowNewOpportunityDialog(true)}
            />
          ) : (
            <div className="crm-board-scroll">
              <div className="crm-board">
                {opportunitiesByStage.map((column) => (
                  <KanbanColumn key={column.status} className="crm-column" title={column.label} count={column.items.length}>
                    <div className="crm-column__body">
                      {column.items.length === 0 ? (
                        (() => {
                          const emptyState = getOpportunityEmptyState(column.status);
                          const EmptyIcon = emptyState.icon;
                          return (
                            <div className="crm-column__empty">
                              <EmptyIcon size={20} />
                              <strong>{emptyState.title}</strong>
                              <span>{emptyState.description}</span>
                            </div>
                          );
                        })()
                      ) : (
                        column.items.map((item) => (
                          <OpportunityCard
                            key={item.id}
                            className={`crm-card crm-card--opportunity ${selectedOpportunity?.id === item.id ? 'is-selected' : ''}`}
                            title={item.personName}
                            account={`${formatSourceLabel(item.source)} · ${item.responsible || 'Sem responsável'}`}
                            value={getSummaryPreview(item.summary)}
                            status="info"
                            statusLabel={OPPORTUNITY_STAGE_LABELS[item.status as keyof typeof OPPORTUNITY_STAGE_LABELS] ?? item.status}
                            priority={getNextContactState(item.nextContactAt) === 'overdue' ? 'urgent' : getNextContactState(item.nextContactAt) === 'today' ? 'high' : 'medium'}
                            onClick={() => setSelectedOpportunity(item)}
                            footer={(
                              <div className="crm-card__footer">
                                <span className={`crm-next-contact crm-next-contact--${getNextContactState(item.nextContactAt)}`}>{getNextContactText(item.nextContactAt)}</span>
                                {item.convertedProcessId ? (
                                  <button
                                    className="btn-ghost"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      navigate(`/processos/${item.convertedProcessId}`);
                                    }}
                                  >
                                    Abrir processo
                                  </button>
                                ) : null}
                                <select
                                  value={item.status}
                                  aria-label={`Alterar etapa de ${item.personName}`}
                                  onChange={(event) => void updateOpportunityStatus(item, event.target.value)}
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  {OPPORTUNITY_STATUS.map((status) => <option key={status} value={status}>{OPPORTUNITY_STAGE_LABELS[status]}</option>)}
                                </select>
                              </div>
                            )}
                          />
                        ))
                      )}
                    </div>
                    <button
                      type="button"
                      className="crm-column__add"
                      onClick={() => {
                        setShowNewOpportunityDialog(true);
                        setNewOpportunityForm((prev) => ({ ...prev, source: 'manual' }));
                      }}
                    >
                      <Plus size={14} />
                      Adicionar oportunidade
                    </button>
                  </KanbanColumn>
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className="crm-drawer">
          {tab === 'leads' ? (
            selectedLead ? (
              <>
                <div className="crm-drawer__intro">
                  <span className="crm-eyebrow">Detalhe do lead</span>
                  <div className="crm-drawer__title-row">
                    <div>
                      <h3>{selectedLead.personName}</h3>
                      <p>{selectedLead.client || 'Sem cliente vinculado'} · {selectedLead.source}</p>
                    </div>
                    <button className="crm-icon-button" onClick={() => setSelectedLead(null)} aria-label="Fechar detalhe do lead">
                      <X size={16} />
                    </button>
                  </div>
                  <div className="crm-drawer__badge-row">
                    <span className="crm-chip crm-chip--blue">{getLeadStatusLabel(selectedLead.status)}</span>
                    {selectedLead.hasCriticalTriage ? <span className="crm-chip crm-chip--neutral">Triagem</span> : null}
                    {selectedLead.responsible ? null : <span className="crm-chip crm-chip--warning">Sem responsável</span>}
                  </div>
                </div>

                {selectedLeadNextAction ? (
                  <section className={`crm-next-best-action crm-next-best-action--${selectedLeadNextAction.tone}`}>
                    <div className="crm-next-best-action__top">
                      <span className="crm-next-best-action__icon"><ClipboardCheck size={16} /></span>
                      <span className="crm-eyebrow">{selectedLeadNextAction.eyebrow}</span>
                    </div>
                    <strong>{selectedLeadNextAction.title}</strong>
                    <p>{selectedLeadNextAction.description}</p>
                    <button className="btn-primary" onClick={selectedLeadNextAction.onClick}>
                      <Target size={14} />
                      {selectedLeadNextAction.cta}
                    </button>
                  </section>
                ) : null}

                <nav className="crm-drawer-tabs" aria-label="Detalhe do lead">
                  {DRAWER_TABS.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      className={drawerTab === item.key ? 'is-active' : ''}
                      onClick={() => setDrawerTab(item.key)}
                    >
                      {item.label}
                    </button>
                  ))}
                </nav>

                {drawerTab === 'overview' ? (
                  <>
                    <div className="crm-drawer__meta">
                      <div><span>Status</span><strong>{getLeadStatusLabel(selectedLead.status)}</strong></div>
                      <div><span>Origem</span><strong>{selectedLead.source}</strong></div>
                      <div><span>Cliente</span><strong>{selectedLead.client || '—'}</strong></div>
                      <div><span>Responsável</span><strong>{selectedLead.responsible || 'Não definido'}</strong></div>
                      <div><span>Criado em</span><strong>{formatDateTime(selectedLead.createdAt)}</strong></div>
                      <div><span>Último contato</span><strong>{selectedLead.lastContactAt ? formatDateTime(selectedLead.lastContactAt) : '—'}</strong></div>
                      <div><span>Próximo contato</span><strong>{selectedLead.nextContactAt ? formatDateTime(selectedLead.nextContactAt) : '—'}</strong></div>
                      <div><span>CPF</span><strong>{selectedLead.cpf || '—'}</strong></div>
                    </div>
                    <section className="crm-panel">
                      <h4>Resumo</h4>
                      <p>{selectedLead.summary}</p>
                    </section>
                    <section className="crm-panel">
                      <h4>Contexto de triagem</h4>
                      <p>{selectedLead.triageCount} item(ns) associado(s){selectedLead.hasCriticalTriage ? ' com sinal crítico recente.' : '.'}</p>
                    </section>
                  </>
                ) : null}

                {drawerTab === 'history' ? (
                  <DrawerSection title="Histórico" description="Cadência e evolução recente do lead.">
                    {selectedLead.contactEvents.length === 0 ? (
                      <p>Nenhum contato registrado.</p>
                    ) : (
                      <Timeline
                        items={selectedLead.contactEvents.map((event) => ({
                          id: String(event.id),
                          title: CONTACT_KIND_LABELS[event.kind] ?? event.kind,
                          description: event.summary,
                          date: `${formatDateTime(event.createdAt)}${event.createdBy ? ` · ${event.createdBy}` : ''}`,
                        }))}
                      />
                    )}
                  </DrawerSection>
                ) : null}

                {drawerTab === 'commercial' ? (
                  <>
                    <section className="crm-panel">
                      <h4>Gestão comercial</h4>
                      <label className="crm-inline-field">
                        <span>Responsável</span>
                        <input
                          value={selectedLead.responsible}
                          onChange={(event) => setSelectedLead((prev) => prev ? { ...prev, responsible: event.target.value } : prev)}
                          placeholder="advogado@juridico.com"
                        />
                      </label>
                      <label className="crm-inline-field">
                        <span>Próximo contato</span>
                        <input type="datetime-local" value={nextContactDraft} onChange={(event) => setNextContactDraft(event.target.value)} />
                      </label>
                      <button className="btn-secondary" onClick={() => void updateLeadOwner(selectedLead, selectedLead.responsible)}>
                        <CalendarClock size={14} />
                        Salvar responsável
                      </button>
                    </section>
                    <section className="crm-panel">
                      <h4>Registrar contato</h4>
                      <Textarea
                        value={contactNote}
                        onChange={(event) => setContactNote(event.target.value)}
                        placeholder="Resumo do contato, próxima objeção ou passo acordado..."
                        rows={4}
                      />
                      <label className="crm-inline-field">
                        <span>Tipo de contato</span>
                        <select value={contactKind} onChange={(event) => setContactKind(event.target.value)}>
                          {Object.entries(CONTACT_KIND_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                        </select>
                      </label>
                      <button className="btn-secondary" onClick={() => void addLeadContactEvent(selectedLead)}>Adicionar histórico</button>
                    </section>
                  </>
                ) : null}

                {drawerTab === 'process' ? (
                  <section className="crm-panel">
                    <h4>Conversão operacional</h4>
                    <p>Quando o interesse estiver validado e o caso tiver aderência comercial, converta o lead em oportunidade para seguir no pipeline principal.</p>
                    <div className="crm-process-actions">
                      <button className="btn-primary" onClick={() => void convertLead(selectedLead)}>
                        <TrendingUp size={14} />
                        Converter em oportunidade
                      </button>
                      {selectedLead.clientId ? (
                        <button className="btn-secondary" onClick={() => navigate(`/clientes?clientId=${selectedLead.clientId}`)}>
                          <FolderOpen size={14} />
                          Abrir cliente
                        </button>
                      ) : null}
                    </div>
                  </section>
                ) : null}

                {drawerTab === 'documents' ? (
                  <section className="crm-panel">
                    <h4>Documentos</h4>
                    <div className="crm-empty crm-empty--compact">
                      <div className="crm-empty__icon"><FileText size={18} /></div>
                      <strong>Nenhum documento anexado</strong>
                      <p>Adicione documentos para apoiar a qualificação do lead.</p>
                      <button className="btn-secondary" onClick={() => navigate(buildDocumentsContextUrl(selectedLead))}>
                        <FolderOpen size={14} />
                        Adicionar documento
                      </button>
                    </div>
                  </section>
                ) : null}
              </>
            ) : <div className="crm-empty">Selecione um lead para ver o detalhe.</div>
          ) : selectedOpportunity ? (
            <>
              <div className="crm-drawer__intro">
                <span className="crm-eyebrow">Detalhe da oportunidade</span>
                <div className="crm-drawer__title-row">
                  <div>
                    <h3>{selectedOpportunity.personName}</h3>
                    <p>{selectedOpportunity.client || selectedOpportunity.personName} · {formatSourceLabel(selectedOpportunity.source)}</p>
                  </div>
                  <button className="crm-icon-button" onClick={() => setSelectedOpportunity(null)} aria-label="Fechar detalhe da oportunidade">
                    <X size={16} />
                  </button>
                </div>
                <div className="crm-drawer__badge-row">
                  <span className={`crm-chip crm-chip--blue`}>{OPPORTUNITY_STAGE_LABELS[selectedOpportunity.status as keyof typeof OPPORTUNITY_STAGE_LABELS]}</span>
                  {selectedOpportunity.hasCriticalTriage ? <span className="crm-chip crm-chip--neutral">Triagem</span> : null}
                  {selectedOpportunity.responsible ? null : <span className="crm-chip crm-chip--warning">Sem responsável</span>}
                </div>
              </div>

              {selectedOpportunityNextAction ? (
                <section className={`crm-next-best-action crm-next-best-action--${selectedOpportunityNextAction.tone}`}>
                  <div className="crm-next-best-action__top">
                    <span className="crm-next-best-action__icon"><AlertTriangle size={16} /></span>
                    <span className="crm-eyebrow">{selectedOpportunityNextAction.eyebrow}</span>
                  </div>
                  <strong>{selectedOpportunityNextAction.title}</strong>
                  <p>{selectedOpportunityNextAction.description}</p>
                  <button className="btn-primary" onClick={selectedOpportunityNextAction.onClick}>
                    <Target size={14} />
                    {selectedOpportunityNextAction.cta}
                  </button>
                </section>
              ) : null}

              {getNextContactState(selectedOpportunity.nextContactAt) === 'overdue' ? (
                <div className="crm-alert crm-alert--danger">Follow-up vencido. Essa oportunidade exige ação imediata.</div>
              ) : null}
              {getNextContactState(selectedOpportunity.nextContactAt) === 'today' ? (
                <div className="crm-alert crm-alert--warning">Follow-up previsto para hoje.</div>
              ) : null}

              <nav className="crm-drawer-tabs" aria-label="Detalhe da oportunidade">
                {DRAWER_TABS.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={drawerTab === item.key ? 'is-active' : ''}
                    onClick={() => setDrawerTab(item.key)}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>

              {drawerTab === 'overview' ? (
                <>
                  <div className="crm-drawer__meta">
                    <div><span>Status</span><strong>{OPPORTUNITY_STAGE_LABELS[selectedOpportunity.status as keyof typeof OPPORTUNITY_STAGE_LABELS] ?? selectedOpportunity.status}</strong></div>
                    <div><span>Origem</span><strong>{formatSourceLabel(selectedOpportunity.source)}</strong></div>
                    <div><span>Cliente</span><strong>{selectedOpportunity.client || selectedOpportunity.personName}</strong></div>
                    <div><span>Responsável</span><strong className={selectedOpportunity.responsible ? '' : 'crm-value--warning'}>{selectedOpportunity.responsible || 'Não definido'}</strong></div>
                    <div><span>Último contato</span><strong>{selectedOpportunity.lastContactAt ? formatDateTime(selectedOpportunity.lastContactAt) : '—'}</strong></div>
                    <div><span>Próximo contato</span><strong>{selectedOpportunity.nextContactAt ? formatDateTime(selectedOpportunity.nextContactAt) : '—'}</strong></div>
                    <div><span>Atualizada em</span><strong>{formatDateTime(selectedOpportunity.updatedAt)}</strong></div>
                    <div><span>CPF</span><strong>{selectedOpportunity.cpf || '—'}</strong></div>
                  </div>
                  <section className="crm-panel">
                    <h4>Resumo</h4>
                    <p>{selectedOpportunity.summary}</p>
                    <small>Oportunidade criada automaticamente para análise comercial e possível conversão operacional.</small>
                  </section>
                  <section className="crm-panel">
                    <h4>Contexto de triagem</h4>
                    <p>{selectedOpportunity.triageCount} item associado.</p>
                    <small>Nenhuma oportunidade convertida ainda.</small>
                  </section>
                </>
              ) : null}

              {drawerTab === 'history' ? (
                <DrawerSection title="Histórico" description="Eventos e marcos da oportunidade.">
                  <Timeline
                    items={getOpportunityTimeline(selectedOpportunity).map((event) => ({
                      id: event.key,
                      title: event.title,
                      description: 'body' in event && event.body ? event.body : event.meta,
                      date: 'body' in event && event.body ? event.meta : undefined,
                    }))}
                  />
                </DrawerSection>
              ) : null}

                {drawerTab === 'commercial' ? (
                  <section className="crm-panel crm-commercial-form">
                    <h4>Gestão comercial</h4>
                    <label className="crm-inline-field">
                      <span>Responsável</span>
                      <select
                        value={selectedOpportunity.responsible}
                        onChange={(event) => setSelectedOpportunity((prev) => prev ? { ...prev, responsible: event.target.value } : prev)}
                      >
                        <option value="">Selecionar responsável</option>
                        {commercialResponsibleOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </label>
                    <label className="crm-inline-field">
                      <span>Próximo contato</span>
                      <input type="datetime-local" value={nextContactDraft} onChange={(event) => setNextContactDraft(event.target.value)} />
                    </label>
                    <label className="crm-inline-field">
                      <span>Tipo de contato</span>
                      <select value={contactKind} onChange={(event) => setContactKind(event.target.value)}>
                        {Object.entries(CONTACT_KIND_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                      </select>
                    </label>
                    <label className="crm-inline-field">
                      <span>Status comercial</span>
                      <select
                        value={selectedOpportunity.status}
                        onChange={(event) => setSelectedOpportunity((prev) => prev ? { ...prev, status: event.target.value } : prev)}
                      >
                        {COMMERCIAL_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </label>
                    <label className="crm-inline-field crm-inline-field--full">
                      <span>Resumo do contato</span>
                      <Textarea
                        value={contactNote}
                        onChange={(event) => setContactNote(event.target.value)}
                        placeholder="Resumo do contato, avanço da negociação ou próximo passo..."
                        rows={4}
                      />
                    </label>
                    <div className="crm-form-actions">
                      <button
                        className="btn-primary"
                        onClick={() => {
                          if (!validateCommercialDraft(selectedOpportunity, 'save')) return;
                          void updateOpportunityOwner(selectedOpportunity, selectedOpportunity.responsible);
                        }}
                      >
                        <CalendarClock size={14} />
                        Salvar gestão comercial
                      </button>
                      <button
                        className="btn-secondary"
                        onClick={() => {
                          if (!validateCommercialDraft(selectedOpportunity, 'history')) return;
                          void addOpportunityContactEvent(selectedOpportunity);
                        }}
                      >
                        Registrar histórico
                      </button>
                    </div>
                  </section>
                ) : null}

              {drawerTab === 'documents' ? (
                <section className="crm-panel">
                  <h4>Documentos</h4>
                  <div className="crm-empty crm-empty--compact">
                    <div className="crm-empty__icon"><FileText size={18} /></div>
                    <strong>Nenhum documento anexado</strong>
                    <p>Adicione documentos para apoiar a qualificação da oportunidade.</p>
                    <button
                      className="btn-secondary"
                      onClick={() => {
                        if (selectedOpportunity?.convertedProcessId) {
                          navigate(`/processos/${selectedOpportunity.convertedProcessId}`);
                          return;
                        }
                        navigate(buildDocumentsContextUrl(selectedOpportunity));
                      }}
                    >
                      <FolderOpen size={14} />
                      {selectedOpportunity?.convertedProcessId ? 'Abrir processo para documentos' : 'Adicionar documento'}
                    </button>
                  </div>
                </section>
              ) : null}

              {drawerTab === 'process' ? (
                <section className="crm-panel">
                  {selectedOpportunity.convertedProcessId ? (
                    <>
                      <h4>Processo vinculado</h4>
                      <p>Esta oportunidade já foi convertida e possui processo operacional criado.</p>
                    </>
                  ) : (
                    <>
                      <h4>Nenhum processo vinculado</h4>
                      <p>Ao converter esta oportunidade, será possível criar ou vincular um processo existente.</p>
                    </>
                  )}
                  {(selectedOpportunity.clientId || selectedOpportunity.convertedProcessId) ? (
                    <div className="crm-process-actions">
                      {selectedOpportunity.clientId ? (
                        <button className="btn-secondary" onClick={() => navigate(`/clientes?clientId=${selectedOpportunity.clientId}`)}>
                          <FolderOpen size={14} />
                          Abrir cliente
                        </button>
                      ) : null}
                      {selectedOpportunity.convertedProcessId ? (
                        <button className="btn-secondary" onClick={() => navigate(`/processos/${selectedOpportunity.convertedProcessId}`)}>
                          <FolderOpen size={14} />
                          Abrir processo
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                  {!selectedOpportunity.convertedProcessId ? (
                    <div className="crm-process-actions">
                      <button className="btn-secondary" onClick={() => navigate(buildProcessesContextUrl(selectedOpportunity))}>
                        <FolderOpen size={14} />
                        Vincular processo existente
                      </button>
                      <button className="btn-primary" onClick={() => setShowOpportunityConversion(true)}>
                        <TrendingUp size={14} />
                        Preparar conversão
                      </button>
                    </div>
                  ) : null}
                  {!showOpportunityConversion ? (
                    null
                  ) : (
                    <div className="crm-conversion">
                      <div className="crm-conversion__header">
                        <span className="crm-eyebrow">Preparação da abertura</span>
                        <strong>Transforme a oportunidade em caso operacional</strong>
                        <p>Revise o cliente, o título do processo e a estrutura inicial antes de concluir a conversão.</p>
                      </div>
                      <div className="crm-conversion__form">
                        <label className="crm-inline-field">
                          <span>Cliente</span>
                          <input value={conversionForm.clientName} onChange={(event) => setConversionForm((prev) => ({ ...prev, clientName: event.target.value }))} />
                        </label>
                        <label className="crm-inline-field">
                          <span>Título do processo</span>
                          <input value={conversionForm.processTitle} onChange={(event) => setConversionForm((prev) => ({ ...prev, processTitle: event.target.value }))} />
                        </label>
                        <label className="crm-inline-field">
                          <span>Número do processo</span>
                          <input value={conversionForm.processNumber} onChange={(event) => setConversionForm((prev) => ({ ...prev, processNumber: event.target.value }))} placeholder="Opcional" />
                        </label>
                        <div className="crm-conversion__grid">
                          <label className="crm-inline-field">
                            <span>Fase</span>
                            <input value={conversionForm.processPhase} onChange={(event) => setConversionForm((prev) => ({ ...prev, processPhase: event.target.value }))} />
                          </label>
                          <label className="crm-inline-field">
                            <span>Status</span>
                            <input value={conversionForm.processStatus} onChange={(event) => setConversionForm((prev) => ({ ...prev, processStatus: event.target.value }))} />
                          </label>
                        </div>
                      </div>
                      <div className="crm-conversion__footer">
                        <div className="crm-conversion__hint">
                          <ArrowRight size={14} />
                          <span>Ao confirmar, o CRM preserva a oportunidade e cria o cliente/processo vinculado.</span>
                        </div>
                        <div className="crm-drawer__actions">
                          <button
                            className="btn-primary"
                            disabled={!selectedOpportunityReadyToConvert}
                            title={!selectedOpportunityReadyToConvert ? 'Defina responsável e próximo contato quando estiver em contato.' : undefined}
                            onClick={() => setShowConvertConfirmDialog(true)}
                          >
                            Confirmar conversão
                          </button>
                          <button className="btn-secondary" onClick={() => setShowOpportunityConversion(false)}>Cancelar</button>
                        </div>
                      </div>
                    </div>
                  )}
                </section>
              ) : null}

              <div className="crm-drawer__footer">
                <p>Converta apenas após definir responsável e registrar o primeiro contato.</p>
                <div className="crm-drawer__footer-actions">
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      if (selectedOpportunity.convertedProcessId) {
                        navigate(`/processos/${selectedOpportunity.convertedProcessId}`);
                      } else {
                        setDrawerTab('overview');
                      }
                    }}
                  >
                    Ver detalhes completos
                  </button>
                  <button
                    className="btn-primary"
                    disabled={!selectedOpportunity.convertedProcessId && !selectedOpportunityReadyToConvert}
                    title={!selectedOpportunity.convertedProcessId && !selectedOpportunityReadyToConvert ? 'Defina responsável e próximo contato quando estiver em contato.' : undefined}
                    onClick={() => {
                      if (selectedOpportunity.convertedProcessId) {
                        navigate(`/processos/${selectedOpportunity.convertedProcessId}`);
                        return;
                      }
                      setDrawerTab('process');
                      setShowOpportunityConversion(true);
                    }}
                  >
                    {selectedOpportunity.convertedProcessId ? 'Abrir processo' : 'Converter em cliente + processo'}
                  </button>
                </div>
              </div>
            </>
          ) : <div className="crm-empty">Selecione uma oportunidade para ver o detalhe.</div>}
        </aside>
      </section>

      {showConvertConfirmDialog && selectedOpportunity ? (
        <div className="crm-dialog" role="dialog" aria-modal="true" aria-label="Confirmar conversão da oportunidade">
          <div className="crm-dialog__backdrop" onClick={() => setShowConvertConfirmDialog(false)} />
          <div className="crm-dialog__panel">
            <div className="crm-dialog__header">
              <div>
                <span className="crm-eyebrow">Conversão operacional</span>
                <h3>Converter em cliente + processo</h3>
                <p>Revise os dados antes de confirmar. Essa ação cria vínculo comercial-operacional auditável.</p>
              </div>
              <button className="crm-icon-button" onClick={() => setShowConvertConfirmDialog(false)} aria-label="Fechar confirmação">
                <X size={16} />
              </button>
            </div>
            <div className="crm-dialog__body">
              <label className="crm-inline-field">
                <span>Cliente</span>
                <input value={conversionForm.clientName} readOnly />
              </label>
              <label className="crm-inline-field">
                <span>Título do processo</span>
                <input value={conversionForm.processTitle} readOnly />
              </label>
              <label className="crm-inline-field">
                <span>Responsável</span>
                <input value={selectedOpportunity.responsible || 'Não definido'} readOnly />
              </label>
              <label className="crm-inline-field">
                <span>Próximo contato</span>
                <input value={nextContactDraft || selectedOpportunity.nextContactAt || 'Não definido'} readOnly />
              </label>
              <label className="crm-inline-field crm-inline-field--full">
                <span>Impacto da conversão</span>
                <textarea
                  value="Cria cliente (ou vincula existente), cria processo operacional e registra histórico de conversão no CRM."
                  rows={3}
                  readOnly
                />
              </label>
            </div>
            <div className="crm-dialog__footer">
              <div className="crm-conversion__hint">
                <ArrowRight size={14} />
                <span>Após converter, a oportunidade permanece rastreável no CRM com referência do processo.</span>
              </div>
              <div className="crm-drawer__actions">
                <button className="btn-primary" onClick={() => void convertOpportunity(selectedOpportunity)}>
                  Confirmar conversão
                </button>
                <button className="btn-secondary" onClick={() => setShowConvertConfirmDialog(false)}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showNewOpportunityDialog ? (
        <div className="crm-dialog" role="dialog" aria-modal="true" aria-label="Nova oportunidade">
          <div className="crm-dialog__backdrop" onClick={() => setShowNewOpportunityDialog(false)} />
          <div className="crm-dialog__panel">
            <div className="crm-dialog__header">
              <div>
                <span className="crm-eyebrow">Nova oportunidade</span>
                <h3>Criar oportunidade manual</h3>
                <p>Cadastre um caso novo para entrar no pipeline comercial do CRM.</p>
              </div>
              <button className="crm-icon-button" onClick={() => setShowNewOpportunityDialog(false)} aria-label="Fechar diálogo">
                <X size={16} />
              </button>
            </div>
            <div className="crm-dialog__body">
              <label className="crm-inline-field">
                <span>Nome</span>
                <input value={newOpportunityForm.personName} onChange={(event) => setNewOpportunityForm((prev) => ({ ...prev, personName: event.target.value }))} placeholder="Tom Kelve Santos de Medeiros" />
              </label>
              <label className="crm-inline-field">
                <span>Cliente</span>
                <input value={newOpportunityForm.clientName} onChange={(event) => setNewOpportunityForm((prev) => ({ ...prev, clientName: event.target.value }))} placeholder="Opcional" />
              </label>
              <label className="crm-inline-field">
                <span>CPF</span>
                <input value={newOpportunityForm.cpf} onChange={(event) => setNewOpportunityForm((prev) => ({ ...prev, cpf: event.target.value }))} placeholder="Opcional" />
              </label>
              <label className="crm-inline-field">
                <span>Responsável</span>
                <input value={newOpportunityForm.responsible} onChange={(event) => setNewOpportunityForm((prev) => ({ ...prev, responsible: event.target.value }))} placeholder="advogado@juridico.com" />
              </label>
              <label className="crm-inline-field">
                <span>Próximo contato</span>
                <input type="datetime-local" value={newOpportunityForm.nextContactAt} onChange={(event) => setNewOpportunityForm((prev) => ({ ...prev, nextContactAt: event.target.value }))} />
              </label>
              <label className="crm-inline-field">
                <span>Resumo</span>
                <textarea value={newOpportunityForm.summary} onChange={(event) => setNewOpportunityForm((prev) => ({ ...prev, summary: event.target.value }))} rows={4} placeholder="Contexto da oportunidade, origem, necessidade e próximos passos..." />
              </label>
            </div>
            <div className="crm-dialog__footer">
              <div className="crm-conversion__hint">
                <ArrowRight size={14} />
                <span>A oportunidade entra no pipeline com ação recomendada.</span>
              </div>
              <div className="crm-drawer__actions">
                <button className="btn-primary" onClick={() => void createOpportunity()}>
                  Criar oportunidade
                </button>
                <button className="btn-secondary" onClick={() => setShowNewOpportunityDialog(false)}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
