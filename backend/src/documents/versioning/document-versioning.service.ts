import { CrmContractError } from '../../crm/audit';
import type { DocumentVersioningInput, DocumentVersioningRepository } from './document-versioning.types';

function parsePositiveInteger(value: unknown, field: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new CrmContractError(`${field} inválido`, 400, 'VALIDATION_ERROR', { field });
  }

  return parsed;
}

function parseOptionalString(value: unknown) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') {
    throw new CrmContractError('Valor textual inválido', 400, 'VALIDATION_ERROR');
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export class DocumentVersioningService {
  constructor(private readonly repository: DocumentVersioningRepository) {}

  async createVersion(input: DocumentVersioningInput) {
    const documentId = parsePositiveInteger(input.documentId, 'documentId');
    const current = await this.repository.findById(documentId);
    if (!current) {
      throw new CrmContractError('Documento não encontrado', 404, 'DOCUMENT_NOT_FOUND', { documentId });
    }

    if (!current.isLatestVersion) {
      throw new CrmContractError('Somente a versão atual pode ser versionada', 409, 'DOCUMENT_NOT_LATEST_VERSION', { documentId });
    }

    const changes = input.changes ?? {};
    return this.repository.createNextVersion({
      processId: current.processId,
      title: parseOptionalString(changes.title) ?? current.title,
      description: parseOptionalString(changes.description) ?? current.description,
      status: parseOptionalString(changes.status) ?? current.status,
      category: parseOptionalString(changes.category) ?? current.category,
      version: current.version + 1,
      origin: parseOptionalString(changes.origin) ?? current.origin,
      responsible: changes.responsible === undefined ? current.responsible : parseOptionalString(changes.responsible),
      requiredChecklist: changes.requiredChecklist ?? current.requiredChecklist,
      pendingForAdvance: changes.pendingForAdvance ?? current.pendingForAdvance,
      mimeType: parseOptionalString(changes.mimeType) ?? current.mimeType,
      previewUrl: changes.previewUrl === undefined ? current.previewUrl : parseOptionalString(changes.previewUrl),
      metadata: {
        ...(current.metadata ?? {}),
        ...((changes.metadata ?? {}) as Record<string, unknown>),
      },
      storage: {
        ...(current.storage ?? {}),
        ...(changes.storage ?? {}),
      },
    });
  }
}
