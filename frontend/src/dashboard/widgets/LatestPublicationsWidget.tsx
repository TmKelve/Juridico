import { NotebookText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SectionCard } from './SectionCard';
import { RailWidgetItem } from './RailWidgetItem';
import { EmptyState } from '@/components/product/EmptyState';

export function LatestPublicationsWidget() {
  const navigate = useNavigate();
  const publications = [
    { id: 'pub-1', title: 'Diário Oficial - intimação publicada', detail: 'Há 2 horas' },
    { id: 'pub-2', title: 'Andamento no TRF atualizado', detail: 'Hoje, 08:40' },
    { id: 'pub-3', title: 'Novo prazo incluído automaticamente', detail: 'Ontem, 18:20' },
  ];

  return (
    <SectionCard
      title="Publicações recentes"
      meta={`${publications.length} atualização(ões) para revisar`}
      action={<button className="btn-ghost btn-inline" onClick={() => navigate('/publicacoes-intimacoes')}>Abrir módulo</button>}
      className="support-section-card"
    >
      {publications.length > 0 ? (
        <ul className="rail-widget-list">
          {publications.map((item) => (
            <RailWidgetItem
              key={item.id}
              title={item.title}
              meta={item.detail}
              accent="default"
            />
          ))}
        </ul>
      ) : (
        <EmptyState icon={<NotebookText size={32} />} title="Nenhuma publicação recente" description="As novas movimentações oficiais aparecerão aqui." />
      )}
    </SectionCard>
  );
}
