import type { ResponsibilityItem } from '../types';
import { LatestPublicationsWidget } from '../widgets/LatestPublicationsWidget';
import { MissingDocumentsWidget } from '../widgets/MissingDocumentsWidget';
import { RecentCasesWidget } from '../widgets/RecentCasesWidget';

interface SupportLayerContainerProps {
  items: ResponsibilityItem[];
}

export function SupportLayerContainer({ items }: SupportLayerContainerProps) {
  return (
    <section className="support-layer" aria-label="Camada de apoio">
      <MissingDocumentsWidget items={items} />
      <LatestPublicationsWidget />
      <RecentCasesWidget items={items} />
    </section>
  );
}
