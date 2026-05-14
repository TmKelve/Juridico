import type { ChartSeries } from '../types';
import { CasesByPhaseChart } from '../widgets/CasesByPhaseChart';
import { TasksByStatusChart } from '../widgets/TasksByStatusChart';

interface AnalyticsContainerProps {
  phaseSeries: ChartSeries[];
  statusSeries: ChartSeries[];
  selectedPhase: string | null;
  onTogglePhase: (phase: string) => void;
}

export function AnalyticsContainer({ phaseSeries, statusSeries, selectedPhase, onTogglePhase }: AnalyticsContainerProps) {
  return (
    <section className="dashboard-panels analytics-layer" aria-label="Camada analítica">
      <CasesByPhaseChart series={phaseSeries} selectedPhase={selectedPhase} onTogglePhase={onTogglePhase} />
      <TasksByStatusChart series={statusSeries} />
    </section>
  );
}
