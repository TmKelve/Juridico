import type { ChartSeries } from '../types';
import { SectionCard } from './SectionCard';

interface CasesByPhaseChartProps {
  series: ChartSeries[];
  selectedPhase: string | null;
  onTogglePhase: (phase: string) => void;
}

export function CasesByPhaseChart({ series, selectedPhase, onTogglePhase }: CasesByPhaseChartProps) {
  const total = series.reduce((sum, item) => sum + item.value, 0);

  const donutStops = series.reduce<{ stops: string[]; cumulativePercent: number }>((acc, segment) => {
    const ratio = total > 0 ? segment.value / total : 1 / Math.max(1, series.length);
    const start = acc.cumulativePercent;
    const nextPercent = acc.cumulativePercent + ratio * 100;
    return {
      stops: [...acc.stops, `${segment.color} ${start}% ${nextPercent}%`],
      cumulativePercent: nextPercent,
    };
  }, { stops: [], cumulativePercent: 0 }).stops;

  return (
    <SectionCard title="Processos por Fase" meta="Leitura executiva" className="chart-card">
      <div className="analytics-donut-layout">
        <div className="donut-chart" style={{ background: `conic-gradient(${donutStops.join(', ')})` }} aria-label="Distribuição de processos por fase">
          <div className="donut-hole">{total}</div>
        </div>
        <ul className="donut-legend">
          {series.map((segment) => (
            <li key={segment.label}>
              <button
                className={`legend-filter-btn ${selectedPhase === segment.label ? 'active' : ''}`}
                onClick={() => onTogglePhase(segment.label)}
                aria-pressed={selectedPhase === segment.label}
              >
                <span className="legend-dot" style={{ background: segment.color }} aria-hidden="true" />
                <span>{segment.label}</span>
                <strong>{segment.value}</strong>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </SectionCard>
  );
}
