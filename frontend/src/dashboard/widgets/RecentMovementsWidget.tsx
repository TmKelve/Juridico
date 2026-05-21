import { NotebookText } from 'lucide-react';
import type { MovementItem } from '../types';
import { SectionCard } from './SectionCard';
import { RailWidgetItem } from './RailWidgetItem';
import { EmptyState } from './EmptyState';

interface RecentMovementsWidgetProps {
  items: MovementItem[];
}

export function RecentMovementsWidget({ items }: RecentMovementsWidgetProps) {
  return (
    <SectionCard title="Movimentações Recentes" meta={`${items.length} atualização(ões)`}>
      {items.length > 0 ? (
        <ul className="rail-widget-list">
          {items.map((item) => (
            <RailWidgetItem
              key={item.id}
              title={`#${item.id} • ${item.title}`}
              meta={item.detail}
            />
          ))}
        </ul>
      ) : (
        <EmptyState icon={NotebookText} title="Sem movimentações recentes" />
      )}
    </SectionCard>
  );
}
