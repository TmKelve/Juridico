import { FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { ResponsibilityItem } from '../types';
import { SectionCard } from './SectionCard';
import { RailWidgetItem } from './RailWidgetItem';
import { EmptyState } from '@/components/product/EmptyState';

interface MissingDocumentsWidgetProps {
  items: ResponsibilityItem[];
}

export function MissingDocumentsWidget({ items }: MissingDocumentsWidgetProps) {
  const navigate = useNavigate();
  const missing = items.slice(0, 3);

  return (
    <SectionCard
      title="Documentos pendentes"
      meta={missing.length > 0 ? `${missing.length} item(ns) travando execução` : 'Nenhum bloqueio documental'}
      action={<button className="btn-ghost btn-inline" onClick={() => navigate('/documentos')}>Abrir documentos</button>}
      className="support-section-card"
    >
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
        <EmptyState icon={<FileText size={32} />} title="Documentos em dia" description="Não há pendências obrigatórias no momento." />
      )}
    </SectionCard>
  );
}
