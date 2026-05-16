type RawTemplateRecord = {
  id: number;
  name: string;
  legalArea: string;
  pieceType: string;
  status: string;
  official?: boolean | null;
  favorite?: boolean | null;
  autoFill?: boolean | null;
  phase: string;
  author: string;
  version: string;
  updatedOn: Date;
  lastUsedAt?: Date | null;
  needsReview?: boolean | null;
  description: string;
  tags?: unknown;
  placeholders?: unknown;
  preview: string;
  versionsJson?: unknown;
};

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function asVersions(value: unknown) {
  return Array.isArray(value) ? value : [];
}

export function buildTemplatePayload(template: RawTemplateRecord) {
  return {
    id: String(template.id),
    nome: template.name,
    area: template.legalArea,
    tipoPeca: template.pieceType,
    status: template.status,
    oficial: Boolean(template.official),
    favorito: Boolean(template.favorite),
    autoFill: Boolean(template.autoFill),
    fase: template.phase,
    autor: template.author,
    versao: template.version,
    ultimaAtualizacao: template.updatedOn.toISOString().slice(0, 10),
    usoRecente: template.lastUsedAt ? template.lastUsedAt.toISOString().slice(0, 10) : null,
    precisaRevisao: Boolean(template.needsReview),
    descricao: template.description,
    tags: asStringArray(template.tags),
    placeholders: asStringArray(template.placeholders),
    preview: template.preview,
    versions: asVersions(template.versionsJson),
  };
}
