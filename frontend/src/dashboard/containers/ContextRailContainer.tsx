import { PlusCircle, CalendarDays, SlidersHorizontal, LayoutGrid } from 'lucide-react';
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
          <ActionTile icon={SlidersHorizontal} label="Filtro Avançado" onClick={() => onShortcutClick('filtro_avancado')} />
          <ActionTile icon={LayoutGrid} label="Menu Utilitário" onClick={() => onShortcutClick('menu_utilitario')} />
        </div>
      </SectionCard>

      <TodayAgendaWidget items={agenda} />
      <RecentMovementsWidget items={movements} />
      <CriticalAlertsWidget items={alerts} />
    </aside>
  );
}
