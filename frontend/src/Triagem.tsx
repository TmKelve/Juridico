import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Briefcase,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileClock,
  Filter,
  LoaderCircle,
  RefreshCw,
  Search,
  ShieldAlert,
  UserRoundSearch,
  X,
} from 'lucide-react';
import { api, type ApiTriageDecision, type ApiTriageItem, type ApiTriageJob } from './api';
import { captureException, trackEvent, trackPageView } from './monitoring';
import './Triagem.css';

interface TriagemProps {
  user: { id: number; email: string; role: string };
}

type QueueTab = 'critica' | 'normal' | 'tratados';

const DISCARD_REASONS = [
  'duplicada',
  'irrelevante',
  'sem relação com cliente/processo',
  'falso positivo da IA',
  'já tratada fora do sistema',
  'outro',
] as const;

const ACTION_LABEL: Record<ApiTriageItem['suggestedAction'], string> = {
  criar_prazo: 'Criar prazo',
  criar_tarefa: 'Criar tarefa',
  criar_oportunidade: 'Criar oportunidade',
  criar_lead: 'Criar lead',
  registrar_publicacao: 'Registrar publicação',
  sem_acao: 'Sem ação',
};

const CONFIDENCE_LABEL: Record<ApiTriageItem['aiConfidenceBand'], string> = {
  alta: 'Alta',
  media: 'Média',
  baixa: 'Baixa',
};

const SOURCE_LABEL: Record<string, string> = {
  cnj: 'CNJ',
  cpf: 'CPF',
  diario_oficial: 'Diário Oficial',
  diario: 'Diário Oficial',
  oab: 'OAB',
  scheduler: 'Scheduler',
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function formatRelative(iso: string) {
  const diffHours = Math.round((Date.now() - new Date(iso).getTime()) / 36e5);
  if (diffHours < 1) return 'agora';
  if (diffHours < 24) return `há ${diffHours}h`;
  const diffDays = Math.round(diffHours / 24);
  return `há ${diffDays}d`;
}

function kpiTone(value: number, danger = false) {
  if (danger && value > 0) return 'critical';
  if (value > 0) return 'info';
  return 'neutral';
}

function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function Triagem({ user }: TriagemProps) {
  const navigate = useNavigate();
  const [items, setItems] = useState<ApiTriageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tab, setTab] = useState<QueueTab>('critica');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<ApiTriageItem | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [jobs, setJobs] = useState<ApiTriageJob[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [runningSource, setRunningSource] = useState<string>('');
  const [discardReason, setDiscardReason] = useState<string>('duplicada');
  const [decisionNote, setDecisionNote] = useState('');
  const [assistDraft, setAssistDraft] = useState({
    deadlineTitle: '',
    dueDate: '',
    deadlinePriority: 'alta',
    taskTitle: '',
    taskDueDate: '',
    taskPriority: 'alta',
    taskOwner: '',
    taskDescription: '',
    crmPersonName: '',
    crmSummary: '',
  });

  useEffect(() => {
    trackPageView('triagem', { role: user.role });
    void loadItems();
    void loadJobs();
  }, [user.role]);

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => setSuccess(''), 3000);
    return () => clearTimeout(timer);
  }, [success]);

  async function loadItems() {
    setLoading(true);
    setError('');
    try {
      const response = await api.getTriage();
      if (response.status !== 200 || !Array.isArray(response.data)) {
        setError(response.error || 'Não foi possível carregar a fila de triagem.');
        return;
      }
      setItems(response.data);
    } catch (err) {
      setError((err as Error).message || 'Erro ao carregar triagem.');
      captureException(err as Error, { context: 'triage_load' });
    } finally {
      setLoading(false);
    }
  }

  async function loadJobs() {
    setJobsLoading(true);
    try {
      const response = await api.getTriageJobs();
      if (response.status === 200 && Array.isArray(response.data)) {
        setJobs(response.data);
      }
    } catch (err) {
      captureException(err as Error, { context: 'triage_jobs_load' });
    } finally {
      setJobsLoading(false);
    }
  }

  async function openItem(id: number) {
    setDrawerLoading(true);
    setError('');
    try {
      const response = await api.getTriageItem(id);
      if (response.status !== 200 || !response.data) {
        setError(response.error || 'Não foi possível carregar o item selecionado.');
        return;
      }
      setSelected(response.data);
      setDiscardReason('duplicada');
      setDecisionNote('');
      setAssistDraft(buildAssistDraft(response.data, user.email));
    } catch (err) {
      setError((err as Error).message || 'Erro ao carregar detalhe da triagem.');
    } finally {
      setDrawerLoading(false);
    }
  }

  async function refreshSelected(id: number) {
    const response = await api.getTriageItem(id);
    if (response.status === 200 && response.data) {
      setSelected(response.data);
      setAssistDraft(buildAssistDraft(response.data, user.email));
    }
  }

  function buildAssistDraft(item: ApiTriageItem, email: string) {
    const owner = email.split('@')[0] || email;
    const isCritical = item.queueType === 'critica';
    return {
      deadlineTitle: item.event?.title || `Prazo derivado da triagem #${item.id}`,
      dueDate: formatDateInput(new Date(Date.now() + 2 * 864e5)),
      deadlinePriority: isCritical ? 'alta' : 'media',
      taskTitle: item.suggestedAction === 'criar_prazo'
        ? `Tratar ${item.event?.title?.toLowerCase() || 'publicação crítica'}`
        : item.event?.title || `Ação derivada da triagem #${item.id}`,
      taskDueDate: formatDateInput(new Date(Date.now() + 864e5)),
      taskPriority: isCritical ? 'alta' : 'media',
      taskOwner: owner,
      taskDescription: item.suggestedReason,
      crmPersonName: item.client || item.capture.personName || '',
      crmSummary: item.suggestedReason,
    };
  }

  async function decide(item: ApiTriageItem, decisionType: 'confirmado' | 'descartado' | 'revisao_manual' | 'adiado') {
    setError('');
    const body: {
      decisionType: 'confirmado' | 'descartado' | 'revisao_manual' | 'adiado';
      decisionReason?: string;
      decisionNote?: string;
      postponeUntil?: string;
      deadlineTitle?: string;
      dueDate?: string;
      deadlinePriority?: 'baixa' | 'media' | 'alta';
      taskTitle?: string;
      taskDueDate?: string;
      taskPriority?: 'baixa' | 'media' | 'alta' | 'critica';
      taskOwner?: string;
      taskDescription?: string;
      crmPersonName?: string;
      crmSummary?: string;
    } = { decisionType };

    if (decisionType === 'descartado') {
      body.decisionReason = discardReason;
      body.decisionNote = decisionNote;
    }

    if (decisionType === 'revisao_manual') {
      body.decisionReason = 'Requer leitura humana adicional';
      body.decisionNote = decisionNote;
    }

    if (decisionType === 'adiado') {
      const suggested = item.queueType === 'critica' ? new Date(Date.now() + 6 * 36e5) : new Date(Date.now() + 24 * 36e5);
      body.decisionReason = 'Adiado para novo ciclo de triagem';
      body.decisionNote = decisionNote;
      body.postponeUntil = suggested.toISOString();
    }

    if (decisionType === 'confirmado') {
      body.deadlineTitle = assistDraft.deadlineTitle;
      body.dueDate = assistDraft.dueDate;
      body.deadlinePriority = assistDraft.deadlinePriority as 'baixa' | 'media' | 'alta';
      body.taskTitle = assistDraft.taskTitle;
      body.taskDueDate = assistDraft.taskDueDate;
      body.taskPriority = assistDraft.taskPriority as 'baixa' | 'media' | 'alta' | 'critica';
      body.taskOwner = assistDraft.taskOwner;
      body.taskDescription = assistDraft.taskDescription;
      body.crmPersonName = assistDraft.crmPersonName;
      body.crmSummary = assistDraft.crmSummary;
    }

    const response = await api.decideTriageItem(item.id, body);
    if (response.status !== 200 || !response.data) {
      setError(response.error || 'Não foi possível registrar a decisão.');
      return;
    }

    const updated = response.data.item;
    setItems((prev) => prev.map((entry) => (entry.id === updated.id ? updated : entry)));
    await refreshSelected(item.id);
    setSuccess(
      decisionType === 'confirmado'
        ? 'Ação confirmada e encaminhada.'
        : decisionType === 'descartado'
          ? 'Item descartado com motivo registrado.'
          : decisionType === 'adiado'
            ? 'Item adiado para novo ciclo.'
            : 'Item enviado para revisão manual.',
    );
    trackEvent('triage_decision', { id: item.id, decisionType });
  }

  async function runJob(source: 'cnj' | 'cpf' | 'diario' | 'oab') {
    setRunningSource(source);
    setError('');
    const response = await api.runTriageJob(source);
    if (response.status !== 201 && response.status !== 200) {
      setError(response.error || 'Não foi possível executar a coleta manual.');
      setRunningSource('');
      return;
    }
    await Promise.all([loadJobs(), loadItems()]);
    setSuccess(`Coleta ${SOURCE_LABEL[source]} executada manualmente.`);
    trackEvent('triage_job_run', { source });
    setRunningSource('');
  }

  const filteredItems = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return items.filter((item) => {
      if (item.queueType !== tab) return false;
      if (statusFilter && item.status !== statusFilter) return false;
      if (!normalized) return true;
      return [
        item.client,
        item.processTitle,
        item.capture.processNumber,
        item.capture.personName,
        item.capture.normalizedText,
        item.suggestedReason,
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalized);
    });
  }, [items, search, statusFilter, tab]);

  const kpis = useMemo(() => {
    const criticalPending = items.filter((item) => item.queueType === 'critica' && item.status === 'pendente').length;
    const normalPending = items.filter((item) => item.queueType === 'normal' && item.status === 'pendente').length;
    const manualReview = items.filter((item) => item.status === 'em_revisao_manual').length;
    const handledToday = items.filter((item) => item.handledAt && new Date(item.handledAt).toDateString() === new Date().toDateString()).length;
    const crmGenerated = items.filter((item) => item.crmLeadId || item.crmOpportunityId).length;
    return { criticalPending, normalPending, manualReview, handledToday, crmGenerated };
  }, [items]);

  const quality = useMemo(() => {
    const handled = items.filter((item) => item.status === 'confirmado' || item.status === 'descartado' || item.status === 'em_revisao_manual');
    const confirmed = handled.filter((item) => item.status === 'confirmado').length;
    const discarded = handled.filter((item) => item.status === 'descartado').length;
    const manual = items.filter((item) => item.status === 'em_revisao_manual').length;
    const falsePositive = items.filter((item) => item.discardReason === 'falso positivo da IA').length;
    const confirmationRate = handled.length ? Math.round((confirmed / handled.length) * 100) : 0;

    const sourceRows = Object.entries(
      items.reduce<Record<string, { total: number; confirmed: number; discarded: number; falsePositive: number }>>((acc, item) => {
        const key = item.capture.sourceType || 'unknown';
        if (!acc[key]) acc[key] = { total: 0, confirmed: 0, discarded: 0, falsePositive: 0 };
        acc[key].total += 1;
        if (item.status === 'confirmado') acc[key].confirmed += 1;
        if (item.status === 'descartado') acc[key].discarded += 1;
        if (item.discardReason === 'falso positivo da IA') acc[key].falsePositive += 1;
        return acc;
      }, {}),
    ).map(([source, row]) => ({
      source,
      ...row,
      confirmationRate: row.total ? Math.round((row.confirmed / row.total) * 100) : 0,
    }));

    return { handled, confirmed, discarded, manual, falsePositive, confirmationRate, sourceRows };
  }, [items]);

  const activeCount = filteredItems.length;
  const latestJobs = jobs.slice(0, 4);

  function openRelatedPublication(item: ApiTriageItem) {
    const params = new URLSearchParams();
    if (item.event?.publicationId) params.set('publicationId', String(item.event.publicationId));
    if (item.processId) params.set('processId', String(item.processId));
    if (item.client) params.set('clientName', item.client);
    if (item.capture.processNumber) params.set('processNumber', item.capture.processNumber);
    navigate(`/publicacoes-intimacoes?${params.toString()}`);
    trackEvent('triage_open_publication', {
      id: item.id,
      publicationId: item.event?.publicationId ?? 0,
      processId: item.processId ?? 0,
      hasClient: Boolean(item.client),
    });
  }

  return (
    <div className="triage-page">
      <section className="triage-hero">
        <div>
          <span className="triage-eyebrow">Fila central de triagem</span>
          <h2>Decida publicações capturadas sem perder governança.</h2>
          <p>Itens críticos, sinais comerciais e eventos órfãos ficam centralizados para confirmação humana, auditoria e execução assistida.</p>
        </div>
        <div className="triage-hero-actions">
          <button className="btn-secondary" onClick={() => void loadItems()}>
            <RefreshCw size={16} />
            Atualizar
          </button>
        </div>
      </section>

      <section className="triage-kpis">
        <button className={`triage-kpi triage-kpi--${kpiTone(kpis.criticalPending, true)}`} onClick={() => { setTab('critica'); setStatusFilter('pendente'); }}>
          <span>Críticos pendentes</span>
          <strong>{kpis.criticalPending}</strong>
          <small>Exigem leitura imediata</small>
        </button>
        <button className={`triage-kpi triage-kpi--${kpiTone(kpis.normalPending)}`} onClick={() => { setTab('normal'); setStatusFilter('pendente'); }}>
          <span>Normais pendentes</span>
          <strong>{kpis.normalPending}</strong>
          <small>Fila operacional regular</small>
        </button>
        <button className={`triage-kpi triage-kpi--${kpiTone(kpis.manualReview, true)}`} onClick={() => { setStatusFilter('em_revisao_manual'); }}>
          <span>Em revisão manual</span>
          <strong>{kpis.manualReview}</strong>
          <small>Precisam de análise humana</small>
        </button>
        <button className={`triage-kpi triage-kpi--${kpiTone(kpis.handledToday)}`} onClick={() => { setTab('tratados'); setStatusFilter(''); }}>
          <span>Tratados hoje</span>
          <strong>{kpis.handledToday}</strong>
          <small>Decisões auditadas no ciclo</small>
        </button>
        <button className={`triage-kpi triage-kpi--${kpiTone(kpis.crmGenerated)}`} onClick={() => { setTab('tratados'); setStatusFilter(''); }}>
          <span>CRM gerado</span>
          <strong>{kpis.crmGenerated}</strong>
          <small>Leads e oportunidades derivados</small>
        </button>
      </section>

      <section className="triage-ops">
        <div className="triage-ops__header">
          <div>
            <span className="triage-eyebrow">Observabilidade</span>
            <h3>Últimos ciclos de coleta</h3>
          </div>
          <div className="triage-ops__actions">
            {(['cnj', 'cpf', 'diario', 'oab'] as const).map((source) => (
              <button
                key={source}
                className="btn-secondary"
                onClick={() => void runJob(source)}
                disabled={runningSource === source}
              >
                {runningSource === source ? <LoaderCircle size={14} className="triage-spin" /> : <RefreshCw size={14} />}
                Rodar {SOURCE_LABEL[source]}
              </button>
            ))}
          </div>
        </div>

        <div className="triage-jobs">
          {jobsLoading ? (
            <div className="triage-job triage-job--empty">Carregando jobs...</div>
          ) : latestJobs.length === 0 ? (
            <div className="triage-job triage-job--empty">Nenhum job registrado ainda.</div>
          ) : (
            latestJobs.map((job) => (
              <article key={job.id} className={`triage-job triage-job--${job.status}`}>
                <div className="triage-job__top">
                  <strong>{SOURCE_LABEL[job.sourceType] || job.sourceType}</strong>
                  <span className={`triage-job__status triage-job__status--${job.status}`}>{job.status}</span>
                </div>
                <div className="triage-job__meta">
                  <span>{formatDateTime(job.scheduledFor)}</span>
                  <span>{job.itemsCaptured} capturados</span>
                  <span>{job.itemsFlaggedCritical} críticos</span>
                  <span>{job.itemsSentToCrm} CRM</span>
                </div>
                {job.errorLog ? <p className="triage-job__error">{job.errorLog}</p> : null}
              </article>
            ))
          )}
        </div>
      </section>

      <section className="triage-quality">
        <div className="triage-quality__header">
          <div>
            <span className="triage-eyebrow">Qualidade da IA</span>
            <h3>Confirmação, descarte e ruído por fonte</h3>
          </div>
        </div>

        <div className="triage-quality__cards">
          <article className="triage-quality-card">
            <span>Taxa de confirmação</span>
            <strong>{quality.confirmationRate}%</strong>
            <small>{quality.confirmed} confirmados em {quality.handled.length} itens tratados/revisados</small>
          </article>
          <article className="triage-quality-card">
            <span>Descartados</span>
            <strong>{quality.discarded}</strong>
            <small>Itens encerrados sem ação operacional</small>
          </article>
          <article className="triage-quality-card">
            <span>Revisão manual</span>
            <strong>{quality.manual}</strong>
            <small>Demandam leitura humana adicional</small>
          </article>
          <article className="triage-quality-card">
            <span>Falso positivo</span>
            <strong>{quality.falsePositive}</strong>
            <small>Descartes marcados como erro da IA</small>
          </article>
        </div>

        <div className="triage-quality__table">
          {quality.sourceRows.length === 0 ? (
            <div className="triage-quality__empty">Sem dados suficientes para medir qualidade por fonte.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Fonte</th>
                  <th>Total</th>
                  <th>Confirmados</th>
                  <th>Descartados</th>
                  <th>Falso positivo</th>
                  <th>Conversão</th>
                </tr>
              </thead>
              <tbody>
                {quality.sourceRows.map((row) => (
                  <tr key={row.source}>
                    <td>{SOURCE_LABEL[row.source] || row.source}</td>
                    <td>{row.total}</td>
                    <td>{row.confirmed}</td>
                    <td>{row.discarded}</td>
                    <td>{row.falsePositive}</td>
                    <td>{row.confirmationRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="triage-workspace">
        <div className="triage-main">
          <div className="triage-toolbar">
            <div className="triage-tabs" role="tablist" aria-label="Filas da triagem">
              {(['critica', 'normal', 'tratados'] as QueueTab[]).map((queue) => (
                <button
                  key={queue}
                  className={`triage-tab ${tab === queue ? 'is-active' : ''}`}
                  onClick={() => setTab(queue)}
                >
                  {queue === 'critica' ? 'Crítica' : queue === 'normal' ? 'Normal' : 'Tratados'}
                </button>
              ))}
            </div>

            <div className="triage-filters">
              <label className="triage-search">
                <Search size={16} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por processo, cliente, CPF ou razão sugerida..."
                />
              </label>

              <label className="triage-status-select">
                <Filter size={16} />
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option value="">Todos os status</option>
                  <option value="pendente">Pendentes</option>
                  <option value="em_revisao_manual">Revisão manual</option>
                  <option value="adiado">Adiados</option>
                  <option value="confirmado">Confirmados</option>
                  <option value="descartado">Descartados</option>
                </select>
              </label>
            </div>
          </div>

          {success && <div className="triage-feedback triage-feedback--success">{success}</div>}
          {error && <div className="triage-feedback triage-feedback--error">{error}</div>}

          <div className="triage-list-header">
            <div>
              <strong>{activeCount}</strong> item(ns) nesta visão
            </div>
            <small>Ordenação implícita por risco e recência.</small>
          </div>

          {loading ? (
            <div className="triage-empty">Carregando fila de triagem...</div>
          ) : filteredItems.length === 0 ? (
            <div className="triage-empty">Nenhum item encontrado para os filtros atuais.</div>
          ) : (
            <div className="triage-list">
              {filteredItems.map((item) => (
                <article
                  key={item.id}
                  className={`triage-card triage-card--${item.queueType} ${selected?.id === item.id ? 'is-selected' : ''}`}
                  onClick={() => void openItem(item.id)}
                >
                  <div className="triage-card__header">
                    <div className="triage-card__source">
                      <span className={`triage-source triage-source--${item.capture.sourceType}`}>{item.sourceLabel}</span>
                      <span className={`triage-confidence triage-confidence--${item.aiConfidenceBand}`}>{CONFIDENCE_LABEL[item.aiConfidenceBand]}</span>
                      <span className="triage-action-chip">{ACTION_LABEL[item.suggestedAction]}</span>
                    </div>
                    <div className="triage-card__time">{formatRelative(item.capture.occurredAt)}</div>
                  </div>

                  <h3>{item.event?.title || item.suggestedReason}</h3>
                  <p>{item.client}{item.processTitle ? ` · ${item.processTitle}` : ''}</p>

                  <div className="triage-card__meta">
                    <span>{item.capture.processNumber || 'Sem número de processo'}</span>
                    <span>{item.capture.tribunal || 'Fonte sem tribunal'}</span>
                    <span>{item.status.replaceAll('_', ' ')}</span>
                  </div>

                  <div className="triage-card__reason">{item.suggestedReason}</div>

                  <div className="triage-card__actions">
                    <button
                      className="btn-secondary"
                      onClick={(event) => {
                        event.stopPropagation();
                        openRelatedPublication(item);
                      }}
                    >
                      Ver publicação
                    </button>
                    <button
                      className="btn-primary"
                      onClick={(event) => {
                        event.stopPropagation();
                        void decide(item, 'confirmado');
                      }}
                    >
                      Confirmar
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={(event) => {
                        event.stopPropagation();
                        void decide(item, 'revisao_manual');
                      }}
                    >
                      Revisão manual
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <aside className="triage-drawer">
          {!selected && !drawerLoading && (
            <div className="triage-drawer__empty">
              <ShieldAlert size={20} />
              <strong>Selecione um item da fila</strong>
              <p>O detalhe mostra contexto, timeline e a sugestão operacional antes da confirmação.</p>
            </div>
          )}

          {drawerLoading && <div className="triage-drawer__empty">Carregando detalhe...</div>}

          {selected && !drawerLoading && (
            <>
              <div className="triage-drawer__header">
                <div>
                  <span className="triage-eyebrow">Detalhe da triagem</span>
                  <h3>{selected.event?.title || selected.capture.personName || 'Evento capturado'}</h3>
                  <p>{selected.client}{selected.processTitle ? ` · ${selected.processTitle}` : ''}</p>
                </div>
                <button className="triage-close" onClick={() => setSelected(null)}>
                  <X size={18} />
                </button>
              </div>

              <div className="triage-drawer__badges">
                <span className={`triage-source triage-source--${selected.capture.sourceType}`}>{selected.sourceLabel}</span>
                <span className={`triage-confidence triage-confidence--${selected.aiConfidenceBand}`}>{CONFIDENCE_LABEL[selected.aiConfidenceBand]}</span>
                <span className="triage-action-chip">{ACTION_LABEL[selected.suggestedAction]}</span>
              </div>

              <section className="triage-panel">
                <h4>Contexto</h4>
                <div className="triage-panel__grid">
                  <div><span>Processo</span><strong>{selected.processTitle || 'Não vinculado'}</strong></div>
                  <div><span>Cliente</span><strong>{selected.client}</strong></div>
                  <div><span>Tribunal</span><strong>{selected.capture.tribunal || '—'}</strong></div>
                  <div><span>Ocorrência</span><strong>{formatDateTime(selected.capture.occurredAt)}</strong></div>
                  <div><span>CPF</span><strong>{selected.capture.cpf || '—'}</strong></div>
                  <div><span>Fila</span><strong>{selected.queueType === 'critica' ? 'Crítica' : selected.queueType === 'normal' ? 'Normal' : 'Tratados'}</strong></div>
                </div>
              </section>

              <section className="triage-panel">
                <h4>Leitura da IA</h4>
                <p>{selected.suggestedReason}</p>
                <div className="triage-panel__hint">
                  <AlertTriangle size={16} />
                  <span>Confiança {CONFIDENCE_LABEL[selected.aiConfidenceBand].toLowerCase()} com ação sugerida: {ACTION_LABEL[selected.suggestedAction].toLowerCase()}.</span>
                </div>
              </section>

              <section className="triage-panel">
                <h4>Texto capturado</h4>
                <p>{selected.capture.normalizedText}</p>
              </section>

              <section className="triage-panel">
                <h4>Timeline relacionada</h4>
                {selected.timeline?.length ? (
                  <div className="triage-timeline">
                    {selected.timeline.map((event) => (
                      <div key={event.id} className="triage-timeline__item">
                        <div className="triage-timeline__icon">
                          {event.requiresAction ? <FileClock size={14} /> : <Clock3 size={14} />}
                        </div>
                        <div>
                          <strong>{event.title}</strong>
                          <p>{event.summary}</p>
                          <small>{formatDateTime(event.eventAt)}</small>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="triage-muted">Sem histórico cronológico adicional para este vínculo.</p>
                )}
              </section>

              <section className="triage-panel">
                <h4>Histórico de decisão</h4>
                {selected.decisions?.length ? (
                  <div className="triage-decisions">
                    {selected.decisions.map((decision: ApiTriageDecision) => (
                      <div key={decision.id} className="triage-decision">
                        <strong>{decision.decisionType.replaceAll('_', ' ')}</strong>
                        <p>{decision.decisionReason || 'Sem justificativa informada.'}</p>
                        <small>{decision.decidedBy} · {formatDateTime(decision.decidedAt)}</small>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="triage-muted">Nenhuma decisão registrada até agora.</p>
                )}
              </section>

              <section className="triage-panel">
                <h4>Descartar ou adiar</h4>
                <select value={discardReason} onChange={(event) => setDiscardReason(event.target.value)}>
                  {DISCARD_REASONS.map((reason) => (
                    <option key={reason} value={reason}>{reason}</option>
                  ))}
                </select>
                <textarea
                  rows={3}
                  placeholder="Observação opcional para decisão ou revisão manual."
                  value={decisionNote}
                  onChange={(event) => setDecisionNote(event.target.value)}
                />
              </section>

              <section className="triage-panel">
                <h4>Confirmação assistida</h4>
                {selected.suggestedAction === 'criar_prazo' && (
                  <div className="triage-panel__grid">
                    <div>
                      <span>Título do prazo</span>
                      <input value={assistDraft.deadlineTitle} onChange={(event) => setAssistDraft((prev) => ({ ...prev, deadlineTitle: event.target.value }))} />
                    </div>
                    <div>
                      <span>Vencimento</span>
                      <input type="date" value={assistDraft.dueDate} onChange={(event) => setAssistDraft((prev) => ({ ...prev, dueDate: event.target.value }))} />
                    </div>
                    <div>
                      <span>Prioridade do prazo</span>
                      <select value={assistDraft.deadlinePriority} onChange={(event) => setAssistDraft((prev) => ({ ...prev, deadlinePriority: event.target.value }))}>
                        <option value="baixa">Baixa</option>
                        <option value="media">Média</option>
                        <option value="alta">Alta</option>
                      </select>
                    </div>
                    <div>
                      <span>Tarefa derivada</span>
                      <input value={assistDraft.taskTitle} onChange={(event) => setAssistDraft((prev) => ({ ...prev, taskTitle: event.target.value }))} />
                    </div>
                    <div>
                      <span>Vencimento da tarefa</span>
                      <input type="date" value={assistDraft.taskDueDate} onChange={(event) => setAssistDraft((prev) => ({ ...prev, taskDueDate: event.target.value }))} />
                    </div>
                    <div>
                      <span>Responsável</span>
                      <input value={assistDraft.taskOwner} onChange={(event) => setAssistDraft((prev) => ({ ...prev, taskOwner: event.target.value }))} />
                    </div>
                  </div>
                )}

                {selected.suggestedAction === 'criar_tarefa' && (
                  <div className="triage-panel__grid">
                    <div>
                      <span>Título da tarefa</span>
                      <input value={assistDraft.taskTitle} onChange={(event) => setAssistDraft((prev) => ({ ...prev, taskTitle: event.target.value }))} />
                    </div>
                    <div>
                      <span>Vencimento</span>
                      <input type="date" value={assistDraft.taskDueDate} onChange={(event) => setAssistDraft((prev) => ({ ...prev, taskDueDate: event.target.value }))} />
                    </div>
                    <div>
                      <span>Prioridade</span>
                      <select value={assistDraft.taskPriority} onChange={(event) => setAssistDraft((prev) => ({ ...prev, taskPriority: event.target.value }))}>
                        <option value="baixa">Baixa</option>
                        <option value="media">Média</option>
                        <option value="alta">Alta</option>
                        <option value="critica">Crítica</option>
                      </select>
                    </div>
                    <div>
                      <span>Responsável</span>
                      <input value={assistDraft.taskOwner} onChange={(event) => setAssistDraft((prev) => ({ ...prev, taskOwner: event.target.value }))} />
                    </div>
                  </div>
                )}

                {(selected.suggestedAction === 'criar_oportunidade' || selected.suggestedAction === 'criar_lead') && (
                  <div className="triage-panel__grid">
                    <div>
                      <span>Contato</span>
                      <input value={assistDraft.crmPersonName} onChange={(event) => setAssistDraft((prev) => ({ ...prev, crmPersonName: event.target.value }))} />
                    </div>
                    <div>
                      <span>Resumo para CRM</span>
                      <textarea rows={3} value={assistDraft.crmSummary} onChange={(event) => setAssistDraft((prev) => ({ ...prev, crmSummary: event.target.value }))} />
                    </div>
                  </div>
                )}

                {selected.suggestedAction !== 'criar_oportunidade' && selected.suggestedAction !== 'criar_lead' && (
                  <textarea
                    rows={3}
                    placeholder="Descrição operacional que acompanhará a ação."
                    value={assistDraft.taskDescription}
                    onChange={(event) => setAssistDraft((prev) => ({ ...prev, taskDescription: event.target.value }))}
                  />
                )}
              </section>

              <div className="triage-drawer__actions">
                <button className="btn-primary" onClick={() => void decide(selected, 'confirmado')}>
                  <CheckCircle2 size={16} />
                  Confirmar ação
                </button>
                <button className="btn-secondary" onClick={() => void decide(selected, 'revisao_manual')}>
                  <UserRoundSearch size={16} />
                  Revisão manual
                </button>
                <button className="btn-secondary" onClick={() => void decide(selected, 'adiado')}>
                  <Clock3 size={16} />
                  Adiar
                </button>
                <button className="btn-danger" onClick={() => void decide(selected, 'descartado')}>
                  <X size={16} />
                  Descartar
                </button>
              </div>

              <div className="triage-drawer__links">
                {(selected.processId || selected.client) ? (
                  <button type="button" onClick={() => openRelatedPublication(selected)}>
                    <ExternalLink size={14} />
                    Ver publicação
                  </button>
                ) : null}
                {selected.processId ? (
                  <a href={`/processos/${selected.processId}`}>
                    <ExternalLink size={14} />
                    Abrir processo
                  </a>
                ) : null}
                {selected.crmOpportunityId || selected.crmLeadId ? (
                  <button type="button" onClick={() => trackEvent('triage_open_crm_stub', { id: selected.id })}>
                    <Briefcase size={14} />
                    Ver CRM
                  </button>
                ) : null}
              </div>
            </>
          )}
        </aside>
      </section>
    </div>
  );
}
