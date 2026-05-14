import { Calendar } from 'lucide-react';
import type { AgendaItem } from '../types';
import { SectionCard } from './SectionCard';
import { RailWidgetItem } from './RailWidgetItem';
import { EmptyState } from './EmptyState';

interface TodayAgendaWidgetProps {
  items: AgendaItem[];
}

export function TodayAgendaWidget({ items }: TodayAgendaWidgetProps) {
  return (
    <SectionCard title="Agenda de Hoje">
      {items.length > 0 ? (
        <ul className="rail-widget-list">
          {items.map((item) => (
            <RailWidgetItem
              key={item.id}
              time={item.hour}
              title={item.label}
              meta={item.context}
            />
          ))}
        </ul>
      ) : (
        <EmptyState icon={Calendar} title="Nenhum evento hoje" />
      )}
    </SectionCard>
  );
}
