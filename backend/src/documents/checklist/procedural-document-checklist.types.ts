export interface ProceduralChecklistItem {
  documentType: string;
  label: string;
  required: boolean;
}

export interface ProceduralChecklistEvaluationInput {
  proceduralType?: string | null;
  providedDocumentTypes?: string[];
}

export interface ProceduralChecklistEvaluation {
  proceduralType: string;
  requiredItems: ProceduralChecklistItem[];
  missingItems: ProceduralChecklistItem[];
  complete: boolean;
}
