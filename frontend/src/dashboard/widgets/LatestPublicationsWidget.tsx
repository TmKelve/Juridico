import { NotebookText } from 'lucide-react';
import { SectionCard } from './SectionCard';
import { RailWidgetItem } from './RailWidgetItem';
import { EmptyState } from './EmptyState';

export function LatestPublicationsWidget() {
  const publications = [
    { id: 'pub-1', title: 'Diário Oficial - intimação publicada', detail: 'Há 2 horas' },
    { id: 'pub-2', title: 'Andamento no TRF atualizado', detail: 'Hoje, 08:40' },
    { id: 'pub-3', title: 'Novo prazo incluído automaticamente', detail: 'Ontem, 18:20' },
  ];

  return (
    <SectionCard title="Últimas Publicações">
      {publications.length > 0 ? (
        <ul className="rail-widget-list">
          {publications.map((item) => (
            <RailWidgetItem
              key={item.id}
              title={item.title}
              meta={item.detail}
            />
          ))}
        </ul>
      ) : (
        <EmptyState icon={NotebookText} title="Nenhuma publicação recente" />
      )}
    </SectionCard>
  );
}
