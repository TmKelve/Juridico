import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarClock, RefreshCw, Search, ShieldAlert, TrendingUp } from 'lucide-react';
import { api, type ApiCrmLead, type ApiCrmOpportunity } from './api';
import { captureException, trackEvent, trackPageView } from './monitoring';
import './CrmJuridico.css';

interface CrmJuridicoProps {
  user: { id: number; email: string; role: string };
}

type TabKey = 'leads' | 'opportunities';

const LEAD_STATUS = ['novo', 'qualificado', 'contatado', 'convertido', 'perdido'] as const;
const OPPORTUNITY_STATUS = ['acao_recomendada', 'em_contato', 'proposta_enviada', 'negociacao', 'ganha', 'perdida'] as const;
const OPPORTUNITY_STAGE_LABELS: Record<(typeof OPPORTUNITY_STATUS)[number], string> = {
  acao_recomendada: 'Ação recomendada',
  em_contato: 'Em contato',
  proposta_enviada: 'Proposta enviada',
  negociacao: 'Negociação',
  ganha: 'Ganha',
  perdida: 'Perdida',
};
const CONTACT_KIND_LABELS: Record<string, string> = {
  contato: 'Contato',
  ligacao: 'Ligação',
  whatsapp: 'WhatsApp',
  email: 'E-mail',
  reuniao: 'Reunião',
  proposta: 'Proposta',
  conversao: 'Conversão',
};

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

export function CrmJuridico({ user }: CrmJuridicoProps) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>('opportunities');
  const [leads, setLeads] = useState<ApiCrmLead[]>([]);
  const [opportunities, setOpportunities] = useState<ApiCrmOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [responsibleFilter, setResponsibleFilter] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [nextContactFilter, setNextContactFilter] = useState('');
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [selectedLead, setSelectedLead] = useState<ApiCrmLead | null>(null);
  const [selectedOpportunity, setSelectedOpportunity] = useState<ApiCrmOpportunity | null>(null);
  const [contactNote, setContactNote] = useState('');
  const [contactKind, setContactKind] = useState('contato');
  const [nextContactDraft, setNextContactDraft] = useState('');
  const [showOpportunityConversion, setShowOpportunityConversion] = useState(false);
  const [conversionForm, setConversionForm] = useState({
    clientName: '',
    processTitle: '',
    processNumber: '',
    processPhase: 'Inicial',
    processStatus: 'Ativo',
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
    const response = await api.updateCrmOpportunity(item.id, {
      responsible,
      nextContactAt: nextContactDraft || null,
    });
    if (response.status !== 200 || !response.data) {
      setError(response.error || 'Não foi possível atualizar a oportunidade.');
      return;
    }
    setOpportunities((prev) => prev.map((entry) => entry.id === item.id ? response.data as ApiCrmOpportunity : entry));
    setSelectedOpportunity(response.data as ApiCrmOpportunity);
    setSuccess('Oportunidade atualizada.');
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
  }, [selectedOpportunity?.id]);

  const filteredLeads = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((item) => {
      const matchesSearch = !q || [item.personName, item.client, item.cpf, item.summary, item.source].join(' ').toLowerCase().includes(q);
      const matchesResponsible = !responsibleFilter || item.responsible === responsibleFilter;
      const matchesStage = !stageFilter || item.status === stageFilter;
      const matchesNextContact = matchesNextContactFilter(item.nextContactAt, nextContactFilter);
      return matchesSearch && matchesResponsible && matchesStage && matchesNextContact;
    });
  }, [leads, search, responsibleFilter, stageFilter, nextContactFilter]);

  const filteredOpportunities = useMemo(() => {
    const q = search.trim().toLowerCase();
    return opportunities.filter((item) => {
      const matchesSearch = !q || [item.personName, item.client, item.cpf, item.summary, item.source].join(' ').toLowerCase().includes(q);
      const matchesResponsible = !responsibleFilter || item.responsible === responsibleFilter;
      const matchesStage = !stageFilter || item.status === stageFilter;
      const matchesNextContact = matchesNextContactFilter(item.nextContactAt, nextContactFilter);
      return matchesSearch && matchesResponsible && matchesStage && matchesNextContact;
    });
  }, [opportunities, search, responsibleFilter, stageFilter, nextContactFilter]);

  const responsibleOptions = useMemo(() => {
    const values = new Set<string>();
    [...leads, ...opportunities].forEach((item) => {
      if (item.responsible) values.add(item.responsible);
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [leads, opportunities]);

  const kpis = useMemo(() => ({
    newLeads: leads.filter((item) => item.status === 'novo').length,
    convertedLeads: leads.filter((item) => item.status === 'convertido').length,
    activeOpportunities: opportunities.filter((item) => !['ganha', 'perdida'].includes(item.status)).length,
    wonOpportunities: opportunities.filter((item) => item.status === 'ganha').length,
    overdueFollowUps: [...leads, ...opportunities].filter((item) => getNextContactState(item.nextContactAt) === 'overdue').length,
  }), [leads, opportunities]);

  const ownerMetrics = useMemo(() => {
    const buckets = new Map<string, {
      responsible: string;
      leads: number;
      opportunities: number;
      overdueFollowUps: number;
      dueToday: number;
    }>();

    const touch = (responsible: string) => {
      const key = responsible || 'Não definido';
      const current = buckets.get(key);
      if (current) return current;
      const next = {
        responsible: key,
        leads: 0,
        opportunities: 0,
        overdueFollowUps: 0,
        dueToday: 0,
      };
      buckets.set(key, next);
      return next;
    };

    leads
      .filter((item) => !['convertido', 'perdido'].includes(item.status))
      .forEach((item) => {
        const bucket = touch(item.responsible);
        bucket.leads += 1;
        const contactState = getNextContactState(item.nextContactAt);
        if (contactState === 'overdue') bucket.overdueFollowUps += 1;
        if (contactState === 'today') bucket.dueToday += 1;
      });

    opportunities
      .filter((item) => !['ganha', 'perdida'].includes(item.status))
      .forEach((item) => {
        const bucket = touch(item.responsible);
        bucket.opportunities += 1;
        const contactState = getNextContactState(item.nextContactAt);
        if (contactState === 'overdue') bucket.overdueFollowUps += 1;
        if (contactState === 'today') bucket.dueToday += 1;
      });

    return Array.from(buckets.values()).sort((a, b) => {
      if (b.overdueFollowUps !== a.overdueFollowUps) return b.overdueFollowUps - a.overdueFollowUps;
      if (b.opportunities !== a.opportunities) return b.opportunities - a.opportunities;
      if (b.leads !== a.leads) return b.leads - a.leads;
      return a.responsible.localeCompare(b.responsible);
    });
  }, [leads, opportunities]);

  const opportunitiesByStage = useMemo(() => (
    OPPORTUNITY_STATUS.map((status) => ({
      status,
      label: OPPORTUNITY_STAGE_LABELS[status],
      items: filteredOpportunities.filter((item) => item.status === status),
    }))
  ), [filteredOpportunities]);

  async function convertOpportunity(item: ApiCrmOpportunity) {
    const response = await api.convertCrmOpportunity(item.id, {
      clientId: item.clientId,
      clientName: conversionForm.clientName,
      processTitle: conversionForm.processTitle,
      processNumber: conversionForm.processNumber,
      processPhase: conversionForm.processPhase,
      processStatus: conversionForm.processStatus,
      summary: item.summary,
    });
    if (response.status !== 201 || !response.data) {
      setError(response.error || 'Não foi possível converter a oportunidade.');
      return;
    }
    setOpportunities((prev) => prev.map((entry) => entry.id === item.id ? response.data!.opportunity : entry));
    setSelectedOpportunity(response.data.opportunity);
    setShowOpportunityConversion(false);
    setSuccess(`Oportunidade convertida em cliente e processo #${response.data.process.id}.`);
  }

  const activeFilters = [
    responsibleFilter ? { key: 'responsible', label: `Responsável: ${responsibleFilter}` } : null,
    stageFilter ? { key: 'stage', label: `Etapa: ${tab === 'opportunities' ? (OPPORTUNITY_STAGE_LABELS[stageFilter as keyof typeof OPPORTUNITY_STAGE_LABELS] ?? stageFilter) : stageFilter}` } : null,
    nextContactFilter ? {
      key: 'nextContact',
      label: `Próximo contato: ${nextContactFilter === 'hoje' ? 'Hoje' : nextContactFilter === 'futuro' ? 'Futuro' : nextContactFilter === 'vencido' ? 'Vencido' : 'Sem contato'}`
    } : null,
  ].filter(Boolean) as Array<{ key: string; label: string }>;

  function clearFilter(key: string) {
    if (key === 'responsible') setResponsibleFilter('');
    if (key === 'stage') setStageFilter('');
    if (key === 'nextContact') setNextContactFilter('');
  }

  return (
    <div className="crm-page">
      <section className="crm-hero">
        <div>
          <span className="crm-eyebrow">Pipeline relacional</span>
          <h2>CRM Jurídico</h2>
          <p>Consolide leads, oportunidades derivadas da triagem e próximos passos comerciais sem perder o contexto jurídico.</p>
        </div>
        <button className="btn-secondary" onClick={() => void loadData()}>
          <RefreshCw size={14} />
          Atualizar
        </button>
      </section>

      <section className="crm-kpis">
        <article className="crm-kpi"><span>Leads novos</span><strong>{kpis.newLeads}</strong></article>
        <article className="crm-kpi"><span>Leads convertidos</span><strong>{kpis.convertedLeads}</strong></article>
        <article className="crm-kpi"><span>Oportunidades ativas</span><strong>{kpis.activeOpportunities}</strong></article>
        <article className="crm-kpi"><span>Ganhos</span><strong>{kpis.wonOpportunities}</strong></article>
        <article className="crm-kpi crm-kpi--warning"><span>Follow-up vencido</span><strong>{kpis.overdueFollowUps}</strong></article>
      </section>

      <section className="crm-owner-metrics">
        <div className="crm-section-header">
          <div>
            <span className="crm-eyebrow">Gestão da carteira</span>
            <h3>Indicadores por responsável</h3>
          </div>
          {responsibleFilter ? (
            <button className="btn-secondary" onClick={() => setResponsibleFilter('')}>
              Limpar responsável
            </button>
          ) : null}
        </div>
        {ownerMetrics.length === 0 ? (
          <div className="crm-empty crm-empty--compact">Nenhum responsável com carteira ativa no momento.</div>
        ) : (
          <div className="crm-owner-grid">
            {ownerMetrics.map((item) => (
              <button
                key={item.responsible}
                type="button"
                className={`crm-owner-card ${responsibleFilter === item.responsible ? 'is-active' : ''}`}
                onClick={() => setResponsibleFilter((prev) => prev === item.responsible ? '' : item.responsible)}
              >
                <div className="crm-owner-card__header">
                  <strong>{item.responsible}</strong>
                  <span>{item.overdueFollowUps > 0 ? `${item.overdueFollowUps} vencido(s)` : 'Sem follow-up vencido'}</span>
                </div>
                <div className="crm-owner-card__metrics">
                  <div>
                    <span>Leads</span>
                    <strong>{item.leads}</strong>
                  </div>
                  <div>
                    <span>Oportunidades</span>
                    <strong>{item.opportunities}</strong>
                  </div>
                  <div>
                    <span>Vencidos</span>
                    <strong>{item.overdueFollowUps}</strong>
                  </div>
                  <div>
                    <span>Hoje</span>
                    <strong>{item.dueToday}</strong>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="crm-workspace">
        <div className="crm-main">
          <div className="crm-toolbar">
            <div className="crm-tabs">
              <button className={tab === 'opportunities' ? 'is-active' : ''} onClick={() => setTab('opportunities')}>Oportunidades</button>
              <button className={tab === 'leads' ? 'is-active' : ''} onClick={() => setTab('leads')}>Leads</button>
            </div>
            <label className="crm-search">
              <Search size={14} />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome, cliente, CPF, origem ou resumo..." />
            </label>
            <select className="crm-filter-select" value={responsibleFilter} onChange={(event) => setResponsibleFilter(event.target.value)}>
              <option value="">Todos responsáveis</option>
              {responsibleOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
            <button className={`btn-secondary ${showMoreFilters ? 'is-active' : ''}`} onClick={() => setShowMoreFilters((prev) => !prev)}>
              Mais filtros
            </button>
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
            <div className="crm-empty">Carregando CRM jurídico...</div>
          ) : tab === 'leads' ? (
            filteredLeads.length === 0 ? (
              <div className="crm-empty">Nenhum lead encontrado.</div>
            ) : (
              <div className="crm-list">
                {filteredLeads.map((item) => (
                  <article key={item.id} className={`crm-card ${selectedLead?.id === item.id ? 'is-selected' : ''}`} onClick={() => setSelectedLead(item)}>
                    <div className="crm-card__header">
                      <strong>{item.personName}</strong>
                      <span className={`crm-status crm-status--${item.status}`}>{item.status}</span>
                    </div>
                    <p>{item.client || 'Sem cliente vinculado'} · {item.source}</p>
                    <small>{item.cpf || 'CPF não informado'}</small>
                    <div className="crm-card__meta">
                      <span>{item.triageCount} triagem(ns)</span>
                      {item.hasCriticalTriage ? <span className="crm-flag"><ShieldAlert size={12} /> crítica</span> : null}
                    </div>
                    <div className="crm-card__actions">
                      <select value={item.status} onChange={(event) => void updateLeadStatus(item, event.target.value)} onClick={(event) => event.stopPropagation()}>
                        {LEAD_STATUS.map((status) => <option key={status} value={status}>{status}</option>)}
                      </select>
                      <button className="btn-primary" onClick={(event) => { event.stopPropagation(); void convertLead(item); }}>Converter</button>
                    </div>
                  </article>
                ))}
              </div>
            )
          ) : filteredOpportunities.length === 0 ? (
            <div className="crm-empty">Nenhuma oportunidade encontrada.</div>
          ) : (
            <div className="crm-board">
              {opportunitiesByStage.map((column) => (
                <section key={column.status} className="crm-column">
                  <header className="crm-column__header">
                    <div>
                      <strong>{column.label}</strong>
                      <span>{column.items.length} oportunidade(s)</span>
                    </div>
                  </header>
                  <div className="crm-column__body">
                    {column.items.length === 0 ? (
                      <div className="crm-column__empty">Sem oportunidades neste estágio.</div>
                    ) : (
                      column.items.map((item) => (
                        <article key={item.id} className={`crm-card ${selectedOpportunity?.id === item.id ? 'is-selected' : ''}`} onClick={() => setSelectedOpportunity(item)}>
                          <div className="crm-card__header">
                            <strong>{item.personName}</strong>
                            <span className={`crm-status crm-status--${item.status}`}>{OPPORTUNITY_STAGE_LABELS[item.status as keyof typeof OPPORTUNITY_STAGE_LABELS] ?? item.status}</span>
                          </div>
                          <p>{item.client || 'Sem cliente vinculado'} · {item.source}</p>
                          <small>{item.cpf || 'CPF não informado'}</small>
                          <div className="crm-card__meta">
                            <span>{item.triageCount} triagem(ns)</span>
                            {item.responsible ? <span>{item.responsible}</span> : null}
                            {item.hasCriticalTriage ? <span className="crm-flag"><ShieldAlert size={12} /> crítica</span> : null}
                          </div>
                          <div className="crm-card__meta">
                            <span className={`crm-next-contact crm-next-contact--${getNextContactState(item.nextContactAt)}`}>{item.nextContactAt ? `Próximo contato ${formatDateTime(item.nextContactAt)}` : 'Sem próximo contato'}</span>
                          </div>
                          <div className="crm-card__actions">
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
                            <select value={item.status} onChange={(event) => void updateOpportunityStatus(item, event.target.value)} onClick={(event) => event.stopPropagation()}>
                              {OPPORTUNITY_STATUS.map((status) => <option key={status} value={status}>{OPPORTUNITY_STAGE_LABELS[status]}</option>)}
                            </select>
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>

        <aside className="crm-drawer">
          {tab === 'leads' ? (
            selectedLead ? (
              <>
                <span className="crm-eyebrow">Detalhe do lead</span>
                <h3>{selectedLead.personName}</h3>
                <div className="crm-drawer__meta">
                  <div><span>Status</span><strong>{selectedLead.status}</strong></div>
                  <div><span>Origem</span><strong>{selectedLead.source}</strong></div>
                  <div><span>Cliente</span><strong>{selectedLead.client || '—'}</strong></div>
                  <div><span>Responsável</span><strong>{selectedLead.responsible || 'Não definido'}</strong></div>
                  <div><span>Criado em</span><strong>{formatDateTime(selectedLead.createdAt)}</strong></div>
                  <div><span>Último contato</span><strong>{selectedLead.lastContactAt ? formatDateTime(selectedLead.lastContactAt) : '—'}</strong></div>
                  <div><span>Próximo contato</span><strong>{selectedLead.nextContactAt ? formatDateTime(selectedLead.nextContactAt) : '—'}</strong></div>
                </div>
                <section className="crm-panel">
                  <h4>Resumo</h4>
                  <p>{selectedLead.summary}</p>
                </section>
                <section className="crm-panel">
                  <h4>Contexto de triagem</h4>
                  <p>{selectedLead.triageCount} item(ns) associado(s){selectedLead.hasCriticalTriage ? ' com sinal crítico recente.' : '.'}</p>
                </section>
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
                  <textarea
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
                <section className="crm-panel">
                  <h4>Histórico</h4>
                  {selectedLead.contactEvents.length === 0 ? (
                    <p>Nenhum contato registrado.</p>
                  ) : (
                    <div className="crm-history">
                      {selectedLead.contactEvents.map((event) => (
                        <article key={event.id} className="crm-history__item">
                          <strong>{CONTACT_KIND_LABELS[event.kind] ?? event.kind}</strong>
                          <p>{event.summary}</p>
                          <small>{formatDateTime(event.createdAt)}{event.createdBy ? ` · ${event.createdBy}` : ''}</small>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
                <div className="crm-drawer__actions">
                  <button className="btn-primary" onClick={() => void convertLead(selectedLead)}><TrendingUp size={14} /> Converter em oportunidade</button>
                </div>
              </>
            ) : <div className="crm-empty">Selecione um lead para ver o detalhe.</div>
          ) : selectedOpportunity ? (
            <>
              <span className="crm-eyebrow">Detalhe da oportunidade</span>
              <h3>{selectedOpportunity.personName}</h3>
              <div className="crm-drawer__meta">
                <div><span>Status</span><strong>{selectedOpportunity.status}</strong></div>
                <div><span>Origem</span><strong>{selectedOpportunity.source}</strong></div>
                <div><span>Cliente</span><strong>{selectedOpportunity.client || '—'}</strong></div>
                <div><span>Responsável</span><strong>{selectedOpportunity.responsible || 'Não definido'}</strong></div>
                <div><span>Último contato</span><strong>{selectedOpportunity.lastContactAt ? formatDateTime(selectedOpportunity.lastContactAt) : '—'}</strong></div>
                <div><span>Próximo contato</span><strong>{selectedOpportunity.nextContactAt ? formatDateTime(selectedOpportunity.nextContactAt) : '—'}</strong></div>
                <div><span>Atualizada em</span><strong>{formatDateTime(selectedOpportunity.updatedAt)}</strong></div>
              </div>
              {getNextContactState(selectedOpportunity.nextContactAt) === 'overdue' ? (
                <div className="crm-alert crm-alert--danger">Follow-up vencido. Essa oportunidade exige ação imediata.</div>
              ) : null}
              {getNextContactState(selectedOpportunity.nextContactAt) === 'today' ? (
                <div className="crm-alert crm-alert--warning">Follow-up previsto para hoje.</div>
              ) : null}
              <section className="crm-panel">
                <h4>Resumo</h4>
                <p>{selectedOpportunity.summary}</p>
              </section>
              <section className="crm-panel">
                <h4>Contexto de triagem</h4>
                <p>{selectedOpportunity.triageCount} item(ns) associado(s){selectedOpportunity.hasCriticalTriage ? ' com triagem crítica ativa.' : '.'}</p>
              </section>
              <section className="crm-panel">
                <h4>Gestão comercial</h4>
                <label className="crm-inline-field">
                  <span>Responsável</span>
                  <input
                    value={selectedOpportunity.responsible}
                    onChange={(event) => setSelectedOpportunity((prev) => prev ? { ...prev, responsible: event.target.value } : prev)}
                    placeholder="advogado@juridico.com"
                  />
                </label>
                <label className="crm-inline-field">
                  <span>Próximo contato</span>
                  <input type="datetime-local" value={nextContactDraft} onChange={(event) => setNextContactDraft(event.target.value)} />
                </label>
                <button className="btn-secondary" onClick={() => void updateOpportunityOwner(selectedOpportunity, selectedOpportunity.responsible)}>
                  <CalendarClock size={14} />
                  Salvar responsável
                </button>
              </section>
              <section className="crm-panel">
                <h4>Registrar contato</h4>
                <textarea
                  value={contactNote}
                  onChange={(event) => setContactNote(event.target.value)}
                  placeholder="Resumo do contato, avanço da negociação ou próximo passo..."
                  rows={4}
                />
                <label className="crm-inline-field">
                  <span>Tipo de contato</span>
                  <select value={contactKind} onChange={(event) => setContactKind(event.target.value)}>
                    {Object.entries(CONTACT_KIND_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                  </select>
                </label>
                <button className="btn-secondary" onClick={() => void addOpportunityContactEvent(selectedOpportunity)}>Adicionar histórico</button>
              </section>
              <section className="crm-panel">
                <h4>Histórico</h4>
                {selectedOpportunity.contactEvents.length === 0 ? (
                  <p>Nenhum contato registrado.</p>
                ) : (
                  <div className="crm-history">
                    {selectedOpportunity.contactEvents.map((event) => (
                      <article key={event.id} className="crm-history__item">
                        <strong>{CONTACT_KIND_LABELS[event.kind] ?? event.kind}</strong>
                        <p>{event.summary}</p>
                        <small>{formatDateTime(event.createdAt)}{event.createdBy ? ` · ${event.createdBy}` : ''}</small>
                      </article>
                    ))}
                  </div>
                )}
              </section>
              <section className="crm-panel">
                <h4>Conversão operacional</h4>
                {selectedOpportunity.clientId || selectedOpportunity.convertedProcessId ? (
                  <div className="crm-drawer__actions">
                    {selectedOpportunity.clientId ? (
                      <button className="btn-secondary" onClick={() => navigate(`/clientes?clientId=${selectedOpportunity.clientId}`)}>
                        Abrir cliente
                      </button>
                    ) : null}
                    {selectedOpportunity.convertedProcessId ? (
                      <button className="btn-secondary" onClick={() => navigate(`/processos/${selectedOpportunity.convertedProcessId}`)}>
                        Abrir processo
                      </button>
                    ) : null}
                  </div>
                ) : null}
                {!showOpportunityConversion ? (
                  <button className="btn-primary" onClick={() => setShowOpportunityConversion(true)}>
                    <TrendingUp size={14} />
                    Converter em cliente + processo
                  </button>
                ) : (
                  <div className="crm-conversion">
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
                    <div className="crm-drawer__actions">
                      <button className="btn-primary" onClick={() => void convertOpportunity(selectedOpportunity)}>Confirmar conversão</button>
                      <button className="btn-secondary" onClick={() => setShowOpportunityConversion(false)}>Cancelar</button>
                    </div>
                  </div>
                )}
              </section>
            </>
          ) : <div className="crm-empty">Selecione uma oportunidade para ver o detalhe.</div>}
        </aside>
      </section>
    </div>
  );
}
