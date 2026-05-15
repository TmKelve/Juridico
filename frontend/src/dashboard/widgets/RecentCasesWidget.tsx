import { Scale } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { ResponsibilityItem } from '../types';
import { SectionCard } from './SectionCard';
import { RailWidgetItem } from './RailWidgetItem';
import { EmptyState } from './EmptyState';

interface RecentCasesWidgetProps {
  items: ResponsibilityItem[];
}

export function RecentCasesWidget({ items }: RecentCasesWidgetProps) {
  const navigate = useNavigate();
  const recent = items.slice(0, 3);

  return (
    <SectionCard
      title="Processos recentes"
      meta={recent.length > 0 ? `${recent.length} processo(s) em observação` : 'Sem atualização recente'}
      action={<button className="btn-ghost btn-inline" onClick={() => navigate('/processos')}>Abrir carteira</button>}
      className="support-section-card"
    >
      {recent.length > 0 ? (
        <ul className="rail-widget-list">
          {recent.map((item) => (
            <RailWidgetItem
              key={item.id}
              title={`#${item.id} • ${item.title}`}
              meta={`${item.client} • ${item.phase}`}
              accent="default"
            />
          ))}
        </ul>
      ) : (
        <EmptyState icon={Scale} title="Nenhum processo recente" description="Os casos mais ativos da carteira aparecerão aqui." />
      )}
    </SectionCard>
  );
}
