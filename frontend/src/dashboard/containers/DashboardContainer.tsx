import { AlertCircle, BarChart2, CheckCircle2, Clock, DollarSign, Scale, Users } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContextFeed } from '../hooks/useContextFeed';
import { useDashboardHomeData } from '../hooks/useDashboardHomeData';
import { useKpiActions } from '../hooks/useKpiActions';
import { useOperationalFilters } from '../hooks/useOperationalFilters';
import type { ChartSeries, DashboardKpi, QueueFilter, ResponsibilityItem } from '../types';
import { AnalyticsContainer } from './AnalyticsContainer';
import { ContextRailContainer } from './ContextRailContainer';
import { OperationalQueueContainer } from './OperationalQueueContainer';
import { SupportLayerContainer } from './SupportLayerContainer';
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
    const clientesEmRetorno = new Set(items.filter((item) => item.type !== 'amanha').map((item) => item.client)).size;
    const financeiroDoDia = `R$ ${(items.length * 2800).toLocaleString('pt-BR')}`;
    const produtividadeEquipe = `${Math.max(62, 100 - aguardandoAcao * 5)}%`;

    return [
      { id: 'kpi-deadlines', title: 'Prazos Hoje', value: prazosHoje, microtext: 'Itens com vencimento no turno atual', icon: Clock, color: 'warning' },
      { id: 'kpi-tasks', title: 'Tarefas Pendentes', value: tarefasPendentes, microtext: 'Demandas aguardando execução', icon: CheckCircle2, color: 'info' },
      { id: 'kpi-awaiting', title: 'Processos Aguardando Ação', value: aguardandoAcao, microtext: 'Processos pausados ou bloqueados', icon: Scale, color: 'error' },
      { id: 'kpi-return', title: 'Clientes em Retorno', value: clientesEmRetorno, microtext: 'Clientes com retorno previsto hoje', icon: Users, color: 'primary' },
      ...(profile === 'ADM' || profile === 'FIN'
        ? [{ id: 'kpi-finance', title: 'Financeiro do Dia', value: financeiroDoDia, microtext: 'Receita prevista para o dia', icon: DollarSign, color: 'success' as const }]
        : []),
      ...(profile === 'ADM' || profile === 'ADV'
        ? [{
          id: 'kpi-productivity',
          title: profile === 'ADV' ? 'Produtividade Pessoal' : 'Produtividade Equipe',
          value: produtividadeEquipe,
          microtext: profile === 'ADV' ? 'Aproveitamento operacional da sua carteira' : 'Aproveitamento operacional da equipe',
          icon: BarChart2,
          color: 'success' as const,
        }]
        : []),
    ];
  }, [items, profile]);

  const hero = useMemo(() => {
    const overdueCount = items.filter((item) => item.type === 'atrasados').length;
    const todayCount = items.filter((item) => item.type === 'hoje').length;
    const pausedCount = items.filter((item) => item.status === 'pausado').length;
    const agendaToday = agenda.length;
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
      ADV: 'Priorize prazos, avance pendências e reduza gargalos da sua carteira.',
      ADM: 'Enxergue carga, bloqueios e urgências antes que virem atraso operacional.',
      FIN: 'Monitore execução, retornos e pontos que travam cobrança ou andamento.',
      ATD: 'Acompanhe retornos, agenda e fila de processos com ação pendente.',
    };

    return {
      title: titleByProfile[profile] || 'Home Operacional',
      subtitle: subtitleByProfile[profile] || 'Acompanhe a fila operacional e ataque o que exige ação primeiro.',
      dateLabel: longDate.charAt(0).toUpperCase() + longDate.slice(1),
      summary: `Você tem ${agendaToday} compromisso(s) no dia, ${todayCount} item(ns) para atuar hoje e ${overdueCount} atraso(s) exigindo correção.`,
      insights: [
        { text: `${todayCount} item(ns) exigem atuação hoje`, tone: todayCount > 0 ? 'warning' : 'neutral' },
        { text: `${overdueCount} atraso(s) pedem correção imediata`, tone: overdueCount > 0 ? 'error' : 'success' },
        { text: `${pausedCount} processo(s) estão sem avanço`, tone: pausedCount > 0 ? 'warning' : 'neutral' },
        { text: `${agendaToday} compromisso(s) no dia`, tone: 'info' },
      ],
    };
  }, [agenda.length, items, profile]);

  const phaseSeries = useMemo<ChartSeries[]>(() => {
    const phaseTotals = items.reduce((acc: Record<string, number>, item) => {
      acc[item.phase] = (acc[item.phase] || 0) + 1;
      return acc;
    }, {});

    const entries = Object.entries(phaseTotals).slice(0, 5) as Array<[string, number]>;
    const palette = ['#1d4ed8', '#2563eb', '#3b82f6', '#0891b2', '#0e7490'];
    const base: Array<[string, number]> = entries.length > 0 ? entries : [['Sem fase', 1]];
    return base.map((entry, index) => ({ label: entry[0], value: entry[1], color: palette[index % palette.length] }));
  }, [items]);

  const statusSeries = useMemo<ChartSeries[]>(() => {
    return [
      { label: 'Pendentes', value: items.filter((item) => item.status === 'pausado').length, color: '#b45309' },
      { label: 'Em andamento', value: items.filter((item) => item.status === 'ativo').length, color: '#2563eb' },
      { label: 'Concluídas', value: items.filter((item) => item.status === 'concluido').length, color: '#0f766e' },
    ];
  }, [items]);

  const handleQueueFilter = (filter: QueueFilter) => {
    setQueueFilter(filter);
    setLiveFeedback(`Filtro de fila aplicado: ${filter}.`);
  };

  const handlePhaseToggle = (phase: string) => {
    const next = selectedPhase === phase ? null : phase;
    setSelectedPhase(next);
    setLiveFeedback(next ? `Filtro por fase aplicado: ${next}.` : 'Filtro por fase removido.');
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
      if (event.key === 'Escape') {
        closeItemDrawer();
      }
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
          <section className="dashboard-hero" aria-label="Resumo do dia">
            <div className="dashboard-hero-copy">
              <div className="dashboard-hero-eyebrow">Painel de responsabilidades</div>
              <div className="dashboard-hero-date">{hero.dateLabel}</div>
              <p>{hero.subtitle}</p>
              <p className="dashboard-hero-summary">{hero.summary}</p>
            </div>

            <div className="dashboard-hero-insights" aria-label="Insights do dia">
              {hero.insights.map((insight) => (
                <span key={insight.text} className={`dashboard-hero-chip dashboard-hero-chip--${insight.tone}`}>{insight.text}</span>
              ))}
            </div>
          </section>
        )}
        kpi={<KpiStrip kpis={kpis} onKpiClick={onKpiClick} />}
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
        analytics={(
          <AnalyticsContainer
            phaseSeries={phaseSeries}
            statusSeries={statusSeries}
            selectedPhase={selectedPhase}
            onTogglePhase={handlePhaseToggle}
          />
        )}
        support={<SupportLayerContainer items={items} />}
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
                  <p>{selectedItem.status}</p>
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
