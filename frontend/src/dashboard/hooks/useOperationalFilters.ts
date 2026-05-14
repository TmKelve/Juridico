import { useMemo, useState } from 'react';
import type { QueueFilter, ResponsibilityItem } from '../types';

export function useOperationalFilters(items: ResponsibilityItem[]) {
  const [queueFilter, setQueueFilter] = useState<QueueFilter>('todos');
  const [selectedPhase, setSelectedPhase] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    return items
      .filter((item) => (queueFilter === 'todos' ? true : item.type === queueFilter))
      .filter((item) => (selectedPhase ? item.phase === selectedPhase : true));
  }, [items, queueFilter, selectedPhase]);

  return {
    queueFilter,
    setQueueFilter,
    selectedPhase,
    setSelectedPhase,
    filteredItems,
  };
}
