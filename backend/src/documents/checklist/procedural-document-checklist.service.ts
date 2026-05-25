import type {
  ProceduralChecklistEvaluation,
  ProceduralChecklistEvaluationInput,
  ProceduralChecklistItem,
} from './procedural-document-checklist.types';

const checklistByProceduralType: Record<string, ProceduralChecklistItem[]> = {
  trabalhista: [
    { documentType: 'peticao_inicial', label: 'Petição inicial', required: true },
    { documentType: 'procuracao', label: 'Procuração', required: true },
    { documentType: 'documentos_pessoais', label: 'Documentos pessoais', required: true },
  ],
  civel: [
    { documentType: 'contrato_social', label: 'Contrato social', required: true },
    { documentType: 'procuracao', label: 'Procuração', required: true },
    { documentType: 'documentos_pessoais', label: 'Documentos pessoais', required: true },
  ],
  default: [
    { documentType: 'procuracao', label: 'Procuração', required: true },
  ],
};

function normalizeChecklistToken(value: string) {
  return value.trim().toLowerCase();
}

export class ProceduralDocumentChecklistService {
  evaluate(input: ProceduralChecklistEvaluationInput): ProceduralChecklistEvaluation {
    const proceduralType = typeof input.proceduralType === 'string' && input.proceduralType.trim()
      ? normalizeChecklistToken(input.proceduralType)
      : 'default';

    const requiredItems = checklistByProceduralType[proceduralType] ?? checklistByProceduralType.default;
    const provided = new Set(
      (input.providedDocumentTypes ?? [])
        .filter((item) => typeof item === 'string')
        .map((item) => normalizeChecklistToken(item))
        .filter(Boolean),
    );

    const missingItems = requiredItems.filter((item) => item.required && !provided.has(item.documentType));

    return {
      proceduralType,
      requiredItems,
      missingItems,
      complete: missingItems.length === 0,
    };
  }
}
