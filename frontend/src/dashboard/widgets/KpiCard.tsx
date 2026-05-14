import type { DashboardKpi } from '../types';

interface KpiCardProps {
  kpi: DashboardKpi;
  onClick: () => void;
}

export function KpiCard({ kpi, onClick }: KpiCardProps) {
  return (
    <button
      type="button"
      className="metric-card"
      data-kpi-color={kpi.color}
      onClick={onClick}
      aria-label={`${kpi.title}: ${kpi.value}`}
    >
      <div className="metric-top-row">
        <p className="metric-value">{kpi.value}</p>
        <div className="metric-icon" aria-hidden="true">
          <kpi.icon size={16} />
        </div>
      </div>
      <p className="metric-label">{kpi.title}</p>
      <p className="metric-microtext">{kpi.microtext}</p>
    </button>
  );
}
