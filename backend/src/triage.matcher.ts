type ProcessCandidate = {
  id: number;
  processNumber?: string | null;
  client: string;
  clientId?: number | null;
};

type ClientCandidate = {
  id: number;
  cpfCnpj?: string | null;
  name: string;
};

type CaptureCandidate = {
  processNumber?: string | null;
  cpf?: string | null;
  sourceType: string;
  normalizedText: string;
};

function normalizeDigits(value?: string | null) {
  return (value ?? '').replace(/\D/g, '');
}

export function resolveTriageTarget(
  capture: CaptureCandidate,
  processes: ProcessCandidate[],
  clients: ClientCandidate[],
) {
  const processNumber = normalizeDigits(capture.processNumber);
  if (processNumber) {
    const matchedProcess = processes.find((process) => normalizeDigits(process.processNumber) === processNumber);
    if (matchedProcess) {
      return {
        kind: 'process' as const,
        processId: matchedProcess.id,
        clientId: matchedProcess.clientId ?? null,
      };
    }
  }

  const cpf = normalizeDigits(capture.cpf);
  if (cpf) {
    const matchedClient = clients.find((client) => normalizeDigits(client.cpfCnpj) === cpf);
    if (matchedClient) {
      return {
        kind: 'client' as const,
        processId: null,
        clientId: matchedClient.id,
      };
    }
  }

  return {
    kind: 'orphan' as const,
    processId: null,
    clientId: null,
  };
}

export function inferQueueType(sourceType: string, normalizedText: string) {
  const text = `${sourceType} ${normalizedText}`.toLowerCase();
  if (text.includes('sentença') || text.includes('intimação') || text.includes('citacao') || text.includes('prazo')) {
    return 'critica';
  }
  return 'normal';
}

export function inferSuggestedAction(params: {
  sourceType: string;
  queueType: string;
  processId: number | null;
  clientId: number | null;
  hasExistingClient: boolean;
  normalizedText: string;
}) {
  const text = params.normalizedText.toLowerCase();
  if (params.processId && (text.includes('prazo') || text.includes('manifestação') || text.includes('manifestacao') || text.includes('sentença') || text.includes('intimação') || text.includes('intimacao'))) {
    return 'criar_prazo';
  }
  if (params.processId) {
    return 'criar_tarefa';
  }
  if (params.clientId || params.hasExistingClient) {
    return 'criar_oportunidade';
  }
  return 'criar_lead';
}
