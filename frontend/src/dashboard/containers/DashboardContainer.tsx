import { AlertCircle, AlertTriangle, BarChart2, CalendarDays, CheckCircle2, Clock, DollarSign, Scale, Target, Users } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContextFeed } from '../hooks/useContextFeed';
import { useDashboardHomeData } from '../hooks/useDashboardHomeData';
import { useKpiActions } from '../hooks/useKpiActions';
import { useOperationalFilters } from '../hooks/useOperationalFilters';
import type { DashboardKpi, QueueFilter, ResponsibilityItem } from '../types';
import { ContextRailContainer } from './ContextRailContainer';
import { OperationalQueueContainer } from './OperationalQueueContainer';
import { KpiStrip } from '../widgets/KpiStrip';
import { DashboardShell } from '../layout/DashboardShell';

interface DashboardContainerProps {
  user: { id: number; email: string; role: string };
}

export function DashboardContainer({ user }: DashboardContainerProps) {
  const navigate = useNavigate();
  const { profile, items, loading, error } = useDashboardHomeData(user.role, user.id, user.email);
  const { agenda, movements, alerts } = useContextFeed(items);
  const { onKpiClick, onShortcutClick, onQueueOpen } = useKpiActions();
  const { queueFilter, setQueueFilter, selectedPhase, setSelectedPhase, filteredItems } = useOperationalFilters(items);

  const [selectedItem, setSelectedItem] = useState<ResponsibilityItem | null>(null);
  const [liveFeedback, setLiveFeedback] = useState('');
  const closeDrawerRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const kpis = useMemo<DashboardKpi[]>(() => {
    const prazosHoje = items.filter((item) => item.type === 'hoje').length;
    const tarefasPendentes = items.filter((item) => item.status !== 'concluido').length;
    const aguardandoAcao = items.filter((item) => item.status === 'pausado').length;
    const clientesRetorno = items.filter((item) => item.type === 'hoje').length + 1;
    const financeiroDia = items.length * 2800;
    const produtividade = Math.max(62, Math.min(98, 80 + items.filter((i) => i.status === 'concluido').length * 3));

    return [
      {
        id: 'kpi-deadlines',
        title: 'Prazos Hoje',
        value: prazosHoje,
        microtext: 'Itens com vencimento no turno atual',
        icon: Clock,
        color: 'warning',
      },
      {
        id: 'kpi-tasks',
        title: 'Tarefas Pendentes',
        value: tarefasPendentes,
        microtext: 'Demandas aguardando execução',
        icon: CheckCircle2,
        color: 'info',
      },
      {
        id: 'kpi-awaiting',
        title: 'Processos Aguardando Ação',
        value: aguardandoAcao,
        microtext: 'Processos pausados ou bloqueados',
        icon: Scale,
        color: 'error',
      },
      {
        id: 'kpi-clients',
        title: 'Clientes em Retorno',
        value: clientesRetorno,
        microtext: 'Clientes com retorno previsto hoje',
        icon: Users,
        color: 'primary',
      },
      {
        id: 'kpi-financial',
        title: 'Financeiro do Dia',
        value: `R$ ${financeiroDia.toLocaleString('pt-BR')}`,
        microtext: 'Receita prevista para o dia',
        icon: DollarSign,
        color: 'success',
      },
      {
        id: 'kpi-productivity',
        title: 'Produtividade da Equipe',
        value: `${produtividade}%`,
        microtext: 'Aproveitamento operacional da equipe',
        icon: BarChart2,
        color: 'info',
      },
    ];
  }, [items]);

  const hero = useMemo(() => {
    const overdueCount = items.filter((item) => item.type === 'atrasados').length;
    const todayCount = items.filter((item) => item.type === 'hoje').length;
    const agendaToday = agenda.length;
    const withoutMovement = items.filter((i) => i.status !== 'ativo' && i.status !== 'concluido').length;

    const now = new Date();
    const longDate = new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(now);

    const titleByProfile: Record<string, string> = {
      ADV: 'Meu Dia',
      ADM: 'Visão do Escritório',
      FIN: 'Operação Financeira',
      ATD: 'Atendimento do Dia',
    };

    const subtitleByProfile: Record<string, string> = {
      ADV: 'Priorize prazos críticos, avance tarefas-chave e monitore gargalos da operação.',
      ADM: 'Acompanhe a performance do escritório, urgências e alocação da equipe.',
      FIN: 'Monitore receitas, cobranças pendentes e saúde financeira do dia.',
      ATD: 'Gerencie atendimentos, retornos e pendências do dia com clientes.',
    };

    return {
      title: titleByProfile[profile] || 'Home Operacional',
      subtitle: subtitleByProfile[profile] || 'Acompanhe suas responsabilidades operacionais do dia.',
      dateLabel: longDate.charAt(0).toUpperCase() + longDate.slice(1),
      summary: `Você tem ${agendaToday} compromisso(s) no dia, ${todayCount} item(ns) para atuar hoje e ${overdueCount} atraso(s) exigindo correção.`,
      insights: [
        {
          label: `${todayCount} item(ns) exigem atuação hoje`,
          tone: todayCount > 0 ? 'warning' : 'info',
          icon: Clock,
        },
        {
          label: `${overdueCount} atraso(s) pedem correção imediata`,
          tone: overdueCount > 0 ? 'error' : 'info',
          icon: AlertTriangle,
        },
        {
          label: `${withoutMovement} processo(s) estão sem avanço`,
          tone: withoutMovement > 0 ? 'info' : 'success',
          icon: Scale,
        },
        {
          label: `${agendaToday} compromisso(s) no dia`,
          tone: 'info',
          icon: CalendarDays,
        },
      ],
    };
  }, [agenda.length, items, profile]);

  const nextBestAction = useMemo(() => {
    const overdueItem = items.find((item) => item.type === 'atrasados');
    if (overdueItem) {
      const overdueCount = items.filter((i) => i.type === 'atrasados').length;
      return {
        title: `Resolver atraso: ${overdueItem.client}`,
        description: `${overdueCount === 1 ? '1 item vencido exige' : `${overdueCount} itens vencidos exigem`} correção imediata. Priorize a validação e destrave o processo antes das demais tarefas.`,
        cta: 'Abrir prioridade',
        secondary: 'Ver fila completa',
        tone: 'warning' as const,
        item: overdueItem,
      };
    }
    const todayItem = items.find((item) => item.type === 'hoje');
    if (todayItem) {
      const todayCount = items.filter((i) => i.type === 'hoje').length;
      return {
        title: `Avançar: ${todayItem.title}`,
        description: `${todayCount === 1 ? '1 item aguarda' : `${todayCount} itens aguardam`} execução hoje. Priorize a manifestação pendente e mantenha a cadência da carteira.`,
        cta: 'Abrir prioridade',
        secondary: 'Ver fila completa',
        tone: 'info' as const,
        item: todayItem,
      };
    }
    return null;
  }, [items]);

  const handleQueueFilter = (filter: QueueFilter) => {
    setQueueFilter(filter);
    setLiveFeedback(`Filtro de fila aplicado: ${filter}.`);
  };

  const handleOpenItem = (item: ResponsibilityItem) => {
    previousFocusRef.current = document.activeElement as HTMLElement;
    onQueueOpen(item.id);
    setSelectedItem(item);
    setLiveFeedback(`Detalhes rápidos abertos para o processo ${item.id}.`);
  };

  const closeItemDrawer = () => {
    setSelectedItem(null);
    setLiveFeedback('Painel lateral fechado.');
    previousFocusRef.current?.focus();
  };

  useEffect(() => {
    if (!selectedItem) return;
    closeDrawerRef.current?.focus();

    const onEscapeClose = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeItemDrawer();
    };

    window.addEventListener('keydown', onEscapeClose);
    return () => window.removeEventListener('keydown', onEscapeClose);
  }, [selectedItem]);

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="sr-only" aria-live="polite">{liveFeedback}</div>

      {error && (
        <div className="error-alert" role="alert">
          <AlertCircle size={16} aria-hidden="true" />
          {error}
        </div>
      )}

      <DashboardShell
        header={(
          <header className="dashboard-hero" aria-label="Cabeçalho do dia">
            <div className="dashboard-hero-copy">
              <p className="dashboard-hero-eyebrow">DASHBOARD</p>
              <h2>{hero.title}</h2>
              <p>{hero.subtitle}</p>
              <div className="dashboard-hero-date-badge">
                <CalendarDays size={14} aria-hidden="true" />
                {hero.dateLabel}
              </div>
            </div>
          </header>
        )}
        responsibility={(
          <section className="responsibility-panel" aria-label="Painel de responsabilidades">
            <div className="responsibility-panel__copy">
              <div className="responsibility-panel__eyebrow">
                <Scale size={14} aria-hidden="true" />
                Painel de Responsabilidades
              </div>
              <p>Entregue carga, bloqueios e urgências antes que virem atraso operacional.</p>
              <strong>{hero.summary}</strong>
            </div>
            <div className="responsibility-panel__insights" aria-label="Insights operacionais">
              {hero.insights.map((insight) => (
                <div key={insight.label} className={`responsibility-insight responsibility-insight--${insight.tone}`}>
                  <insight.icon size={16} aria-hidden="true" />
                  {insight.label}
                </div>
              ))}
            </div>
          </section>
        )}
        kpi={<KpiStrip kpis={kpis} onKpiClick={onKpiClick} />}
        nextAction={nextBestAction ? (
          <section className={`next-best-action next-best-action--${nextBestAction.tone}`} aria-label="Próxima melhor ação">
            <div className="next-best-action__icon-wrap">
              <AlertTriangle size={18} aria-hidden="true" />
            </div>
            <div className="next-best-action__content">
              <span className="next-best-action__eyebrow">Próxima melhor ação</span>
              <strong className="next-best-action__title">{nextBestAction.title}</strong>
              <p className="next-best-action__description">{nextBestAction.description}</p>
            </div>
            <div className="next-best-action__actions">
              <button className="btn-primary btn-compact" onClick={() => handleOpenItem(nextBestAction.item)}>
                <Target size={14} aria-hidden="true" />
                {nextBestAction.cta}
              </button>
              <button className="btn-ghost btn-compact" onClick={() => setQueueFilter('todos')}>
                {nextBestAction.secondary}
              </button>
            </div>
          </section>
        ) : null}
        operational={(
          <OperationalQueueContainer
            items={filteredItems}
            selectedItemId={selectedItem?.id}
            queueFilter={queueFilter}
            selectedPhase={selectedPhase}
            onQueueFilterChange={handleQueueFilter}
            onItemOpen={handleOpenItem}
          />
        )}
        context={<ContextRailContainer agenda={agenda} movements={movements} alerts={alerts} onShortcutClick={onShortcutClick} />}
      />

      {selectedItem && (
        <>
          <button className="drawer-backdrop" onClick={closeItemDrawer} aria-label="Fechar painel de detalhes" />
          <aside className="quick-drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
            <header className="quick-drawer-head">
              <div>
                <small>Detalhes rápidos</small>
                <h3 id="drawer-title">Processo #{selectedItem.id}</h3>
                <div className="quick-drawer-meta">
                  <span className="quick-drawer-chip">{selectedItem.phase}</span>
                  <span className={`sla-badge sla-${selectedItem.type === 'atrasados' ? 'urgent' : selectedItem.type === 'hoje' ? 'today' : 'ok'}`}>
                    {selectedItem.sla}
                  </span>
                </div>
              </div>
              <button ref={closeDrawerRef} className="btn-secondary" onClick={closeItemDrawer}>
                Fechar
              </button>
            </header>
            <div className="quick-drawer-body">
              <section className="quick-drawer-section">
                <small className="quick-drawer-label">Próxima ação</small>
                <p className="quick-drawer-primary-text">{selectedItem.pendingSummary}</p>
              </section>

              <section className="quick-drawer-grid">
                <div>
                  <small className="quick-drawer-label">Cliente</small>
                  <p>{selectedItem.client}</p>
                </div>
                <div>
                  <small className="quick-drawer-label">Responsável</small>
                  <p>{selectedItem.owner}</p>
                </div>
                <div>
                  <small className="quick-drawer-label">Status</small>
                  <p style={{ textTransform: 'capitalize' }}>{selectedItem.status}</p>
                </div>
                <div>
                  <small className="quick-drawer-label">Fila</small>
                  <p>{selectedItem.type === 'hoje' ? 'Atuação hoje' : selectedItem.type === 'atrasados' ? 'Atrasado' : 'Próximo período'}</p>
                </div>
              </section>

              <div className="quick-drawer-actions">
                <button className="btn-primary" onClick={() => navigate(`/processos/${selectedItem.id}`)}>Abrir processo completo</button>
                <button className="btn-ghost" onClick={() => navigate('/atendimentos')}>Registrar atendimento</button>
              </div>
            </div>
          </aside>
        </>
      )}
    </>
  );
}
