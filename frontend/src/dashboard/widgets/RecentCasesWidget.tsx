import { Scale } from 'lucide-react';
import type { ResponsibilityItem } from '../types';
import { SectionCard } from './SectionCard';
import { RailWidgetItem } from './RailWidgetItem';
import { EmptyState } from './EmptyState';

interface RecentCasesWidgetProps {
  items: ResponsibilityItem[];
}

export function RecentCasesWidget({ items }: RecentCasesWidgetProps) {
  const recent = items.slice(0, 3);

  return (
    <SectionCard title="Processos Recentes">
      {recent.length > 0 ? (
        <ul className="rail-widget-list">
          {recent.map((item) => (
            <RailWidgetItem
              key={item.id}
              title={`#${item.id} • ${item.title}`}
              meta={`${item.client} • ${item.phase}`}
            />
          ))}
        </ul>
      ) : (
        <EmptyState icon={Scale} title="Nenhum processo recente" />
      )}
    </SectionCard>
  );
}
