import { ChecklistSuggestionService } from './checklist-suggestion.service';

export class DocumentChecklistSuggestionAdapter {
  constructor(private readonly service = new ChecklistSuggestionService()) {}

  suggest(input: {
    proceduralType?: string | null;
    providedDocumentTypes?: string[];
    documentCategory?: string | null;
    facts?: Record<string, unknown>;
  }) {
    return this.service.suggest(input);
  }
}
