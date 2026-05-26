import type { ResponsibilityItem } from '../types';
import { MissingDocumentsWidget } from '../widgets/MissingDocumentsWidget';

interface SupportLayerContainerProps {
  items: ResponsibilityItem[];
}

export function SupportLayerContainer({ items }: SupportLayerContainerProps) {
  return (
    <section className="support-layer support-layer--single" aria-label="Camada de apoio">
      <MissingDocumentsWidget items={items} />
    </section>
  );
}
