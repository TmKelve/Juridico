import { CrmContractError } from '../../crm/audit';
import type { DocumentUploadRepository, DocumentUploadResult, DocumentUploadStorageAdapter } from './document-upload.types';
import { normalizeDocumentUploadInput } from './document-upload.validators';

export class DocumentUploadService {
  constructor(
    private readonly storageAdapter: DocumentUploadStorageAdapter,
    private readonly repository: DocumentUploadRepository,
  ) {}

  async upload(input: Parameters<typeof normalizeDocumentUploadInput>[0]): Promise<DocumentUploadResult> {
    const normalized = normalizeDocumentUploadInput(input);
    const process = await this.repository.assertProcessExists(normalized.processId);
    if (!process) {
      throw new CrmContractError('Processo não encontrado', 404, 'PROCESS_NOT_FOUND', {
        processId: normalized.processId,
      });
    }

    const metadata = {
      ...normalized.metadata,
      proceduralType: normalized.metadata.proceduralType ?? process.proceduralType ?? null,
    };

    const storage = await this.storageAdapter.store({
      processId: normalized.processId,
      fileName: normalized.file.fileName,
      contentBase64: normalized.file.contentBase64,
      mimeType: normalized.file.mimeType,
      sizeInBytes: normalized.file.sizeInBytes,
      metadata,
    });

    const document = await this.repository.createDocument({
      processId: normalized.processId,
      title: normalized.title,
      description: normalized.description,
      category: normalized.category,
      status: normalized.status,
      origin: normalized.origin,
      responsible: normalized.responsible,
      requiredChecklist: normalized.requiredChecklist,
      pendingForAdvance: normalized.pendingForAdvance,
      mimeType: storage.mimeType,
      previewUrl: storage.previewUrl ?? normalized.previewUrl,
      createdBy: normalized.createdBy,
      metadata,
      storage,
    });

    return { document };
  }
}
