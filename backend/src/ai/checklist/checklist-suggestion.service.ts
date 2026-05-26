import { ProceduralDocumentChecklistService } from '../../documents/checklist';

export type ChecklistSuggestionInput = {
  proceduralType?: string | null;
  providedDocumentTypes?: string[];
  documentCategory?: string | null;
  facts?: Record<string, unknown>;
};

export type ChecklistSuggestionResult = {
  proceduralType: string;
  requiredItems: Array<{ documentType: string; label: string; required: boolean }>;
  missingItems: Array<{ documentType: string; label: string; required: boolean }>;
  suggestedItems: Array<{ documentType: string; label: string; reason: string }>;
  complete: boolean;
};

function normalizeToken(value: string) {
  return value.trim().toLowerCase();
}

export class ChecklistSuggestionService {
  constructor(private readonly checklistService = new ProceduralDocumentChecklistService()) {}

  suggest(input: ChecklistSuggestionInput): ChecklistSuggestionResult {
    const base = this.checklistService.evaluate({
      proceduralType: input.proceduralType ?? null,
      providedDocumentTypes: input.providedDocumentTypes ?? [],
    });

    const suggestedItems = new Map<string, { documentType: string; label: string; reason: string }>();
    const category = normalizeToken(String(input.documentCategory ?? ''));
    const factsText = JSON.stringify(input.facts ?? {}).toLowerCase();

    if (category.includes('audiencia')) {
      suggestedItems.set('roteiro_audiencia', {
        documentType: 'roteiro_audiencia',
        label: 'Roteiro de audiência',
        reason: 'Categoria indica preparação de audiência.',
      });
    }

    if (factsText.includes('testemunha')) {
      suggestedItems.set('rol_testemunhas', {
        documentType: 'rol_testemunhas',
        label: 'Rol de testemunhas',
        reason: 'Fatos mencionam testemunhas.',
      });
    }

    if (factsText.includes('acordo')) {
      suggestedItems.set('minuta_acordo', {
        documentType: 'minuta_acordo',
        label: 'Minuta de acordo',
        reason: 'Fatos sugerem negociação ou acordo.',
      });
    }

    return {
      proceduralType: base.proceduralType,
      requiredItems: base.requiredItems,
      missingItems: base.missingItems,
      complete: base.complete,
      suggestedItems: [...suggestedItems.values()],
    };
  }
}
