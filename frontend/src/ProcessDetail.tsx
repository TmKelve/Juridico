import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileText,
  Flag,
  FolderOpen,
  Handshake,
  Landmark,
  MoreHorizontal,
  PlusCircle,
  RefreshCw,
  Scale,
  Send,
  UserRound,
  X,
  type LucideIcon,
} from 'lucide-react';
import { api } from './api';
import { captureException, trackEvent, trackPageView } from './monitoring';
import { EmptyState } from './dashboard/widgets/EmptyState';
import { SectionCard } from './dashboard/widgets/SectionCard';
import { ActionModal, type ActionModalType } from './ActionModal';
import './ProcessDetail.css';

interface ProcessDetailProps {
  user: { id: number; email: string; role: string };
}

interface ProcessData {
  id: number;
  title: string;
  client: string;
  phase: string;
  status: string;
  ownerId: number;
  owner?: { id: number; email: string; role: string };
}

type DetailTab =
  | 'visao_geral'
  | 'andamentos'
  | 'prazos'
  | 'audiencias'
  | 'documentos'
  | 'tarefas'
  | 'publicacoes'
  | 'atendimento'
  | 'comentarios';

type EventType =
  | 'cadastro'
  | 'andamento'
  | 'fase'
  | 'prazo'
  | 'documento'
  | 'publicacao'
  | 'atendimento'
  | 'tarefa'
  | 'comentario';

interface TimelineEvent {
  id: string;
  type: EventType;
  title: string;
  description: string;
  date: string;
  actor: string;
  pending?: boolean;
}

interface RightRailItem {
  id: string;
  title: string;
  meta: string;
  kind: 'prazo' | 'tarefa' | 'documento' | 'publicacao' | 'interacao' | 'alerta';
}

interface QuickFact {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: 'default' | 'warning' | 'danger' | 'success';
}

const TAB_LABELS: Array<{ key: DetailTab; label: string }> = [
  { key: 'visao_geral', label: 'Visao Geral' },
  { key: 'andamentos', label: 'Andamentos' },
  { key: 'prazos', label: 'Prazos' },
  { key: 'audiencias', label: 'Audiencias' },
  { key: 'documentos', label: 'Documentos' },
  { key: 'tarefas', label: 'Tarefas' },
  { key: 'publicacoes', label: 'Publicacoes' },
  { key: 'atendimento', label: 'Atendimento' },
  { key: 'comentarios', label: 'Comentarios Internos' },
];

function formatDate(date: Date) {
  return date.toLocaleDateString('pt-BR');
}

function iso(date: Date) {
  return date.toISOString();
}

function labelOfEvent(type: EventType) {
  const labels: Record<EventType, string> = {
    cadastro: 'Cadastro',
    andamento: 'Andamento',
    fase: 'Mudanca de fase',
    prazo: 'Prazo',
    documento: 'Documento',
    publicacao: 'Publicacao',
    atendimento: 'Atendimento',
    tarefa: 'Tarefa',
    comentario: 'Comentario interno',
  };

  return labels[type];
}

function iconOfEvent(type: EventType): LucideIcon {
  const icons: Record<EventType, LucideIcon> = {
    cadastro: FolderOpen,
    andamento: RefreshCw,
    fase: Flag,
    prazo: CalendarDays,
    documento: FileText,
    publicacao: FileCheck2,
    atendimento: Handshake,
    tarefa: CheckCircle2,
    comentario: MoreHorizontal,
  };

  return icons[type];
}

function iconOfRailItem(kind: RightRailItem['kind']): LucideIcon {
  const icons: Record<RightRailItem['kind'], LucideIcon> = {
    prazo: CalendarDays,
    tarefa: RefreshCw,
    documento: FileText,
    publicacao: FileCheck2,
    interacao: Handshake,
    alerta: AlertTriangle,
  };

  return icons[kind];
}

function sampleTimeline(process: ProcessData): TimelineEvent[] {
  const now = new Date();

  return [
    {
      id: `c-${process.id}`,
      type: 'cadastro',
      title: 'Processo cadastrado na plataforma',
      description: 'Cadastro inicial da ficha processual.',
      date: iso(new Date(now.getTime() - 1000 * 60 * 60 * 24 * 60)),
      actor: 'Sistema',
    },
    {
      id: `a-${process.id}`,
      type: 'andamento',
      title: 'Andamento registrado',
      description: 'Peticao de informacoes complementares protocolada.',
      date: iso(new Date(now.getTime() - 1000 * 60 * 60 * 24 * 6)),
      actor: process.owner?.email || 'Equipe',
    },
    {
      id: `f-${process.id}`,
      type: 'fase',
      title: `Fase atualizada para ${process.phase}`,
      description: 'Eixo processual atualizado para refletir o momento da causa.',
      date: iso(new Date(now.getTime() - 1000 * 60 * 60 * 24 * 4)),
      actor: process.owner?.email || 'Equipe',
    },
    {
      id: `p-${process.id}`,
      type: 'prazo',
      title: 'Prazo critico em 48 horas',
      description: 'Manifestacao final requerida no tribunal competente.',
      date: iso(new Date(now.getTime() + 1000 * 60 * 60 * 24 * 2)),
      actor: 'Sistema',
      pending: true,
    },
    {
      id: `d-${process.id}`,
      type: 'documento',
      title: 'Documento pendente de anexacao',
      description: 'Comprovante de pagamento de custas judiciais.',
      date: iso(new Date(now.getTime() - 1000 * 60 * 60 * 24 * 2)),
      actor: 'Equipe de apoio',
      pending: true,
    },
    {
      id: `pub-${process.id}`,
      type: 'publicacao',
      title: 'Publicacao vinculada ao processo',
      description: 'Diario oficial trouxe intimacao com exigencia de resposta.',
      date: iso(new Date(now.getTime() - 1000 * 60 * 60 * 20)),
      actor: 'Monitor de publicacoes',
      pending: true,
    },
    {
      id: `at-${process.id}`,
      type: 'atendimento',
      title: 'Atendimento com cliente registrado',
      description: 'Alinhamento de estrategia e envio de checklist documental.',
      date: iso(new Date(now.getTime() - 1000 * 60 * 60 * 10)),
      actor: process.owner?.email || 'Equipe',
    },
    {
      id: `t-${process.id}`,
      type: 'tarefa',
      title: 'Tarefa aberta para estagiario',
      description: 'Consolidar anexos e validar metadados da juntada.',
      date: iso(new Date(now.getTime() - 1000 * 60 * 60 * 6)),
      actor: process.owner?.email || 'Equipe',
      pending: true,
    },
    {
      id: `com-${process.id}`,
      type: 'comentario',
      title: 'Comentario interno adicionado',
      description: 'Ajustar tese subsidiaria em caso de indeferimento parcial.',
      date: iso(new Date(now.getTime() - 1000 * 60 * 45)),
      actor: process.owner?.email || 'Equipe',
    },
  ];
}

function sampleRightRail(process: ProcessData): {
  prazos: RightRailItem[];
  tarefas: RightRailItem[];
  docs: RightRailItem[];
  pubs: RightRailItem[];
  interacoes: RightRailItem[];
  alertas: RightRailItem[];
} {
  return {
    prazos: [
      { id: `r-p1-${process.id}`, title: 'Manifestacao final', meta: 'vence em 2 dias', kind: 'prazo' },
      { id: `r-p2-${process.id}`, title: 'Revisao de anexos', meta: 'vence hoje', kind: 'prazo' },
    ],
    tarefas: [
      { id: `r-t1-${process.id}`, title: 'Conferir provas documentais', meta: 'em andamento', kind: 'tarefa' },
      { id: `r-t2-${process.id}`, title: 'Atualizar cliente por e-mail', meta: 'pendente', kind: 'tarefa' },
    ],
    docs: [
      { id: `r-d1-${process.id}`, title: 'Comprovante de custas', meta: 'pendente de envio', kind: 'documento' },
    ],
    pubs: [
      { id: `r-pub1-${process.id}`, title: 'Intimacao publicada', meta: 'hoje 08:42', kind: 'publicacao' },
    ],
    interacoes: [
      { id: `r-i1-${process.id}`, title: 'Contato telefonico com cliente', meta: 'ontem 17:10', kind: 'interacao' },
    ],
    alertas: [
      { id: `r-a1-${process.id}`, title: 'Prazo critico sem peticao final', meta: 'acao requerida', kind: 'alerta' },
    ],
  };
}

export function ProcessDetail({ user }: ProcessDetailProps) {
  const navigate = useNavigate();
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processData, setProcessData] = useState<ProcessData | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>('visao_geral');
  const [selectedContextItem, setSelectedContextItem] = useState<TimelineEvent | RightRailItem | null>(null);
  const [openModal, setOpenModal] = useState<ActionModalType | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  const processId = Number(id);

  const timeline = useMemo(() => (processData ? sampleTimeline(processData) : []), [processData]);
  const rightRail = useMemo(() => (processData ? sampleRightRail(processData) : null), [processData]);

  const quickFacts = useMemo<QuickFact[]>(() => {
    if (!processData) return [];

    return [
      { label: 'Fase atual', value: processData.phase, icon: Flag },
      { label: 'Proximo prazo', value: formatDate(new Date(Date.now() + 1000 * 60 * 60 * 24 * 2)), icon: CalendarDays, tone: 'warning' },
      { label: 'Proxima audiencia', value: formatDate(new Date(Date.now() + 1000 * 60 * 60 * 24 * 7)), icon: CalendarClock },
      { label: 'Documentos pendentes', value: '1', icon: FileText, tone: 'danger' },
      { label: 'Status operacional', value: processData.status === 'ativo' ? 'Em acompanhamento' : processData.status, icon: CheckCircle2, tone: 'success' },
    ];
  }, [processData]);

  useEffect(() => {
    trackPageView('process_detail', { role: user.role, processId: String(id || '') });

    if (!processId || Number.isNaN(processId)) {
      setError('Processo invalido.');
      setLoading(false);
      return;
    }

    loadProcess(processId);
  }, [id, processId, user.role]);

  async function loadProcess(nextId: number) {
    setLoading(true);
    setError('');

    try {
      const res = await api.getProcess(nextId);
      if (res.status === 200) {
        setProcessData(res.data as ProcessData);
        trackEvent('process_detail_loaded', { processId: nextId });
      } else if (res.status === 404) {
        setProcessData(null);
      } else {
        setError(res.error || 'Nao foi possivel carregar o processo.');
      }
    } catch (err) {
      setError((err as Error).message);
      captureException(err as Error, { context: 'loadProcess', processId: nextId });
    } finally {
      setLoading(false);
    }
  }

  const tabItems = useMemo(() => {
    const byType = (type: EventType) => timeline.filter((event) => event.type === type);

    return {
      andamentos: byType('andamento'),
      prazos: byType('prazo'),
      audiencias: timeline.filter((event) => event.title.toLowerCase().includes('audiencia')),
      documentos: byType('documento'),
      tarefas: byType('tarefa'),
      publicacoes: byType('publicacao'),
      atendimento: byType('atendimento'),
      comentarios: byType('comentario'),
    };
  }, [timeline]);

  function currentTabList() {
    if (activeTab === 'visao_geral') return timeline;
    if (activeTab === 'andamentos') return tabItems.andamentos;
    if (activeTab === 'prazos') return tabItems.prazos;
    if (activeTab === 'audiencias') return tabItems.audiencias;
    if (activeTab === 'documentos') return tabItems.documentos;
    if (activeTab === 'tarefas') return tabItems.tarefas;
    if (activeTab === 'publicacoes') return tabItems.publicacoes;
    if (activeTab === 'atendimento') return tabItems.atendimento;
    return tabItems.comentarios;
  }

  if (loading) {
    return (
      <div className="process-detail-loading" role="status">
        <RefreshCw size={18} className="spin" aria-hidden="true" />
        <p>Carregando detalhe do processo...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="process-detail-error" role="alert">
        <AlertTriangle size={16} aria-hidden="true" />
        <p>{error}</p>
        <button className="btn-secondary" onClick={() => loadProcess(processId)}>
          <RefreshCw size={15} aria-hidden="true" />
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!processData) {
    return (
      <SectionCard title="Processo nao encontrado" meta="Detalhe do Processo">
        <EmptyState
          icon={FileText}
          title="Nao encontramos este processo"
          description="Verifique o numero informado ou retorne para a lista de processos."
          action={<button className="btn-secondary" onClick={() => navigate('/processos')}>Voltar para Meus Processos</button>}
        />
      </SectionCard>
    );
  }

  const tabList = currentTabList();

  function handleModalSuccess(message: string) {
    setOpenModal(null);
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(""), 4000);
    loadProcess(processId);
  }

  return (
    <section className="process-detail-page" aria-label="Detalhe do Processo">
      {successMessage && (
        <div className="process-toast" role="status">
          <CheckCircle2 size={16} aria-hidden="true" />
          {successMessage}
        </div>
      )}

      <header className="process-head-card">
        <div className="process-head-main">
          <div className="process-head-title-row">
            <div className="process-head-icon" aria-hidden="true">
              <FolderOpen size={26} />
            </div>
            <div>
              <p className="process-head-eyebrow">Operação jurídica</p>
              <h2>Processo #{processData.id}</h2>
              <p className="process-head-subtitle">{processData.title} · {processData.client}</p>
            </div>
          </div>

          <div className="process-head-meta">
            <span><Landmark size={15} aria-hidden="true" />Area juridica: Civel Empresarial</span>
            <span><Flag size={15} aria-hidden="true" />Fase atual: {processData.phase}</span>
            <span><Scale size={15} aria-hidden="true" />Tribunal/Vara: TRT 2 · 6ª Vara</span>
            <span><UserRound size={15} aria-hidden="true" />Responsavel principal: {processData.owner?.email || user.email}</span>
          </div>

          <div className="process-head-tags">
            <span className="process-tag priority-alta"><Flag size={12} aria-hidden="true" /> Prioridade alta</span>
            <span className="process-tag risk"><AlertTriangle size={12} aria-hidden="true" /> Risco de prazo</span>
            <span className="process-tag pendencia"><Clock3 size={12} aria-hidden="true" /> Documento pendente</span>
          </div>
        </div>

        <div className="process-head-actions">
          <button className="btn-primary" aria-label="Registrar andamento" onClick={() => setOpenModal('andamento')}><PlusCircle size={16} aria-hidden="true" />Registrar andamento</button>
          <button className="btn-secondary" aria-label="Criar prazo" onClick={() => setOpenModal('prazo')}><CalendarDays size={16} aria-hidden="true" />Criar prazo</button>
          <button className="btn-secondary" aria-label="Registrar documento" onClick={() => setOpenModal('documento')}><FileText size={16} aria-hidden="true" />Registrar documento</button>
          <button className="btn-secondary" aria-label="Registrar atendimento" onClick={() => setOpenModal('atendimento')}><Handshake size={16} aria-hidden="true" />Registrar atendimento</button>
          <button className="btn-secondary" aria-label="Mais ações">
            <MoreHorizontal size={15} aria-hidden="true" />
            Mais acoes
          </button>
        </div>
      </header>

      <section className="process-quick-facts" aria-label="Cards de visao rapida">
        {quickFacts.map((fact) => (
          <article key={fact.label} className={`quick-fact-card ${fact.tone || 'default'}`}>
            <span className="quick-fact-icon" aria-hidden="true">
              <fact.icon size={20} />
            </span>
            <div>
              <p>{fact.label}</p>
              <strong>{fact.value}</strong>
            </div>
          </article>
        ))}
      </section>

      <nav className="process-tabs" aria-label="Abas funcionais">
        {TAB_LABELS.map((tab) => (
          <button
            key={tab.key}
            className={`process-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
            aria-pressed={activeTab === tab.key}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <section className="process-main-grid" aria-label="Nucleo principal em tres colunas">
        <aside className="process-left-column">
          <SectionCard title="Resumo Estrutural" meta="Contexto do caso">
            <dl className="process-struct-list">
              <div><dt>Cliente</dt><dd>{processData.client}</dd></div>
              <div><dt>Partes</dt><dd>Autor · Reu · Terceiro interessado</dd></div>
              <div><dt>Classe processual</dt><dd>Acao de obrigacao de fazer</dd></div>
              <div><dt>Assunto</dt><dd>{processData.title}</dd></div>
              <div><dt>Valor da causa</dt><dd>R$ 180.000,00</dd></div>
              <div><dt>Tribunal</dt><dd>TRT 2 · 6ª Vara</dd></div>
              <div><dt>Responsaveis</dt><dd>{processData.owner?.email || user.email}, apoio juridico</dd></div>
            </dl>
          </SectionCard>
        </aside>

        <main className="process-center-column">
          <SectionCard title="Timeline Unificada" meta="Eixo central do caso">
            {tabList.length > 0 ? (
              <ul className="process-timeline">
                {tabList.map((event) => (
                  <li key={event.id}>
                    <button
                      className="timeline-item-btn"
                      onClick={() => setSelectedContextItem(event)}
                      aria-label={`Abrir detalhe de ${labelOfEvent(event.type)}: ${event.title}`}
                    >
                      <div className="timeline-icon" data-type={event.type} aria-hidden="true">
                        {(() => {
                          const Icon = iconOfEvent(event.type);
                          return <Icon size={20} />;
                        })()}
                      </div>
                      <div className="timeline-content">
                        <div className="timeline-head">
                          <span className="timeline-kind">{labelOfEvent(event.type)}</span>
                          <time dateTime={event.date}>{formatDate(new Date(event.date))}</time>
                        </div>
                        <p className="timeline-title">{event.title}</p>
                        <p className="timeline-desc">{event.description}</p>
                        <small>{event.actor}</small>
                      </div>
                      {event.pending && <span className="timeline-badge">Pendente</span>}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={CalendarClock}
                title="Sem eventos nesta aba"
                description="Nao ha registros para a selecao atual."
              />
            )}
          </SectionCard>
        </main>

        <aside className="process-right-column">
          <SectionCard title="Pendencias e Proximos Passos" meta="Acao imediata">
            <div className="right-rail-block">
              <h4>Proximos prazos</h4>
              <ul>
                {rightRail?.prazos.map((item) => (
                  <li key={item.id}>
                    <button onClick={() => setSelectedContextItem(item)}>
                      <span className="rail-item-icon" aria-hidden="true">{(() => { const Icon = iconOfRailItem(item.kind); return <Icon size={16} />; })()}</span>
                      <span>{item.title}<small>{item.meta}</small></span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="right-rail-block">
              <h4>Tarefas em aberto</h4>
              <ul>
                {rightRail?.tarefas.map((item) => (
                  <li key={item.id}>
                    <button onClick={() => setSelectedContextItem(item)}>
                      <span className="rail-item-icon" aria-hidden="true">{(() => { const Icon = iconOfRailItem(item.kind); return <Icon size={16} />; })()}</span>
                      <span>{item.title}<small>{item.meta}</small></span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="right-rail-block">
              <h4>Documentos faltantes</h4>
              <ul>
                {rightRail?.docs.map((item) => (
                  <li key={item.id}>
                    <button onClick={() => setSelectedContextItem(item)}>
                      <span className="rail-item-icon" aria-hidden="true">{(() => { const Icon = iconOfRailItem(item.kind); return <Icon size={16} />; })()}</span>
                      <span>{item.title}<small>{item.meta}</small></span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="right-rail-block">
              <h4>Publicacoes recentes</h4>
              <ul>
                {rightRail?.pubs.map((item) => (
                  <li key={item.id}>
                    <button onClick={() => setSelectedContextItem(item)}>
                      <span className="rail-item-icon" aria-hidden="true">{(() => { const Icon = iconOfRailItem(item.kind); return <Icon size={16} />; })()}</span>
                      <span>{item.title}<small>{item.meta}</small></span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="right-rail-block">
              <h4>Ultimas interacoes</h4>
              <ul>
                {rightRail?.interacoes.map((item) => (
                  <li key={item.id}>
                    <button onClick={() => setSelectedContextItem(item)}>
                      <span className="rail-item-icon" aria-hidden="true">{(() => { const Icon = iconOfRailItem(item.kind); return <Icon size={16} />; })()}</span>
                      <span>{item.title}<small>{item.meta}</small></span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="right-rail-block">
              <h4>Alertas</h4>
              <ul>
                {rightRail?.alertas.map((item) => (
                  <li key={item.id}>
                    <button onClick={() => setSelectedContextItem(item)}>
                      <span className="rail-item-icon" aria-hidden="true">{(() => { const Icon = iconOfRailItem(item.kind); return <Icon size={16} />; })()}</span>
                      <span>{item.title}<small>{item.meta}</small></span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </SectionCard>
        </aside>
      </section>

      {openModal && (
        <ActionModal
          type={openModal}
          processId={processId}
          onClose={() => setOpenModal(null)}
          onSuccess={handleModalSuccess}
        />
      )}

      {selectedContextItem && (
        <>
          <button className="drawer-backdrop" onClick={() => setSelectedContextItem(null)} aria-label="Fechar detalhe contextual" />
          <aside className="context-drawer" role="dialog" aria-modal="true" aria-labelledby="context-drawer-title">
            <header>
              <div>
                <small>Contexto</small>
                <h3 id="context-drawer-title">{'type' in selectedContextItem ? labelOfEvent(selectedContextItem.type) : selectedContextItem.kind}</h3>
              </div>
              <button className="icon-close" onClick={() => setSelectedContextItem(null)} aria-label="Fechar drawer">
                <X size={15} aria-hidden="true" />
              </button>
            </header>

            <div className="context-drawer-body">
              <p className="context-title">{selectedContextItem.title}</p>
              {'description' in selectedContextItem ? (
                <>
                  <p className="context-desc">{selectedContextItem.description}</p>
                  <p className="context-meta">{formatDate(new Date(selectedContextItem.date))} · {selectedContextItem.actor}</p>
                </>
              ) : (
                <p className="context-meta">{selectedContextItem.meta}</p>
              )}

              <div className="context-actions">
                <button className="btn-primary"><Send size={16} aria-hidden="true" />Abrir detalhe completo</button>
                <button className="btn-secondary">Registrar andamento</button>
                <button className="btn-secondary">Criar prazo</button>
                <button className="btn-secondary">Criar tarefa</button>
                <button className="btn-secondary">Anexar documento</button>
              </div>
            </div>
          </aside>
        </>
      )}
    </section>
  );
}
