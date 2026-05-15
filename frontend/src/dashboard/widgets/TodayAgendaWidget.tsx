import { Calendar } from 'lucide-react';
import type { AgendaItem } from '../types';
import { SectionCard } from './SectionCard';
import { AgendaTimelineItem } from './AgendaTimelineItem';
import { EmptyState } from './EmptyState';

interface TodayAgendaWidgetProps {
  items: AgendaItem[];
}

export function TodayAgendaWidget({ items }: TodayAgendaWidgetProps) {
  return (
    <SectionCard title="Agenda de Hoje">
      {items.length > 0 ? (
        <ul className="agenda-timeline-list">
          {items.map((item) => (
            <AgendaTimelineItem
              key={item.id}
              time={item.hour}
              title={item.label}
              context={item.context}
            />
          ))}
        </ul>
      ) : (
        <EmptyState icon={Calendar} title="Nenhum evento hoje" description="Sua agenda está livre no momento." />
      )}
    </SectionCard>
  );
}
