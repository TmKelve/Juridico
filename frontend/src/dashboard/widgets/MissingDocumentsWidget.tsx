import { FileText } from 'lucide-react';
import type { ResponsibilityItem } from '../types';
import { SectionCard } from './SectionCard';
import { RailWidgetItem } from './RailWidgetItem';
import { EmptyState } from './EmptyState';

interface MissingDocumentsWidgetProps {
  items: ResponsibilityItem[];
}

export function MissingDocumentsWidget({ items }: MissingDocumentsWidgetProps) {
  const missing = items.slice(0, 3);

  return (
    <SectionCard title="Documentos Faltantes">
      {missing.length > 0 ? (
        <ul className="rail-widget-list">
          {missing.map((item) => (
            <RailWidgetItem
              key={item.id}
              title={`#${item.id} • ${item.title}`}
              meta={item.pendingSummary}
              accent="warning"
            />
          ))}
        </ul>
      ) : (
        <EmptyState icon={FileText} title="Nenhum documento pendente" />
      )}
    </SectionCard>
  );
}
