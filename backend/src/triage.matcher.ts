import {
  matchPublicationDeterministically,
  toLegacyTriageTarget,
  type ClientCandidate as MatchingClientCandidate,
  type ProcessCandidate as MatchingProcessCandidate,
} from './publications/matching';
import { toLegacyTriageClassification } from './publications/classification';

type ProcessCandidate = {
  id: number;
  processNumber?: string | null;
  client: string;
  clientId?: number | null;
  cpfCnpj?: string | null;
  oabNumber?: string | null;
  clientAliases?: string[] | null;
};

type ClientCandidate = {
  id: number;
  cpfCnpj?: string | null;
  name: string;
  oabNumber?: string | null;
  aliases?: string[] | null;
  activeProcessId?: number | null;
};

type CaptureCandidate = {
  processNumber?: string | null;
  cpf?: string | null;
  cpfCnpj?: string | null;
  oabNumber?: string | null;
  personName?: string | null;
  sourceType: string;
  normalizedText: string;
};

function toMatchingProcesses(processes: ProcessCandidate[]): MatchingProcessCandidate[] {
  return processes.map((process) => ({
    id: process.id,
    processNumber: process.processNumber ?? null,
    clientId: process.clientId ?? null,
    clientName: process.client,
    clientAliases: process.clientAliases ?? [],
    cpfCnpj: process.cpfCnpj ?? null,
    oabNumber: process.oabNumber ?? null,
    active: true,
  }));
}

function toMatchingClients(clients: ClientCandidate[]): MatchingClientCandidate[] {
  return clients.map((client) => ({
    id: client.id,
    name: client.name,
    aliases: client.aliases ?? [],
    cpfCnpj: client.cpfCnpj ?? null,
    oabNumber: client.oabNumber ?? null,
    activeProcessId: client.activeProcessId ?? null,
  }));
}

export function resolveTriageTarget(
  capture: CaptureCandidate,
  processes: ProcessCandidate[],
  clients: ClientCandidate[],
) {
  const matching = matchPublicationDeterministically(
    {
      sourceType: capture.sourceType,
      processNumber: capture.processNumber ?? null,
      cpfCnpj: capture.cpfCnpj ?? capture.cpf ?? null,
      oabNumber: capture.oabNumber ?? null,
      clientName: capture.personName ?? null,
      normalizedText: capture.normalizedText,
      summary: capture.normalizedText,
    },
    toMatchingProcesses(processes),
    toMatchingClients(clients),
  );

  return toLegacyTriageTarget(matching);
}

export function inferQueueType(sourceType: string, normalizedText: string) {
  return toLegacyTriageClassification({
    sourceType,
    summary: normalizedText,
    normalizedText,
    matching: {
      matchStatus: 'unmatched',
      matchedBy: 'manual_review',
      processId: null,
      clientId: null,
      confidence: 'low',
      reasons: [],
      candidates: [],
    },
  }).queueType;
}

export function inferSuggestedAction(params: {
  sourceType: string;
  queueType: string;
  processId: number | null;
  clientId: number | null;
  hasExistingClient: boolean;
  normalizedText: string;
}) {
  return toLegacyTriageClassification({
    sourceType: params.sourceType,
    summary: params.normalizedText,
    normalizedText: params.normalizedText,
    matching: {
      matchStatus: params.processId ? 'matched' : params.clientId || params.hasExistingClient ? 'partial' : 'unmatched',
      matchedBy: params.processId ? 'processNumber' : params.clientId || params.hasExistingClient ? 'clientName' : 'manual_review',
      processId: params.processId,
      clientId: params.clientId,
      confidence: params.processId ? 'high' : params.clientId || params.hasExistingClient ? 'medium' : 'low',
      reasons: [],
      candidates: [],
    },
  }).suggestedAction;
}
