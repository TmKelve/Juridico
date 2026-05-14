import type { DashboardKpi } from '../types';
import { KpiCard } from './KpiCard';

interface KpiStripProps {
  kpis: DashboardKpi[];
  onKpiClick: (kpiId: string) => void;
}

export function KpiStrip({ kpis, onKpiClick }: KpiStripProps) {
  return (
    <section className="kpi-grid" aria-label="Indicadores principais">
      {kpis.map((kpi) => (
        <KpiCard
          key={kpi.id}
          kpi={kpi}
          onClick={() => onKpiClick(kpi.id)}
        />
      ))}
    </section>
  );
}
