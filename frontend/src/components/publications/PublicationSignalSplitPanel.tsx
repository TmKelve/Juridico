import type {
  ApiDerivedActionRecord,
  ApiOriginReference,
  ApiPublication,
  ApiPublicationCapture,
  ApiPublicationPipelineItem,
} from '../../api';
import { Button } from '../ui';
import { OriginInsightPanel } from '../audit/OriginInsightPanel';

import './publication-split-view.css';

interface PublicationSignalSplitPanelProps {
  selected: ApiPublication | null;
  originReference: ApiOriginReference | null;
  capture: ApiPublicationCapture | null;
  timeline: ApiPublicationPipelineItem[];
  derivedActions: ApiDerivedActionRecord[];
  loading: boolean;
  error: string;
  onOpenDrawer: () => void;
  onRefresh: () => void;
}

export function PublicationSignalSplitPanel({
  selected,
  originReference,
  capture,
  timeline,
  derivedActions,
  loading,
  error,
  onOpenDrawer,
  onRefresh,
}: PublicationSignalSplitPanelProps) {
  if (!selected) {
    return (
      <aside className="pub-signal-panel pub-signal-panel--empty">
        <span className="pub-signal-panel__eyebrow">Capturas e sinais</span>
        <strong>Selecione uma publicacao</strong>
        <p>Esta tela mostra a publicacao consolidada e o rastro da captura que a originou. Se voce ainda precisa decidir o significado do item, volte para a Triagem.</p>
      </aside>
    );
  }

  return (
    <aside className="pub-signal-panel">
      <div className="pub-signal-panel__guide">
        <span className="pub-signal-panel__eyebrow">Como ler esta tela</span>
        <strong>Esquerda: publicacao consolidada. Direita: origem e rastreabilidade.</strong>
        <p>Publicacoes serve para tratar o item juridico ja consolidado. A trilha lateral explica de qual captura ele veio e quais acoes o pipeline ja gerou.</p>
      </div>
      <div className="pub-signal-panel__actions">
        <Button onClick={onOpenDrawer}>Abrir detalhe completo</Button>
        <Button variant="outline" onClick={onRefresh}>Atualizar origem</Button>
      </div>
      <OriginInsightPanel
        title="Capturas e sinais relacionados"
        originReference={originReference}
        originStage={selected.originStage}
        pipelineStatus={selected.pipelineStatus}
        consolidationStatus={selected.consolidationStatus}
        capture={capture}
        timeline={timeline}
        derivedActions={derivedActions}
        loading={loading}
        error={error}
        fallbackEvidenceText={selected.textoRelevante}
        summary={selected.resumo}
      />
    </aside>
  );
}
