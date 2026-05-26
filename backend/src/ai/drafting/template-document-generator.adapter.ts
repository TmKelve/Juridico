import type { DocumentArtifactGenerator } from '../../documents/artifacts';
import { DocumentDraftingService } from './document-drafting.service';

export class AiTemplateDocumentGeneratorAdapter implements DocumentArtifactGenerator {
  constructor(private readonly draftingService = new DocumentDraftingService()) {}

  async generate(input: {
    templateId: string;
    processId: number;
    documentTitle: string;
    payload: Record<string, unknown>;
  }) {
    return this.draftingService.generate({
      templateId: input.templateId,
      processId: input.processId,
      documentTitle: input.documentTitle,
      payload: input.payload,
    });
  }
}
