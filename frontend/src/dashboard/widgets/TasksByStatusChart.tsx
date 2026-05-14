import type { ChartSeries } from '../types';
import { SectionCard } from './SectionCard';

interface TasksByStatusChartProps {
  series: ChartSeries[];
}

export function TasksByStatusChart({ series }: TasksByStatusChartProps) {
  const maxValue = Math.max(1, ...series.map((item) => item.value));

  return (
    <SectionCard title="Tarefas por Status" meta="Distribuição operacional" className="chart-card">
      <div className="status-bars">
        {series.map((item) => (
          <div key={item.label} className="status-bar-row">
            <div className="status-bar-head">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
            <div className="status-bar-track" role="presentation">
              <span className="status-bar-fill" style={{ width: `${(item.value / maxValue) * 100}%`, background: item.color }} />
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
