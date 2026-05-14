import { AlertTriangle } from 'lucide-react';
import type { AlertItem } from '../types';
import { SectionCard } from './SectionCard';
import { EmptyState } from './EmptyState';

interface CriticalAlertsWidgetProps {
  items: AlertItem[];
}

export function CriticalAlertsWidget({ items }: CriticalAlertsWidgetProps) {
  return (
    <SectionCard title="Alertas Críticos">
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
        <EmptyState icon={AlertTriangle} title="Nenhum alerta crítico" />
      )}
    </SectionCard>
  );
}
