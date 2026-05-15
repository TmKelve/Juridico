type RawDocumentRecord = {
  id: number;
  title: string;
  description: string;
  status: string;
  category?: string | null;
  version?: number | null;
  isLatestVersion?: boolean | null;
  origin?: string | null;
  uploadedAt?: Date | null;
  responsible?: string | null;
  requiredChecklist?: boolean | null;
  pendingForAdvance?: boolean | null;
  mimeType?: string | null;
  previewUrl?: string | null;
  processId: number;
  process?: {
    id: number;
    title: string;
    client: string;
    phase?: string | null;
    clientRecord?: { id: number; name: string; legalArea?: string | null } | null;
  } | null;
};

export function buildDocumentPayload(document: RawDocumentRecord) {
  const process = document.process ?? null;
  const client = process?.clientRecord ?? null;

  return {
    id: document.id,
    name: document.title,
    processId: document.processId,
    processLabel: `#${document.processId}`,
    processTitle: process?.title ?? '',
    client: client?.name ?? process?.client ?? 'Cliente não informado',
    category: document.category ?? 'Checklist',
    status: document.status,
    version: document.version ?? 1,
    isLatestVersion: document.isLatestVersion ?? true,
    origin: document.origin ?? 'interno',
    uploadedAt: (document.uploadedAt ?? new Date()).toISOString().slice(0, 10),
    owner: document.responsible ?? 'sem-responsavel',
    notes: document.description ?? '',
    requiredChecklist: Boolean(document.requiredChecklist),
    pendingForAdvance: Boolean(document.pendingForAdvance),
    mimeType: document.mimeType ?? 'application/octet-stream',
    previewUrl: document.previewUrl ?? undefined,
  };
}
