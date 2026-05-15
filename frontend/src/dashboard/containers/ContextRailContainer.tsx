import { CalendarDays, Clock3, PlusCircle, Scale } from 'lucide-react';
import type { AgendaItem, AlertItem, MovementItem } from '../types';
import { CriticalAlertsWidget } from '../widgets/CriticalAlertsWidget';
import { RecentMovementsWidget } from '../widgets/RecentMovementsWidget';
import { TodayAgendaWidget } from '../widgets/TodayAgendaWidget';
import { SectionCard } from '../widgets/SectionCard';
import { ActionTile } from '../widgets/ActionTile';

interface ContextRailContainerProps {
  agenda: AgendaItem[];
  movements: MovementItem[];
  alerts: AlertItem[];
  onShortcutClick: (action: string) => void;
}

export function ContextRailContainer({ agenda, movements, alerts, onShortcutClick }: ContextRailContainerProps) {
  return (
    <aside className="context-column" aria-label="Coluna contextual">
      <SectionCard title="Ações Rápidas">
        <div className="action-tile-grid">
          <ActionTile icon={PlusCircle} label="Nova Tarefa" onClick={() => onShortcutClick('nova_tarefa')} />
          <ActionTile icon={CalendarDays} label="Ver Agenda" onClick={() => onShortcutClick('ver_agenda')} />
          <ActionTile icon={Clock3} label="Ver Prazos" onClick={() => onShortcutClick('ver_prazos')} />
          <ActionTile icon={Scale} label="Ver Processos" onClick={() => onShortcutClick('ver_processos')} />
        </div>
      </SectionCard>

      <TodayAgendaWidget items={agenda} />
      <RecentMovementsWidget items={movements} />
      <CriticalAlertsWidget items={alerts} />
    </aside>
  );
}
