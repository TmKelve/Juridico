type RawDeadlineRecord = {
  id: number;
  title: string;
  dueDate: Date;
  status: string;
  priority: string;
  origin?: string | null;
  responsible?: string | null;
  legalArea?: string | null;
  notes?: string | null;
  completedAt?: Date | null;
  processId: number;
  process?: {
    id: number;
    title: string;
    client: string;
    phase?: string | null;
    status?: string | null;
    owner?: { id: number; email: string; role: string } | null;
    clientRecord?: { id: number; name: string; legalArea?: string | null } | null;
  } | null;
};

export function buildDeadlinePayload(deadline: RawDeadlineRecord) {
  const process = deadline.process ?? null;
  const client = process?.clientRecord ?? null;

  return {
    id: deadline.id,
    title: deadline.title,
    processId: deadline.processId,
    processLabel: `#${deadline.processId}`,
    processTitle: process?.title ?? '',
    clientId: client?.id ?? null,
    client: client?.name ?? process?.client ?? 'Cliente não informado',
    origin: deadline.origin ?? 'interno',
    dueDate: deadline.dueDate.toISOString().slice(0, 10),
    status: deadline.status,
    priority: deadline.priority,
    owner: deadline.responsible ?? process?.owner?.email?.split('@')[0] ?? 'sem-responsavel',
    area: deadline.legalArea ?? process?.phase ?? client?.legalArea ?? 'Civel',
    notes: deadline.notes ?? '',
    completedAt: deadline.completedAt ? deadline.completedAt.toISOString() : null,
  };
}
