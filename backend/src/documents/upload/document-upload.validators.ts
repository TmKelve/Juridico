import { CrmContractError } from '../../crm/audit';
import type { DocumentUploadInput, DocumentUploadMetadata } from './document-upload.types';

function parsePositiveInteger(value: unknown, field: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new CrmContractError(`${field} inválido`, 400, 'VALIDATION_ERROR', { field });
  }

  return parsed;
}

function parseRequiredString(value: unknown, field: string) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new CrmContractError(`${field} é obrigatório`, 400, 'VALIDATION_ERROR', { field });
  }

  return value.trim();
}

function parseOptionalString(value: unknown) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') {
    throw new CrmContractError('Valor textual inválido', 400, 'VALIDATION_ERROR');
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parseOptionalUrl(value: unknown, field: string) {
  const normalized = parseOptionalString(value);
  if (!normalized) return null;

  try {
    return new URL(normalized).toString();
  } catch {
    throw new CrmContractError(`${field} inválido`, 400, 'VALIDATION_ERROR', { field });
  }
}

function normalizeMetadata(metadata: unknown): DocumentUploadMetadata {
  if (!metadata || Array.isArray(metadata) || typeof metadata !== 'object') {
    throw new CrmContractError('metadata deve ser um objeto JSON', 400, 'VALIDATION_ERROR', { field: 'metadata' });
  }

  const raw = metadata as Record<string, unknown>;
  const tags = Array.isArray(raw.tags)
    ? raw.tags
        .filter((tag) => typeof tag === 'string')
        .map((tag) => tag.trim())
        .filter(Boolean)
    : [];

  return {
    ...raw,
    proceduralType: parseOptionalString(raw.proceduralType),
    documentType: parseOptionalString(raw.documentType),
    checklistCode: parseOptionalString(raw.checklistCode),
    fileName: parseOptionalString(raw.fileName),
    tags,
  };
}

function parseFile(input: DocumentUploadInput['file']) {
  if (!input || typeof input !== 'object') {
    throw new CrmContractError('file é obrigatório', 400, 'VALIDATION_ERROR', { field: 'file' });
  }

  const fileName = parseRequiredString(input.fileName, 'file.fileName');
  const contentBase64 = parseRequiredString(input.contentBase64, 'file.contentBase64');
  const mimeType = parseOptionalString(input.mimeType) ?? 'application/octet-stream';
  const sizeInBytes = input.sizeInBytes == null
    ? Buffer.from(contentBase64, 'base64').byteLength
    : parsePositiveInteger(input.sizeInBytes, 'file.sizeInBytes');

  return {
    fileName,
    contentBase64,
    mimeType,
    sizeInBytes,
  };
}

export function normalizeDocumentUploadInput(input: DocumentUploadInput) {
  const metadata = normalizeMetadata(input.metadata);
  const file = parseFile(input.file);

  return {
    processId: parsePositiveInteger(input.processId, 'processId'),
    title: parseRequiredString(input.title, 'title'),
    description: parseOptionalString(input.description) ?? '',
    category: parseOptionalString(input.category) ?? metadata.documentType ?? 'Checklist',
    status: parseOptionalString(input.status) ?? 'pendente',
    origin: parseOptionalString(input.origin) ?? 'interno',
    responsible: parseOptionalString(input.responsible),
    requiredChecklist: Boolean(input.requiredChecklist),
    pendingForAdvance: Boolean(input.pendingForAdvance),
    previewUrl: parseOptionalUrl(input.previewUrl, 'previewUrl'),
    createdBy: parseOptionalString(input.createdBy) ?? parseOptionalString(input.actor.email),
    actor: input.actor,
    file,
    metadata,
  };
}
