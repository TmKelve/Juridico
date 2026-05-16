type RawPublicationRecord = {
  id: number;
  publicationType: string;
  status: string;
  impact: string;
  tribunal: string;
  origin: string;
  publishedAt: Date;
  summary: string;
  relevantText: string;
  requiresAction?: boolean | null;
  convertedToDeadline?: boolean | null;
  derivedDeadlineLabel?: string | null;
  derivedDeadlineId?: number | null;
  notes?: string | null;
  read?: boolean | null;
  processId: number;
  process?: {
    id: number;
    title: string;
    client: string;
    clientRecord?: { id: number; name: string } | null;
  } | null;
  clientRecord?: { id: number; name: string } | null;
};

export function buildPublicationPayload(publication: RawPublicationRecord) {
  const process = publication.process ?? null;
  const client = publication.clientRecord ?? process?.clientRecord ?? null;

  return {
    id: publication.id,
    tipo: publication.publicationType,
    status: publication.status,
    impacto: publication.impact,
    processId: publication.processId,
    processLabel: `#${publication.processId}`,
    processTitle: process?.title ?? '',
    client: client?.name ?? process?.client ?? 'Cliente não informado',
    tribunal: publication.tribunal,
    origem: publication.origin,
    dataPublicacao: publication.publishedAt.toISOString().slice(0, 10),
    resumo: publication.summary,
    textoRelevante: publication.relevantText,
    exigeAcao: Boolean(publication.requiresAction),
    convertidaEmPrazo: Boolean(publication.convertedToDeadline),
    prazoDerivedoLabel: publication.derivedDeadlineLabel ?? null,
    derivedDeadlineId: publication.derivedDeadlineId ?? null,
    observacoes: publication.notes ?? '',
    lida: Boolean(publication.read),
  };
}
