import { useEffect, useMemo, useState } from 'react';
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

export function CrmJuridico({ user }: CrmJuridicoProps) {
  const [tab, setTab] = useState<TabKey>('opportunities');
  const [leads, setLeads] = useState<ApiCrmLead[]>([]);
  const [opportunities, setOpportunities] = useState<ApiCrmOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [selectedLead, setSelectedLead] = useState<ApiCrmLead | null>(null);
  const [selectedOpportunity, setSelectedOpportunity] = useState<ApiCrmOpportunity | null>(null);
  const [contactNote, setContactNote] = useState('');
  const [nextContactDraft, setNextContactDraft] = useState('');

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
      nextContactAt: nextContactDraft || null,
    });
    if (response.status !== 201 || !response.data) {
      setError(response.error || 'Não foi possível registrar o contato.');
      return;
    }
    setLeads((prev) => prev.map((entry) => entry.id === item.id ? response.data as ApiCrmLead : entry));
    setSelectedLead(response.data as ApiCrmLead);
    setContactNote('');
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
      nextContactAt: nextContactDraft || null,
    });
    if (response.status !== 201 || !response.data) {
      setError(response.error || 'Não foi possível registrar o contato.');
      return;
    }
    setOpportunities((prev) => prev.map((entry) => entry.id === item.id ? response.data as ApiCrmOpportunity : entry));
    setSelectedOpportunity(response.data as ApiCrmOpportunity);
    setContactNote('');
    setNextContactDraft(formatDateTimeLocal((response.data as ApiCrmOpportunity).nextContactAt));
    setSuccess('Contato registrado.');
  }

  useEffect(() => {
    const selected = tab === 'leads' ? selectedLead : selectedOpportunity;
    setContactNote('');
    setNextContactDraft(formatDateTimeLocal(selected?.nextContactAt ?? null));
  }, [tab, selectedLead?.id, selectedOpportunity?.id]);

  const filteredLeads = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((item) => !q || [item.personName, item.client, item.cpf, item.summary, item.source].join(' ').toLowerCase().includes(q));
  }, [leads, search]);

  const filteredOpportunities = useMemo(() => {
    const q = search.trim().toLowerCase();
    return opportunities.filter((item) => !q || [item.personName, item.client, item.cpf, item.summary, item.source].join(' ').toLowerCase().includes(q));
  }, [opportunities, search]);

  const kpis = useMemo(() => ({
    newLeads: leads.filter((item) => item.status === 'novo').length,
    convertedLeads: leads.filter((item) => item.status === 'convertido').length,
    activeOpportunities: opportunities.filter((item) => !['ganha', 'perdida'].includes(item.status)).length,
    wonOpportunities: opportunities.filter((item) => item.status === 'ganha').length,
  }), [leads, opportunities]);

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
          </div>

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
            <div className="crm-list">
              {filteredOpportunities.map((item) => (
                <article key={item.id} className={`crm-card ${selectedOpportunity?.id === item.id ? 'is-selected' : ''}`} onClick={() => setSelectedOpportunity(item)}>
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
                    <select value={item.status} onChange={(event) => void updateOpportunityStatus(item, event.target.value)} onClick={(event) => event.stopPropagation()}>
                      {OPPORTUNITY_STATUS.map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                  </div>
                </article>
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
                          <strong>{event.kind}</strong>
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
                        <strong>{event.kind}</strong>
                        <p>{event.summary}</p>
                        <small>{formatDateTime(event.createdAt)}{event.createdBy ? ` · ${event.createdBy}` : ''}</small>
                      </article>
                    ))}
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
