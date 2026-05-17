import type { QueueFilter, ResponsibilityItem } from '../types';
import { SectionCard } from '../widgets/SectionCard';
import { ResponsibilityQueueTable } from '../widgets/ResponsibilityQueueTable';

interface OperationalQueueContainerProps {
  items: ResponsibilityItem[];
  selectedItemId?: number | string;
  queueFilter: QueueFilter;
  selectedPhase: string | null;
  onQueueFilterChange: (filter: QueueFilter) => void;
  onItemOpen: (item: ResponsibilityItem) => void;
}

export function OperationalQueueContainer(props: OperationalQueueContainerProps) {
  return (
    <SectionCard
      title="Prioridades do Dia"
      meta={`${props.items.length} itens ativos`}
      className="operational-section-card"
    >
      <ResponsibilityQueueTable {...props} />
    </SectionCard>
  );
}
