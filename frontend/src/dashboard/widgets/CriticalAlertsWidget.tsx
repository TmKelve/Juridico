import { AlertTriangle } from 'lucide-react';
import type { AlertItem } from '../types';
import { SectionCard } from './SectionCard';
import { EmptyState } from '@/components/product/EmptyState';

interface CriticalAlertsWidgetProps {
  items: AlertItem[];
}

export function CriticalAlertsWidget({ items }: CriticalAlertsWidgetProps) {
  return (
    <SectionCard title="Alertas Críticos" meta={`${items.length} alerta(s)`}>
      {items.length > 0 ? (
        <ul className="rail-widget-list">
          {items.map((alert) => (
            <li key={alert.id} className={`rail-alert-item alert-${alert.type}`}>
              <AlertTriangle size={13} aria-hidden="true" />
              <span>{alert.text}</span>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={<AlertTriangle size={32} />} title="Nenhum alerta crítico" />
      )}
    </SectionCard>
  );
}
