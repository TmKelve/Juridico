import { CalendarDays, Clock3, PlusCircle, Scale } from 'lucide-react';
import type { AgendaItem, AlertItem, MovementItem } from '../types';
import { CriticalAlertsWidget } from '../widgets/CriticalAlertsWidget';
import { RecentMovementsWidget } from '../widgets/RecentMovementsWidget';
import { TodayAgendaWidget } from '../widgets/TodayAgendaWidget';
import { SectionCard } from '../widgets/SectionCard';
import { ActionCard } from '../widgets/ActionCard';

interface ContextRailContainerProps {
  agenda: AgendaItem[];
  movements: MovementItem[];
  alerts: AlertItem[];
  onShortcutClick: (action: string) => void;
}

export function ContextRailContainer({ agenda, movements, alerts, onShortcutClick }: ContextRailContainerProps) {
  return (
    <aside className="context-column" aria-label="Coluna contextual">
      <SectionCard title="Ações Rápidas" meta="Atalhos de operação">
        <div className="action-card-grid action-card-grid--compact">
          <ActionCard
            icon={PlusCircle}
            title="Nova Tarefa"
            description="Criar pendência operacional"
            onClick={() => onShortcutClick('nova_tarefa')}
          />
          <ActionCard
            icon={CalendarDays}
            title="Ver Agenda"
            description="Abrir compromissos do dia"
            onClick={() => onShortcutClick('ver_agenda')}
          />
          <ActionCard
            icon={Clock3}
            title="Ver Prazos"
            description="Revisar vencimentos e urgências"
            onClick={() => onShortcutClick('ver_prazos')}
          />
          <ActionCard
            icon={Scale}
            title="Ver Processos"
            description="Entrar na carteira operacional"
            onClick={() => onShortcutClick('ver_processos')}
          />
        </div>
      </SectionCard>

      <CriticalAlertsWidget items={alerts} />
      <TodayAgendaWidget items={agenda} />
      <RecentMovementsWidget items={movements} />
    </aside>
  );
}
