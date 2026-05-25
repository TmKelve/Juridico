import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import { createHash, randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { Prisma, PrismaClient } from '@prisma/client';
import { signUserToken, verifyToken, type UserToken } from './auth';
import { buildAgendaPayload } from './agenda.contract';
import { collectCnjPublications } from './cnj-publications.provider';
import { collectCpfPublications } from './cpf-publications.provider';
import { collectDiarioPublications } from './diario-publications.provider';
import { collectOabPublications } from './oab-publications.provider';
import { ClientConsentService, createPrismaClientConsentRepository } from './clients/consent';
import { ClientPortalService, createPrismaClientPortalRepository } from './clients/portal';
import { ClientCommunicationService, createCommunicationDispatcherFromEnv, createPrismaCommunicationRepository } from './communication';
import { buildCrmLeadPayload, buildCrmOpportunityPayload } from './crm.contract';
import { CrmAuditService, createPrismaCrmAuditRepository } from './crm/audit';
import { OpportunityContactHistoryService, createPrismaOpportunityContactHistoryRepository } from './crm/contact-history';
import { CrmOpportunityConversionService } from './crm/conversion/opportunity-conversion.service';
import { validateOpportunityConversionCommand } from './crm/conversion/opportunity-conversion.validators';
import { createPrismaOpportunityConversionRepository } from './crm/conversion/prisma-opportunity-conversion.repository';
import { OpportunityDocumentsService, createPrismaOpportunityDocumentsRepository } from './crm/documents';
import { CrmContractError as CrmAuditContractError } from './crm/audit/crm-audit.validators';
import { CrmProspectingService, createPrismaCrmProspectingRepository } from './crm/prospecting';
import { createPrismaLinkProcessRepository } from './crm/process-link/prisma-link-process.repository';
import { CrmOpportunityProcessLinkService } from './crm/process-link/link-process.service';
import { validateLinkProcessCommand } from './crm/process-link/link-process.validators';
import { CrmContractError as CrmOpportunityContractError } from './crm/opportunities/crm-opportunity.types';
import { DeadlineAuditService } from './deadlines/deadline-audit.service';
import { DeadlineBulkActionService } from './deadlines/batch-actions/deadline-bulk-action.service';
import { DeadlineRiskService } from './deadlines/deadline-risk.service';
import { DeadlineDomainError } from './deadlines/deadline-errors';
import { DocumentApprovalService } from './documents/approval';
import { DocumentArtifactsService, createPrismaDocumentArtifactsRepository } from './documents/artifacts';
import { ProceduralDocumentChecklistService } from './documents/checklist';
import { DocumentLinksService, createPrismaDocumentLinksRepository } from './documents/links';
import { DocumentUploadService } from './documents/upload';
import { DocumentVersioningService } from './documents/versioning';
import { CreateDeadlineFromPublicationService } from './publications/deadline-automation/create-from-publication.service';
import { buildDeadlinePayload } from './deadlines.contract';
import { buildDocumentPayload } from './documents.contract';
import { lookupExternalProcess } from './process-lookup.provider';
import { createPublicationScheduler } from './shared/scheduler/publication-schedule';
import { planTriageDecision } from './triage/decision-engine';
import { assistTriageDecision } from './triage/decision/assisted-triage-decision';
import { rankUnifiedTriageQueue } from './triage/queue/triage-unified-queue';
import { buildPublicationPayload } from './publications.contract';
import { buildTaskPayload } from './tasks.contract';
import { buildTemplatePayload } from './templates.contract';
import { classifyTriageItem } from './triage-ai.provider';
import { buildTriageDecisionPayload, buildTriageItemPayload } from './triage.contract';
import { buildTriageExplanation } from './triage/explainability/triage-explanation-builder';
import {
  buildExplainCommandResult,
  buildPrioritizeCommandResult,
  runTriageDecisionIdempotent,
  triggerTriageAutomation,
} from './triage/http/triage-command-helpers';
import { resolveTriageTarget } from './triage.matcher';
import { registerFinanceRoutes } from './finance/http/register-finance-routes';
import { listFinancePermissions } from './authz/finance/permissions';
import { FinanceAuditService, PrismaFinanceAuditRepository } from './finance/shared/audit';
import { PrismaFinanceCollectionsRepository } from './finance/collections/finance-collections.service';
import { FinanceCollectionDispatchJob } from './jobs/finance/finance-collection-dispatch.job';
import { MockFinanceTransport } from './jobs/finance/mock-finance-transport';
import { registerFinanceSchedulers } from './shared/scheduler/finance-scheduler-registry';

const app = express();
const port = process.env.PORT || 3000;
const prisma = new PrismaClient() as PrismaClient & {
  client: any;
  publicationCapture: any;
  publicationEvent: any;
  publicationSourceJob: any;
  crmLead: any;
  crmOpportunity: any;
  crmAuditEvent: any;
  crmIdempotencyRequest: any;
  crmOpportunityDocumentAttachment: any;
  triageItem: any;
  triageDecision: any;
};
const clientStore = prisma.client;
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
const isProduction = process.env.NODE_ENV === 'production';
const authCookieName = 'Authorization';
const devMockEnabled = !isProduction && process.env.LEXORA_DEV_MOCK !== '0';

const devMockUsers = [
  { id: 1, email: 'admin@juridico.com', password: '123456', role: 'ADM' },
  { id: 2, email: 'advogado@juridico.com', password: '123456', role: 'ADV' },
  { id: 3, email: 'financeiro@juridico.com', password: '123456', role: 'FIN' },
  { id: 4, email: 'atendimento@juridico.com', password: '123456', role: 'ATD' },
] as const;

const devMockProcesses = [
  { id: 3, title: 'Recuperacao de Credito Cliente Nexo', processNumber: '10024567820265020001', client: 'Cliente Nexo', phase: 'Recurso', status: 'pausado', ownerId: 1 },
  { id: 1, title: 'Reclamatoria Trabalhista Cliente Atlas', processNumber: '50011234520263010022', client: 'Cliente Atlas', phase: 'Inicial', status: 'ativo', ownerId: 2 },
  { id: 2, title: 'Execucao Contratual Cliente Prisma', processNumber: '70099887720264030015', client: 'Cliente Prisma', phase: 'Contestacao', status: 'ativo', ownerId: 1 },
  { id: 4, title: 'Auditoria Societaria Grupo Solaris', processNumber: '90011223320265010088', client: 'Grupo Solaris', phase: 'Saneamento', status: 'ativo', ownerId: 1 },
  { id: 5, title: 'Parecer Regulatorio Aurora', processNumber: '80044556620265010012', client: 'Aurora Capital', phase: 'Conhecimento', status: 'concluido', ownerId: 1 },
  { id: 6, title: 'Mandado de Seguranca Cliente Boreal', processNumber: '60077889920265010055', client: 'Cliente Boreal', phase: 'Liminar', status: 'ativo', ownerId: 2 },
  { id: 7, title: 'Defesa Administrativa Cliente Orbe', processNumber: '30055443320265010034', client: 'Cliente Orbe', phase: 'Administrativo', status: 'ativo', ownerId: 1 },
] as const;

const devMockDeadlines = [
  { id: 101, processId: 1, title: 'Protocolar manifestação final', dueOffsetDays: 0, status: 'critico', priority: 'alta', origin: 'interno', notes: 'Validar anexos antes do protocolo.' },
  { id: 102, processId: 1, title: 'Revisar documentos complementares', dueOffsetDays: 2, status: 'aberto', priority: 'media', origin: 'cliente', notes: 'Dependência de retorno do cliente.' },
  { id: 103, processId: 2, title: 'Responder publicação recente', dueOffsetDays: -1, status: 'atrasado', priority: 'alta', origin: 'publicacao', notes: 'Prazo já extrapolado no monitor.' },
  { id: 104, processId: 3, title: 'Organizar checklist de audiência', dueOffsetDays: 6, status: 'aberto', priority: 'baixa', origin: 'audiencia', notes: 'Conferir testemunhas e pauta.' },
  { id: 105, processId: 6, title: 'Concluir minuta de petição', dueOffsetDays: 1, status: 'critico', priority: 'alta', origin: 'interno', notes: 'Aguardar revisão do responsável.' },
  { id: 106, processId: 7, title: 'Atualizar cliente sobre andamento', dueOffsetDays: 9, status: 'concluido', priority: 'media', origin: 'cliente', notes: 'Contato realizado com sucesso.' },
] as const;

const devMockAgendaEvents = [
  { id: 201, processId: 1, title: 'Audiência de instrução', type: 'audiencia', status: 'confirmado', priority: 'alta', dayOffset: 0, startTime: '10:00', endTime: '11:00', locationOrChannel: 'Fórum Trabalhista', origin: 'processo', notes: 'Levar documentos complementares.' },
  { id: 202, processId: 1, title: 'Retorno ao cliente Atlas', type: 'retorno_agendado', status: 'agendado', priority: 'media', dayOffset: 0, startTime: '14:00', endTime: '14:30', locationOrChannel: 'Telefone', origin: 'atendimento', notes: 'Atualizar sobre estratégia.' },
  { id: 203, processId: 2, title: 'Prazo de contestação', type: 'prazo_calendario', status: 'atencao', priority: 'alta', dayOffset: 1, startTime: '09:00', endTime: '10:00', locationOrChannel: 'Operação interna', origin: 'publicacao', notes: 'Prazo crítico em abertura.' },
  { id: 204, processId: 6, title: 'Reunião com cliente Boreal', type: 'reuniao_cliente', status: 'agendado', priority: 'media', dayOffset: 2, startTime: '15:00', endTime: '16:00', locationOrChannel: 'Teams', origin: 'manual', notes: 'Revisar próximos passos.' },
  { id: 205, processId: 7, title: 'Protocolo administrativo', type: 'protocolo', status: 'agendado', priority: 'baixa', dayOffset: 3, startTime: '11:00', endTime: '11:30', locationOrChannel: 'Tribunal', origin: 'processo', notes: 'Confirmar anexo final.' },
  { id: 206, processId: 2, title: 'Conflito de agenda interno', type: 'compromisso_interno', status: 'agendado', priority: 'alta', dayOffset: 1, startTime: '09:00', endTime: '09:45', locationOrChannel: 'Interno', origin: 'manual', notes: 'Sobreposição intencional para validar conflito.' },
] as const;

const externalProcessRegistry = [
  {
    processNumber: '10024567820265020001',
    title: 'Reclamatoria Trabalhista Cliente Horizonte',
    client: 'Cliente Horizonte',
    phase: 'Inicial',
    status: 'ativo',
  },
  {
    processNumber: '50011234520263010022',
    title: 'Execucao Fiscal Grupo Solaris',
    client: 'Grupo Solaris',
    phase: 'Contestacao',
    status: 'ativo',
  },
  {
    processNumber: '70099887720264030015',
    title: 'Acao de Cobranca Cooperativa Aurora',
    client: 'Cooperativa Aurora',
    phase: 'Recurso',
    status: 'pausado',
  },
] as const;

const publicationSeedTypes = ['intimacao', 'citacao', 'despacho', 'sentenca', 'acordao', 'edital', 'outros'] as const;
const publicationSeedImpacts = ['critico', 'alto', 'medio', 'baixo', 'informativo'] as const;
const publicationSeedStatuses = ['nova', 'lida', 'em_analise', 'tratada', 'ignorada'] as const;
const publicationSeedTribunals = ['TJSP', 'TJRJ', 'TJMG', 'TRT-2', 'TRF-3', 'STJ'] as const;
const publicationSeedSummaries = [
  'Intimação para manifestação no prazo de 15 dias sobre documentos juntados.',
  'Despacho determinando a juntada de documentos complementares.',
  'Sentença parcialmente procedente com prazo recursal em aberto.',
  'Acórdão publicado com necessidade de revisão imediata.',
  'Edital de citação disponibilizado no diário oficial.',
] as const;
const publicationSeedTexts = [
  'Vistos. Intimem-se as partes para manifestação no prazo legal, sob pena de preclusão.',
  'Junte a parte autora os documentos faltantes, no prazo de 10 dias, sob pena de extinção.',
  'DISPOSITIVO: Julgo procedente em parte o pedido formulado na inicial.',
  'ACORDAM os Desembargadores em negar provimento ao recurso.',
  'Cite-se por edital ante a ausência de localização da parte ré.',
] as const;
const templateSeedAreas = ['Trabalhista', 'Cível', 'Tributário', 'Empresarial', 'Previdenciário'] as const;
const templateSeedTypes = ['Petição Inicial', 'Contestação', 'Réplica', 'Recurso', 'Embargos', 'Manifestação', 'Parecer'] as const;
const templateSeedPhases = ['Conhecimento', 'Saneamento', 'Instrução', 'Recursal', 'Execução'] as const;
const templateSeedTags = ['urgente', 'cliente-pj', 'audiência', 'custas', 'acordo', 'recurso', 'provas'] as const;

function buildAllowedOrigins(primaryOrigin: string) {
  const allowed = new Set([primaryOrigin]);

  if (!isProduction) {
    try {
      const parsed = new URL(primaryOrigin);
      const hosts = parsed.hostname === 'localhost'
        ? ['localhost', '127.0.0.1']
        : parsed.hostname === '127.0.0.1'
          ? ['127.0.0.1', 'localhost']
          : [parsed.hostname];
      const ports = new Set([parsed.port || '', '5173', '4173']);

      for (const host of hosts) {
        for (const port of ports) {
          parsed.hostname = host;
          parsed.port = port;
          allowed.add(parsed.toString().replace(/\/$/, ''));
        }
      }
    } catch {
      // Keep the primary origin only when parsing fails.
    }
  }

  return allowed;
}

const allowedOrigins = buildAllowedOrigins(frontendUrl);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true
}));
app.use(express.json());

function isBcryptHash(value: string) {
  return /^\$2[aby]\$\d{2}\$/.test(value);
}

function parseCookies(cookieHeader?: string) {
  const parsed: Record<string, string> = {};
  if (!cookieHeader) return parsed;

  for (const part of cookieHeader.split(';')) {
    const [rawName, ...rawValue] = part.trim().split('=');
    if (!rawName || rawValue.length === 0) continue;
    parsed[rawName] = decodeURIComponent(rawValue.join('='));
  }

  return parsed;
}

function getAuthToken(req: express.Request) {
  const cookies = parseCookies(req.headers.cookie);
  const cookieToken = cookies[authCookieName];
  if (cookieToken) {
    return cookieToken.startsWith('Bearer ') ? cookieToken.slice('Bearer '.length) : cookieToken;
  }

  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.slice('Bearer '.length);
}

function setAuthCookie(res: express.Response, token: string) {
  res.cookie(authCookieName, `Bearer ${token}`, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'strict',
    maxAge: 8 * 60 * 60 * 1000,
    path: '/',
  });
}

function clearAuthCookie(res: express.Response) {
  res.clearCookie(authCookieName, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'strict',
    path: '/',
  });
}

function isPrismaConnectionError(error: unknown) {
  if (error instanceof Prisma.PrismaClientInitializationError) return true;
  if (error instanceof Prisma.PrismaClientUnknownRequestError) return true;
  if (!(error instanceof Error)) return false;

  return error.message.includes("Can't reach database server")
    || error.message.includes('Authentication failed')
    || error.message.includes('ECONNREFUSED');
}

function getDevMockUserByEmail(email: string) {
  return devMockUsers.find((user) => user.email.toLowerCase() === email.toLowerCase()) ?? null;
}

function getDevMockSessionUser(email: string) {
  const user = getDevMockUserByEmail(email);
  if (!user) return null;
  return { id: user.id, email: user.email, role: user.role };
}

function getDevMockProcessesForRole(decoded: UserToken) {
  const visible = decoded.role === 'ADM' || decoded.role === 'FIN'
    ? devMockProcesses
    : devMockProcesses.filter((process) => process.ownerId === decoded.sub);

  return visible.map((process) => ({
    ...process,
    owner: getDevMockSessionUser(devMockUsers.find((user) => user.id === process.ownerId)?.email || '') ?? undefined,
  }));
}

function getDevMockProcessById(processId: number) {
  const process = devMockProcesses.find((item) => item.id === processId);
  if (!process) return null;

  return {
    ...process,
    owner: getDevMockSessionUser(devMockUsers.find((user) => user.id === process.ownerId)?.email || '') ?? undefined,
  };
}

function getDevMockDeadlinesForRole(decoded: UserToken) {
  const visibleProcesses = getDevMockProcessesForRole(decoded);
  const visibleProcessIds = new Set(visibleProcesses.map((process) => process.id));
  const today = new Date();

  return devMockDeadlines
    .filter((deadline) => visibleProcessIds.has(deadline.processId))
    .map((deadline) => {
      const process = visibleProcesses.find((item) => item.id === deadline.processId);
      const dueDate = addDays(today, deadline.dueOffsetDays).toISOString().slice(0, 10);

      return {
        id: deadline.id,
        title: deadline.title,
        processId: deadline.processId,
        processLabel: `#${deadline.processId}`,
        processTitle: process?.title ?? '',
        clientId: null,
        client: process?.client ?? 'Cliente não informado',
        origin: deadline.origin,
        dueDate,
        status: deadline.status,
        priority: deadline.priority,
        owner: process?.owner?.email?.split('@')[0] ?? 'sem-responsavel',
        area: process?.phase ?? 'Civel',
        notes: deadline.notes,
        completedAt: deadline.status === 'concluido' ? addDays(today, -2).toISOString() : null,
      };
    });
}

function getDevMockAgendaForRole(decoded: UserToken) {
  const visibleProcesses = getDevMockProcessesForRole(decoded);
  const visibleProcessIds = new Set(visibleProcesses.map((process) => process.id));
  const today = new Date();

  return devMockAgendaEvents
    .filter((event) => visibleProcessIds.has(event.processId))
    .map((event) => {
      const process = visibleProcesses.find((item) => item.id === event.processId);

      return {
        id: event.id,
        title: event.title,
        type: event.type,
        status: event.status,
        priority: event.priority,
        date: addDays(today, event.dayOffset).toISOString().slice(0, 10),
        startTime: event.startTime,
        endTime: event.endTime,
        clientId: null,
        client: process?.client ?? 'Cliente não informado',
        processId: event.processId,
        processLabel: `#${event.processId}`,
        processTitle: process?.title ?? '',
        responsible: process?.owner?.email?.split('@')[0] ?? 'sem-responsavel',
        locationOrChannel: event.locationOrChannel,
        notes: event.notes,
        origin: event.origin,
        createdBy: process?.owner?.email?.split('@')[0] ?? 'sem-responsavel',
        attendanceId: null,
        taskId: null,
        isAudience: event.type === 'audiencia',
        isReturn: event.type === 'retorno_agendado',
        isDeadline: event.type === 'prazo_calendario',
        requiresAttention: event.type === 'audiencia' || event.type === 'retorno_agendado' || event.type === 'prazo_calendario',
      };
    });
}

function canAccessCrm(user: UserToken) {
  return ['ADM', 'ADV', 'ATD'].includes(user.role);
}

const crmAuditService = new CrmAuditService(createPrismaCrmAuditRepository({
  crmAuditEvent: prisma.crmAuditEvent,
  crmIdempotencyRequest: prisma.crmIdempotencyRequest,
}));

const crmContactHistoryService = new OpportunityContactHistoryService(
  createPrismaOpportunityContactHistoryRepository({
    crmOpportunity: prisma.crmOpportunity,
  }),
  crmAuditService,
);

const crmOpportunityDocumentsService = new OpportunityDocumentsService(
  createPrismaOpportunityDocumentsRepository({
    crmOpportunity: prisma.crmOpportunity,
    documento: prisma.documento,
    crmOpportunityDocumentAttachment: prisma.crmOpportunityDocumentAttachment,
  }),
  crmAuditService,
);

const crmOpportunityConversionService = new CrmOpportunityConversionService(
  createPrismaOpportunityConversionRepository(prisma),
);

const crmOpportunityProcessLinkService = new CrmOpportunityProcessLinkService(
  createPrismaLinkProcessRepository(prisma),
);
const clientPortalService = new ClientPortalService(
  createPrismaClientPortalRepository(prisma),
);
const clientConsentService = new ClientConsentService(
  createPrismaClientConsentRepository({
    client: prisma.client,
    crmAuditEvent: prisma.crmAuditEvent,
  }),
  crmAuditService,
);
const clientCommunicationService = new ClientCommunicationService(
  createPrismaCommunicationRepository({
    client: prisma.client,
    crmAuditEvent: prisma.crmAuditEvent,
  }),
  crmAuditService,
  createCommunicationDispatcherFromEnv(),
);
const crmProspectingService = new CrmProspectingService(
  createPrismaCrmProspectingRepository({
    client: prisma.client,
    process: prisma.process,
    crmLead: prisma.crmLead,
  }),
  crmAuditService,
);
const documentChecklistService = new ProceduralDocumentChecklistService();
const deadlineRiskService = new DeadlineRiskService();
const deadlineAuditService = new DeadlineAuditService();

function buildCrmActor(decoded: UserToken) {
  return {
    sub: decoded.sub,
    email: decoded.email,
    role: decoded.role,
  };
}

function getCrmContractStatus(error: unknown) {
  if (error instanceof CrmOpportunityContractError) return error.status;
  if (error instanceof CrmAuditContractError) return error.statusCode;
  return null;
}

function getCrmContractCode(error: unknown) {
  if (error instanceof CrmOpportunityContractError) return error.code;
  if (error instanceof CrmAuditContractError) return error.code;
  return null;
}

function deriveBasePriorityScore(item: {
  queueType: string;
  aiScoreRaw?: number | null;
  event?: { riskLevel?: string | null; requiresAction?: boolean | null } | null;
  suggestedAction?: string | null;
}) {
  const aiScore = typeof item.aiScoreRaw === 'number' && Number.isFinite(item.aiScoreRaw)
    ? Math.round(item.aiScoreRaw)
    : null;
  if (aiScore !== null) return aiScore;

  let score = item.queueType === 'critica' ? 85 : item.queueType === 'tratados' ? 20 : 55;
  if (item.event?.requiresAction) score += 10;
  if (item.event?.riskLevel === 'critico') score += 10;
  if (item.event?.riskLevel === 'alto') score += 5;
  if (item.suggestedAction === 'criar_prazo') score += 5;
  return Math.min(score, 100);
}

function getCrmContractDetails(error: unknown) {
  if (error instanceof CrmOpportunityContractError) return error.details;
  if (error instanceof CrmAuditContractError) return error.details;
  return undefined;
}

const documentsStorageRoot = path.join(process.cwd(), 'storage', 'documents');

type DocumentSidecarState = {
  metadata: Record<string, unknown>;
  storage: Record<string, unknown>;
  approval: Record<string, unknown> | null;
  links: Array<{ entityType: string; entityId: number }>;
  artifacts: Array<Record<string, unknown>>;
};

function getFileExtension(fileName: string) {
  const ext = path.extname(fileName || '').trim().toLowerCase();
  return ext && ext.length <= 10 ? ext : '';
}

function computeContentChecksum(contentBase64: string) {
  return createHash('sha256').update(Buffer.from(contentBase64, 'base64')).digest('hex');
}

async function ensureDocumentsStorageRoot() {
  await fs.mkdir(documentsStorageRoot, { recursive: true });
}

async function listDocumentAuditTrail(documentId: number) {
  const [documentEvents, linkSidecarEvents, artifactSidecarEvents] = await Promise.all([
    crmAuditService.list({
      scope: 'documents',
      entityType: 'document',
      entityId: documentId,
      limit: 100,
    }),
    crmAuditService.list({
      scope: 'documents',
      entityType: 'crm_opportunity_document',
      entityId: documentId,
      limit: 100,
    }),
    crmAuditService.list({
      scope: 'documents.artifact.sidecar',
      entityType: 'crm_opportunity_document',
      entityId: documentId,
      limit: 100,
    }),
  ]);

  return [...documentEvents, ...linkSidecarEvents, ...artifactSidecarEvents]
    .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))
    .slice(0, 100);
}

async function hydrateDocumentSidecar(documentId: number): Promise<DocumentSidecarState> {
  const events = await listDocumentAuditTrail(documentId);
  const state: DocumentSidecarState = {
    metadata: {},
    storage: {},
    approval: null,
    links: [],
    artifacts: [],
  };

  for (const event of [...events].reverse()) {
    const details = (event.details ?? {}) as Record<string, unknown>;
    if (details.metadata && typeof details.metadata === 'object' && !Array.isArray(details.metadata)) {
      state.metadata = { ...state.metadata, ...(details.metadata as Record<string, unknown>) };
    }
    if (details.storage && typeof details.storage === 'object' && !Array.isArray(details.storage)) {
      state.storage = { ...state.storage, ...(details.storage as Record<string, unknown>) };
    }
    if (event.action === 'document.approval.update') {
      state.approval = {
        decision: details.decision ?? null,
        reason: details.reason ?? null,
        decidedAt: details.decidedAt ?? event.occurredAt,
        checklist: details.checklist ?? null,
      };
    }
    if (event.action === 'document.link.bindEntities') {
      const links = Array.isArray(details.links) ? details.links : [];
      state.links = links
        .filter((link) => link && typeof link === 'object')
        .map((link) => ({
          entityType: String((link as Record<string, unknown>).entityType ?? ''),
          entityId: Number((link as Record<string, unknown>).entityId ?? 0),
        }))
        .filter((link) => link.entityType && Number.isInteger(link.entityId) && link.entityId > 0);
    }
    if (event.action === 'document.artifact.generate') {
      if (details.metadata && typeof details.metadata === 'object' && !Array.isArray(details.metadata)) {
        state.metadata = { ...state.metadata, ...(details.metadata as Record<string, unknown>) };
      }
      if (details.storage && typeof details.storage === 'object' && !Array.isArray(details.storage)) {
        state.storage = { ...state.storage, ...(details.storage as Record<string, unknown>) };
      }
      state.artifacts.push({
        artifactId: details.artifactId ?? event.id,
        templateId: details.templateId ?? null,
        storageKey: details.storageKey ?? (typeof details.storage === 'object' && details.storage && !Array.isArray(details.storage)
          ? (details.storage as Record<string, unknown>).storageKey ?? null
          : null),
        generatedAt: details.generatedAt ?? event.occurredAt,
        documentId,
      });
    }
  }

  return state;
}

async function recordDocumentAuditEvent(input: {
  documentId: number;
  action: string;
  status: 'success' | 'warning' | 'error';
  summary: string;
  details?: Record<string, unknown>;
  actor: { source: 'user' | 'system' | 'api'; email?: string | null; role?: string | null; userId?: number | null };
  idempotencyKey?: string | null;
}) {
  return crmAuditService.record({
    scope: 'documents',
    entityType: 'document',
    entityId: input.documentId,
    action: input.action,
    status: input.status,
    summary: input.summary,
    details: input.details ?? {},
    actor: input.actor,
    occurredAt: new Date().toISOString(),
    idempotencyKey: input.idempotencyKey ?? null,
  });
}

async function buildDocumentResponse(document: any) {
  const sidecar = await hydrateDocumentSidecar(document.id);
  return {
    ...buildDocumentPayload(document),
    metadata: sidecar.metadata,
    storage: sidecar.storage,
    approval: sidecar.approval,
    links: sidecar.links,
    artifacts: sidecar.artifacts,
  };
}

function createLocalDocumentStorageAdapter() {
  return {
    async store(input: {
      processId: number;
      fileName: string;
      contentBase64: string;
      mimeType: string;
      sizeInBytes: number;
      metadata: Record<string, unknown>;
    }) {
      await ensureDocumentsStorageRoot();
      const checksum = computeContentChecksum(input.contentBase64);
      const extension = getFileExtension(input.fileName);
      const fileName = `${new Date().toISOString().slice(0, 10)}-${input.processId}-${checksum.slice(0, 12)}${extension}`;
      const filePath = path.join(documentsStorageRoot, fileName);

      await fs.writeFile(filePath, Buffer.from(input.contentBase64, 'base64'));

      return {
        storageKey: filePath,
        mimeType: input.mimeType,
        sizeInBytes: input.sizeInBytes,
        checksum,
        previewUrl: null,
      };
    },
  };
}

function createDocumentUploadService() {
  return new DocumentUploadService(
    createLocalDocumentStorageAdapter(),
    {
      async assertProcessExists(processId: number) {
        const process = await prisma.process.findUnique({
          where: { id: processId },
          select: { id: true, phase: true },
        });

        return process
          ? { id: process.id, proceduralType: process.phase ?? null }
          : null;
      },
      async createDocument(input: any) {
        const created = await prisma.documento.create({
          data: {
            processId: input.processId,
            title: input.title,
            description: input.description,
            status: input.status,
            category: input.category,
            origin: input.origin,
            responsible: input.responsible,
            requiredChecklist: input.requiredChecklist,
            pendingForAdvance: input.pendingForAdvance,
            mimeType: input.mimeType,
            previewUrl: input.previewUrl,
            createdBy: input.createdBy,
          },
        });

        await recordDocumentAuditEvent({
          documentId: created.id,
          action: 'document.upload',
          status: 'success',
          summary: `Upload persistido para documento #${created.id}`,
          details: {
            metadata: input.metadata,
            storage: input.storage,
            processId: input.processId,
            version: created.version,
          },
          actor: { source: 'api', role: 'documents' },
          idempotencyKey: typeof input.storage.checksum === 'string' ? input.storage.checksum : null,
        });

        return {
          id: created.id,
          processId: created.processId,
          title: created.title,
          status: created.status,
          category: created.category,
          version: created.version,
          isLatestVersion: created.isLatestVersion,
          mimeType: created.mimeType,
          previewUrl: created.previewUrl,
          metadata: input.metadata,
          storage: input.storage,
        };
      },
    } as any,
  );
}

function createDocumentVersioningService() {
  return new DocumentVersioningService({
    async findById(documentId: number) {
      const document = await prisma.documento.findUnique({ where: { id: documentId } });
      if (!document) return null;
      const sidecar = await hydrateDocumentSidecar(documentId);
      return {
        ...document,
        metadata: sidecar.metadata,
        storage: sidecar.storage,
      };
    },
    async createNextVersion(input: any) {
      await prisma.documento.updateMany({
        where: {
          processId: input.processId,
          title: input.title,
          isLatestVersion: true,
        },
        data: { isLatestVersion: false },
      });

      const created = await prisma.documento.create({
        data: {
          processId: input.processId,
          title: input.title,
          description: input.description,
          status: input.status,
          category: input.category,
          version: input.version,
          isLatestVersion: true,
          origin: input.origin,
          responsible: input.responsible,
          requiredChecklist: input.requiredChecklist,
          pendingForAdvance: input.pendingForAdvance,
          mimeType: input.mimeType,
          previewUrl: input.previewUrl,
          createdBy: null,
        },
      });

      await recordDocumentAuditEvent({
        documentId: created.id,
        action: 'document.version.create',
        status: 'success',
        summary: `Versão ${created.version} criada para documento #${created.id}`,
        details: {
          metadata: input.metadata,
          storage: input.storage,
          version: created.version,
        },
        actor: { source: 'api', role: 'documents' },
      });

      return {
        ...created,
        metadata: input.metadata,
        storage: input.storage,
      };
    },
  } as any);
}

function createDocumentApprovalService() {
  return new DocumentApprovalService({
    async findById(documentId: number) {
      const document = await prisma.documento.findUnique({ where: { id: documentId } });
      if (!document) return null;
      const sidecar = await hydrateDocumentSidecar(documentId);
      return {
        id: document.id,
        processId: document.processId,
        title: document.title,
        status: document.status,
        version: document.version,
        isLatestVersion: document.isLatestVersion,
        metadata: sidecar.metadata,
      };
    },
    async saveDecision(input: any) {
      const nextStatus = input.decision === 'approved' ? 'validado' : 'rejeitado';
      await prisma.documento.update({
        where: { id: input.documentId },
        data: { status: nextStatus },
      });

      await recordDocumentAuditEvent({
        documentId: input.documentId,
        action: 'document.approval.update',
        status: input.decision === 'approved' ? 'success' : 'warning',
        summary: `Documento #${input.documentId} ${input.decision === 'approved' ? 'aprovado' : 'rejeitado'}`,
        details: {
          decision: input.decision,
          reason: input.reason,
          checklist: input.checklist ?? null,
          decidedAt: new Date().toISOString(),
        },
        actor: {
          source: input.actor.source,
          userId: input.actor.userId ?? null,
          email: input.actor.email ?? null,
          role: input.actor.role ?? null,
        },
      });

      return {
        documentId: input.documentId,
        status: nextStatus,
        decision: input.decision,
        reason: input.reason,
        decidedAt: new Date().toISOString(),
        checklist: input.checklist,
      };
    },
  } as any, documentChecklistService);
}

function createDocumentLinksService() {
  return new DocumentLinksService(
    createPrismaDocumentLinksRepository({
      document: prisma.documento as any,
      process: prisma.process as any,
      deadline: prisma.prazo as any,
      attendance: prisma.atendimento as any,
      triageItem: prisma.triageItem as any,
      crmOpportunity: prisma.crmOpportunity as any,
      auditEvent: prisma.crmAuditEvent as any,
    }),
    {
      idempotencyService: crmAuditService,
    },
  );
}

function createDocumentArtifactsService() {
  return new DocumentArtifactsService(
    {
      async generate(input) {
        const lines = Object.entries(input.payload ?? {})
          .map(([key, value]) => `${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`);
        const content = [
          `Template: ${input.templateId}`,
          `Processo: ${input.processId}`,
          `Documento: ${input.documentTitle}`,
          '',
          ...lines,
        ].join('\n');

        return {
          fileName: `${input.documentTitle}.txt`,
          mimeType: 'text/plain',
          contentBase64: Buffer.from(content, 'utf8').toString('base64'),
          previewUrl: null,
          metadata: { generatedFrom: 'template-runtime' },
        };
      },
    },
    {
      async store(input) {
        await ensureDocumentsStorageRoot();
        const checksum = computeContentChecksum(input.contentBase64);
        const extension = getFileExtension(input.fileName) || '.txt';
        const fileName = `${new Date().toISOString().slice(0, 10)}-${input.processId}-${checksum.slice(0, 12)}${extension}`;
        const filePath = path.join(documentsStorageRoot, fileName);

        await fs.writeFile(filePath, Buffer.from(input.contentBase64, 'base64'));

        return {
          storageKey: filePath,
          mimeType: input.mimeType,
          sizeInBytes: Buffer.from(input.contentBase64, 'base64').byteLength,
          checksum,
          previewUrl: null,
        };
      },
    },
    createPrismaDocumentArtifactsRepository({
      process: prisma.process as any,
      auditEvent: prisma.crmAuditEvent as any,
      document: prisma.documento as any,
    }),
    {
      idempotencyService: crmAuditService,
    },
  );
}

function buildDeadlineActor(decoded: UserToken) {
  return `user:${decoded.sub}` as const;
}

function buildDeadlineRisk(deadline: {
  id: number;
  processId: number;
  title: string;
  dueDate: Date;
  status: string;
  priority: string;
  origin?: string | null;
  legalArea?: string | null;
  publicationId?: number | null;
  agendaEventId?: number | null;
  agendaSyncStatus?: string | null;
  completedAt?: Date | null;
}) {
  return deadlineRiskService.evaluate({
    id: deadline.id,
    processId: deadline.processId,
    title: deadline.title,
    dueDate: deadline.dueDate.toISOString().slice(0, 10),
    status: deadline.status,
    priority: deadline.priority,
    origin: deadline.origin ?? 'interno',
    publicationId: deadline.publicationId ?? null,
    processPhase: deadline.legalArea ?? null,
    agendaEventId: deadline.agendaEventId ? String(deadline.agendaEventId) : null,
    agendaSyncStatus: (deadline.agendaSyncStatus as any) ?? (deadline.agendaEventId ? 'synced' : 'missing'),
    completedAt: deadline.completedAt ? deadline.completedAt.toISOString() : null,
  });
}

async function persistDeadlineAuditEvent(event: {
  eventType: string;
  status: string;
  deadlineId: number;
  processId: number | null;
  publicationId: number | null;
  occurredAt: string;
  actor: string;
  details: Record<string, unknown>;
}) {
  await prisma.crmAuditEvent.create({
    data: {
      id: `deadline:${event.eventType}:${event.deadlineId}:${Date.now()}`,
      scope: 'audit.event',
      entityType: 'deadline',
      entityId: event.deadlineId,
      action: event.eventType,
      status: event.status,
      summary: `${event.eventType} para prazo #${event.deadlineId}`,
      details: event.details,
      actor: { source: 'system', email: event.actor, role: 'deadline' },
      occurredAt: event.occurredAt,
      correlationId: null,
      idempotencyKey: null,
      createdAt: new Date().toISOString(),
    },
  });
}

const OPPORTUNITY_STAGE_SEQUENCE = ['acao_recomendada', 'em_contato', 'proposta_enviada', 'negociacao', 'ganha', 'perdida'] as const;

function parseOptionalDateTime(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'invalid' as const;
  return parsed;
}

function resolveOpportunityStatus(value: unknown, fallback: string) {
  if (typeof value !== 'string' || !value.trim()) return fallback;
  return value.trim();
}

function validateOpportunityCommercialRules(input: {
  currentStatus: string;
  nextStatus: string;
  responsible: string | null;
  nextContactAt: Date | null;
}) {
  const { currentStatus, nextStatus, responsible, nextContactAt } = input;
  const currentIndex = OPPORTUNITY_STAGE_SEQUENCE.indexOf(currentStatus as typeof OPPORTUNITY_STAGE_SEQUENCE[number]);
  const nextIndex = OPPORTUNITY_STAGE_SEQUENCE.indexOf(nextStatus as typeof OPPORTUNITY_STAGE_SEQUENCE[number]);

  if (nextStatus === 'em_contato' && !nextContactAt) {
    return 'O estágio em_contato exige próximo contato preenchido.';
  }

  if (nextStatus !== 'acao_recomendada' && !responsible) {
    return 'Defina um responsável para avançar a oportunidade.';
  }

  if (currentIndex >= 0 && nextIndex >= 0 && nextIndex > currentIndex + 1) {
    return 'Avanço inválido: mova a oportunidade etapa por etapa.';
  }

  return null;
}

function getResponsibleLabel(email?: string | null) {
  if (!email) return null;
  return email.split('@')[0];
}

function normalizeProcessNumber(value?: string | null) {
  return (value ?? '').replace(/\D/g, '');
}

function formatDateLabel(date: Date) {
  return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

function addDays(base: Date, amount: number) {
  const next = new Date(base);
  next.setUTCDate(next.getUTCDate() + amount);
  return next;
}

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}

async function collectExistingAutomationDedupeKeys(triageItem: {
  id: number;
  processId: number | null;
  event?: { publicationId?: number | null } | null;
}) {
  if (!triageItem.processId) return new Set<string>();

  const priorDecisions = await prisma.triageDecision.findMany({
    where: {
      triageItemId: triageItem.id,
      OR: [
        { generatedTaskId: { not: null } },
        { generatedDeadlineId: { not: null } },
      ],
    },
    select: {
      generatedTaskId: true,
      generatedDeadlineId: true,
    },
  });

  if (!priorDecisions.length) return new Set<string>();

  const publicationRef = triageItem.event?.publicationId
    ? `pub:${triageItem.event.publicationId}`
    : `triage:${triageItem.id}`;
  const dedupeKeys = new Set<string>();

  if (priorDecisions.some((decision: any) => decision.generatedTaskId && decision.generatedDeadlineId)) {
    dedupeKeys.add(`${publicationRef}|process:${triageItem.processId}|deadline-and-task`);
  }

  if (priorDecisions.some((decision: any) => decision.generatedTaskId && !decision.generatedDeadlineId)) {
    dedupeKeys.add(`${publicationRef}|process:${triageItem.processId}|task`);
  }

  return dedupeKeys;
}

function buildTriageQueueSnapshot(item: any) {
  return {
    id: item.id,
    queueType: item.queueType,
    status: item.status,
    createdAt: item.createdAt,
    priorityScore: deriveBasePriorityScore(item),
    priorityReasons: [item.suggestedReason],
    sourceType: item.capture?.sourceType ?? item.sourceLabel ?? 'triage',
    postponeUntil: item.postponeUntil ?? null,
    slaTargetAt: item.slaTargetAt ?? null,
  };
}

async function executeTriageAutomationCommand(params: {
  command: any;
  triageItem: any;
  actor: string;
}) {
  const payload = params.command?.payload ?? params.command ?? {};
  const commandType = payload.commandType ?? params.command?.type ?? null;

  if (commandType === 'create_deadline_and_task' && params.triageItem.processId) {
    const deadline = await prisma.prazo.create({
      data: {
        processId: params.triageItem.processId,
        title: payload.deadline?.title || params.triageItem.event?.title || `Prazo derivado da triagem #${params.triageItem.id}`,
        dueDate: new Date(`${payload.deadline?.dueDate}T12:00:00`),
        status: 'critico',
        priority: payload.deadline?.priority || 'alta',
        origin: 'publicacao',
        responsible: params.actor,
        legalArea: params.triageItem.process?.phase || null,
        notes: payload.deadline?.notes || params.triageItem.suggestedReason,
        createdBy: params.actor,
      },
    });

    const task = await prisma.task.create({
      data: {
        title: payload.task?.title || `Tratar ${params.triageItem.event?.title?.toLowerCase() || 'publicação crítica'}`,
        description: payload.task?.description || params.triageItem.suggestedReason,
        processId: params.triageItem.processId,
        clientId: params.triageItem.clientId,
        clientName: params.triageItem.clientRecord?.name || params.triageItem.process?.client || null,
        origin: 'publicacao',
        dueDate: new Date(`${payload.task?.dueDate}T12:00:00`),
        status: 'pendente',
        priority: payload.task?.priority || 'alta',
        owner: payload.task?.owner || params.actor,
        createdBy: params.actor,
        notes: params.triageItem.capture.normalizedText,
        linkedToDeadline: true,
        linkedToPublication: true,
        immediateAction: true,
      },
    });

    return { entityId: `${deadline.id}:${task.id}` };
  }

  if (commandType === 'create_task' && params.triageItem.processId) {
    const task = await prisma.task.create({
      data: {
        title: payload.task?.title || params.triageItem.event?.title || `Ação derivada da triagem #${params.triageItem.id}`,
        description: payload.task?.description || params.triageItem.suggestedReason,
        processId: params.triageItem.processId,
        clientId: params.triageItem.clientId,
        clientName: params.triageItem.clientRecord?.name || params.triageItem.process?.client || null,
        origin: 'publicacao',
        dueDate: new Date(`${payload.task?.dueDate}T12:00:00`),
        status: 'pendente',
        priority: payload.task?.priority || (params.triageItem.queueType === 'critica' ? 'alta' : 'media'),
        owner: payload.task?.owner || params.actor,
        createdBy: params.actor,
        notes: params.triageItem.capture.normalizedText,
        linkedToPublication: true,
        immediateAction: params.triageItem.queueType === 'critica',
      },
    });

    return { entityId: task.id };
  }

  const error = new Error('Falha inesperada na automacao.');
  (error as Error & { code?: string }).code = 'TRIAGE_AUTOMATION_FAILED';
  throw error;
}

function createCaptureFingerprint(parts: Array<string | number | null | undefined>) {
  return parts
    .map((part) => String(part ?? '').trim().toLowerCase())
    .join('|')
    .replace(/\s+/g, ' ')
    .slice(0, 400);
}

function getScheduledHours() {
  return [6, 12, 18];
}

function computeNextScheduleDate(from = new Date()) {
  const next = new Date(from);
  const hours = getScheduledHours();
  const currentHour = from.getHours();
  const currentMinute = from.getMinutes();

  const nextHour = hours.find((hour) => hour > currentHour || (hour === currentHour && currentMinute === 0));
  if (typeof nextHour === 'number') {
    next.setHours(nextHour, 0, 0, 0);
    if (next <= from) {
      next.setHours(nextHour + 6, 0, 0, 0);
    }
    return next;
  }

  next.setDate(next.getDate() + 1);
  next.setHours(hours[0], 0, 0, 0);
  return next;
}

async function ingestCnjPublications(triggeredBy: string) {
  const candidates = await prisma.process.findMany({
    where: { processNumber: { not: null } },
    include: { clientRecord: true },
    orderBy: { id: 'asc' },
  });

  const sourceJob = await prisma.publicationSourceJob.create({
    data: {
      sourceType: 'cnj',
      scheduledFor: new Date(),
      startedAt: new Date(),
      status: 'running',
    },
  });

  let itemsCaptured = 0;
  let itemsCreated = 0;
  let itemsUpdated = 0;
  let itemsFlaggedCritical = 0;
  let itemsSentToCrm = 0;

  try {
    const captures = await collectCnjPublications(
      candidates.map((process: any) => ({
        processNumber: process.processNumber,
        clientName: process.client,
        cpf: process.clientRecord?.cpfCnpj ?? null,
      })),
    );

    const processes = candidates.map((process: any) => ({
      id: process.id,
      title: process.title,
      processNumber: process.processNumber,
      client: process.client,
      clientId: process.clientId ?? process.clientRecord?.id ?? null,
    }));

    const clients = await clientStore.findMany({
      select: { id: true, cpfCnpj: true, name: true },
    });

    itemsCaptured = captures.length;

    for (const capturePayload of captures) {
      const fingerprint = createCaptureFingerprint([
        'cnj',
        capturePayload.sourceReference,
        capturePayload.processNumber,
        capturePayload.occurredAt,
        capturePayload.rawText,
      ]);

      let capture = await prisma.publicationCapture.findUnique({
        where: { fingerprint },
      });

      if (capture) {
        capture = await prisma.publicationCapture.update({
          where: { id: capture.id },
          data: {
            sourceReference: capturePayload.sourceReference,
            occurredAt: new Date(capturePayload.occurredAt),
            tribunal: capturePayload.tribunal,
            processNumber: capturePayload.processNumber,
            cpf: capturePayload.cpf ?? null,
            personName: capturePayload.personName ?? null,
            rawText: capturePayload.rawText,
            normalizedText: capturePayload.rawText,
            status: 'atualizado',
            sourceJobId: sourceJob.id,
          },
        });
        itemsUpdated += 1;
      } else {
        capture = await prisma.publicationCapture.create({
          data: {
            sourceType: 'cnj',
            sourceReference: capturePayload.sourceReference,
            occurredAt: new Date(capturePayload.occurredAt),
            rawText: capturePayload.rawText,
            normalizedText: capturePayload.rawText,
            tribunal: capturePayload.tribunal,
            processNumber: capturePayload.processNumber,
            cpf: capturePayload.cpf ?? null,
            personName: capturePayload.personName ?? null,
            metadataJson: { triggeredBy, source: 'cnj' },
            fingerprint,
            status: 'processado',
            sourceJobId: sourceJob.id,
          },
        });
        itemsCreated += 1;
      }

      const target = resolveTriageTarget(
        {
          processNumber: capturePayload.processNumber,
          cpf: capturePayload.cpf ?? null,
          sourceType: 'cnj',
          normalizedText: capturePayload.rawText,
        },
        processes,
        clients,
      );

      const history = target.processId
        ? await prisma.publicationEvent.findMany({
            where: { processId: target.processId },
            orderBy: { eventAt: 'desc' },
            take: 5,
          })
        : [];

      const classification = await classifyTriageItem({
        sourceType: 'cnj',
        normalizedText: capturePayload.rawText,
        processTitle: target.processId ? processes.find((process: any) => process.id === target.processId)?.title ?? null : null,
        clientName: capturePayload.personName ?? null,
        historicalEvents: history.map((event: any) => ({ title: event.title, summary: event.summary, riskLevel: event.riskLevel })),
        processId: target.processId,
        clientId: target.clientId,
        hasExistingClient: Boolean(target.clientId),
      });
      const queueType = classification.queueType;
      const suggestedAction = classification.suggestedAction;

      if (queueType === 'critica') itemsFlaggedCritical += 1;

      const existingEvent = await prisma.publicationEvent.findFirst({
        where: {
          captureId: capture.id,
          title: capturePayload.title,
          eventAt: new Date(capturePayload.occurredAt),
        },
      });

      const event = existingEvent ?? await prisma.publicationEvent.create({
        data: {
          captureId: capture.id,
          processId: target.processId,
          clientId: target.clientId,
          eventType: capturePayload.title.toLowerCase().includes('sentença') ? 'sentenca' : 'publicacao',
          eventAt: new Date(capturePayload.occurredAt),
          title: capturePayload.title,
          summary: capturePayload.summary,
          fullText: capturePayload.rawText,
          riskLevel: queueType === 'critica' ? 'critico' : 'normal',
          requiresAction: true,
          timelinePosition: 1,
        },
      });

      let crmLeadId: number | null = null;
      let crmOpportunityId: number | null = null;

      if (suggestedAction === 'criar_oportunidade') {
        const opportunity = await prisma.crmOpportunity.create({
          data: {
            clientId: target.clientId,
            cpf: capturePayload.cpf ?? null,
            personName: capturePayload.personName || 'Cliente identificado',
            source: 'publicacao_automatizada',
            status: 'acao_recomendada',
            summary: capturePayload.summary,
          },
        });
        crmOpportunityId = opportunity.id;
        itemsSentToCrm += 1;
      } else if (suggestedAction === 'criar_lead') {
        const lead = await prisma.crmLead.create({
          data: {
            clientId: target.clientId,
            cpf: capturePayload.cpf ?? null,
            personName: capturePayload.personName || 'Lead identificado',
            source: 'publicacao_automatizada',
            status: 'novo',
            summary: capturePayload.summary,
          },
        });
        crmLeadId = lead.id;
        itemsSentToCrm += 1;
      }

      const existingTriage = await prisma.triageItem.findFirst({
        where: {
          captureId: capture.id,
          suggestedAction,
          processId: target.processId,
          clientId: target.clientId,
          status: { in: ['pendente', 'em_revisao_manual', 'adiado'] },
        },
      });

      if (existingTriage) {
        await prisma.triageItem.update({
          where: { id: existingTriage.id },
          data: {
            eventId: event.id,
            queueType,
            suggestedReason: classification.suggestedReason,
            sourceLabel: 'CNJ',
            aiConfidenceBand: classification.aiConfidenceBand,
            aiScoreRaw: classification.aiScoreRaw,
            crmLeadId: crmLeadId ?? existingTriage.crmLeadId,
            crmOpportunityId: crmOpportunityId ?? existingTriage.crmOpportunityId,
          },
        });
      } else {
        await prisma.triageItem.create({
          data: {
            captureId: capture.id,
            eventId: event.id,
            processId: target.processId,
            clientId: target.clientId,
            crmLeadId,
            crmOpportunityId,
            queueType,
            status: 'pendente',
            suggestedAction,
            suggestedReason: classification.suggestedReason,
            aiConfidenceBand: classification.aiConfidenceBand,
            aiScoreRaw: classification.aiScoreRaw,
            sourceLabel: 'CNJ',
          },
        });
      }
    }

    await prisma.publicationSourceJob.update({
      where: { id: sourceJob.id },
      data: {
        finishedAt: new Date(),
        status: 'success',
        itemsCaptured,
        itemsCreated,
        itemsUpdated,
        itemsFlaggedCritical,
        itemsSentToCrm,
      },
    });

    return {
      sourceJobId: sourceJob.id,
      itemsCaptured,
      itemsCreated,
      itemsUpdated,
      itemsFlaggedCritical,
      itemsSentToCrm,
    };
  } catch (error) {
    await prisma.publicationSourceJob.update({
      where: { id: sourceJob.id },
      data: {
        finishedAt: new Date(),
        status: 'failed',
        itemsCaptured,
        itemsCreated,
        itemsUpdated,
        itemsFlaggedCritical,
        itemsSentToCrm,
        errorLog: error instanceof Error ? error.message : 'Erro desconhecido na coleta CNJ',
      },
    });
    throw error;
  }
}

async function ingestCpfPublications(triggeredBy: string) {
  const clients = await clientStore.findMany({
    include: {
      processes: {
        where: { status: 'ativo' },
        select: { id: true },
      },
    },
    orderBy: { id: 'asc' },
  });

  const candidates = clients
    .filter((client: any) => Boolean(client.cpfCnpj))
    .map((client: any) => ({
      clientId: client.id,
      clientName: client.name,
      cpf: client.cpfCnpj,
      hasActiveProcess: client.processes.length > 0,
    }));

  const sourceJob = await prisma.publicationSourceJob.create({
    data: {
      sourceType: 'cpf',
      scheduledFor: new Date(),
      startedAt: new Date(),
      status: 'running',
    },
  });

  let itemsCaptured = 0;
  let itemsCreated = 0;
  let itemsUpdated = 0;
  let itemsFlaggedCritical = 0;
  let itemsSentToCrm = 0;

  try {
    const captures = await collectCpfPublications(candidates);
    itemsCaptured = captures.length;

    for (const capturePayload of captures) {
      const matchedClient = clients.find((client: any) => client.cpfCnpj === capturePayload.cpf);
      const fingerprint = createCaptureFingerprint([
        'cpf',
        capturePayload.sourceReference,
        capturePayload.cpf,
        capturePayload.occurredAt,
        capturePayload.rawText,
      ]);

      let capture = await prisma.publicationCapture.findUnique({
        where: { fingerprint },
      });

      if (capture) {
        capture = await prisma.publicationCapture.update({
          where: { id: capture.id },
          data: {
            sourceReference: capturePayload.sourceReference,
            occurredAt: new Date(capturePayload.occurredAt),
            tribunal: capturePayload.tribunal,
            cpf: capturePayload.cpf,
            personName: capturePayload.personName,
            rawText: capturePayload.rawText,
            normalizedText: capturePayload.rawText,
            status: 'atualizado',
            sourceJobId: sourceJob.id,
          },
        });
        itemsUpdated += 1;
      } else {
        capture = await prisma.publicationCapture.create({
          data: {
            sourceType: 'cpf',
            sourceReference: capturePayload.sourceReference,
            occurredAt: new Date(capturePayload.occurredAt),
            rawText: capturePayload.rawText,
            normalizedText: capturePayload.rawText,
            tribunal: capturePayload.tribunal,
            cpf: capturePayload.cpf,
            personName: capturePayload.personName,
            metadataJson: { triggeredBy, source: 'cpf' },
            fingerprint,
            status: 'processado',
            sourceJobId: sourceJob.id,
          },
        });
        itemsCreated += 1;
      }

      const existingEvent = await prisma.publicationEvent.findFirst({
        where: {
          captureId: capture.id,
          title: capturePayload.title,
          eventAt: new Date(capturePayload.occurredAt),
        },
      });

      const classification = await classifyTriageItem({
        sourceType: 'cpf',
        normalizedText: capturePayload.rawText,
        processTitle: null,
        clientName: capturePayload.personName,
        historicalEvents: [],
        processId: null,
        clientId: matchedClient?.id ?? null,
        hasExistingClient: Boolean(matchedClient),
      });

      if (classification.queueType === 'critica') itemsFlaggedCritical += 1;

      const event = existingEvent ?? await prisma.publicationEvent.create({
        data: {
          captureId: capture.id,
          clientId: matchedClient?.id ?? null,
          eventType: 'publicacao',
          eventAt: new Date(capturePayload.occurredAt),
          title: capturePayload.title,
          summary: capturePayload.summary,
          fullText: capturePayload.rawText,
          riskLevel: classification.queueType === 'critica' ? 'critico' : 'normal',
          requiresAction: true,
          timelinePosition: 1,
        },
      });

      let crmOpportunityId: number | null = null;
      let crmLeadId: number | null = null;

      if (matchedClient) {
        const opportunity = await prisma.crmOpportunity.create({
          data: {
            clientId: matchedClient.id,
            cpf: capturePayload.cpf,
            personName: capturePayload.personName,
            source: 'publicacao_automatizada',
            status: 'acao_recomendada',
            summary: capturePayload.summary,
          },
        });
        crmOpportunityId = opportunity.id;
      } else {
        const lead = await prisma.crmLead.create({
          data: {
            cpf: capturePayload.cpf,
            personName: capturePayload.personName,
            source: 'publicacao_automatizada',
            status: 'novo',
            summary: capturePayload.summary,
          },
        });
        crmLeadId = lead.id;
      }

      itemsSentToCrm += 1;

      const existingTriage = await prisma.triageItem.findFirst({
        where: {
          captureId: capture.id,
          suggestedAction: classification.suggestedAction,
          clientId: matchedClient?.id ?? null,
          status: { in: ['pendente', 'em_revisao_manual', 'adiado'] },
        },
      });

      if (existingTriage) {
        await prisma.triageItem.update({
          where: { id: existingTriage.id },
          data: {
            eventId: event.id,
            queueType: classification.queueType,
            suggestedReason: classification.suggestedReason,
            sourceLabel: 'CPF',
            aiConfidenceBand: classification.aiConfidenceBand,
            aiScoreRaw: classification.aiScoreRaw,
            crmLeadId: crmLeadId ?? existingTriage.crmLeadId,
            crmOpportunityId: crmOpportunityId ?? existingTriage.crmOpportunityId,
          },
        });
      } else {
        await prisma.triageItem.create({
          data: {
            captureId: capture.id,
            eventId: event.id,
            clientId: matchedClient?.id ?? null,
            crmLeadId,
            crmOpportunityId,
            queueType: classification.queueType,
            status: 'pendente',
            suggestedAction: classification.suggestedAction,
            suggestedReason: classification.suggestedReason,
            aiConfidenceBand: classification.aiConfidenceBand,
            aiScoreRaw: classification.aiScoreRaw,
            sourceLabel: 'CPF',
          },
        });
      }
    }

    await prisma.publicationSourceJob.update({
      where: { id: sourceJob.id },
      data: {
        finishedAt: new Date(),
        status: 'success',
        itemsCaptured,
        itemsCreated,
        itemsUpdated,
        itemsFlaggedCritical,
        itemsSentToCrm,
      },
    });

    return {
      sourceJobId: sourceJob.id,
      itemsCaptured,
      itemsCreated,
      itemsUpdated,
      itemsFlaggedCritical,
      itemsSentToCrm,
    };
  } catch (error) {
    await prisma.publicationSourceJob.update({
      where: { id: sourceJob.id },
      data: {
        finishedAt: new Date(),
        status: 'failed',
        itemsCaptured,
        itemsCreated,
        itemsUpdated,
        itemsFlaggedCritical,
        itemsSentToCrm,
        errorLog: error instanceof Error ? error.message : 'Erro desconhecido na coleta CPF',
      },
    });
    throw error;
  }
}

async function ingestDiarioPublications(triggeredBy: string) {
  const candidates = await prisma.process.findMany({
    where: { processNumber: { not: null } },
    include: { clientRecord: true },
    orderBy: { id: 'asc' },
  });

  const sourceJob = await prisma.publicationSourceJob.create({
    data: {
      sourceType: 'diario_oficial',
      scheduledFor: new Date(),
      startedAt: new Date(),
      status: 'running',
    },
  });

  let itemsCaptured = 0;
  let itemsCreated = 0;
  let itemsUpdated = 0;
  let itemsFlaggedCritical = 0;
  let itemsSentToCrm = 0;

  try {
    const captures = await collectDiarioPublications(
      candidates.map((process: any) => ({
        processId: process.id,
        processNumber: process.processNumber,
        clientName: process.client,
        cpf: process.clientRecord?.cpfCnpj ?? null,
        tribunalHint: process.status === 'ativo' ? 'TJSP' : 'TRT-2',
      })),
    );

    const processes = candidates.map((process: any) => ({
      id: process.id,
      title: process.title,
      processNumber: process.processNumber,
      client: process.client,
      clientId: process.clientId ?? process.clientRecord?.id ?? null,
    }));

    const clients = await clientStore.findMany({
      select: { id: true, cpfCnpj: true, name: true },
    });

    itemsCaptured = captures.length;

    for (const capturePayload of captures) {
      const fingerprint = createCaptureFingerprint([
        'diario',
        capturePayload.sourceReference,
        capturePayload.processNumber,
        capturePayload.occurredAt,
        capturePayload.rawText,
      ]);

      let capture = await prisma.publicationCapture.findUnique({
        where: { fingerprint },
      });

      if (capture) {
        capture = await prisma.publicationCapture.update({
          where: { id: capture.id },
          data: {
            sourceReference: capturePayload.sourceReference,
            occurredAt: new Date(capturePayload.occurredAt),
            tribunal: capturePayload.tribunal,
            processNumber: capturePayload.processNumber,
            cpf: capturePayload.cpf ?? null,
            personName: capturePayload.personName ?? null,
            rawText: capturePayload.rawText,
            normalizedText: capturePayload.rawText,
            status: 'atualizado',
            sourceJobId: sourceJob.id,
          },
        });
        itemsUpdated += 1;
      } else {
        capture = await prisma.publicationCapture.create({
          data: {
            sourceType: 'diario_oficial',
            sourceReference: capturePayload.sourceReference,
            occurredAt: new Date(capturePayload.occurredAt),
            rawText: capturePayload.rawText,
            normalizedText: capturePayload.rawText,
            tribunal: capturePayload.tribunal,
            processNumber: capturePayload.processNumber,
            cpf: capturePayload.cpf ?? null,
            personName: capturePayload.personName ?? null,
            metadataJson: { triggeredBy, source: 'diario_oficial' },
            fingerprint,
            status: 'processado',
            sourceJobId: sourceJob.id,
          },
        });
        itemsCreated += 1;
      }

      const target = resolveTriageTarget(
        {
          processNumber: capturePayload.processNumber,
          cpf: capturePayload.cpf ?? null,
          sourceType: 'diario_oficial',
          normalizedText: capturePayload.rawText,
        },
        processes,
        clients,
      );

      const history = target.processId
        ? await prisma.publicationEvent.findMany({
            where: { processId: target.processId },
            orderBy: { eventAt: 'desc' },
            take: 5,
          })
        : [];

      const classification = await classifyTriageItem({
        sourceType: 'diario_oficial',
        normalizedText: capturePayload.rawText,
        processTitle: target.processId ? processes.find((process: any) => process.id === target.processId)?.title ?? null : null,
        clientName: capturePayload.personName ?? null,
        historicalEvents: history.map((event: any) => ({ title: event.title, summary: event.summary, riskLevel: event.riskLevel })),
        processId: target.processId,
        clientId: target.clientId,
        hasExistingClient: Boolean(target.clientId),
      });
      const queueType = classification.queueType;
      const suggestedAction = classification.suggestedAction;

      if (queueType === 'critica') itemsFlaggedCritical += 1;

      const existingEvent = await prisma.publicationEvent.findFirst({
        where: {
          captureId: capture.id,
          title: capturePayload.title,
          eventAt: new Date(capturePayload.occurredAt),
        },
      });

      const event = existingEvent ?? await prisma.publicationEvent.create({
        data: {
          captureId: capture.id,
          processId: target.processId,
          clientId: target.clientId,
          eventType: capturePayload.title.toLowerCase().includes('despacho') ? 'intimacao' : 'publicacao',
          eventAt: new Date(capturePayload.occurredAt),
          title: capturePayload.title,
          summary: capturePayload.summary,
          fullText: capturePayload.rawText,
          riskLevel: queueType === 'critica' ? 'critico' : 'normal',
          requiresAction: true,
          timelinePosition: 1,
        },
      });

      const existingTriage = await prisma.triageItem.findFirst({
        where: {
          captureId: capture.id,
          suggestedAction,
          processId: target.processId,
          clientId: target.clientId,
          status: { in: ['pendente', 'em_revisao_manual', 'adiado'] },
        },
      });

      if (existingTriage) {
        await prisma.triageItem.update({
          where: { id: existingTriage.id },
          data: {
            eventId: event.id,
            queueType,
            suggestedReason: classification.suggestedReason,
            sourceLabel: 'Diário Oficial',
            aiConfidenceBand: classification.aiConfidenceBand,
            aiScoreRaw: classification.aiScoreRaw,
          },
        });
      } else {
        await prisma.triageItem.create({
          data: {
            captureId: capture.id,
            eventId: event.id,
            processId: target.processId,
            clientId: target.clientId,
            queueType,
            status: 'pendente',
            suggestedAction,
            suggestedReason: classification.suggestedReason,
            aiConfidenceBand: classification.aiConfidenceBand,
            aiScoreRaw: classification.aiScoreRaw,
            sourceLabel: 'Diário Oficial',
          },
        });
      }
    }

    await prisma.publicationSourceJob.update({
      where: { id: sourceJob.id },
      data: {
        finishedAt: new Date(),
        status: 'success',
        itemsCaptured,
        itemsCreated,
        itemsUpdated,
        itemsFlaggedCritical,
        itemsSentToCrm,
      },
    });

    return {
      sourceJobId: sourceJob.id,
      itemsCaptured,
      itemsCreated,
      itemsUpdated,
      itemsFlaggedCritical,
      itemsSentToCrm,
    };
  } catch (error) {
    await prisma.publicationSourceJob.update({
      where: { id: sourceJob.id },
      data: {
        finishedAt: new Date(),
        status: 'failed',
        itemsCaptured,
        itemsCreated,
        itemsUpdated,
        itemsFlaggedCritical,
        itemsSentToCrm,
        errorLog: error instanceof Error ? error.message : 'Erro desconhecido na coleta de diário oficial',
      },
    });
    throw error;
  }
}

async function ingestOabPublications(triggeredBy: string) {
  const candidates = await prisma.process.findMany({
    where: { processNumber: { not: null } },
    include: { owner: { select: { email: true } } },
    orderBy: { id: 'asc' },
  });

  const sourceJob = await prisma.publicationSourceJob.create({
    data: {
      sourceType: 'oab',
      scheduledFor: new Date(),
      startedAt: new Date(),
      status: 'running',
    },
  });

  let itemsCaptured = 0;
  let itemsCreated = 0;
  let itemsUpdated = 0;
  let itemsFlaggedCritical = 0;
  let itemsSentToCrm = 0;

  try {
    const captures = await collectOabPublications(
      candidates.map((process: any) => ({
        processId: process.id,
        processNumber: process.processNumber,
        clientName: process.client,
        lawyerName: getResponsibleLabel(process.owner?.email) || 'advogado',
        oabNumber: `SP${String(process.id).padStart(6, '0')}`,
      })),
    );

    const processes = candidates.map((process: any) => ({
      id: process.id,
      title: process.title,
      processNumber: process.processNumber,
      client: process.client,
      clientId: process.clientId ?? null,
    }));

    const clients = await clientStore.findMany({
      select: { id: true, cpfCnpj: true, name: true },
    });

    itemsCaptured = captures.length;

    for (const capturePayload of captures) {
      const fingerprint = createCaptureFingerprint([
        'oab',
        capturePayload.sourceReference,
        capturePayload.oabNumber,
        capturePayload.processNumber,
        capturePayload.occurredAt,
        capturePayload.rawText,
      ]);

      let capture = await prisma.publicationCapture.findUnique({
        where: { fingerprint },
      });

      if (capture) {
        capture = await prisma.publicationCapture.update({
          where: { id: capture.id },
          data: {
            sourceReference: capturePayload.sourceReference,
            occurredAt: new Date(capturePayload.occurredAt),
            tribunal: capturePayload.tribunal,
            processNumber: capturePayload.processNumber || null,
            oabNumber: capturePayload.oabNumber,
            personName: capturePayload.personName ?? null,
            lawyerName: capturePayload.lawyerName ?? null,
            rawText: capturePayload.rawText,
            normalizedText: capturePayload.rawText,
            status: 'atualizado',
            sourceJobId: sourceJob.id,
          },
        });
        itemsUpdated += 1;
      } else {
        capture = await prisma.publicationCapture.create({
          data: {
            sourceType: 'oab',
            sourceReference: capturePayload.sourceReference,
            occurredAt: new Date(capturePayload.occurredAt),
            rawText: capturePayload.rawText,
            normalizedText: capturePayload.rawText,
            tribunal: capturePayload.tribunal,
            processNumber: capturePayload.processNumber || null,
            oabNumber: capturePayload.oabNumber,
            personName: capturePayload.personName ?? null,
            lawyerName: capturePayload.lawyerName ?? null,
            metadataJson: { triggeredBy, source: 'oab' },
            fingerprint,
            status: 'processado',
            sourceJobId: sourceJob.id,
          },
        });
        itemsCreated += 1;
      }

      const target = resolveTriageTarget(
        {
          processNumber: capturePayload.processNumber || null,
          cpf: null,
          sourceType: 'oab',
          normalizedText: capturePayload.rawText,
        },
        processes,
        clients,
      );

      const history = target.processId
        ? await prisma.publicationEvent.findMany({
            where: { processId: target.processId },
            orderBy: { eventAt: 'desc' },
            take: 5,
          })
        : [];

      const classification = await classifyTriageItem({
        sourceType: 'oab',
        normalizedText: capturePayload.rawText,
        processTitle: target.processId ? processes.find((process: any) => process.id === target.processId)?.title ?? null : null,
        clientName: capturePayload.personName ?? null,
        historicalEvents: history.map((event: any) => ({ title: event.title, summary: event.summary, riskLevel: event.riskLevel })),
        processId: target.processId,
        clientId: target.clientId,
        hasExistingClient: Boolean(target.clientId),
      });
      const queueType = classification.queueType;
      const suggestedAction = classification.suggestedAction;

      if (queueType === 'critica') itemsFlaggedCritical += 1;

      const existingEvent = await prisma.publicationEvent.findFirst({
        where: {
          captureId: capture.id,
          title: capturePayload.title,
          eventAt: new Date(capturePayload.occurredAt),
        },
      });

      const event = existingEvent ?? await prisma.publicationEvent.create({
        data: {
          captureId: capture.id,
          processId: target.processId,
          clientId: target.clientId,
          eventType: capturePayload.title.toLowerCase().includes('intimação') ? 'intimacao' : 'publicacao',
          eventAt: new Date(capturePayload.occurredAt),
          title: capturePayload.title,
          summary: capturePayload.summary,
          fullText: capturePayload.rawText,
          riskLevel: queueType === 'critica' ? 'critico' : 'normal',
          requiresAction: true,
          timelinePosition: 1,
        },
      });

      const existingTriage = await prisma.triageItem.findFirst({
        where: {
          captureId: capture.id,
          suggestedAction,
          processId: target.processId,
          clientId: target.clientId,
          status: { in: ['pendente', 'em_revisao_manual', 'adiado'] },
        },
      });

      if (existingTriage) {
        await prisma.triageItem.update({
          where: { id: existingTriage.id },
          data: {
            eventId: event.id,
            queueType,
            suggestedReason: classification.suggestedReason,
            sourceLabel: 'OAB',
            aiConfidenceBand: classification.aiConfidenceBand,
            aiScoreRaw: classification.aiScoreRaw,
          },
        });
      } else {
        await prisma.triageItem.create({
          data: {
            captureId: capture.id,
            eventId: event.id,
            processId: target.processId,
            clientId: target.clientId,
            queueType,
            status: 'pendente',
            suggestedAction,
            suggestedReason: classification.suggestedReason,
            aiConfidenceBand: classification.aiConfidenceBand,
            aiScoreRaw: classification.aiScoreRaw,
            sourceLabel: 'OAB',
          },
        });
      }
    }

    await prisma.publicationSourceJob.update({
      where: { id: sourceJob.id },
      data: {
        finishedAt: new Date(),
        status: 'success',
        itemsCaptured,
        itemsCreated,
        itemsUpdated,
        itemsFlaggedCritical,
        itemsSentToCrm,
      },
    });

    return {
      sourceJobId: sourceJob.id,
      itemsCaptured,
      itemsCreated,
      itemsUpdated,
      itemsFlaggedCritical,
      itemsSentToCrm,
    };
  } catch (error) {
    await prisma.publicationSourceJob.update({
      where: { id: sourceJob.id },
      data: {
        finishedAt: new Date(),
        status: 'failed',
        itemsCaptured,
        itemsCreated,
        itemsUpdated,
        itemsFlaggedCritical,
        itemsSentToCrm,
        errorLog: error instanceof Error ? error.message : 'Erro desconhecido na coleta OAB',
      },
    });
    throw error;
  }
}

function scheduleCnjCollector() {
  createPublicationScheduler({
    disabled: process.env.TRIAGE_SCHEDULER_DISABLED === 'true',
    onTick: async () => { await ingestCnjPublications('scheduler'); },
    onError: (error) => console.error('[triage] CNJ scheduler failed:', error),
  }).arm();
}

function scheduleCpfCollector() {
  createPublicationScheduler({
    disabled: process.env.TRIAGE_SCHEDULER_DISABLED === 'true',
    onTick: async () => { await ingestCpfPublications('scheduler'); },
    onError: (error) => console.error('[triage] CPF scheduler failed:', error),
  }).arm();
}

function scheduleDiarioCollector() {
  createPublicationScheduler({
    disabled: process.env.TRIAGE_SCHEDULER_DISABLED === 'true',
    onTick: async () => { await ingestDiarioPublications('scheduler'); },
    onError: (error) => console.error('[triage] Diário oficial scheduler failed:', error),
  }).arm();
}

function scheduleOabCollector() {
  createPublicationScheduler({
    disabled: process.env.TRIAGE_SCHEDULER_DISABLED === 'true',
    onTick: async () => { await ingestOabPublications('scheduler'); },
    onError: (error) => console.error('[triage] OAB scheduler failed:', error),
  }).arm();
}

async function syncClientsFromProcesses() {
  const processes = await prisma.process.findMany({
    include: { owner: { select: { email: true } } },
  });

  for (const process of processes) {
    if (!process.client?.trim()) continue;

    const client = await clientStore.upsert({
      where: { name: process.client },
      update: {
        responsible: process.owner?.email ? getResponsibleLabel(process.owner.email) : undefined,
        legalArea: process.phase || undefined,
      },
      create: {
        name: process.client,
        type: 'PJ',
        status: 'ativo',
        legalArea: process.phase,
        responsible: process.owner?.email ? getResponsibleLabel(process.owner.email) : undefined,
        notes: 'Cliente sincronizado a partir da carteira de processos.',
      },
    });

    if ((process as { clientId?: number | null }).clientId !== client.id) {
      await prisma.process.update({
        where: { id: process.id },
        data: { clientId: client.id },
      });
    }
  }
}

async function seedData() {
  const count = await prisma.user.count();
  if (count === 0) {
    const users = [
      { email: 'admin@juridico.com', password: '123456', role: 'ADM' },
      { email: 'advogado@juridico.com', password: '123456', role: 'ADV' },
      { email: 'financeiro@juridico.com', password: '123456', role: 'FIN' },
    ] as const;

    for (const user of users) {
      await prisma.user.create({
        data: {
          email: user.email,
          password: await bcrypt.hash(user.password, 10),
          role: user.role,
        },
      });
    }
  }

  const users = await prisma.user.findMany({ select: { id: true, password: true } });
  for (const user of users) {
    if (!isBcryptHash(user.password)) {
      await prisma.user.update({
        where: { id: user.id },
        data: { password: await bcrypt.hash(user.password, 10) },
      });
    }
  }

  const processCount = await prisma.process.count();
  if (processCount === 0) {
    const owners = await prisma.user.findMany({
      where: {
        email: {
          in: ['advogado@juridico.com', 'admin@juridico.com', 'financeiro@juridico.com'],
        },
      },
      select: { id: true, email: true },
    });

    const ownerByEmail = new Map(owners.map((owner) => [owner.email, owner.id]));
    const sampleProcesses = [
      {
        title: 'Reclamatoria Trabalhista Cliente Atlas',
        processNumber: '10000011120265020001',
        client: 'Cliente Atlas',
        phase: 'Inicial',
        status: 'ativo',
        ownerEmail: 'advogado@juridico.com',
      },
      {
        title: 'Execucao Contratual Cliente Prisma',
        processNumber: '10000022220265020002',
        client: 'Cliente Prisma',
        phase: 'Contestacao',
        status: 'ativo',
        ownerEmail: 'admin@juridico.com',
      },
      {
        title: 'Recuperacao de Credito Cliente Nexo',
        processNumber: '10000033320265020003',
        client: 'Cliente Nexo',
        phase: 'Recurso',
        status: 'pausado',
        ownerEmail: 'financeiro@juridico.com',
      },
    ] as const;

    for (const process of sampleProcesses) {
      const ownerId = ownerByEmail.get(process.ownerEmail);
      if (!ownerId) continue;
      const seededClient = await clientStore.upsert({
        where: { name: process.client },
        update: {
          responsible: process.ownerEmail.split('@')[0],
          legalArea: process.phase,
        },
        create: {
          name: process.client,
          type: 'PJ',
          status: 'ativo',
          legalArea: process.phase,
          responsible: process.ownerEmail.split('@')[0],
          notes: 'Cliente inicial criado a partir da seed do projeto.',
        },
      });

      await prisma.process.create({
        data: {
          title: process.title,
          processNumber: process.processNumber,
          client: process.client,
          clientId: seededClient.id,
          phase: process.phase,
          status: process.status,
          ownerId,
        },
      });
    }
  }

  await syncClientsFromProcesses();

  const attendanceCount = await prisma.atendimento.count();
  if (attendanceCount === 0) {
    const seededProcesses = await prisma.process.findMany({
      include: {
        owner: { select: { email: true } },
        clientRecord: true,
      },
      orderBy: { id: 'asc' },
    });

    const channels = ['email', 'telefone', 'whatsapp', 'portal', 'presencial', 'interno'] as const;
    const types = ['consulta', 'urgencia', 'rotina', 'triagem', 'acompanhamento'] as const;
    const statuses = ['aberto', 'aguardando_cliente', 'resolvido', 'agendado'] as const;
    const subjects = [
      'Informações sobre audiência',
      'Solicitação de documentos complementares',
      'Confirmação de retorno jurídico',
      'Atualização sobre andamento do processo',
      'Alinhamento de próximos passos',
      'Urgência em notificação recebida',
    ] as const;

    for (const [index, process] of seededProcesses.entries()) {
      const baseDate = new Date();
      const firstDate = new Date(baseDate);
      firstDate.setDate(baseDate.getDate() - (index + 1));
      firstDate.setHours(9 + index, 15, 0, 0);

      const secondDate = new Date(baseDate);
      secondDate.setDate(baseDate.getDate() - (index + 3));
      secondDate.setHours(14 + index, 30, 0, 0);

      const clientId = process.clientId ?? process.clientRecord?.id ?? null;
      const responsible = getResponsibleLabel(process.owner?.email);

      await prisma.atendimento.create({
        data: {
          processId: process.id,
          clientId,
          subject: subjects[index % subjects.length],
          summary: `Cliente entrou em contato para tratar ${subjects[index % subjects.length].toLowerCase()} no processo ${process.title}.`,
          notes: 'Seed inicial de atendimento para validar a carteira relacional.',
          occurredAt: firstDate,
          channel: channels[index % channels.length],
          type: types[index % types.length],
          status: statuses[index % statuses.length],
          priority: index % 3 === 0 ? 'alta' : index % 2 === 0 ? 'media' : 'baixa',
          responsible,
          nextStep: index % 2 === 0 ? `Retornar cliente ${process.client} com atualização do processo.` : '',
          scheduledReturnAt: index % 2 === 0 ? new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + index + 1) : null,
          critical: process.status !== 'ativo',
          actorEmail: process.owner?.email ?? 'admin@juridico.com',
        },
      });

      await prisma.atendimento.create({
        data: {
          processId: process.id,
          clientId,
          subject: subjects[(index + 2) % subjects.length],
          summary: `Segundo contato registrado na carteira para o cliente ${process.client}.`,
          notes: '',
          occurredAt: secondDate,
          channel: channels[(index + 2) % channels.length],
          type: types[(index + 1) % types.length],
          status: index % 2 === 0 ? 'sem_resposta' : 'aberto',
          priority: index % 2 === 0 ? 'media' : 'baixa',
          responsible,
          nextStep: `Consolidar retorno e registrar encaminhamento do processo ${process.title}.`,
          scheduledReturnAt: null,
          critical: false,
          actorEmail: process.owner?.email ?? 'admin@juridico.com',
        },
      });
    }
  }

  const taskCount = await prisma.task.count();
  if (taskCount === 0) {
    const seededProcesses = await prisma.process.findMany({
      include: {
        owner: { select: { email: true } },
        clientRecord: true,
      },
      orderBy: { id: 'asc' },
    });

    const origins = ['processo', 'prazo', 'documento', 'publicacao', 'atendimento', 'interno'] as const;
    const priorities = ['baixa', 'media', 'alta', 'critica'] as const;
    const statuses = ['pendente', 'em_andamento', 'aguardando', 'concluida', 'atrasada'] as const;

    for (const [index, process] of seededProcesses.entries()) {
      const ownerLabel = getResponsibleLabel(process.owner?.email) ?? 'admin';
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (index - 1));
      dueDate.setHours(0, 0, 0, 0);

      await prisma.task.create({
        data: {
          title: `Acompanhar ${process.title}`,
          description: `Executar ação operacional vinculada ao processo ${process.title}.`,
          processId: process.id,
          clientId: process.clientId ?? process.clientRecord?.id ?? null,
          clientName: process.client,
          origin: origins[index % origins.length],
          dueDate,
          status: statuses[index % statuses.length],
          priority: priorities[index % priorities.length],
          owner: ownerLabel,
          createdBy: ownerLabel,
          notes: index % 2 === 0 ? 'Validar próximos passos com o cliente.' : 'Conferir documentação antes do retorno.',
          linkedToDeadline: index % 3 === 0,
          linkedToPublication: index % 4 === 0,
          linkedToDocument: index % 5 === 0,
          immediateAction: index % 2 === 0,
        },
      });
    }
  }

  const deadlineCount = await prisma.prazo.count();
  if (deadlineCount === 0) {
    const seededProcesses = await prisma.process.findMany({
      include: {
        owner: { select: { email: true } },
        clientRecord: true,
      },
      orderBy: { id: 'asc' },
    });

    const origins = ['publicacao', 'audiencia', 'interno', 'cliente'] as const;
    const priorities = ['baixa', 'media', 'alta'] as const;

    for (const [index, process] of seededProcesses.entries()) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (index - 1));
      dueDate.setHours(0, 0, 0, 0);

      await prisma.prazo.create({
        data: {
          processId: process.id,
          title: `Prazo de manifestação - ${process.title}`,
          dueDate,
          status: index === 0 ? 'critico' : index === 1 ? 'aberto' : 'atrasado',
          priority: priorities[index % priorities.length],
          origin: origins[index % origins.length],
          responsible: getResponsibleLabel(process.owner?.email) ?? 'admin',
          legalArea: process.phase,
          notes: index % 2 === 0
            ? 'Validar documentação e protocolar antes do fim do expediente.'
            : 'Consolidar retorno do cliente e revisar próximos passos.',
          createdBy: getResponsibleLabel(process.owner?.email) ?? 'admin',
        },
      });
    }
  }

  const documentCount = await prisma.documento.count();
  if (documentCount === 0) {
    const seededProcesses = await prisma.process.findMany({
      include: {
        owner: { select: { email: true } },
      },
      orderBy: { id: 'asc' },
    });

    const categories = ['Peticao', 'Contrato', 'Prova', 'Financeiro', 'Checklist'] as const;
    const origins = ['upload', 'cliente', 'publicacao', 'interno'] as const;
    const statuses = ['pendente', 'aguardando_validacao', 'validado'] as const;
    const mimeTypes = ['application/pdf', 'image/png', 'application/octet-stream'] as const;

    for (const [index, process] of seededProcesses.entries()) {
      const ownerLabel = getResponsibleLabel(process.owner?.email) ?? 'admin';
      const uploadedAt = new Date();
      uploadedAt.setDate(uploadedAt.getDate() - index);

      await prisma.documento.create({
        data: {
          processId: process.id,
          title: `Petição inicial - ${process.client}`,
          description: 'Documento principal para protocolo e análise jurídica.',
          status: statuses[index % statuses.length],
          category: categories[index % categories.length],
          version: 2,
          isLatestVersion: true,
          origin: origins[index % origins.length],
          uploadedAt,
          responsible: ownerLabel,
          requiredChecklist: true,
          pendingForAdvance: index % 2 === 0,
          mimeType: mimeTypes[index % mimeTypes.length],
          previewUrl: mimeTypes[index % mimeTypes.length] === 'application/octet-stream' ? null : '/lexora-logo.svg',
          createdBy: ownerLabel,
        },
      });

      await prisma.documento.create({
        data: {
          processId: process.id,
          title: `Petição inicial - ${process.client}`,
          description: 'Versão histórica preservada para rastreabilidade.',
          status: 'validado',
          category: categories[index % categories.length],
          version: 1,
          isLatestVersion: false,
          origin: origins[(index + 1) % origins.length],
          uploadedAt: new Date(uploadedAt.getTime() - 7 * 24 * 60 * 60 * 1000),
          responsible: ownerLabel,
          requiredChecklist: true,
          pendingForAdvance: false,
          mimeType: 'application/octet-stream',
          previewUrl: null,
          createdBy: ownerLabel,
        },
      });
    }
  }

  const publicationCount = await prisma.publication.count();
  if (publicationCount === 0) {
    const seededProcesses = await prisma.process.findMany({
      include: {
        owner: { select: { email: true } },
        clientRecord: true,
      },
      orderBy: { id: 'asc' },
    });

    for (const [index, process] of seededProcesses.entries()) {
      const publishedAt = new Date();
      publishedAt.setDate(publishedAt.getDate() - (index + 1));
      publishedAt.setHours(8 + index, 0, 0, 0);

      await prisma.publication.create({
        data: {
          processId: process.id,
          clientId: process.clientId ?? process.clientRecord?.id ?? null,
          publicationType: publicationSeedTypes[index % publicationSeedTypes.length],
          status: publicationSeedStatuses[index % publicationSeedStatuses.length],
          impact: publicationSeedImpacts[index % publicationSeedImpacts.length],
          tribunal: publicationSeedTribunals[index % publicationSeedTribunals.length],
          origin: `Diário de Justiça Eletrônico — ${publicationSeedTribunals[index % publicationSeedTribunals.length]}`,
          publishedAt,
          summary: publicationSeedSummaries[index % publicationSeedSummaries.length],
          relevantText: publicationSeedTexts[index % publicationSeedTexts.length],
          requiresAction: index % 3 !== 0,
          convertedToDeadline: index % 2 === 0,
          derivedDeadlineLabel: index % 2 === 0 ? `Prazo: ${new Date(publishedAt.getTime() + 15 * 86400000).toISOString().slice(0, 10)}` : null,
          notes: index % 2 === 0 ? 'Validar necessidade de prazo derivado e retorno ao cliente.' : '',
          read: index % 2 === 1,
          createdBy: getResponsibleLabel(process.owner?.email) ?? 'admin',
        },
      });

      await prisma.publication.create({
        data: {
          processId: process.id,
          clientId: process.clientId ?? process.clientRecord?.id ?? null,
          publicationType: publicationSeedTypes[(index + 2) % publicationSeedTypes.length],
          status: publicationSeedStatuses[(index + 1) % publicationSeedStatuses.length],
          impact: publicationSeedImpacts[(index + 1) % publicationSeedImpacts.length],
          tribunal: publicationSeedTribunals[(index + 1) % publicationSeedTribunals.length],
          origin: `Diário Oficial — ${publicationSeedTribunals[(index + 1) % publicationSeedTribunals.length]}`,
          publishedAt: new Date(publishedAt.getTime() - 2 * 86400000),
          summary: publicationSeedSummaries[(index + 1) % publicationSeedSummaries.length],
          relevantText: publicationSeedTexts[(index + 1) % publicationSeedTexts.length],
          requiresAction: index % 2 === 0,
          convertedToDeadline: false,
          derivedDeadlineLabel: null,
          notes: '',
          read: false,
          createdBy: getResponsibleLabel(process.owner?.email) ?? 'admin',
        },
      });
    }
  }

  const templateCount = await prisma.template.count();
  if (templateCount === 0) {
    const authors = ['advogado', 'admin', 'financeiro'];

    for (let index = 0; index < 16; index += 1) {
      const area = templateSeedAreas[index % templateSeedAreas.length];
      const pieceType = templateSeedTypes[index % templateSeedTypes.length];
      const phase = templateSeedPhases[index % templateSeedPhases.length];
      const author = authors[index % authors.length];
      const status = ['ativo', 'ativo', 'revisao', 'rascunho', 'arquivado'][index % 5];
      const version = `v${1 + Math.floor(index / 4)}.${index % 4}`;
      const updatedOn = new Date();
      updatedOn.setDate(updatedOn.getDate() - (index * 3));
      const lastUsedAt = index % 4 === 0 ? new Date(Date.now() - (index + 2) * 86400000) : null;
      const placeholders = ['vara', 'numero_processo', 'nome_cliente', 'parte_contraria', 'fundamentacao', 'pedidos'].slice(0, 4 + (index % 3));
      const tags = [templateSeedTags[index % templateSeedTags.length], templateSeedTags[(index + 2) % templateSeedTags.length], area.toLowerCase()].slice(0, 2 + (index % 2));
      const name = `${pieceType} — ${area} (${phase})`;
      const preview = `${pieceType}: ${name}\n\nExcelentíssimo(a) Senhor(a) Doutor(a) Juiz(a) de Direito da {{vara}}\n\nProcesso nº {{numero_processo}}\n\n{{nome_cliente}}, já qualificado(a), apresenta ${pieceType.toLowerCase()} em face de {{parte_contraria}}.`;
      const versionsJson = [
        {
          id: `${index + 1}-v2`,
          version,
          author,
          date: updatedOn.toISOString().slice(0, 10),
          description: 'Ajustes de fundamentação e atualização de precedentes recentes.',
          current: true,
        },
        {
          id: `${index + 1}-v1`,
          version: `v${Math.max(1, Math.floor(index / 4))}.${Math.max(0, (index % 4) - 1)}`,
          author,
          date: new Date(updatedOn.getTime() - 14 * 86400000).toISOString().slice(0, 10),
          description: 'Estrutura inicial do modelo com cabeçalho padrão.',
          current: false,
        },
      ];

      await prisma.template.create({
        data: {
          name,
          legalArea: area,
          pieceType,
          status,
          official: index % 3 !== 0,
          favorite: index % 6 === 0,
          autoFill: index % 5 !== 0,
          phase,
          author,
          version,
          updatedOn,
          lastUsedAt,
          needsReview: status === 'revisao' || index % 7 === 0,
          description: `Modelo ${pieceType.toLowerCase()} para fase ${phase.toLowerCase()}, com linguagem institucional e checkpoints de validação jurídica.`,
          tags,
          placeholders,
          preview,
          versionsJson,
          createdBy: author,
        },
      });
    }
  }

  const agendaCount = await prisma.agendaEvent.count();
  if (agendaCount === 0) {
    const seededProcesses = await prisma.process.findMany({
      include: {
        owner: { select: { email: true } },
        clientRecord: true,
        atendimentos: { orderBy: { occurredAt: 'asc' } },
        tasks: { orderBy: { dueDate: 'asc' } },
      },
      orderBy: { id: 'asc' },
    });

    for (const [index, process] of seededProcesses.entries()) {
      const baseDate = new Date();
      baseDate.setDate(baseDate.getDate() + index);
      baseDate.setHours(9 + index, 0, 0, 0);

      const audienceEnd = new Date(baseDate);
      audienceEnd.setHours(audienceEnd.getHours() + 1);

      await prisma.agendaEvent.create({
        data: {
          title: `Audiência de acompanhamento - ${process.client}`,
          eventType: 'audiencia',
          status: process.status === 'ativo' ? 'agendado' : 'confirmado',
          priority: index % 2 === 0 ? 'alta' : 'media',
          startAt: baseDate,
          endAt: audienceEnd,
          processId: process.id,
          clientId: process.clientId ?? process.clientRecord?.id ?? null,
          responsible: getResponsibleLabel(process.owner?.email) ?? 'admin',
          locationOrChannel: index % 2 === 0 ? 'Fórum trabalhista' : 'Tribunal regional',
          notes: 'Evento inicial da agenda para validar audiência e calendário operacional.',
          origin: 'processo',
          createdBy: getResponsibleLabel(process.owner?.email) ?? 'admin',
        },
      });

      const firstAttendance = process.atendimentos.find((attendance) => attendance.scheduledReturnAt);
      if (firstAttendance?.scheduledReturnAt) {
        const returnStart = new Date(firstAttendance.scheduledReturnAt);
        returnStart.setHours(14, 0, 0, 0);
        const returnEnd = new Date(returnStart);
        returnEnd.setHours(returnEnd.getHours() + 1);

        await prisma.agendaEvent.create({
          data: {
            title: `Retorno com ${process.client}`,
            eventType: 'retorno_agendado',
            status: 'agendado',
            priority: firstAttendance.critical ? 'alta' : 'media',
            startAt: returnStart,
            endAt: returnEnd,
            processId: process.id,
            clientId: process.clientId ?? process.clientRecord?.id ?? null,
            attendanceId: firstAttendance.id,
            responsible: firstAttendance.responsible ?? getResponsibleLabel(process.owner?.email) ?? 'admin',
            locationOrChannel: firstAttendance.channel || 'Telefone',
            notes: firstAttendance.nextStep || 'Retorno programado a partir da carteira de atendimentos.',
            origin: 'atendimento',
            createdBy: getResponsibleLabel(process.owner?.email) ?? 'admin',
          },
        });
      }

      const firstTask = process.tasks[0];
      if (firstTask) {
        const taskStart = new Date(firstTask.dueDate);
        taskStart.setHours(11 + (index % 3), 0, 0, 0);
        const taskEnd = new Date(taskStart);
        taskEnd.setHours(taskEnd.getHours() + 1);

        await prisma.agendaEvent.create({
          data: {
            title: firstTask.title,
            eventType: 'tarefa_horario',
            status: firstTask.status === 'concluida' ? 'realizado' : 'agendado',
            priority: firstTask.priority === 'critica' ? 'alta' : firstTask.priority,
            startAt: taskStart,
            endAt: taskEnd,
            processId: process.id,
            clientId: process.clientId ?? process.clientRecord?.id ?? null,
            taskId: firstTask.id,
            responsible: firstTask.owner,
            locationOrChannel: 'Operação interna',
            notes: firstTask.notes || firstTask.description,
            origin: firstTask.origin === 'atendimento' ? 'atendimento' : 'processo',
            createdBy: firstTask.createdBy,
          },
      });
    }
  }

  const triageCount = await prisma.triageItem.count();
  if (triageCount === 0) {
    const seededProcesses = await prisma.process.findMany({
      include: {
        owner: { select: { email: true } },
        clientRecord: true,
        publications: { orderBy: { publishedAt: 'desc' } },
      },
      orderBy: { id: 'asc' },
      take: 3,
    });

    const sourceJob = await prisma.publicationSourceJob.create({
      data: {
        sourceType: 'scheduler',
        scheduledFor: new Date(),
        startedAt: new Date(),
        finishedAt: new Date(),
        status: 'success',
      },
    });

    for (const [index, process] of seededProcesses.entries()) {
      const occurredAt = new Date();
      occurredAt.setHours(8 + index * 2, 0, 0, 0);

      const rawText = index === 0
        ? `Sentença publicada no processo ${process.processNumber}. Prazo recursal em aberto.`
        : index === 1
          ? `Intimação para manifestação no processo ${process.processNumber} com necessidade de anexar documentos.`
          : `Movimentação informativa no processo ${process.processNumber} sem prazo explícito.`;

      const capture = await prisma.publicationCapture.create({
        data: {
          sourceType: index === 2 ? 'diario_oficial' : 'cnj',
          sourceReference: `SEED-TRIAGE-${process.id}-${index + 1}`,
          occurredAt,
          rawText,
          normalizedText: rawText,
          tribunal: index === 0 ? 'TJSP' : index === 1 ? 'TRT-2' : 'TJRJ',
          processNumber: process.processNumber,
          cpf: process.clientRecord?.cpfCnpj ?? null,
          personName: process.client,
          metadataJson: { seed: true, processId: process.id },
          fingerprint: createCaptureFingerprint([
            'seed-triage',
            process.processNumber,
            occurredAt.toISOString(),
            rawText,
          ]),
          status: 'processado',
          sourceJobId: sourceJob.id,
        },
      });

      const event = await prisma.publicationEvent.create({
        data: {
          captureId: capture.id,
          processId: process.id,
          clientId: process.clientId ?? process.clientRecord?.id ?? null,
          publicationId: process.publications[0]?.id ?? null,
          eventType: index === 0 ? 'sentenca' : index === 1 ? 'intimacao' : 'movimentacao',
          eventAt: occurredAt,
          title: index === 0 ? 'Sentença publicada' : index === 1 ? 'Intimação para manifestação' : 'Movimentação informativa',
          summary: rawText,
          fullText: rawText,
          riskLevel: index === 2 ? 'normal' : 'critico',
          requiresAction: index !== 2,
          timelinePosition: index + 1,
        },
      });

      await prisma.triageItem.create({
        data: {
          captureId: capture.id,
          eventId: event.id,
          processId: process.id,
          clientId: process.clientId ?? process.clientRecord?.id ?? null,
          queueType: index === 2 ? 'normal' : 'critica',
          status: index === 1 ? 'em_revisao_manual' : 'pendente',
          suggestedAction: index === 0 ? 'criar_prazo' : 'criar_tarefa',
          suggestedReason: index === 0
            ? 'Sentença com indício de prazo recursal e necessidade de triagem imediata.'
            : index === 1
              ? 'Intimação com necessidade de ação operacional e documentação.'
              : 'Movimentação informativa com necessidade de validação humana.',
          aiConfidenceBand: index === 2 ? 'media' : 'alta',
          aiScoreRaw: index === 2 ? 0.68 : 0.93,
          sourceLabel: index === 2 ? 'Diário Oficial' : 'CNJ',
        },
      });
    }

    const prospectCapture = await prisma.publicationCapture.create({
      data: {
        sourceType: 'cpf',
        sourceReference: 'SEED-TRIAGE-CPF-1',
        occurredAt: new Date(),
        rawText: 'Publicação associada ao CPF 98765432100 sem processo ativo na carteira.',
        normalizedText: 'Publicação associada ao CPF 98765432100 sem processo ativo na carteira.',
        tribunal: 'TJMG',
        cpf: '98765432100',
        personName: 'Contato Prospectado',
        metadataJson: { seed: true, orphan: true },
        fingerprint: createCaptureFingerprint(['seed-triage-cpf', '98765432100', new Date().toISOString()]),
        status: 'processado',
        sourceJobId: sourceJob.id,
      },
    });

    const lead = await prisma.crmLead.create({
      data: {
        cpf: '98765432100',
        personName: 'Contato Prospectado',
        source: 'publicacao_automatizada',
        status: 'novo',
        summary: 'Lead criado a partir de publicação capturada por CPF sem cliente prévio.',
      },
    });

    await prisma.triageItem.create({
      data: {
        captureId: prospectCapture.id,
        crmLeadId: lead.id,
        queueType: 'normal',
        status: 'pendente',
        suggestedAction: 'criar_lead',
        suggestedReason: 'CPF identificado em publicação sem cliente ou processo ativo associado.',
        aiConfidenceBand: 'media',
        aiScoreRaw: 0.71,
        sourceLabel: 'CPF',
      },
    });

    const crmOpportunityCount = await prisma.crmOpportunity.count();
    if (crmOpportunityCount === 0) {
      const referenceProcess = await prisma.process.findFirst({
        where: { processNumber: '10024567820265020001' },
        include: {
          clientRecord: true,
          owner: { select: { email: true } },
        },
      });

      const nextContactAt = new Date();
      nextContactAt.setDate(nextContactAt.getDate() + 2);
      nextContactAt.setHours(10, 30, 0, 0);

      await prisma.crmOpportunity.create({
        data: {
          clientId: referenceProcess?.clientId ?? referenceProcess?.clientRecord?.id ?? null,
          cpf: referenceProcess?.clientRecord?.cpfCnpj ?? '12345678900',
          personName: 'Tom Kelve Santos de Medeiros',
          source: 'triagem',
          status: 'negociacao',
          responsible: getResponsibleLabel(referenceProcess?.owner?.email) ?? 'advogado',
          summary: 'Oportunidade priorizada para validar conversão operacional, vínculo de processo existente e documentos comerciais.',
          nextContactAt,
          contactEvents: {
            create: {
              kind: 'follow_up',
              summary: 'Contato inicial qualificado e pronto para revisão comercial no smoke.',
              createdBy: getResponsibleLabel(referenceProcess?.owner?.email) ?? 'advogado',
              createdAt: new Date(),
            },
          },
        },
      });
    }

    await prisma.publicationSourceJob.update({
      where: { id: sourceJob.id },
      data: {
        itemsCaptured: 4,
        itemsCreated: 4,
        itemsFlaggedCritical: 2,
        itemsSentToCrm: 1,
      },
    });
  }
}
}

seedData().catch((err) => {
  console.error('Erro ao semear dados', err);
});
scheduleCnjCollector();
scheduleCpfCollector();
scheduleDiarioCollector();
scheduleOabCollector();
const financeSchedulerRegistry = bootstrapFinanceSchedulers();

function getUserFromReq(req: express.Request): UserToken | null {
  const token = getAuthToken(req);
  if (!token) return null;
  return verifyToken(token);
}

function canManageClients(role: string) {
  return role === 'ADM' || role === 'ADV';
}

function canReadProcess(user: UserToken, process: { ownerId: number }) {
  return user.role === 'ADM' || user.role === 'FIN' || process.ownerId === user.sub;
}

async function assertProcessAccess(user: UserToken, processId: number) {
  const process = await prisma.process.findUnique({
    where: { id: processId },
    include: {
      owner: { select: { id: true, email: true, role: true } },
      clientRecord: true,
    },
  });

  if (!process) {
    return { error: { status: 404, message: 'Processo nao encontrado' } as const };
  }

  if (!canReadProcess(user, process)) {
    return { error: { status: 403, message: 'Acesso negado' } as const };
  }

  return { process };
}

function canAccessTriage(user: UserToken) {
  return ['ADM', 'ADV', 'ATD'].includes(user.role);
}

async function assertTriageAccess(user: UserToken, triageId: number) {
  if (!canAccessTriage(user)) {
    return { error: { status: 403, message: 'Acesso negado' } } as const;
  }

  const triageItem = await prisma.triageItem.findUnique({
    where: { id: triageId },
    include: {
      process: true,
      clientRecord: true,
      crmLead: true,
      crmOpportunity: true,
      capture: true,
      event: true,
      decisions: { orderBy: { decidedAt: 'desc' } },
    },
  });

  if (!triageItem) {
    return { error: { status: 404, message: 'Item de triagem não encontrado' } } as const;
  }

  return { triageItem } as const;
}

function buildClientPayload(client: any) {
  const processItems = client.processes.map((process: any) => ({
    id: process.id,
    title: process.title,
    client: process.client,
    phase: process.phase,
    status: process.status,
    ownerId: process.ownerId,
    owner: process.owner,
    lastAttendanceAt: process.atendimentos[0]?.occurredAt.toISOString() ?? null,
    pendingDocumentsCount: process.documentos.filter((documento: any) => documento.status === 'pendente').length,
  }));

  const lastAttendanceAt = processItems
    .map((process: any) => process.lastAttendanceAt)
    .filter((value: string | null): value is string => Boolean(value))
    .sort((left: string, right: string) => right.localeCompare(left))[0] ?? null;

  const pendingDocumentsCount = processItems.reduce((accumulator: number, process: any) => accumulator + process.pendingDocumentsCount, 0);
  const pendingAttendance = !lastAttendanceAt || ((Date.now() - new Date(lastAttendanceAt).getTime()) / 86400000) > 14;
  const pendingItems = pendingDocumentsCount + (pendingAttendance ? 1 : 0);

  return {
    id: client.id,
    name: client.name,
    type: client.type,
    cpfCnpj: client.cpfCnpj,
    phone: client.phone,
    email: client.email,
    address: client.address,
    status: client.status,
    legalArea: client.legalArea,
    responsible: client.responsible,
    notes: client.notes,
    createdAt: client.createdAt.toISOString(),
    processes: processItems,
    metrics: {
      lastAttendanceAt,
      pendingDocumentsCount,
      pendingAttendance,
      pendingItems,
    },
  };
}

function buildAttendancePayload(attendance: any) {
  const process = attendance.process;
  const client = attendance.clientRecord ?? process?.clientRecord ?? null;
  const owner = process?.owner ?? null;

  return {
    id: attendance.id,
    processId: attendance.processId ?? null,
    processLabel: attendance.processId ? `#${attendance.processId}` : '—',
    processTitle: process?.title ?? '',
    clientId: client?.id ?? attendance.clientId ?? null,
    client: client?.name ?? process?.client ?? 'Cliente não informado',
    canal: attendance.channel,
    tipo: attendance.type,
    assunto: attendance.subject,
    resumo: attendance.summary,
    observacoes: attendance.notes ?? '',
    status: attendance.status,
    priority: attendance.priority,
    responsavel: attendance.responsible ?? getResponsibleLabel(attendance.actorEmail) ?? owner?.email?.split('@')[0] ?? 'sem-responsavel',
    area: process?.phase ?? client?.legalArea ?? 'Civel',
    dataHora: attendance.occurredAt.toISOString(),
    proximoPasso: attendance.nextStep ?? '',
    retornoAgendado: attendance.scheduledReturnAt ? attendance.scheduledReturnAt.toISOString().slice(0, 10) : null,
    critico: Boolean(attendance.critical),
    actorEmail: attendance.actorEmail,
    owner,
  };
}

function canReadTask(user: UserToken, task: { createdBy: string; owner: string; process?: { ownerId: number } | null }) {
  return (
    user.role === 'ADM' ||
    user.role === 'FIN' ||
    task.createdBy === getResponsibleLabel(user.email) ||
    task.owner === getResponsibleLabel(user.email) ||
    (task.process ? canReadProcess(user, task.process) : false)
  );
}

function canReadDeadline(user: UserToken, deadline: {
  createdBy?: string | null;
  responsible?: string | null;
  process?: { ownerId: number } | null;
}) {
  return (
    user.role === 'ADM' ||
    user.role === 'FIN' ||
    deadline.createdBy === getResponsibleLabel(user.email) ||
    deadline.responsible === getResponsibleLabel(user.email) ||
    (deadline.process ? canReadProcess(user, deadline.process) : false)
  );
}

function canReadDocument(user: UserToken, document: {
  createdBy?: string | null;
  responsible?: string | null;
  process?: { ownerId: number } | null;
}) {
  return (
    user.role === 'ADM' ||
    user.role === 'FIN' ||
    document.createdBy === getResponsibleLabel(user.email) ||
    document.responsible === getResponsibleLabel(user.email) ||
    (document.process ? canReadProcess(user, document.process) : false)
  );
}

function canReadPublication(user: UserToken, publication: {
  createdBy?: string | null;
  process?: { ownerId: number } | null;
}) {
  return (
    user.role === 'ADM' ||
    user.role === 'FIN' ||
    publication.createdBy === getResponsibleLabel(user.email) ||
    (publication.process ? canReadProcess(user, publication.process) : false)
  );
}

function canReadTemplate(user: UserToken, template: { createdBy?: string | null; official?: boolean | null }) {
  return (
    user.role === 'ADM' ||
    user.role === 'FIN' ||
    template.createdBy === getResponsibleLabel(user.email) ||
    Boolean(template.official)
  );
}

function canReadAgendaEvent(user: UserToken, event: {
  createdBy: string;
  responsible?: string | null;
  process?: { ownerId: number } | null;
  attendance?: { actorEmail: string } | null;
  task?: { createdBy: string; owner: string; process?: { ownerId: number } | null } | null;
}) {
  return (
    user.role === 'ADM' ||
    user.role === 'FIN' ||
    event.createdBy === getResponsibleLabel(user.email) ||
    event.responsible === getResponsibleLabel(user.email) ||
    (event.process ? canReadProcess(user, event.process) : false) ||
    (event.attendance ? event.attendance.actorEmail === user.email : false) ||
    (event.task ? canReadTask(user, event.task) : false)
  );
}

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'email e senha são obrigatórios' });

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ message: 'Credenciais inválidas' });
    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) return res.status(401).json({ message: 'Credenciais inválidas' });

    const sessionUser = { id: user.id, email: user.email, role: user.role };
    const token = signUserToken(sessionUser);
    setAuthCookie(res, token);

    return res.json({ user: sessionUser });
  } catch (error) {
    if (!devMockEnabled || !isPrismaConnectionError(error)) {
      return res.status(500).json({ message: error instanceof Error ? error.message : 'Erro ao autenticar' });
    }

    const user = getDevMockUserByEmail(email);
    if (!user || user.password !== password) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    const sessionUser = { id: user.id, email: user.email, role: user.role };
    const token = signUserToken(sessionUser);
    setAuthCookie(res, token);
    return res.json({ user: sessionUser, mockMode: true });
  }
});

app.post('/auth/logout', (_req, res) => {
  clearAuthCookie(res);
  res.json({ success: true });
});

app.get('/me', (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });
  res.json({ user: { id: decoded.sub, email: decoded.email, role: decoded.role } });
});

app.get('/users', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });
  if (decoded.role !== 'ADM') return res.status(403).send({ message: 'Acesso negado' });

  try {
    const users = await prisma.user.findMany({ select: { id: true, email: true, role: true } });
    return res.json(users);
  } catch (error) {
    if (!devMockEnabled || !isPrismaConnectionError(error)) {
      return res.status(500).send({ message: error instanceof Error ? error.message : 'Erro ao carregar usuários' });
    }

    return res.json(devMockUsers.map(({ id, email, role }) => ({ id, email, role })));
  }
});

app.get('/clients', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });

  const clients = await clientStore.findMany({
    include: {
      processes: {
        include: {
          owner: { select: { id: true, email: true, role: true } },
          atendimentos: { orderBy: { occurredAt: 'desc' }, take: 1 },
          documentos: true,
        },
        orderBy: { id: 'desc' },
      },
    },
    orderBy: { name: 'asc' },
  });

  res.json(clients.map((client: any) => buildClientPayload(client)));
});

app.get('/clients/:id', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });

  const client = await clientStore.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      processes: {
        include: {
          owner: { select: { id: true, email: true, role: true } },
          atendimentos: { orderBy: { occurredAt: 'desc' }, take: 1 },
          documentos: true,
        },
        orderBy: { id: 'desc' },
      },
    },
  });

  if (!client) return res.status(404).send({ message: 'Cliente não encontrado' });
  res.json(buildClientPayload(client));
});

app.get('/clients/:id/portal', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });

  try {
    const data = await clientPortalService.fetch({
      clientId: Number(req.params.id),
      includeDocuments: req.query.includeDocuments !== '0',
      includePublications: req.query.includePublications !== '0',
      includeDeadlines: req.query.includeDeadlines !== '0',
    });

    res.json(data);
  } catch (error) {
    const status = getCrmContractStatus(error);
    if (status) {
      return res.status(status).json({
        message: error instanceof Error ? error.message : 'Falha ao carregar portal do cliente',
        code: getCrmContractCode(error),
        details: getCrmContractDetails(error),
      });
    }

    return res.status(500).send({ message: error instanceof Error ? error.message : 'Falha ao carregar portal do cliente' });
  }
});

app.get('/clients/:id/consent', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });
  if (!canManageClients(decoded.role)) return res.status(403).send({ message: 'Acesso negado' });

  try {
    const data = await clientConsentService.get(Number(req.params.id));
    res.json(data);
  } catch (error) {
    const status = getCrmContractStatus(error);
    if (status) {
      return res.status(status).json({
        message: error instanceof Error ? error.message : 'Falha ao carregar consentimento',
        code: getCrmContractCode(error),
        details: getCrmContractDetails(error),
      });
    }

    return res.status(500).send({ message: error instanceof Error ? error.message : 'Falha ao carregar consentimento' });
  }
});

app.put('/clients/:id/consent', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });
  if (!canManageClients(decoded.role)) return res.status(403).send({ message: 'Acesso negado' });

  try {
    const data = await clientConsentService.update({
      clientId: Number(req.params.id),
      preferences: req.body?.preferences,
      legalBasis: req.body?.legalBasis,
      capturedAt: typeof req.body?.capturedAt === 'string' ? req.body.capturedAt : new Date().toISOString(),
      capturedBy: typeof req.body?.capturedBy === 'string' && req.body.capturedBy.trim() ? req.body.capturedBy.trim() : decoded.email,
    });

    res.json(data);
  } catch (error) {
    const status = getCrmContractStatus(error);
    if (status) {
      return res.status(status).json({
        message: error instanceof Error ? error.message : 'Falha ao atualizar consentimento',
        code: getCrmContractCode(error),
        details: getCrmContractDetails(error),
      });
    }

    return res.status(500).send({ message: error instanceof Error ? error.message : 'Falha ao atualizar consentimento' });
  }
});

app.post('/clients', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });
  if (!canManageClients(decoded.role)) return res.status(403).send({ message: 'Acesso negado' });

  const { name, type, cpfCnpj, phone, email, address, status, legalArea, responsible, notes } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).send({ message: 'Nome do cliente é obrigatório' });
  }

  const existing = await clientStore.findUnique({ where: { name: name.trim() } });
  if (existing) return res.status(409).send({ message: 'Já existe cliente com este nome' });

  const created = await clientStore.create({
    data: {
      name: name.trim(),
      type: type || 'PF',
      cpfCnpj: cpfCnpj || null,
      phone: phone || null,
      email: email || null,
      address: address || null,
      status: status || 'ativo',
      legalArea: legalArea || null,
      responsible: responsible || getResponsibleLabel(decoded.email),
      notes: notes || null,
    },
    include: {
      processes: {
        include: {
          owner: { select: { id: true, email: true, role: true } },
          atendimentos: { orderBy: { occurredAt: 'desc' }, take: 1 },
          documentos: true,
        },
      },
    },
  });

  res.status(201).json(buildClientPayload(created));
});

app.put('/clients/:id', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });
  if (!canManageClients(decoded.role)) return res.status(403).send({ message: 'Acesso negado' });

  const clientId = Number(req.params.id);
  const current = await clientStore.findUnique({ where: { id: clientId } });
  if (!current) return res.status(404).send({ message: 'Cliente não encontrado' });

  const { name, type, cpfCnpj, phone, email, address, status, legalArea, responsible, notes } = req.body;
  const nextName = typeof name === 'string' ? name.trim() : current.name;
  if (!nextName) return res.status(400).send({ message: 'Nome do cliente é obrigatório' });

  if (nextName !== current.name) {
    const duplicated = await clientStore.findUnique({ where: { name: nextName } });
    if (duplicated) return res.status(409).send({ message: 'Já existe cliente com este nome' });
  }

  const updated = await clientStore.update({
    where: { id: clientId },
    data: {
      name: nextName,
      type: type ?? current.type,
      cpfCnpj: cpfCnpj ?? current.cpfCnpj,
      phone: phone ?? current.phone,
      email: email ?? current.email,
      address: address ?? current.address,
      status: status ?? current.status,
      legalArea: legalArea ?? current.legalArea,
      responsible: responsible ?? current.responsible,
      notes: notes ?? current.notes,
    },
    include: {
      processes: {
        include: {
          owner: { select: { id: true, email: true, role: true } },
          atendimentos: { orderBy: { occurredAt: 'desc' }, take: 1 },
          documentos: true,
        },
      },
    },
  });

  if (nextName !== current.name) {
    await prisma.process.updateMany({
      where: { clientId },
      data: { client: nextName },
    });
  }

  res.json(buildClientPayload(updated));
});

app.get('/clients/:id/communications', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });
  if (!canAccessCrm(decoded)) return res.status(403).send({ message: 'Acesso negado' });

  try {
    const data = await clientCommunicationService.history({
      clientId: Number(req.params.id),
      channel: typeof req.query.channel === 'string' ? req.query.channel : 'all',
      limit: typeof req.query.limit === 'string' ? Number(req.query.limit) : 20,
    });

    res.json(data);
  } catch (error) {
    const status = getCrmContractStatus(error);
    if (status) {
      return res.status(status).json({
        message: error instanceof Error ? error.message : 'Falha ao carregar histórico de comunicação',
        code: getCrmContractCode(error),
        details: getCrmContractDetails(error),
      });
    }

    return res.status(500).send({ message: error instanceof Error ? error.message : 'Falha ao carregar histórico de comunicação' });
  }
});

app.post('/clients/:id/communications', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });
  if (!canAccessCrm(decoded)) return res.status(403).send({ message: 'Acesso negado' });

  try {
    const data = await clientCommunicationService.send({
      clientId: Number(req.params.id),
      channel: req.body?.channel,
      subject: req.body?.subject,
      message: req.body?.message,
      templateCode: req.body?.templateCode,
      contextEntityType: req.body?.contextEntityType,
      contextEntityId: req.body?.contextEntityId,
      idempotencyKey: typeof req.headers['idempotency-key'] === 'string'
        ? req.headers['idempotency-key']
        : `comm:${req.params.id}:${req.body?.channel ?? 'portal'}:${String(req.body?.contextEntityType ?? 'manual')}:${String(req.body?.contextEntityId ?? 'na')}`,
    });

    res.status(data.idempotent ? 200 : 201).json(data);
  } catch (error) {
    const status = getCrmContractStatus(error);
    if (status) {
      return res.status(status).json({
        message: error instanceof Error ? error.message : 'Falha ao enviar comunicação',
        code: getCrmContractCode(error),
        details: getCrmContractDetails(error),
      });
    }

    return res.status(500).send({ message: error instanceof Error ? error.message : 'Falha ao enviar comunicação' });
  }
});

app.post('/clients/:id/communications/:communicationId/retry', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });
  if (!canAccessCrm(decoded)) return res.status(403).send({ message: 'Acesso negado' });

  try {
    const data = await clientCommunicationService.retry({
      clientId: Number(req.params.id),
      communicationId: req.params.communicationId,
      idempotencyKey: typeof req.headers['idempotency-key'] === 'string'
        ? req.headers['idempotency-key']
        : `comm-retry:${req.params.id}:${req.params.communicationId}`,
    });

    res.status(data.idempotent ? 200 : 201).json(data);
  } catch (error) {
    const status = getCrmContractStatus(error);
    if (status) {
      return res.status(status).json({
        message: error instanceof Error ? error.message : 'Falha ao reprocessar comunicação',
        code: getCrmContractCode(error),
        details: getCrmContractDetails(error),
      });
    }

    return res.status(500).send({ message: error instanceof Error ? error.message : 'Falha ao reprocessar comunicação' });
  }
});

app.get('/attendances', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });

  const attendances = await prisma.atendimento.findMany({
    where: decoded.role === 'ADM' || decoded.role === 'FIN'
      ? undefined
      : {
          OR: [
            { actorEmail: decoded.email },
            { process: { ownerId: decoded.sub } },
            { responsible: getResponsibleLabel(decoded.email) },
          ],
        },
    include: {
      process: {
        include: {
          owner: { select: { id: true, email: true, role: true } },
          clientRecord: true,
        },
      },
      clientRecord: true,
    },
    orderBy: { occurredAt: 'desc' },
  });

  res.json(attendances.map((attendance) => buildAttendancePayload(attendance)));
});

app.get('/attendances/:id', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });

  const attendance = await prisma.atendimento.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      process: {
        include: {
          owner: { select: { id: true, email: true, role: true } },
          clientRecord: true,
        },
      },
      clientRecord: true,
    },
  });

  if (!attendance) return res.status(404).send({ message: 'Atendimento não encontrado' });
  if (attendance.process && !canReadProcess(decoded, attendance.process)) {
    return res.status(403).send({ message: 'Acesso negado' });
  }

  res.json(buildAttendancePayload(attendance));
});

app.post('/attendances', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });

  const {
    processId,
    clientId,
    client,
    canal,
    tipo,
    assunto,
    resumo,
    observacoes,
    status,
    priority,
    responsavel,
    proximoPasso,
    retornoAgendado,
    dataHora,
    critical,
  } = req.body;

  if (!assunto || typeof assunto !== 'string' || !assunto.trim()) {
    return res.status(400).send({ message: 'Assunto do atendimento é obrigatório' });
  }

  let processRecord: any = null;
  if (processId) {
    const access = await assertProcessAccess(decoded, Number(processId));
    if (access.error) return res.status(access.error.status).send({ message: access.error.message });
    processRecord = access.process;
  }

  let linkedClientId: number | null = null;
  if (clientId) {
    const existingClient = await clientStore.findUnique({ where: { id: Number(clientId) } });
    if (!existingClient) return res.status(404).send({ message: 'Cliente não encontrado' });
    linkedClientId = existingClient.id;
  } else if (processRecord?.clientId) {
    linkedClientId = processRecord.clientId;
  } else if (typeof client === 'string' && client.trim()) {
    const linkedClient = await clientStore.upsert({
      where: { name: client.trim() },
      update: {},
      create: {
        name: client.trim(),
        type: 'PF',
        status: 'ativo',
        legalArea: processRecord?.phase ?? null,
        responsible: responsavel || getResponsibleLabel(decoded.email),
        notes: 'Cliente criado automaticamente a partir de um atendimento.',
      },
    });
    linkedClientId = linkedClient.id;
  }

  const created = await prisma.atendimento.create({
    data: {
      processId: processRecord?.id ?? null,
      clientId: linkedClientId,
      subject: assunto.trim(),
      summary: typeof resumo === 'string' ? resumo.trim() : '',
      notes: typeof observacoes === 'string' ? observacoes.trim() : null,
      occurredAt: dataHora ? new Date(dataHora) : new Date(),
      channel: canal || 'interno',
      type: tipo || 'rotina',
      status: status || 'aberto',
      priority: priority || 'media',
      responsible: responsavel || getResponsibleLabel(decoded.email),
      nextStep: typeof proximoPasso === 'string' ? proximoPasso.trim() : null,
      scheduledReturnAt: retornoAgendado ? new Date(retornoAgendado) : null,
      critical: Boolean(critical ?? (processRecord?.status && processRecord.status !== 'ativo')),
      actorEmail: decoded.email,
    },
    include: {
      process: {
        include: {
          owner: { select: { id: true, email: true, role: true } },
          clientRecord: true,
        },
      },
      clientRecord: true,
    },
  });

  res.status(201).json(buildAttendancePayload(created));
});

app.put('/attendances/:id', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });

  const current = await prisma.atendimento.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      process: {
        include: {
          owner: { select: { id: true, email: true, role: true } },
          clientRecord: true,
        },
      },
      clientRecord: true,
    },
  });

  if (!current) return res.status(404).send({ message: 'Atendimento não encontrado' });
  if (current.process && !canReadProcess(decoded, current.process)) {
    return res.status(403).send({ message: 'Acesso negado' });
  }

  const {
    canal,
    tipo,
    assunto,
    resumo,
    observacoes,
    status,
    priority,
    responsavel,
    proximoPasso,
    retornoAgendado,
    dataHora,
    critical,
  } = req.body;

  const updated = await prisma.atendimento.update({
    where: { id: current.id },
    data: {
      subject: typeof assunto === 'string' && assunto.trim() ? assunto.trim() : current.subject,
      summary: typeof resumo === 'string' ? resumo.trim() : current.summary,
      notes: observacoes === undefined ? current.notes : (typeof observacoes === 'string' ? observacoes.trim() : null),
      occurredAt: dataHora ? new Date(dataHora) : current.occurredAt,
      channel: canal ?? current.channel,
      type: tipo ?? current.type,
      status: status ?? current.status,
      priority: priority ?? current.priority,
      responsible: responsavel ?? current.responsible,
      nextStep: proximoPasso === undefined ? current.nextStep : (typeof proximoPasso === 'string' ? proximoPasso.trim() : null),
      scheduledReturnAt: retornoAgendado === undefined ? current.scheduledReturnAt : (retornoAgendado ? new Date(retornoAgendado) : null),
      critical: critical ?? current.critical,
    },
    include: {
      process: {
        include: {
          owner: { select: { id: true, email: true, role: true } },
          clientRecord: true,
        },
      },
      clientRecord: true,
    },
  });

  res.json(buildAttendancePayload(updated));
});

app.get('/deadlines', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });

  try {
    const ownerLabel = getResponsibleLabel(decoded.email);
    const deadlines = await prisma.prazo.findMany({
      where: decoded.role === 'ADM' || decoded.role === 'FIN'
        ? undefined
        : {
            OR: [
              { createdBy: ownerLabel ?? decoded.email },
              { responsible: ownerLabel ?? decoded.email },
              { process: { ownerId: decoded.sub } },
            ],
          },
      include: {
        process: {
          include: {
            owner: { select: { id: true, email: true, role: true } },
            clientRecord: true,
          },
        },
      },
      orderBy: [
        { dueDate: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    return res.json(deadlines.map((deadline) => ({
      ...buildDeadlinePayload(deadline),
      risk: buildDeadlineRisk(deadline),
    })));
  } catch (error) {
    if (!devMockEnabled || !isPrismaConnectionError(error)) {
      return res.status(500).send({ message: error instanceof Error ? error.message : 'Erro ao carregar prazos' });
    }

    return res.json(getDevMockDeadlinesForRole(decoded));
  }
});

app.get('/deadlines/:id', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });

  const deadline = await prisma.prazo.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      process: {
        include: {
          owner: { select: { id: true, email: true, role: true } },
          clientRecord: true,
        },
      },
    },
  });

  if (!deadline) return res.status(404).send({ message: 'Prazo não encontrado' });
  if (!canReadDeadline(decoded, deadline)) return res.status(403).send({ message: 'Acesso negado' });

  res.json({
    ...buildDeadlinePayload(deadline),
    risk: buildDeadlineRisk(deadline),
  });
});

app.post('/deadlines', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });

  const { title, processId, dueDate, priority, status, origin, responsible, notes } = req.body;

  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).send({ message: 'Título do prazo é obrigatório' });
  }

  if (!processId) {
    return res.status(400).send({ message: 'Processo vinculado é obrigatório' });
  }

  if (!dueDate || typeof dueDate !== 'string') {
    return res.status(400).send({ message: 'Data de vencimento é obrigatória' });
  }

  const access = await assertProcessAccess(decoded, Number(processId));
  if (access.error) return res.status(access.error.status).send({ message: access.error.message });

  const processRecord = access.process;
  const created = await prisma.prazo.create({
    data: {
      processId: processRecord.id,
      title: title.trim(),
      dueDate: new Date(dueDate),
      priority: priority || 'media',
      status: status || 'aberto',
      origin: origin || 'interno',
      responsible: responsible || getResponsibleLabel(decoded.email) || decoded.email,
      legalArea: processRecord.phase,
      notes: typeof notes === 'string' ? notes.trim() : null,
      agendaSyncStatus: 'missing',
      createdBy: getResponsibleLabel(decoded.email) || decoded.email,
    },
    include: {
      process: {
        include: {
          owner: { select: { id: true, email: true, role: true } },
          clientRecord: true,
        },
      },
    },
  });

  res.status(201).json({
    ...buildDeadlinePayload(created),
    risk: buildDeadlineRisk(created),
  });
});

app.put('/deadlines/:id', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });

  const current = await prisma.prazo.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      process: {
        include: {
          owner: { select: { id: true, email: true, role: true } },
          clientRecord: true,
        },
      },
    },
  });

  if (!current) return res.status(404).send({ message: 'Prazo não encontrado' });
  if (!canReadDeadline(decoded, current)) return res.status(403).send({ message: 'Acesso negado' });

  const { title, dueDate, priority, status, responsible, notes, origin, completionJustification } = req.body;
  const nextStatus = status ?? current.status;

  const updated = await prisma.prazo.update({
    where: { id: current.id },
    data: {
      title: typeof title === 'string' && title.trim() ? title.trim() : current.title,
      dueDate: dueDate ? new Date(dueDate) : current.dueDate,
      priority: priority ?? current.priority,
      status: nextStatus,
      responsible: responsible ?? current.responsible,
      notes: notes === undefined ? current.notes : (typeof notes === 'string' ? notes.trim() : null),
      origin: origin ?? current.origin,
      completedAt: nextStatus === 'concluido' ? new Date() : (status ? null : current.completedAt),
      completedBy: nextStatus === 'concluido' ? (getResponsibleLabel(decoded.email) || decoded.email) : null,
      completionJustification: nextStatus === 'concluido'
        ? (typeof completionJustification === 'string' && completionJustification.trim() ? completionJustification.trim() : 'Conclusão manual')
        : null,
    },
    include: {
      process: {
        include: {
          owner: { select: { id: true, email: true, role: true } },
          clientRecord: true,
        },
      },
    },
  });

  if (nextStatus === 'concluido') {
    await persistDeadlineAuditEvent(deadlineAuditService.recordCompletion({
      actor: buildDeadlineActor(decoded),
      deadlineId: updated.id,
      processId: updated.processId,
      publicationId: updated.publicationId ?? null,
      source: 'manual',
      reason: typeof completionJustification === 'string' && completionJustification.trim() ? completionJustification.trim() : null,
      occurredAt: new Date().toISOString(),
      risk: buildDeadlineRisk(updated),
    }));
  }

  res.json({
    ...buildDeadlinePayload(updated),
    risk: buildDeadlineRisk(updated),
  });
});

app.post('/deadlines/bulk-action', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });

  const bulkActionService = new DeadlineBulkActionService({
    store: {
      listByIds: async (ids) => {
        const rows = await prisma.prazo.findMany({
          where: { id: { in: ids } },
          include: {
            process: {
              include: {
                owner: { select: { id: true, email: true, role: true } },
                clientRecord: true,
              },
            },
          },
        });

        return rows.filter((row) => canReadDeadline(decoded, row)).map((row) => ({
          id: row.id,
          processId: row.processId,
          processTitle: row.process?.title ?? null,
          processPhase: row.legalArea ?? row.process?.phase ?? null,
          clientId: row.process?.clientRecord?.id ?? null,
          clientName: row.process?.clientRecord?.name ?? row.process?.client ?? null,
          title: row.title,
          description: row.notes ?? null,
          dueDate: row.dueDate.toISOString().slice(0, 10),
          status: row.status,
          priority: row.priority,
          origin: row.origin ?? 'interno',
          responsible: row.responsible ?? null,
          createdBy: row.createdBy ?? null,
          completedAt: row.completedAt ? row.completedAt.toISOString() : null,
          publicationId: row.publicationId ?? null,
          agendaEventId: row.agendaEventId ? String(row.agendaEventId) : null,
          agendaSyncStatus: (row.agendaSyncStatus as any) ?? (row.agendaEventId ? 'synced' : 'missing'),
        }));
      },
      save: async (deadline) => {
        const updated = await prisma.prazo.update({
          where: { id: deadline.id },
          data: {
            dueDate: new Date(`${deadline.dueDate}T12:00:00.000Z`),
            status: deadline.status,
            priority: deadline.priority,
            responsible: deadline.responsible,
            completedAt: deadline.completedAt ? new Date(deadline.completedAt) : null,
            notes: deadline.description,
          },
          include: {
            process: {
              include: {
                owner: { select: { id: true, email: true, role: true } },
                clientRecord: true,
              },
            },
          },
        });

        return {
          id: updated.id,
          processId: updated.processId,
          processTitle: updated.process?.title ?? null,
          processPhase: updated.legalArea ?? updated.process?.phase ?? null,
          clientId: updated.process?.clientRecord?.id ?? null,
          clientName: updated.process?.clientRecord?.name ?? updated.process?.client ?? null,
          title: updated.title,
          description: updated.notes ?? null,
          dueDate: updated.dueDate.toISOString().slice(0, 10),
          status: updated.status,
          priority: updated.priority,
          origin: updated.origin ?? 'interno',
          responsible: updated.responsible ?? null,
          createdBy: updated.createdBy ?? null,
          completedAt: updated.completedAt ? updated.completedAt.toISOString() : null,
          publicationId: updated.publicationId ?? null,
          agendaEventId: updated.agendaEventId ? String(updated.agendaEventId) : null,
          agendaSyncStatus: (updated.agendaSyncStatus as any) ?? (updated.agendaEventId ? 'synced' : 'missing'),
        };
      },
      getIdempotency: async (key) => {
        const record = await prisma.crmIdempotencyRequest.findUnique({
          where: { scope_key: { scope: 'deadlines.bulkAction', key } },
        });
        return record ? { key, status: 'completed', result: record.responseBody as any } : null;
      },
      saveIdempotency: async (record) => {
        await prisma.crmIdempotencyRequest.create({
          data: {
            key: record.key,
            scope: 'deadlines.bulkAction',
            entityType: 'deadline',
            entityId: null,
            action: 'bulk_action',
            payloadHash: record.key,
            responseCode: 200,
            responseBody: record.result,
          },
        });
      },
    },
  });

  try {
    const result = await bulkActionService.execute({
      idempotencyKey: typeof req.headers['idempotency-key'] === 'string' ? req.headers['idempotency-key'] : `bulk-${Date.now()}`,
      actor: buildDeadlineActor(decoded),
      action: req.body?.action,
    });

    for (const event of result.auditEvents) {
      await persistDeadlineAuditEvent(event);
    }

    res.json(result);
  } catch (error) {
    if (error instanceof DeadlineDomainError) {
      return res.status(error.statusCode).json({ message: error.message, code: error.code, details: error.details ?? null });
    }

    return res.status(500).json({ message: error instanceof Error ? error.message : 'Falha na ação em massa de prazos' });
  }
});

app.get('/documents', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });

  const ownerLabel = getResponsibleLabel(decoded.email);
  const documents = await prisma.documento.findMany({
    where: decoded.role === 'ADM' || decoded.role === 'FIN'
      ? undefined
      : {
          OR: [
            { createdBy: ownerLabel ?? decoded.email },
            { responsible: ownerLabel ?? decoded.email },
            { process: { ownerId: decoded.sub } },
          ],
        },
    include: {
      process: {
        include: {
          owner: { select: { id: true, email: true, role: true } },
          clientRecord: true,
        },
      },
    },
    orderBy: [
      { uploadedAt: 'desc' },
      { version: 'desc' },
    ],
  });

  res.json(await Promise.all(documents.map((document) => buildDocumentResponse(document))));
});

app.get('/documents/:id', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });

  const document = await prisma.documento.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      process: {
        include: {
          owner: { select: { id: true, email: true, role: true } },
          clientRecord: true,
        },
      },
    },
  });

  if (!document) return res.status(404).send({ message: 'Documento não encontrado' });
  if (!canReadDocument(decoded, document)) return res.status(403).send({ message: 'Acesso negado' });

  res.json(await buildDocumentResponse(document));
});

app.get('/documents/:id/audit', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });

  const document = await prisma.documento.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      process: {
        include: {
          owner: { select: { id: true, email: true, role: true } },
          clientRecord: true,
        },
      },
    },
  });

  if (!document) return res.status(404).send({ message: 'Documento não encontrado' });
  if (!canReadDocument(decoded, document)) return res.status(403).send({ message: 'Acesso negado' });

  res.json(await listDocumentAuditTrail(document.id));
});

app.get('/documents/:id/links', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });

  const document = await prisma.documento.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      process: {
        include: {
          owner: { select: { id: true, email: true, role: true } },
          clientRecord: true,
        },
      },
    },
  });

  if (!document) return res.status(404).send({ message: 'Documento não encontrado' });
  if (!canReadDocument(decoded, document)) return res.status(403).send({ message: 'Acesso negado' });

  const sidecar = await hydrateDocumentSidecar(document.id);
  res.json({ documentId: document.id, links: sidecar.links });
});

app.post('/documents/:id/links', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });

  const document = await prisma.documento.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      process: {
        include: {
          owner: { select: { id: true, email: true, role: true } },
          clientRecord: true,
        },
      },
    },
  });

  if (!document) return res.status(404).send({ message: 'Documento não encontrado' });
  if (!canReadDocument(decoded, document)) return res.status(403).send({ message: 'Acesso negado' });

  try {
    const result = await createDocumentLinksService().bindEntities({
      documentId: document.id,
      processId: req.body?.processId,
      deadlineId: req.body?.deadlineId,
      attendanceId: req.body?.attendanceId,
      triageItemId: req.body?.triageItemId,
      crmOpportunityId: req.body?.crmOpportunityId,
      actor: { source: 'user', email: decoded.email, role: decoded.role, userId: decoded.sub },
      idempotencyKey: typeof req.headers['idempotency-key'] === 'string' ? req.headers['idempotency-key'] : null,
    });

    await recordDocumentAuditEvent({
      documentId: document.id,
      action: 'document.link.bindEntities',
      status: 'success',
      summary: `Vínculos atualizados para documento #${document.id}`,
      details: { links: result.links },
      actor: { source: 'user', email: decoded.email, role: decoded.role, userId: decoded.sub },
      idempotencyKey: typeof req.headers['idempotency-key'] === 'string' ? req.headers['idempotency-key'] : null,
    });

    res.status(result.idempotent ? 200 : 201).json({ documentId: result.documentId, links: result.links, idempotent: result.idempotent });
  } catch (error) {
    const statusCode = getCrmContractStatus(error) ?? 500;
    return res.status(statusCode).json({
      message: error instanceof Error ? error.message : 'Falha ao vincular entidades ao documento',
      code: getCrmContractCode(error),
      details: getCrmContractDetails(error),
    });
  }
});

app.post('/documents', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });

  const { title, processId, category, status, origin, responsible, notes, requiredChecklist, pendingForAdvance, mimeType, previewUrl } = req.body;

  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).send({ message: 'Título do documento é obrigatório' });
  }

  if (!processId) {
    return res.status(400).send({ message: 'Processo vinculado é obrigatório' });
  }

  const access = await assertProcessAccess(decoded, Number(processId));
  if (access.error) return res.status(access.error.status).send({ message: access.error.message });

  if (req.body?.file?.contentBase64) {
    try {
      const uploaded = await createDocumentUploadService().upload({
        processId: Number(processId),
        title: title.trim(),
        description: typeof notes === 'string' ? notes.trim() : '',
        category,
        status,
        origin,
        responsible,
        requiredChecklist,
        pendingForAdvance,
        previewUrl,
        createdBy: getResponsibleLabel(decoded.email) || decoded.email,
        actor: {
          source: 'user',
          userId: decoded.sub,
          email: decoded.email,
          role: decoded.role,
        },
        file: req.body.file,
        metadata: req.body?.metadata ?? {},
      });

      const created = await prisma.documento.findUnique({
        where: { id: uploaded.document.id },
        include: {
          process: {
            include: {
              owner: { select: { id: true, email: true, role: true } },
              clientRecord: true,
            },
          },
        },
      });

      if (!created) return res.status(404).send({ message: 'Documento não encontrado após upload' });
      return res.status(201).json(await buildDocumentResponse(created));
    } catch (error) {
      const statusCode = getCrmContractStatus(error) ?? 500;
      return res.status(statusCode).json({
        message: error instanceof Error ? error.message : 'Falha no upload do documento',
        code: getCrmContractCode(error),
        details: getCrmContractDetails(error),
      });
    }
  }

  const processRecord = access.process;
  const created = await prisma.documento.create({
    data: {
      processId: processRecord.id,
      title: title.trim(),
      description: typeof notes === 'string' ? notes.trim() : '',
      status: status || 'pendente',
      category: category || 'Checklist',
      origin: origin || 'interno',
      responsible: responsible || getResponsibleLabel(decoded.email) || decoded.email,
      requiredChecklist: Boolean(requiredChecklist),
      pendingForAdvance: Boolean(pendingForAdvance),
      mimeType: mimeType || 'application/octet-stream',
      previewUrl: typeof previewUrl === 'string' ? previewUrl : null,
      createdBy: getResponsibleLabel(decoded.email) || decoded.email,
    },
    include: {
      process: {
        include: {
          owner: { select: { id: true, email: true, role: true } },
          clientRecord: true,
        },
      },
    },
  });

  await recordDocumentAuditEvent({
    documentId: created.id,
    action: 'document.upload',
    status: 'success',
    summary: `Documento lógico criado para processo #${created.processId}`,
    details: {
      metadata: req.body?.metadata ?? {},
      storage: {},
      processId: created.processId,
      version: created.version,
    },
    actor: { source: 'user', email: decoded.email, role: decoded.role, userId: decoded.sub },
  });

  res.status(201).json(await buildDocumentResponse(created));
});

app.put('/documents/:id', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });

  const current = await prisma.documento.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      process: {
        include: {
          owner: { select: { id: true, email: true, role: true } },
          clientRecord: true,
        },
      },
    },
  });

  if (!current) return res.status(404).send({ message: 'Documento não encontrado' });
  if (!canReadDocument(decoded, current)) return res.status(403).send({ message: 'Acesso negado' });

  const { title, status, category, origin, responsible, notes, requiredChecklist, pendingForAdvance, mimeType, previewUrl, createNewVersion } = req.body;

  if (createNewVersion) {
    try {
      const versioned = await createDocumentVersioningService().createVersion({
        documentId: current.id,
        actor: {
          source: 'user',
          userId: decoded.sub,
          email: decoded.email,
          role: decoded.role,
        },
        changes: {
          title: typeof title === 'string' ? title.trim() : undefined,
          description: typeof notes === 'string' ? notes.trim() : undefined,
          status: status || 'aguardando_validacao',
          category,
          origin,
          responsible,
          requiredChecklist,
          pendingForAdvance,
          mimeType,
          previewUrl,
          metadata: req.body?.metadata,
        },
      });

      const versionedRecord = await prisma.documento.findUnique({
        where: { id: versioned.id },
        include: {
          process: {
            include: {
              owner: { select: { id: true, email: true, role: true } },
              clientRecord: true,
            },
          },
        },
      });

      if (!versionedRecord) return res.status(404).send({ message: 'Versão não encontrada após criação' });
      return res.json(await buildDocumentResponse(versionedRecord));
    } catch (error) {
      const statusCode = getCrmContractStatus(error) ?? 500;
      return res.status(statusCode).json({
        message: error instanceof Error ? error.message : 'Falha ao criar nova versão',
        code: getCrmContractCode(error),
        details: getCrmContractDetails(error),
      });
    }
  }

  if (status === 'validado' || status === 'rejeitado') {
    try {
      await createDocumentApprovalService().decide({
        documentId: current.id,
        decision: status === 'validado' ? 'approved' : 'rejected',
        reason: typeof req.body?.approvalReason === 'string'
          ? req.body.approvalReason
          : typeof notes === 'string' && notes.trim()
            ? notes.trim()
            : status === 'rejeitado'
              ? 'Rejeitado na atualização do documento'
              : 'Aprovado na atualização do documento',
        actor: {
          source: 'user',
          userId: decoded.sub,
          email: decoded.email,
          role: decoded.role,
        },
      });

      const updatedRecord = await prisma.documento.findUnique({
        where: { id: current.id },
        include: {
          process: {
            include: {
              owner: { select: { id: true, email: true, role: true } },
              clientRecord: true,
            },
          },
        },
      });

      if (!updatedRecord) return res.status(404).send({ message: 'Documento não encontrado após decisão' });
      return res.json(await buildDocumentResponse(updatedRecord));
    } catch (error) {
      const statusCode = getCrmContractStatus(error) ?? 500;
      return res.status(statusCode).json({
        message: error instanceof Error ? error.message : 'Falha ao aprovar/rejeitar documento',
        code: getCrmContractCode(error),
        details: getCrmContractDetails(error),
      });
    }
  }

  const updated = await prisma.documento.update({
    where: { id: current.id },
    data: {
      title: typeof title === 'string' && title.trim() ? title.trim() : current.title,
      description: notes === undefined ? current.description : (typeof notes === 'string' ? notes.trim() : current.description),
      status: status ?? current.status,
      category: category ?? current.category,
      origin: origin ?? current.origin,
      responsible: responsible ?? current.responsible,
      requiredChecklist: requiredChecklist ?? current.requiredChecklist,
      pendingForAdvance: pendingForAdvance ?? current.pendingForAdvance,
      mimeType: mimeType ?? current.mimeType,
      previewUrl: previewUrl === undefined ? current.previewUrl : previewUrl,
    },
    include: {
      process: {
        include: {
          owner: { select: { id: true, email: true, role: true } },
          clientRecord: true,
        },
      },
    },
  });

  res.json(await buildDocumentResponse(updated));
});

app.get('/crm/leads', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });
  if (!canAccessCrm(decoded)) return res.status(403).send({ message: 'Acesso negado' });

  const leads = await prisma.crmLead.findMany({
    include: {
      clientRecord: true,
      triageItems: true,
      contactEvents: { orderBy: { createdAt: 'desc' } },
    },
    orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
  });

  res.json(leads.map((item: any) => buildCrmLeadPayload(item)));
});

app.get('/crm/opportunities', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });
  if (!canAccessCrm(decoded)) return res.status(403).send({ message: 'Acesso negado' });

  const opportunities = await prisma.crmOpportunity.findMany({
    include: {
      clientRecord: true,
      triageItems: true,
      contactEvents: { orderBy: { createdAt: 'desc' } },
    },
    orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
  });

  res.json(opportunities.map((item: any) => buildCrmOpportunityPayload(item)));
});

app.post('/crm/opportunities', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });
  if (!canAccessCrm(decoded)) return res.status(403).send({ message: 'Acesso negado' });

  const personName = typeof req.body?.personName === 'string' ? req.body.personName.trim() : '';
  const summary = typeof req.body?.summary === 'string' ? req.body.summary.trim() : '';
  const source = typeof req.body?.source === 'string' && req.body.source.trim() ? req.body.source.trim() : 'manual';
  const status = typeof req.body?.status === 'string' && req.body.status.trim() ? req.body.status.trim() : 'acao_recomendada';
  const responsible = typeof req.body?.responsible === 'string' ? req.body.responsible.trim() || null : null;
  const cpf = typeof req.body?.cpf === 'string' ? req.body.cpf.trim() || null : null;
  const clientName = typeof req.body?.clientName === 'string' ? req.body.clientName.trim() : '';
  const parsedNextContact = parseOptionalDateTime(req.body?.nextContactAt);
  if (parsedNextContact === 'invalid') {
    return res.status(400).send({ message: 'nextContactAt inválido. Use data/hora ISO válida.' });
  }
  const nextContactAt = parsedNextContact;

  if (!personName) return res.status(400).send({ message: 'Nome do contato é obrigatório' });
  if (!summary) return res.status(400).send({ message: 'Resumo da oportunidade é obrigatório' });

  const commercialRuleError = validateOpportunityCommercialRules({
    currentStatus: 'acao_recomendada',
    nextStatus: status,
    responsible,
    nextContactAt,
  });
  if (commercialRuleError) {
    return res.status(400).send({ message: commercialRuleError });
  }

  let clientId: number | null = null;
  if (typeof req.body?.clientId === 'number') {
    const client = await clientStore.findUnique({ where: { id: req.body.clientId } });
    clientId = client?.id ?? null;
  }

  if (!clientId && cpf) {
    const linkedByCpf = await clientStore.findFirst({ where: { cpfCnpj: cpf } });
    clientId = linkedByCpf?.id ?? null;
  }

  if (!clientId && clientName) {
    const linkedByName = await clientStore.upsert({
      where: { name: clientName },
      update: {
        cpfCnpj: cpf ?? undefined,
        responsible: responsible ?? undefined,
        status: 'prospecto',
      },
      create: {
        name: clientName,
        type: 'PJ',
        cpfCnpj: cpf,
        status: 'prospecto',
        responsible,
        notes: 'Cliente criado a partir do CRM jurídico.',
      },
    });
    clientId = linkedByName.id;
  }

  const created = await prisma.crmOpportunity.create({
    data: {
      clientId,
      cpf,
      personName,
      source,
      status,
      responsible,
      summary,
      nextContactAt,
    },
    include: { clientRecord: true, triageItems: true, contactEvents: { orderBy: { createdAt: 'desc' } } },
  });

  res.status(201).json(buildCrmOpportunityPayload(created));
});

app.put('/crm/leads/:id', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });
  if (!canAccessCrm(decoded)) return res.status(403).send({ message: 'Acesso negado' });

  const current = await prisma.crmLead.findUnique({
    where: { id: Number(req.params.id) },
    include: { clientRecord: true, triageItems: true, contactEvents: { orderBy: { createdAt: 'desc' } } },
  });
  if (!current) return res.status(404).send({ message: 'Lead não encontrado' });

  const nextContactAt = typeof req.body?.nextContactAt === 'string' && req.body.nextContactAt.trim()
    ? new Date(req.body.nextContactAt)
    : req.body?.nextContactAt === null
      ? null
      : current.nextContactAt;

  const updated = await prisma.crmLead.update({
    where: { id: current.id },
    data: {
      status: typeof req.body?.status === 'string' && req.body.status.trim() ? req.body.status.trim() : current.status,
      summary: typeof req.body?.summary === 'string' && req.body.summary.trim() ? req.body.summary.trim() : current.summary,
      personName: typeof req.body?.personName === 'string' && req.body.personName.trim() ? req.body.personName.trim() : current.personName,
      responsible: typeof req.body?.responsible === 'string' ? req.body.responsible.trim() || null : current.responsible,
      nextContactAt,
    },
    include: { clientRecord: true, triageItems: true, contactEvents: { orderBy: { createdAt: 'desc' } } },
  });

  res.json(buildCrmLeadPayload(updated));
});

app.put('/crm/opportunities/:id', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });
  if (!canAccessCrm(decoded)) return res.status(403).send({ message: 'Acesso negado' });

  const current = await prisma.crmOpportunity.findUnique({
    where: { id: Number(req.params.id) },
    include: { clientRecord: true, triageItems: true, contactEvents: { orderBy: { createdAt: 'desc' } } },
  });
  if (!current) return res.status(404).send({ message: 'Oportunidade não encontrada' });

  const parsedNextContact = req.body?.nextContactAt === null
    ? null
    : req.body?.nextContactAt === undefined
      ? current.nextContactAt
      : parseOptionalDateTime(req.body?.nextContactAt);
  if (parsedNextContact === 'invalid') {
    return res.status(400).send({ message: 'nextContactAt inválido. Use data/hora ISO válida.' });
  }
  const nextContactAt = parsedNextContact;
  const nextStatus = resolveOpportunityStatus(req.body?.status, current.status);
  const nextResponsible = typeof req.body?.responsible === 'string'
    ? req.body.responsible.trim() || null
    : current.responsible;

  const commercialRuleError = validateOpportunityCommercialRules({
    currentStatus: current.status,
    nextStatus,
    responsible: nextResponsible,
    nextContactAt,
  });
  if (commercialRuleError) {
    return res.status(400).send({ message: commercialRuleError });
  }

  const updated = await prisma.crmOpportunity.update({
    where: { id: current.id },
    data: {
      status: nextStatus,
      summary: typeof req.body?.summary === 'string' && req.body.summary.trim() ? req.body.summary.trim() : current.summary,
      personName: typeof req.body?.personName === 'string' && req.body.personName.trim() ? req.body.personName.trim() : current.personName,
      responsible: nextResponsible,
      nextContactAt,
    },
    include: { clientRecord: true, triageItems: true, contactEvents: { orderBy: { createdAt: 'desc' } } },
  });

  res.json(buildCrmOpportunityPayload(updated));
});

app.post('/crm/leads/:id/contact-events', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });
  if (!canAccessCrm(decoded)) return res.status(403).send({ message: 'Acesso negado' });

  const lead = await prisma.crmLead.findUnique({
    where: { id: Number(req.params.id) },
    include: { clientRecord: true, triageItems: true, contactEvents: { orderBy: { createdAt: 'desc' } } },
  });
  if (!lead) return res.status(404).send({ message: 'Lead não encontrado' });

  const summary = typeof req.body?.summary === 'string' ? req.body.summary.trim() : '';
  if (!summary) return res.status(400).send({ message: 'Resumo do contato é obrigatório' });

  const kind = typeof req.body?.kind === 'string' && req.body.kind.trim() ? req.body.kind.trim() : 'contato';
  const nextContactAt = typeof req.body?.nextContactAt === 'string' && req.body.nextContactAt.trim()
    ? new Date(req.body.nextContactAt)
    : null;

  const updated = await prisma.crmLead.update({
    where: { id: lead.id },
    data: {
      lastContactAt: new Date(),
      nextContactAt: nextContactAt ?? lead.nextContactAt,
      contactEvents: {
        create: {
          kind,
          summary,
          createdBy: decoded.email,
        },
      },
    },
    include: { clientRecord: true, triageItems: true, contactEvents: { orderBy: { createdAt: 'desc' } } },
  });

  res.status(201).json(buildCrmLeadPayload(updated));
});

app.post('/crm/opportunities/:id/contact-events', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });
  if (!canAccessCrm(decoded)) return res.status(403).send({ message: 'Acesso negado' });

  try {
    await crmContactHistoryService.addContactEvent({
      opportunityId: Number(req.params.id),
      summary: req.body?.summary,
      kind: req.body?.kind,
      nextContactAt: req.body?.nextContactAt,
      occurredAt: new Date().toISOString(),
      idempotencyKey: typeof req.headers['idempotency-key'] === 'string' ? req.headers['idempotency-key'] : undefined,
      actor: {
        source: 'user',
        userId: decoded.sub,
        email: decoded.email,
        role: decoded.role,
      },
      metadata: {
        route: 'POST /crm/opportunities/:id/contact-events',
      },
    });

    const updated = await prisma.crmOpportunity.findUnique({
      where: { id: Number(req.params.id) },
      include: { clientRecord: true, triageItems: true, contactEvents: { orderBy: { createdAt: 'desc' } } },
    });

    if (!updated) return res.status(404).send({ message: 'Oportunidade não encontrada' });

    res.status(201).json(buildCrmOpportunityPayload(updated));
  } catch (error) {
    const status = getCrmContractStatus(error);
    if (status) {
      return res.status(status).json({
        message: error instanceof Error ? error.message : 'Falha ao registrar contato comercial',
        code: getCrmContractCode(error),
        details: getCrmContractDetails(error),
      });
    }

    return res.status(500).send({ message: error instanceof Error ? error.message : 'Falha ao registrar contato comercial' });
  }
});

app.get('/crm/opportunities/:id/documents', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });
  if (!canAccessCrm(decoded)) return res.status(403).send({ message: 'Acesso negado' });

  const opportunity = await prisma.crmOpportunity.findUnique({ where: { id: Number(req.params.id) } });
  if (!opportunity) return res.status(404).send({ message: 'Oportunidade não encontrada' });

  const attachments = await prisma.crmOpportunityDocumentAttachment.findMany({
    where: { crmOpportunityId: opportunity.id },
    orderBy: { uploadedAt: 'desc' },
  });

  res.json(attachments.map((attachment: any) => ({
    id: attachment.id,
    opportunityId: attachment.crmOpportunityId,
    documentId: attachment.documentId ?? null,
    title: attachment.titleSnapshot,
    category: attachment.category,
    status: attachment.status,
    mimeType: attachment.mimeType,
    previewUrl: attachment.previewUrl ?? null,
    requiredChecklist: Boolean(attachment.requiredChecklist),
    pendingForAdvance: Boolean(attachment.pendingForAdvance),
    uploadedAt: attachment.uploadedAt.toISOString(),
    responsible: attachment.responsible ?? '',
    createdBy: attachment.createdBy ?? '',
    externalDocumentId: attachment.externalDocumentId ?? null,
  })));
});

app.post('/crm/opportunities/:id/documents', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });
  if (!canAccessCrm(decoded)) return res.status(403).send({ message: 'Acesso negado' });

  try {
    const created = await crmOpportunityDocumentsService.attachDocument({
      opportunityId: Number(req.params.id),
      title: req.body?.title,
      description: req.body?.description,
      category: req.body?.category,
      mimeType: req.body?.mimeType,
      previewUrl: req.body?.previewUrl,
      responsible: req.body?.responsible,
      origin: req.body?.origin,
      uploadedAt: req.body?.uploadedAt,
      requiredChecklist: req.body?.requiredChecklist,
      pendingForAdvance: req.body?.pendingForAdvance,
      createdBy: decoded.email,
      externalDocumentId: req.body?.externalDocumentId,
      idempotencyKey: typeof req.headers['idempotency-key'] === 'string' ? req.headers['idempotency-key'] : undefined,
      actor: {
        source: 'user',
        userId: decoded.sub,
        email: decoded.email,
        role: decoded.role,
      },
      metadata: {
        route: 'POST /crm/opportunities/:id/documents',
      },
    });

    res.status(201).json(created);
  } catch (error) {
    const status = getCrmContractStatus(error);
    if (status) {
      return res.status(status).json({
        message: error instanceof Error ? error.message : 'Falha ao anexar documento comercial',
        code: getCrmContractCode(error),
        details: getCrmContractDetails(error),
      });
    }

    return res.status(500).send({ message: error instanceof Error ? error.message : 'Falha ao anexar documento comercial' });
  }
});

app.get('/crm/opportunities/:id/audit', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });
  if (!canAccessCrm(decoded)) return res.status(403).send({ message: 'Acesso negado' });

  const opportunity = await prisma.crmOpportunity.findUnique({ where: { id: Number(req.params.id) } });
  if (!opportunity) return res.status(404).send({ message: 'Oportunidade não encontrada' });

  const events = await crmAuditService.list({
    entityType: 'crm_opportunity',
    entityId: opportunity.id,
    limit: 50,
  });

  res.json(events);
});

app.post('/crm/leads/:id/convert', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });
  if (!['ADM', 'ATD', 'ADV'].includes(decoded.role)) return res.status(403).send({ message: 'Acesso negado' });

  const lead = await prisma.crmLead.findUnique({
    where: { id: Number(req.params.id) },
    include: { clientRecord: true, triageItems: true, contactEvents: { orderBy: { createdAt: 'desc' } } },
  });
  if (!lead) return res.status(404).send({ message: 'Lead não encontrado' });

  const opportunity = await prisma.crmOpportunity.create({
    data: {
      clientId: lead.clientId,
      cpf: lead.cpf,
      personName: typeof req.body?.personName === 'string' && req.body.personName.trim() ? req.body.personName.trim() : lead.personName,
      source: lead.source,
      status: typeof req.body?.status === 'string' && req.body.status.trim() ? req.body.status.trim() : 'acao_recomendada',
      responsible: lead.responsible,
      summary: typeof req.body?.summary === 'string' && req.body.summary.trim() ? req.body.summary.trim() : lead.summary,
      lastContactAt: lead.lastContactAt,
      nextContactAt: lead.nextContactAt,
      contactEvents: lead.contactEvents.length
        ? {
            createMany: {
              data: lead.contactEvents.map((event: any) => ({
                kind: event.kind,
                summary: event.summary,
                createdBy: event.createdBy,
                createdAt: event.createdAt,
              })),
            },
          }
        : undefined,
    },
    include: { clientRecord: true, triageItems: true, contactEvents: { orderBy: { createdAt: 'desc' } } },
  });

  await prisma.crmLead.update({
    where: { id: lead.id },
    data: { status: 'convertido' },
  });

  res.status(201).json({
    lead: buildCrmLeadPayload({ ...lead, status: 'convertido' }),
    opportunity: buildCrmOpportunityPayload(opportunity),
  });
});

app.post('/crm/opportunities/:id/convert', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });
  if (!canAccessCrm(decoded)) return res.status(403).send({ message: 'Acesso negado' });

  try {
    const command = validateOpportunityConversionCommand({
      opportunityId: Number(req.params.id),
      confirmConversion: req.body?.confirmConversion,
      clientId: req.body?.clientId,
      clientName: req.body?.clientName,
      processTitle: req.body?.processTitle,
      processPhase: req.body?.processPhase,
      processStatus: req.body?.processStatus,
      processNumber: req.body?.processNumber,
      summary: req.body?.summary,
      actor: buildCrmActor(decoded),
    });

    const conversion = await crmOpportunityConversionService.execute(command);

    res.status(conversion.idempotent ? 200 : 201).json({
      opportunity: buildCrmOpportunityPayload(conversion.opportunity),
      client: conversion.client ? {
        id: conversion.client.id,
        name: conversion.client.name,
        cpfCnpj: conversion.client.cpfCnpj ?? '',
        status: conversion.client.status,
        responsible: conversion.client.responsible ?? '',
      } : null,
      process: conversion.process ? {
        id: conversion.process.id,
        title: conversion.process.title,
        processNumber: conversion.process.processNumber ?? '',
        phase: conversion.process.phase,
        status: conversion.process.status,
        clientId: conversion.process.clientId ?? null,
        client: conversion.process.client,
      } : null,
      outcome: conversion.outcome,
      idempotent: conversion.idempotent,
    });
  } catch (error) {
    const status = getCrmContractStatus(error);
    if (status) {
      return res.status(status).json({
        message: error instanceof Error ? error.message : 'Falha ao converter oportunidade',
        code: getCrmContractCode(error),
        details: getCrmContractDetails(error),
      });
    }

    return res.status(500).send({ message: error instanceof Error ? error.message : 'Falha ao converter oportunidade' });
  }
});

app.post('/crm/opportunities/:id/link-process', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });
  if (!canAccessCrm(decoded)) return res.status(403).send({ message: 'Acesso negado' });

  try {
    const command = validateLinkProcessCommand({
      opportunityId: Number(req.params.id),
      processId: req.body?.processId,
      confirmLink: req.body?.confirmLink,
      summary: req.body?.summary,
      actor: buildCrmActor(decoded),
    });

    const linked = await crmOpportunityProcessLinkService.execute(command);

    res.status(linked.idempotent ? 200 : 201).json({
      opportunity: buildCrmOpportunityPayload(linked.opportunity),
      process: {
        id: linked.process.id,
        title: linked.process.title,
        processNumber: linked.process.processNumber ?? '',
        phase: linked.process.phase,
        status: linked.process.status,
        clientId: linked.process.clientId ?? null,
        client: linked.process.client,
      },
      outcome: linked.outcome,
      idempotent: linked.idempotent,
    });
  } catch (error) {
    const status = getCrmContractStatus(error);
    if (status) {
      return res.status(status).json({
        message: error instanceof Error ? error.message : 'Falha ao vincular processo',
        code: getCrmContractCode(error),
        details: getCrmContractDetails(error),
      });
    }

    return res.status(500).send({ message: error instanceof Error ? error.message : 'Falha ao vincular processo' });
  }
});

app.post('/crm/prospects/signal', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });
  if (!canAccessCrm(decoded)) return res.status(403).send({ message: 'Acesso negado' });

  try {
    const data = await crmProspectingService.signal({
      cpfCnpj: req.body?.cpfCnpj,
      personName: req.body?.personName,
      sourceType: req.body?.sourceType,
      sourceReference: req.body?.sourceReference,
      summary: req.body?.summary,
      idempotencyKey: typeof req.headers['idempotency-key'] === 'string'
        ? req.headers['idempotency-key']
        : `prospect:${String(req.body?.cpfCnpj ?? 'na')}:${String(req.body?.sourceType ?? 'manual')}:${String(req.body?.sourceReference ?? 'na')}`,
    });

    res.status(data.idempotent ? 200 : 201).json(data);
  } catch (error) {
    const status = getCrmContractStatus(error);
    if (status) {
      return res.status(status).json({
        message: error instanceof Error ? error.message : 'Falha ao sinalizar prospecção',
        code: getCrmContractCode(error),
        details: getCrmContractDetails(error),
      });
    }

    return res.status(500).send({ message: error instanceof Error ? error.message : 'Falha ao sinalizar prospecção' });
  }
});

app.get('/publications', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });

  const publications = await prisma.publication.findMany({
    where: decoded.role === 'ADM' || decoded.role === 'FIN'
      ? undefined
      : { process: { ownerId: decoded.sub } },
    include: {
      process: {
        include: {
          owner: { select: { id: true, email: true, role: true } },
          clientRecord: true,
        },
      },
      clientRecord: true,
    },
    orderBy: [
      { publishedAt: 'desc' },
      { createdAt: 'desc' },
    ],
  });

  res.json(publications.map((publication) => buildPublicationPayload(publication)));
});

app.get('/publications/:id', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });

  const publication = await prisma.publication.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      process: {
        include: {
          owner: { select: { id: true, email: true, role: true } },
          clientRecord: true,
        },
      },
      clientRecord: true,
    },
  });

  if (!publication) return res.status(404).send({ message: 'Publicação não encontrada' });
  if (!canReadPublication(decoded, publication)) return res.status(403).send({ message: 'Acesso negado' });

  res.json(buildPublicationPayload(publication));
});

app.get('/publications/:id/audit', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });

  const publication = await prisma.publication.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      process: {
        include: {
          owner: { select: { id: true, email: true, role: true } },
          clientRecord: true,
        },
      },
      clientRecord: true,
      publicationEvents: {
        include: {
          capture: true,
        },
        orderBy: { eventAt: 'desc' },
      },
    },
  });

  if (!publication) return res.status(404).send({ message: 'Publicação não encontrada' });
  if (!canReadPublication(decoded, publication)) return res.status(403).send({ message: 'Acesso negado' });

  const publicationDayStart = startOfUtcDay(publication.publishedAt);
  const publicationDayEnd = addDays(publicationDayStart, 1);
  const relatedTriageItems = await prisma.triageItem.findMany({
    where: {
      processId: publication.processId,
      capture: {
        occurredAt: {
          gte: publicationDayStart,
          lt: publicationDayEnd,
        },
      },
    },
    include: {
      process: true,
      clientRecord: true,
      crmLead: true,
      crmOpportunity: true,
      capture: true,
      event: true,
      decisions: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({
    publication: buildPublicationPayload(publication),
    events: publication.publicationEvents.map((event: any) => ({
      id: event.id,
      eventType: event.eventType,
      title: event.title,
      summary: event.summary,
      riskLevel: event.riskLevel,
      requiresAction: event.requiresAction,
      eventAt: event.eventAt.toISOString(),
      captureId: event.captureId,
      sourceType: event.capture?.sourceType ?? null,
      sourceReference: event.capture?.sourceReference ?? null,
    })),
    triage: relatedTriageItems.map((item: any) => ({
      ...buildTriageItemPayload(item),
      decisions: item.decisions.map((decision: any) => buildTriageDecisionPayload(decision)),
    })),
  });
});

app.post('/publications', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });

  const {
    processId,
    tipo,
    impacto,
    status,
    tribunal,
    origem,
    dataPublicacao,
    resumo,
    textoRelevante,
    exigeAcao,
    observacoes,
  } = req.body;

  const access = await assertProcessAccess(decoded, Number(processId));
  if (access.error) return res.status(access.error.status).send({ message: access.error.message });
  if (!tipo || !tribunal || !origem || !dataPublicacao || !resumo || !textoRelevante) {
    return res.status(400).send({ message: 'Dados incompletos para a publicação' });
  }

  const created = await prisma.publication.create({
    data: {
      processId: access.process.id,
      clientId: access.process.clientId ?? access.process.clientRecord?.id ?? null,
      publicationType: tipo,
      status: status || 'nova',
      impact: impacto || 'medio',
      tribunal: tribunal.trim(),
      origin: origem.trim(),
      publishedAt: new Date(`${dataPublicacao}T00:00:00`),
      summary: resumo.trim(),
      relevantText: textoRelevante.trim(),
      requiresAction: Boolean(exigeAcao),
      notes: typeof observacoes === 'string' ? observacoes.trim() : null,
      read: status === 'lida' || status === 'tratada',
      createdBy: getResponsibleLabel(decoded.email) || decoded.email,
    },
    include: {
      process: {
        include: {
          owner: { select: { id: true, email: true, role: true } },
          clientRecord: true,
        },
      },
      clientRecord: true,
    },
  });

  res.status(201).json(buildPublicationPayload(created));
});

app.put('/publications/:id', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });

  const current = await prisma.publication.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      process: {
        include: {
          owner: { select: { id: true, email: true, role: true } },
          clientRecord: true,
        },
      },
      clientRecord: true,
    },
  });

  if (!current) return res.status(404).send({ message: 'Publicação não encontrada' });
  if (!canReadPublication(decoded, current)) return res.status(403).send({ message: 'Acesso negado' });

  const updated = await prisma.publication.update({
    where: { id: current.id },
    data: {
      status: req.body.status ?? current.status,
      impact: req.body.impacto ?? current.impact,
      requiresAction: req.body.exigeAcao ?? current.requiresAction,
      convertedToDeadline: req.body.convertidaEmPrazo ?? current.convertedToDeadline,
      derivedDeadlineLabel: req.body.prazoDerivedoLabel === undefined ? current.derivedDeadlineLabel : req.body.prazoDerivedoLabel,
      notes: req.body.observacoes === undefined ? current.notes : (typeof req.body.observacoes === 'string' ? req.body.observacoes.trim() : null),
      read: req.body.lida ?? current.read,
    },
    include: {
      process: {
        include: {
          owner: { select: { id: true, email: true, role: true } },
          clientRecord: true,
        },
      },
      clientRecord: true,
    },
  });

  res.json(buildPublicationPayload(updated));
});

app.post('/publications/:id/create-deadline', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });

  const publication = await prisma.publication.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      process: {
        include: {
          owner: { select: { id: true, email: true, role: true } },
          clientRecord: true,
        },
      },
      clientRecord: true,
    },
  });

  if (!publication) return res.status(404).send({ message: 'Publicação não encontrada' });
  if (!canReadPublication(decoded, publication)) return res.status(403).send({ message: 'Acesso negado' });

  const derivedDeadlineId = (publication as { derivedDeadlineId?: number | null }).derivedDeadlineId;
  if (derivedDeadlineId) {
    const existingDeadline = await prisma.prazo.findUnique({
      where: { id: derivedDeadlineId },
      include: {
        process: {
          include: {
            owner: { select: { id: true, email: true, role: true } },
            clientRecord: true,
          },
        },
      },
    });

    if (existingDeadline) {
      return res.json({
        publication: buildPublicationPayload(publication),
        deadline: buildDeadlinePayload(existingDeadline),
      });
    }
  }

  const deadlineAutomationService = new CreateDeadlineFromPublicationService({
    store: {
      createDeadline: async (input) => {
        const created = await prisma.prazo.create({
          data: {
            processId: input.processId,
            title: input.title,
            dueDate: new Date(`${input.dueDate}T12:00:00.000Z`),
            status: input.status,
            priority: input.priority,
            origin: input.origin,
            responsible: input.responsible,
            legalArea: input.processPhase,
            notes: input.description,
            publicationId: input.publicationId,
            agendaSyncStatus: input.agendaSyncStatus,
            createdBy: input.createdBy,
          },
          include: {
            process: {
              include: {
                owner: { select: { id: true, email: true, role: true } },
                clientRecord: true,
              },
            },
          },
        });

        return {
          id: created.id,
          processId: created.processId,
          processTitle: created.process?.title ?? null,
          processPhase: created.legalArea ?? created.process?.phase ?? null,
          clientId: created.process?.clientRecord?.id ?? null,
          clientName: created.process?.clientRecord?.name ?? created.process?.client ?? null,
          title: created.title,
          description: created.notes ?? null,
          dueDate: created.dueDate.toISOString().slice(0, 10),
          status: created.status,
          priority: created.priority,
          origin: created.origin ?? 'publicacao',
          responsible: created.responsible ?? null,
          createdBy: created.createdBy ?? null,
          completedAt: created.completedAt ? created.completedAt.toISOString() : null,
          publicationId: created.publicationId ?? null,
          agendaEventId: null,
          agendaSyncStatus: (created.agendaSyncStatus as any) ?? 'missing',
        };
      },
      getIdempotency: async (key) => {
        const record = await prisma.crmIdempotencyRequest.findUnique({
          where: { scope_key: { scope: 'deadlines.createFromPublication', key } },
        });
        return record ? { key, status: 'completed', result: record.responseBody as any } : null;
      },
      saveIdempotency: async (record) => {
        await prisma.crmIdempotencyRequest.create({
          data: {
            key: record.key,
            scope: 'deadlines.createFromPublication',
            entityType: 'deadline',
            entityId: (record.result as any).deadline?.id ?? null,
            action: 'create_from_publication',
            payloadHash: record.key,
            responseCode: 201,
            responseBody: record.result,
          },
        });
      },
    },
    agendaGateway: {
      upsert: async (command) => {
        if (!command.payload) {
          throw new DeadlineDomainError('AGENDA_SYNC_FAILED', 'Payload de agenda ausente para sincronização.', 503, false);
        }

        if (command.agendaEventId) {
          const updated = await prisma.agendaEvent.update({
            where: { id: Number(command.agendaEventId) },
            data: {
              title: command.payload.title,
              eventType: command.payload.eventType,
              status: command.payload.status,
              priority: command.payload.priority,
              startAt: new Date(command.payload.startAt),
              endAt: new Date(command.payload.endAt),
              processId: command.payload.processId,
              clientId: command.payload.clientId,
              responsible: command.payload.responsible,
              origin: command.payload.origin,
              notes: command.payload.notes,
            },
          });

          return { agendaEventId: String(updated.id) };
        }

        const created = await prisma.agendaEvent.create({
          data: {
            title: command.payload.title,
            eventType: command.payload.eventType,
            status: command.payload.status,
            priority: command.payload.priority,
            startAt: new Date(command.payload.startAt),
            endAt: new Date(command.payload.endAt),
            processId: command.payload.processId,
            clientId: command.payload.clientId,
            responsible: command.payload.responsible,
            origin: command.payload.origin,
            notes: command.payload.notes,
            createdBy: getResponsibleLabel(decoded.email) || decoded.email,
          },
        });

        return { agendaEventId: String(created.id) };
      },
    },
  });

  try {
    const automation = await deadlineAutomationService.execute({
      idempotencyKey: typeof req.headers['idempotency-key'] === 'string' ? req.headers['idempotency-key'] : `publication:${publication.id}`,
      actor: buildDeadlineActor(decoded),
      publication: {
        id: publication.id,
        processId: publication.processId,
        processTitle: publication.process.title,
        processPhase: publication.process.phase,
        clientId: publication.clientRecord?.id ?? publication.process.clientRecord?.id ?? null,
        clientName: publication.clientRecord?.name ?? publication.process.clientRecord?.name ?? publication.process.client,
        publishedAt: publication.publishedAt.toISOString(),
        tribunal: publication.tribunal,
        summary: publication.summary,
        impact: publication.impact,
      },
      request: {
        dueDate: req.body?.dueDate,
        title: req.body?.title,
        notes: req.body?.notes,
        responsible: req.body?.responsible,
        priority: req.body?.priority,
        createAgendaEvent: req.body?.createAgendaEvent,
      },
    });

    if (!automation.idempotency.replayed && automation.agendaEvent?.agendaEventId) {
      await prisma.prazo.update({
        where: { id: automation.deadline.id },
        data: {
          agendaEventId: Number(automation.agendaEvent.agendaEventId),
          agendaSyncStatus: 'synced',
        },
      });

      await persistDeadlineAuditEvent(automation.auditEvent);
    }

    const createdDeadline = await prisma.prazo.findUnique({
      where: { id: automation.deadline.id },
      include: {
        process: {
          include: {
            owner: { select: { id: true, email: true, role: true } },
            clientRecord: true,
          },
        },
      },
    });

    if (!createdDeadline) {
      return res.status(500).send({ message: 'Prazo criado, mas não pôde ser recarregado.' });
    }

    const updatedPublication = await prisma.publication.update({
      where: { id: publication.id },
      data: {
        status: publication.status === 'tratada' ? publication.status : 'em_analise',
        requiresAction: true,
        convertedToDeadline: true,
        derivedDeadlineId: createdDeadline.id,
        derivedDeadlineLabel: `Prazo: ${formatDateLabel(createdDeadline.dueDate)}`,
        read: true,
      },
      include: {
        process: {
          include: {
            owner: { select: { id: true, email: true, role: true } },
            clientRecord: true,
          },
        },
        clientRecord: true,
      },
    });

    res.status(automation.idempotency.replayed ? 200 : 201).json({
      publication: buildPublicationPayload(updatedPublication),
      deadline: {
        ...buildDeadlinePayload(createdDeadline),
        risk: buildDeadlineRisk(createdDeadline),
      },
      agendaEvent: automation.agendaEvent,
      auditEvent: automation.auditEvent,
      idempotency: automation.idempotency,
      outcome: automation.outcome,
    });
  } catch (error) {
    if (error instanceof DeadlineDomainError) {
      return res.status(error.statusCode).json({ message: error.message, code: error.code, details: error.details ?? null });
    }

    return res.status(500).send({ message: error instanceof Error ? error.message : 'Falha ao criar prazo a partir da publicação' });
  }
});

app.get('/templates', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });

  const templates = await prisma.template.findMany({
    where: decoded.role === 'ADM' || decoded.role === 'FIN'
      ? undefined
      : {
          OR: [
            { official: true },
            { createdBy: getResponsibleLabel(decoded.email) ?? decoded.email },
          ],
        },
    orderBy: [
      { updatedOn: 'desc' },
      { createdAt: 'desc' },
    ],
  });

  res.json(templates.map((template) => buildTemplatePayload(template)));
});

app.get('/templates/:id', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });

  const template = await prisma.template.findUnique({
    where: { id: Number(req.params.id) },
  });

  if (!template) return res.status(404).send({ message: 'Modelo não encontrado' });
  if (!canReadTemplate(decoded, template)) return res.status(403).send({ message: 'Acesso negado' });

  res.json(buildTemplatePayload(template));
});

app.post('/templates', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });

  const {
    nome,
    area,
    tipoPeca,
    status,
    oficial,
    favorito,
    autoFill,
    fase,
    autor,
    versao,
    precisaRevisao,
    descricao,
    tags,
    placeholders,
    preview,
    versions,
  } = req.body;

  if (!nome || !area || !tipoPeca || !fase || !descricao || !preview) {
    return res.status(400).send({ message: 'Dados incompletos para o modelo' });
  }

  const created = await prisma.template.create({
    data: {
      name: nome.trim(),
      legalArea: area.trim(),
      pieceType: tipoPeca.trim(),
      status: status || 'rascunho',
      official: Boolean(oficial),
      favorite: Boolean(favorito),
      autoFill: Boolean(autoFill),
      phase: fase.trim(),
      author: typeof autor === 'string' && autor.trim() ? autor.trim() : getResponsibleLabel(decoded.email) ?? decoded.email,
      version: typeof versao === 'string' && versao.trim() ? versao.trim() : 'v1.0',
      updatedOn: new Date(),
      needsReview: Boolean(precisaRevisao),
      description: descricao.trim(),
      tags: Array.isArray(tags) ? tags : [],
      placeholders: Array.isArray(placeholders) ? placeholders : [],
      preview: preview.trim(),
      versionsJson: Array.isArray(versions) ? versions : [],
      createdBy: getResponsibleLabel(decoded.email) ?? decoded.email,
    },
  });

  res.status(201).json(buildTemplatePayload(created));
});

app.put('/templates/:id', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });

  const current = await prisma.template.findUnique({
    where: { id: Number(req.params.id) },
  });

  if (!current) return res.status(404).send({ message: 'Modelo não encontrado' });
  if (!canReadTemplate(decoded, current)) return res.status(403).send({ message: 'Acesso negado' });

  const updated = await prisma.template.update({
    where: { id: current.id },
    data: {
      name: req.body.nome === undefined ? current.name : String(req.body.nome).trim(),
      legalArea: req.body.area === undefined ? current.legalArea : String(req.body.area).trim(),
      pieceType: req.body.tipoPeca === undefined ? current.pieceType : String(req.body.tipoPeca).trim(),
      status: req.body.status ?? current.status,
      official: req.body.oficial ?? current.official,
      favorite: req.body.favorito ?? current.favorite,
      autoFill: req.body.autoFill ?? current.autoFill,
      phase: req.body.fase === undefined ? current.phase : String(req.body.fase).trim(),
      author: req.body.autor === undefined ? current.author : String(req.body.autor).trim(),
      version: req.body.versao === undefined ? current.version : String(req.body.versao).trim(),
      updatedOn: new Date(),
      lastUsedAt: req.body.usoRecente ? new Date(`${req.body.usoRecente}T00:00:00`) : req.body.usoRecente === null ? null : current.lastUsedAt,
      needsReview: req.body.precisaRevisao ?? current.needsReview,
      description: req.body.descricao === undefined ? current.description : String(req.body.descricao).trim(),
      tags: Array.isArray(req.body.tags) ? req.body.tags : current.tags,
      placeholders: Array.isArray(req.body.placeholders) ? req.body.placeholders : current.placeholders,
      preview: req.body.preview === undefined ? current.preview : String(req.body.preview),
      versionsJson: Array.isArray(req.body.versions) ? req.body.versions : current.versionsJson,
    },
  });

  res.json(buildTemplatePayload(updated));
});

app.post('/templates/:id/generate-document', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });

  const template = await prisma.template.findUnique({
    where: { id: Number(req.params.id) },
  });

  if (!template) return res.status(404).send({ message: 'Modelo não encontrado' });
  if (!canReadTemplate(decoded, template)) return res.status(403).send({ message: 'Acesso negado' });

  const processId = Number(req.body?.processId);
  if (!processId) {
    return res.status(400).send({ message: 'Processo vinculado é obrigatório' });
  }

  const access = await assertProcessAccess(decoded, processId);
  if (access.error) return res.status(access.error.status).send({ message: access.error.message });

  const processRecord = access.process;
  const title = typeof req.body?.title === 'string' && req.body.title.trim()
    ? req.body.title.trim()
    : `${template.pieceType} - ${processRecord.client}`;
  const fields: unknown[] = Array.isArray(req.body?.fields) ? req.body.fields : [];
  const artifactPayload = {
    templateName: template.name,
    templateVersion: template.version,
    pieceType: template.pieceType,
    processTitle: processRecord.title,
    client: processRecord.client,
    fields,
  };

  const generated = await createDocumentArtifactsService().generate({
    templateId: String(template.id),
    processId: processRecord.id,
    documentTitle: title,
    payload: artifactPayload,
    persistAsDocument: true,
    actor: { source: 'user', email: decoded.email, role: decoded.role, userId: decoded.sub },
    idempotencyKey: typeof req.headers['idempotency-key'] === 'string'
      ? req.headers['idempotency-key']
      : `template:${template.id}:process:${processRecord.id}:title:${title}`,
    category: 'Peticao',
    origin: 'interno',
    createdBy: getResponsibleLabel(decoded.email) || decoded.email,
  });

  if (generated.documentId) {
    await recordDocumentAuditEvent({
      documentId: generated.documentId,
      action: 'document.artifact.generate',
      status: 'success',
      summary: `Artefato documental gerado a partir do template ${template.name}`,
      details: {
        artifactId: generated.artifactId,
        templateId: template.id,
        templateName: template.name,
        storageKey: generated.storageKey,
        generatedAt: generated.generatedAt,
        processId: processRecord.id,
        metadata: artifactPayload,
        storage: {
          storageKey: generated.storageKey,
          checksum: generated.checksum,
        },
      },
      actor: { source: 'user', email: decoded.email, role: decoded.role, userId: decoded.sub },
      idempotencyKey: typeof req.headers['idempotency-key'] === 'string' ? req.headers['idempotency-key'] : null,
    });
  }

  const usedAt = new Date();
  await prisma.template.update({
    where: { id: template.id },
    data: { lastUsedAt: usedAt, updatedOn: usedAt },
  });

  const createdDocument = generated.documentId
    ? await prisma.documento.findUnique({
        where: { id: generated.documentId },
        include: {
          process: {
            include: {
              owner: { select: { id: true, email: true, role: true } },
              clientRecord: true,
            },
          },
        },
      })
    : null;

  res.status(201).json({
    document: createdDocument ? await buildDocumentResponse(createdDocument) : null,
    artifactId: generated.artifactId,
    storageKey: generated.storageKey,
    templateLastUsedAt: usedAt.toISOString().slice(0, 10),
  });
});

app.get('/tasks', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });

  const ownerLabel = getResponsibleLabel(decoded.email);
  const tasks = await prisma.task.findMany({
    where: decoded.role === 'ADM' || decoded.role === 'FIN'
      ? undefined
      : {
          OR: [
            { createdBy: ownerLabel ?? decoded.email },
            { owner: ownerLabel ?? decoded.email },
            { process: { ownerId: decoded.sub } },
          ],
        },
    include: {
      process: {
        include: {
          owner: { select: { id: true, email: true, role: true } },
          clientRecord: true,
        },
      },
      clientRecord: true,
    },
    orderBy: [
      { dueDate: 'asc' },
      { createdAt: 'desc' },
    ],
  });

  res.json(tasks.map((task) => buildTaskPayload(task)));
});

app.get('/tasks/:id', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });

  const task = await prisma.task.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      process: {
        include: {
          owner: { select: { id: true, email: true, role: true } },
          clientRecord: true,
        },
      },
      clientRecord: true,
    },
  });

  if (!task) return res.status(404).send({ message: 'Tarefa não encontrada' });
  if (!canReadTask(decoded, task)) return res.status(403).send({ message: 'Acesso negado' });

  res.json(buildTaskPayload(task));
});

app.post('/tasks', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });

  const {
    title,
    description,
    processId,
    client,
    origin,
    owner,
    priority,
    dueDate,
    status,
    notes,
    immediateAction,
  } = req.body;

  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).send({ message: 'Título da tarefa é obrigatório' });
  }

  let processRecord: any = null;
  if (processId) {
    const access = await assertProcessAccess(decoded, Number(processId));
    if (access.error) return res.status(access.error.status).send({ message: access.error.message });
    processRecord = access.process;
  }

  let linkedClientId: number | null = processRecord?.clientId ?? null;
  let linkedClientName = processRecord?.client ?? null;

  if (typeof client === 'string' && client.trim()) {
    const linkedClient = await clientStore.upsert({
      where: { name: client.trim() },
      update: {},
      create: {
        name: client.trim(),
        type: 'PF',
        status: 'ativo',
        legalArea: processRecord?.phase ?? null,
        responsible: owner || getResponsibleLabel(decoded.email),
        notes: 'Cliente criado automaticamente a partir de uma tarefa.',
      },
    });
    linkedClientId = linkedClient.id;
    linkedClientName = linkedClient.name;
  }

  const ownerLabel = owner || getResponsibleLabel(decoded.email) || decoded.email;
  const createdBy = getResponsibleLabel(decoded.email) || decoded.email;
  const taskOrigin = origin || 'interno';

  const created = await prisma.task.create({
    data: {
      title: title.trim(),
      description: typeof description === 'string' ? description.trim() : '',
      processId: processRecord?.id ?? null,
      clientId: linkedClientId,
      clientName: linkedClientName,
      origin: taskOrigin,
      dueDate: dueDate ? new Date(dueDate) : new Date(),
      status: status || 'pendente',
      priority: priority || 'media',
      owner: ownerLabel,
      createdBy,
      notes: typeof notes === 'string' ? notes.trim() : (typeof description === 'string' ? description.trim() : ''),
      linkedToDeadline: taskOrigin === 'prazo',
      linkedToPublication: taskOrigin === 'publicacao',
      linkedToDocument: taskOrigin === 'documento',
      immediateAction: Boolean(immediateAction ?? (priority === 'critica')),
    },
    include: {
      process: {
        include: {
          owner: { select: { id: true, email: true, role: true } },
          clientRecord: true,
        },
      },
      clientRecord: true,
    },
  });

  res.status(201).json(buildTaskPayload(created));
});

app.put('/tasks/:id', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });

  const current = await prisma.task.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      process: {
        include: {
          owner: { select: { id: true, email: true, role: true } },
          clientRecord: true,
        },
      },
      clientRecord: true,
    },
  });

  if (!current) return res.status(404).send({ message: 'Tarefa não encontrada' });
  if (!canReadTask(decoded, current)) return res.status(403).send({ message: 'Acesso negado' });

  const {
    title,
    description,
    owner,
    priority,
    dueDate,
    status,
    notes,
    immediateAction,
  } = req.body;

  const updated = await prisma.task.update({
    where: { id: current.id },
    data: {
      title: typeof title === 'string' && title.trim() ? title.trim() : current.title,
      description: typeof description === 'string' ? description.trim() : current.description,
      owner: owner ?? current.owner,
      priority: priority ?? current.priority,
      dueDate: dueDate ? new Date(dueDate) : current.dueDate,
      status: status ?? current.status,
      notes: notes === undefined ? current.notes : (typeof notes === 'string' ? notes.trim() : null),
      immediateAction: immediateAction ?? current.immediateAction,
    },
    include: {
      process: {
        include: {
          owner: { select: { id: true, email: true, role: true } },
          clientRecord: true,
        },
      },
      clientRecord: true,
    },
  });

  res.json(buildTaskPayload(updated));
});

app.get('/agenda', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });

  try {
    const ownerLabel = getResponsibleLabel(decoded.email);
    const events = await prisma.agendaEvent.findMany({
      where: decoded.role === 'ADM' || decoded.role === 'FIN'
        ? undefined
        : {
            OR: [
              { createdBy: ownerLabel ?? decoded.email },
              { responsible: ownerLabel ?? decoded.email },
              { process: { ownerId: decoded.sub } },
              { attendance: { actorEmail: decoded.email } },
              { task: { owner: ownerLabel ?? decoded.email } },
            ],
          },
      include: {
        process: {
          include: {
            owner: { select: { id: true, email: true, role: true } },
            clientRecord: true,
          },
        },
        clientRecord: true,
        attendance: {
          include: {
            process: { select: { ownerId: true } },
          },
        },
        task: {
          include: {
            process: { select: { ownerId: true } },
          },
        },
      },
      orderBy: [
        { startAt: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    return res.json(events.map((event) => buildAgendaPayload(event)));
  } catch (error) {
    if (!devMockEnabled || !isPrismaConnectionError(error)) {
      return res.status(500).send({ message: error instanceof Error ? error.message : 'Erro ao carregar agenda' });
    }

    return res.json(getDevMockAgendaForRole(decoded));
  }
});

app.get('/agenda/:id', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });

  const event = await prisma.agendaEvent.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      process: {
        include: {
          owner: { select: { id: true, email: true, role: true } },
          clientRecord: true,
        },
      },
      clientRecord: true,
      attendance: {
        include: {
          process: { select: { ownerId: true } },
        },
      },
      task: {
        include: {
          process: { select: { ownerId: true } },
        },
      },
    },
  });

  if (!event) return res.status(404).send({ message: 'Evento não encontrado' });
  if (!canReadAgendaEvent(decoded, event)) return res.status(403).send({ message: 'Acesso negado' });

  res.json(buildAgendaPayload(event));
});

app.post('/agenda', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });

  const {
    title,
    type,
    status,
    priority,
    date,
    startTime,
    endTime,
    processId,
    clientId,
    client,
    responsible,
    locationOrChannel,
    notes,
    origin,
    attendanceId,
    taskId,
  } = req.body;

  const eventType = typeof type === 'string' && type.trim() ? type.trim() : 'evento_manual';
  const eventDate = typeof date === 'string' && date ? date : new Date().toISOString().slice(0, 10);
  const eventStartTime = typeof startTime === 'string' && startTime ? startTime : '10:00';
  const eventEndTime = typeof endTime === 'string' && endTime ? endTime : '11:00';

  let processRecord: any = null;
  if (processId) {
    const access = await assertProcessAccess(decoded, Number(processId));
    if (access.error) return res.status(access.error.status).send({ message: access.error.message });
    processRecord = access.process;
  }

  let attendanceRecord: any = null;
  if (attendanceId) {
    attendanceRecord = await prisma.atendimento.findUnique({
      where: { id: Number(attendanceId) },
      include: { process: { select: { ownerId: true } } },
    });
    if (!attendanceRecord) return res.status(404).send({ message: 'Atendimento não encontrado' });
    if (attendanceRecord.process && !canReadProcess(decoded, attendanceRecord.process)) {
      return res.status(403).send({ message: 'Acesso negado' });
    }
  }

  let taskRecord: any = null;
  if (taskId) {
    taskRecord = await prisma.task.findUnique({
      where: { id: Number(taskId) },
      include: { process: { select: { ownerId: true } } },
    });
    if (!taskRecord) return res.status(404).send({ message: 'Tarefa não encontrada' });
    if (!canReadTask(decoded, taskRecord)) return res.status(403).send({ message: 'Acesso negado' });
  }

  let linkedClientId: number | null = processRecord?.clientId ?? attendanceRecord?.clientId ?? taskRecord?.clientId ?? null;
  if (clientId) {
    const existingClient = await clientStore.findUnique({ where: { id: Number(clientId) } });
    if (!existingClient) return res.status(404).send({ message: 'Cliente não encontrado' });
    linkedClientId = existingClient.id;
  } else if (typeof client === 'string' && client.trim()) {
    const linkedClient = await clientStore.upsert({
      where: { name: client.trim() },
      update: {},
      create: {
        name: client.trim(),
        type: 'PF',
        status: 'ativo',
        legalArea: processRecord?.phase ?? null,
        responsible: responsible || getResponsibleLabel(decoded.email),
        notes: 'Cliente criado automaticamente a partir de um evento de agenda.',
      },
    });
    linkedClientId = linkedClient.id;
  }

  const processTitle = processRecord?.title ?? taskRecord?.title ?? attendanceRecord?.subject ?? 'Compromisso';
  const created = await prisma.agendaEvent.create({
    data: {
      title: typeof title === 'string' && title.trim() ? title.trim() : `${eventType.replace(/_/g, ' ')} - ${processTitle}`,
      eventType,
      status: status || 'agendado',
      priority: priority || (eventType === 'audiencia' ? 'alta' : 'media'),
      startAt: new Date(`${eventDate}T${eventStartTime}:00`),
      endAt: new Date(`${eventDate}T${eventEndTime}:00`),
      processId: processRecord?.id ?? taskRecord?.processId ?? attendanceRecord?.processId ?? null,
      clientId: linkedClientId,
      attendanceId: attendanceRecord?.id ?? null,
      taskId: taskRecord?.id ?? null,
      responsible: responsible || taskRecord?.owner || attendanceRecord?.responsible || getResponsibleLabel(decoded.email),
      locationOrChannel: locationOrChannel || attendanceRecord?.channel || 'A definir',
      notes: typeof notes === 'string' ? notes.trim() : (attendanceRecord?.nextStep || taskRecord?.notes || ''),
      origin: origin || (attendanceRecord ? 'atendimento' : taskRecord ? 'processo' : 'manual'),
      createdBy: getResponsibleLabel(decoded.email) || decoded.email,
    },
    include: {
      process: {
        include: {
          owner: { select: { id: true, email: true, role: true } },
          clientRecord: true,
        },
      },
      clientRecord: true,
      attendance: {
        include: {
          process: { select: { ownerId: true } },
        },
      },
      task: {
        include: {
          process: { select: { ownerId: true } },
        },
      },
    },
  });

  res.status(201).json(buildAgendaPayload(created));
});

app.put('/agenda/:id', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });

  const current = await prisma.agendaEvent.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      process: { select: { ownerId: true } },
      attendance: { select: { actorEmail: true, process: { select: { ownerId: true } } } },
      task: { select: { createdBy: true, owner: true, process: { select: { ownerId: true } } } },
      clientRecord: true,
    },
  });

  if (!current) return res.status(404).send({ message: 'Evento não encontrado' });
  if (!canReadAgendaEvent(decoded, current)) return res.status(403).send({ message: 'Acesso negado' });

  const { title, status, priority, date, startTime, endTime, responsible, locationOrChannel, notes } = req.body;
  const nextDate = typeof date === 'string' && date ? date : current.startAt.toISOString().slice(0, 10);
  const nextStartTime = typeof startTime === 'string' && startTime ? startTime : current.startAt.toISOString().slice(11, 16);
  const nextEndTime = typeof endTime === 'string' && endTime ? endTime : current.endAt.toISOString().slice(11, 16);

  const updated = await prisma.agendaEvent.update({
    where: { id: current.id },
    data: {
      title: typeof title === 'string' && title.trim() ? title.trim() : current.title,
      status: status ?? current.status,
      priority: priority ?? current.priority,
      startAt: new Date(`${nextDate}T${nextStartTime}:00`),
      endAt: new Date(`${nextDate}T${nextEndTime}:00`),
      responsible: responsible ?? current.responsible,
      locationOrChannel: locationOrChannel ?? current.locationOrChannel,
      notes: notes === undefined ? current.notes : (typeof notes === 'string' ? notes.trim() : null),
    },
    include: {
      process: {
        include: {
          owner: { select: { id: true, email: true, role: true } },
          clientRecord: true,
        },
      },
      clientRecord: true,
      attendance: {
        include: {
          process: { select: { ownerId: true } },
        },
      },
      task: {
        include: {
          process: { select: { ownerId: true } },
        },
      },
    },
  });

  res.json(buildAgendaPayload(updated));
});

app.get('/permissions', (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });

  const perms: Record<'ADM' | 'ADV' | 'FIN', string[]> = {
    ADM: ['processes:*', 'users:*', 'dashboard:*', ...listFinancePermissions('ADM')],
    ADV: ['processes:read,write', 'documents:read,write', 'clients:read'],
    FIN: ['clients:read', ...listFinancePermissions('FIN')]
  };

  res.json(perms[decoded.role as 'ADM' | 'ADV' | 'FIN'] || []);
});

app.get('/home', (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });

  const role = decoded.role as 'ADM' | 'ADV' | 'FIN' | 'ATD';
  const home: Record<'ADM' | 'ADV' | 'FIN' | 'ATD', { menu: string[]; cards: string[] }> = {
    ADM: { menu: ['Início', 'Escritório', 'Processos', 'Equipe', 'Agenda', 'Relatórios', 'Configurações'], cards: ['tarefas atrasadas', 'prazos críticos', 'gargalos'] },
    ADV: { menu: ['Início', 'Meus Processos', 'Prazos', 'Agenda', 'Clientes', 'Documentos', 'Tarefas'], cards: ['prazos hoje', 'clientes aguardando', 'audiências'] },
    FIN: { menu: ['Início', 'Recebimentos', 'Contratos', 'Cobranças', 'Contas a pagar', 'Relatórios'], cards: ['recebimentos do dia', 'inadimplência', 'fluxo de caixa'] },
    ATD: { menu: ['Início', 'Leads', 'Atendimento', 'Clientes', 'Agenda', 'Relatórios'], cards: ['novos leads', 'propostas em aberto', 'retornos pendentes'] }
  };

  res.json({ profile: role, home: home[role] || { menu: [], cards: [] } });
});

app.get('/processes', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });

  try {
    if (decoded.role === 'ADM' || decoded.role === 'FIN') {
      const allProcesses = await prisma.process.findMany({ include: { owner: true } });
      return res.json(allProcesses);
    }

    const own = await prisma.process.findMany({ where: { ownerId: decoded.sub }, include: { owner: true } });
    return res.json(own);
  } catch (error) {
    if (!devMockEnabled || !isPrismaConnectionError(error)) {
      return res.status(500).send({ message: error instanceof Error ? error.message : 'Erro ao carregar processos' });
    }

    return res.json(getDevMockProcessesForRole(decoded));
  }
});

app.get('/processes/lookup', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });

  const number = normalizeProcessNumber(String(req.query.number ?? ''));
  if (number.length < 8) {
    return res.status(400).send({ message: 'Informe um numero de processo valido' });
  }

  const existing = await prisma.process.findFirst({
    where: { processNumber: number },
    include: { owner: true },
  });

  if (existing) {
    return res.json({
      found: true,
      alreadyRegistered: true,
      source: 'registered',
      process: existing,
    });
  }

  try {
    const external = await lookupExternalProcess(number);
    if (external) {
      return res.json({
        found: true,
        alreadyRegistered: false,
        source: 'external',
        process: external,
      });
    }
  } catch (error) {
    return res.status(502).send({
      message: (error as Error).message || 'Falha ao consultar a integração externa de processos',
    });
  }

  const suggested = externalProcessRegistry.find((item) => item.processNumber === number);
  if (!suggested) {
    return res.status(404).send({ message: 'Nenhuma informacao encontrada para esse numero de processo' });
  }

  return res.json({
    found: true,
    alreadyRegistered: false,
    source: 'fallback',
    process: suggested,
  });
});

app.get('/processes/:id', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });

  try {
    const process = await prisma.process.findUnique({ where: { id: Number(req.params.id) }, include: { owner: true } });
    if (!process) return res.status(404).send({ message: 'Processo não encontrado' });
    if (decoded.role === 'ADM' || decoded.role === 'FIN' || process.ownerId === decoded.sub) return res.json(process);

    return res.status(403).send({ message: 'Acesso negado' });
  } catch (error) {
    if (!devMockEnabled || !isPrismaConnectionError(error)) {
      return res.status(500).send({ message: error instanceof Error ? error.message : 'Erro ao carregar processo' });
    }

    const mockProcess = getDevMockProcessById(Number(req.params.id));
    if (!mockProcess) return res.status(404).send({ message: 'Processo não encontrado' });
    if (decoded.role === 'ADM' || decoded.role === 'FIN' || mockProcess.ownerId === decoded.sub) return res.json(mockProcess);

    return res.status(403).send({ message: 'Acesso negado' });
  }
});

app.post('/processes', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });

  const { title, client, phase, status } = req.body;
  const processNumber = normalizeProcessNumber(req.body?.processNumber);
  if (!title || !client || !phase || !status) return res.status(400).send({ message: 'Dados incompletos' });

  if (processNumber) {
    const existing = await prisma.process.findFirst({ where: { processNumber } });
    if (existing) {
      return res.status(409).send({ message: 'Esse numero de processo ja esta cadastrado na carteira' });
    }
  }

  const linkedClient = await clientStore.upsert({
    where: { name: client.trim() },
    update: {
      responsible: getResponsibleLabel(decoded.email),
      legalArea: phase,
    },
    create: {
      name: client.trim(),
      type: 'PJ',
      status: 'ativo',
      legalArea: phase,
      responsible: getResponsibleLabel(decoded.email),
      notes: 'Cliente criado automaticamente a partir de um processo.',
    },
  });

  const newProcess = await prisma.process.create({
    data: {
      title,
      processNumber: processNumber || null,
      client,
      clientId: linkedClient.id,
      phase,
      status,
      ownerId: decoded.sub
    },
    include: { owner: true }
  });

  res.status(201).json(newProcess);
});

app.put('/processes/:id', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });

  const process = await prisma.process.findUnique({ where: { id: Number(req.params.id) } });
  if (!process) return res.status(404).send({ message: 'Processo não encontrado' });
  if (decoded.role !== 'ADM' && decoded.role !== 'FIN' && process.ownerId !== decoded.sub) return res.status(403).send({ message: 'Acesso negado' });

  const { title, client, phase, status } = req.body;
  const processNumber = normalizeProcessNumber(req.body?.processNumber);
  let nextClientId = (process as { clientId?: number | null }).clientId ?? null;
  let nextClientName = process.client;

  if (processNumber) {
    const existing = await prisma.process.findFirst({
      where: {
        processNumber,
        NOT: { id: process.id },
      },
    });

    if (existing) {
      return res.status(409).send({ message: 'Esse numero de processo ja esta cadastrado na carteira' });
    }
  }

  if (typeof client === 'string' && client.trim()) {
    const linkedClient = await clientStore.upsert({
      where: { name: client.trim() },
      update: {
        responsible: getResponsibleLabel(decoded.email),
        legalArea: (phase ?? process.phase) as string,
      },
      create: {
        name: client.trim(),
        type: 'PJ',
        status: 'ativo',
        legalArea: (phase ?? process.phase) as string,
        responsible: getResponsibleLabel(decoded.email),
        notes: 'Cliente criado automaticamente a partir de uma atualização de processo.',
      },
    });
    nextClientId = linkedClient.id;
    nextClientName = client.trim();
  }

  const updated = await prisma.process.update({
    where: { id: process.id },
    data: {
      title: title ?? process.title,
      processNumber: processNumber || null,
      client: nextClientName,
      clientId: nextClientId,
      phase: phase ?? process.phase,
      status: status ?? process.status
    },
    include: { owner: true }
  });

  res.json(updated);
});

app.delete('/processes/:id', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });

  const process = await prisma.process.findUnique({ where: { id: Number(req.params.id) } });
  if (!process) return res.status(404).send({ message: 'Processo não encontrado' });
  if (decoded.role !== 'ADM' && decoded.role !== 'FIN' && process.ownerId !== decoded.sub) return res.status(403).send({ message: 'Acesso negado' });

  await prisma.process.delete({ where: { id: process.id } });
  res.status(204).send();
});

// ── Andamentos ────────────────────────────────────────────────────────────────

app.get('/processes/:id/andamentos', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token nao fornecido ou invalido' });
  const process = await prisma.process.findUnique({ where: { id: Number(req.params.id) } });
  if (!process) return res.status(404).send({ message: 'Processo nao encontrado' });
  if (decoded.role !== 'ADM' && decoded.role !== 'FIN' && process.ownerId !== decoded.sub) return res.status(403).send({ message: 'Acesso negado' });
  const data = await prisma.andamento.findMany({ where: { processId: Number(req.params.id) }, orderBy: { date: 'desc' } });
  res.json(data);
});

app.post('/processes/:id/andamentos', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token nao fornecido ou invalido' });
  const process = await prisma.process.findUnique({ where: { id: Number(req.params.id) } });
  if (!process) return res.status(404).send({ message: 'Processo nao encontrado' });
  if (decoded.role !== 'ADM' && decoded.role !== 'FIN' && process.ownerId !== decoded.sub) return res.status(403).send({ message: 'Acesso negado' });
  const { title, description } = req.body;
  if (!title || !description) return res.status(400).send({ message: 'title e description sao obrigatorios' });
  const item = await prisma.andamento.create({ data: { processId: Number(req.params.id), title, description, actorEmail: decoded.email } });
  res.status(201).json(item);
});

app.get('/processes/:id/prazos', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token nao fornecido ou invalido' });
  const process = await prisma.process.findUnique({ where: { id: Number(req.params.id) } });
  if (!process) return res.status(404).send({ message: 'Processo nao encontrado' });
  if (decoded.role !== 'ADM' && decoded.role !== 'FIN' && process.ownerId !== decoded.sub) return res.status(403).send({ message: 'Acesso negado' });
  const data = await prisma.prazo.findMany({
    where: { processId: Number(req.params.id) },
    include: {
      process: {
        include: {
          owner: { select: { id: true, email: true, role: true } },
          clientRecord: true,
        },
      },
    },
    orderBy: { dueDate: 'asc' },
  });
  res.json(data.map((deadline) => buildDeadlinePayload(deadline)));
});

app.post('/processes/:id/prazos', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token nao fornecido ou invalido' });
  const process = await prisma.process.findUnique({ where: { id: Number(req.params.id) } });
  if (!process) return res.status(404).send({ message: 'Processo nao encontrado' });
  if (decoded.role !== 'ADM' && decoded.role !== 'FIN' && process.ownerId !== decoded.sub) return res.status(403).send({ message: 'Acesso negado' });
  const { title, dueDate, priority, status, origin, responsible, notes } = req.body;
  if (!title || !dueDate) return res.status(400).send({ message: 'title e dueDate sao obrigatorios' });
  const item = await prisma.prazo.create({
    data: {
      processId: Number(req.params.id),
      title,
      dueDate: new Date(dueDate),
      priority: priority || 'media',
      status: status || 'aberto',
      origin: origin || 'interno',
      responsible: responsible || getResponsibleLabel(decoded.email) || decoded.email,
      legalArea: process.phase,
      notes: typeof notes === 'string' ? notes.trim() : null,
      createdBy: getResponsibleLabel(decoded.email) || decoded.email,
    },
    include: {
      process: {
        include: {
          owner: { select: { id: true, email: true, role: true } },
          clientRecord: true,
        },
      },
    },
  });
  res.status(201).json(buildDeadlinePayload(item));
});

app.get('/processes/:id/documentos', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token nao fornecido ou invalido' });
  const process = await prisma.process.findUnique({ where: { id: Number(req.params.id) } });
  if (!process) return res.status(404).send({ message: 'Processo nao encontrado' });
  if (decoded.role !== 'ADM' && decoded.role !== 'FIN' && process.ownerId !== decoded.sub) return res.status(403).send({ message: 'Acesso negado' });
  const data = await prisma.documento.findMany({
    where: { processId: Number(req.params.id) },
    include: {
      process: {
        include: {
          owner: { select: { id: true, email: true, role: true } },
          clientRecord: true,
        },
      },
    },
    orderBy: [
      { uploadedAt: 'desc' },
      { version: 'desc' },
    ],
  });
  res.json(data.map((document) => buildDocumentPayload(document)));
});

app.post('/processes/:id/documentos', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token nao fornecido ou invalido' });
  const process = await prisma.process.findUnique({ where: { id: Number(req.params.id) } });
  if (!process) return res.status(404).send({ message: 'Processo nao encontrado' });
  if (decoded.role !== 'ADM' && decoded.role !== 'FIN' && process.ownerId !== decoded.sub) return res.status(403).send({ message: 'Acesso negado' });
  const { title, description, status, category, origin, responsible, requiredChecklist, pendingForAdvance, mimeType, previewUrl } = req.body;
  if (!title || !description) return res.status(400).send({ message: 'title e description sao obrigatorios' });
  const item = await prisma.documento.create({
    data: {
      processId: Number(req.params.id),
      title,
      description,
      status: status || 'pendente',
      category: category || 'Checklist',
      origin: origin || 'interno',
      responsible: responsible || getResponsibleLabel(decoded.email) || decoded.email,
      requiredChecklist: Boolean(requiredChecklist),
      pendingForAdvance: Boolean(pendingForAdvance),
      mimeType: mimeType || 'application/octet-stream',
      previewUrl: typeof previewUrl === 'string' ? previewUrl : null,
      createdBy: getResponsibleLabel(decoded.email) || decoded.email,
    },
    include: {
      process: {
        include: {
          owner: { select: { id: true, email: true, role: true } },
          clientRecord: true,
        },
      },
    },
  });
  res.status(201).json(buildDocumentPayload(item));
});

app.get('/processes/:id/atendimentos', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token nao fornecido ou invalido' });
  const access = await assertProcessAccess(decoded, Number(req.params.id));
  if (access.error) return res.status(access.error.status).send({ message: access.error.message });
  const data = await prisma.atendimento.findMany({
    where: { processId: Number(req.params.id) },
    include: {
      process: {
        include: {
          owner: { select: { id: true, email: true, role: true } },
          clientRecord: true,
        },
      },
      clientRecord: true,
    },
    orderBy: { occurredAt: 'desc' },
  });
  res.json(data.map((item) => buildAttendancePayload(item)));
});

app.post('/processes/:id/atendimentos', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token nao fornecido ou invalido' });
  const access = await assertProcessAccess(decoded, Number(req.params.id));
  if (access.error) return res.status(access.error.status).send({ message: access.error.message });

  const { title, description, ...rest } = req.body;
  const process = access.process;
  const item = await prisma.atendimento.create({
    data: {
      processId: process.id,
      clientId: process.clientId ?? process.clientRecord?.id ?? null,
      subject: typeof rest.assunto === 'string' && rest.assunto.trim() ? rest.assunto.trim() : title,
      summary: typeof rest.resumo === 'string' ? rest.resumo.trim() : description,
      notes: typeof rest.observacoes === 'string' ? rest.observacoes.trim() : null,
      occurredAt: rest.dataHora ? new Date(rest.dataHora) : new Date(),
      channel: rest.canal || 'interno',
      type: rest.tipo || 'rotina',
      status: rest.status || 'aberto',
      priority: rest.priority || 'media',
      responsible: rest.responsavel || getResponsibleLabel(decoded.email),
      nextStep: typeof rest.proximoPasso === 'string' ? rest.proximoPasso.trim() : null,
      scheduledReturnAt: rest.retornoAgendado ? new Date(rest.retornoAgendado) : null,
      critical: Boolean(rest.critical ?? (process.status !== 'ativo')),
      actorEmail: decoded.email,
    },
    include: {
      process: {
        include: {
          owner: { select: { id: true, email: true, role: true } },
          clientRecord: true,
        },
      },
      clientRecord: true,
    },
  });
  res.status(201).json(buildAttendancePayload(item));
});

app.get('/triage', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token nao fornecido ou invalido' });
  if (!canAccessTriage(decoded)) return res.status(403).send({ message: 'Acesso negado' });

  const queueType = typeof req.query.queueType === 'string' ? req.query.queueType : undefined;
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

  const items = await prisma.triageItem.findMany({
    where: {
      ...(queueType ? { queueType } : {}),
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { suggestedReason: { contains: search, mode: 'insensitive' } },
              { capture: { normalizedText: { contains: search, mode: 'insensitive' } } },
              { capture: { processNumber: { contains: search, mode: 'insensitive' } } },
              { capture: { personName: { contains: search, mode: 'insensitive' } } },
              { process: { title: { contains: search, mode: 'insensitive' } } },
              { clientRecord: { name: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    },
    include: {
      process: true,
      clientRecord: true,
      crmLead: true,
      crmOpportunity: true,
      capture: true,
      event: true,
    },
    orderBy: [
      { queueType: 'asc' },
      { createdAt: 'desc' },
    ],
  });

  const rankedItems = rankUnifiedTriageQueue({
    items: items.map((item: any) => ({
      ...item,
      sourceType: item.capture?.sourceType ?? item.sourceLabel ?? 'triage',
      priorityScore: deriveBasePriorityScore(item),
      priorityReasons: [item.suggestedReason],
    })),
    now: new Date(),
  });

  res.json(rankedItems.map((item: any) => buildTriageItemPayload(item)));
});

app.post('/triage/:id/prioritize', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token nao fornecido ou invalido' });
  const access = await assertTriageAccess(decoded, Number(req.params.id));
  if ('error' in access && access.error) return res.status(access.error.status).send({ message: access.error.message });

  const queueItems = await prisma.triageItem.findMany({
    include: {
      capture: true,
      event: true,
    },
  });

  const result = buildPrioritizeCommandResult({
    triageItemId: access.triageItem.id,
    now: new Date(),
    items: queueItems.map((item: any) => buildTriageQueueSnapshot(item)),
  });

  res.json(result);
});

app.get('/triage/:id', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token nao fornecido ou invalido' });
  const access = await assertTriageAccess(decoded, Number(req.params.id));
  if ('error' in access && access.error) return res.status(access.error.status).send({ message: access.error.message });

  const { triageItem } = access;

  const timeline = triageItem.processId
    ? await prisma.publicationEvent.findMany({
        where: { processId: triageItem.processId },
        orderBy: { eventAt: 'desc' },
        take: 6,
      })
    : triageItem.capture.cpf
      ? await prisma.publicationEvent.findMany({
          where: {
            capture: { cpf: triageItem.capture.cpf },
          },
          orderBy: { eventAt: 'desc' },
          take: 6,
        })
      : [];

  const latestDecision = triageItem.decisions[0] ?? null;
  const explanation = buildTriageExplanation({
    triageItem: {
      ...triageItem,
      sourceType: triageItem.capture?.sourceType ?? triageItem.sourceLabel ?? 'triage',
      priorityScore: deriveBasePriorityScore(triageItem),
      priorityReasons: [triageItem.suggestedReason],
    },
    decisionType: latestDecision?.decisionType ?? 'pendente',
    decisionReason: latestDecision?.decisionReason ?? triageItem.suggestedReason,
  });

  res.json({
    ...buildTriageItemPayload(triageItem),
    decisions: triageItem.decisions.map((decision: any) => buildTriageDecisionPayload(decision)),
    explanation,
    timeline: timeline.map((event: any) => ({
      id: event.id,
      title: event.title,
      summary: event.summary,
      eventType: event.eventType,
      eventAt: event.eventAt.toISOString(),
      riskLevel: event.riskLevel,
      requiresAction: event.requiresAction,
    })),
  });
});

app.get('/triage/:id/explain', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token nao fornecido ou invalido' });
  const access = await assertTriageAccess(decoded, Number(req.params.id));
  if ('error' in access && access.error) return res.status(access.error.status).send({ message: access.error.message });

  const triageItem = access.triageItem;
  const latestDecision = triageItem.decisions[0] ?? null;

  const result = buildExplainCommandResult({
    triageItemId: triageItem.id,
    triageItem: {
      ...triageItem,
      sourceType: triageItem.capture?.sourceType ?? triageItem.sourceLabel ?? 'triage',
      priorityScore: deriveBasePriorityScore(triageItem),
      priorityReasons: [triageItem.suggestedReason],
    },
    decisionType: latestDecision?.decisionType ?? triageItem.status,
    decisionReason: latestDecision?.decisionReason ?? triageItem.suggestedReason,
  });

  res.json(result);
});

app.put('/triage/:id', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token nao fornecido ou invalido' });
  const access = await assertTriageAccess(decoded, Number(req.params.id));
  if ('error' in access && access.error) return res.status(access.error.status).send({ message: access.error.message });

  const { status, postponeUntil, assignedQueue } = req.body ?? {};
  const data: Record<string, unknown> = {};

  if (typeof status === 'string' && status.trim()) {
    data.status = status.trim();
    if (status === 'em_revisao_manual') {
      data.queueType = access.triageItem.queueType;
    }
  }
  if (typeof assignedQueue === 'string' && assignedQueue.trim()) {
    data.assignedQueue = assignedQueue.trim();
  }
  if (typeof postponeUntil === 'string' && postponeUntil.trim()) {
    data.postponeUntil = new Date(postponeUntil);
    data.status = 'adiado';
  } else if (postponeUntil === null) {
    data.postponeUntil = null;
  }

  const updated = await prisma.triageItem.update({
    where: { id: access.triageItem.id },
    data,
    include: {
      process: true,
      clientRecord: true,
      crmLead: true,
      crmOpportunity: true,
      capture: true,
      event: true,
    },
  });

  res.json(buildTriageItemPayload(updated));
});

app.post('/triage/:id/decision', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token nao fornecido ou invalido' });
  const access = await assertTriageAccess(decoded, Number(req.params.id));
  if ('error' in access && access.error) return res.status(access.error.status).send({ message: access.error.message });

  const triageItem = access.triageItem;
  const {
    decisionType,
    decisionReason,
    decisionNote,
    postponeUntil,
    assignedQueue,
    deadlineTitle,
    dueDate,
    deadlinePriority,
    taskTitle,
    taskDueDate,
    taskPriority,
    taskOwner,
    taskDescription,
    crmPersonName,
    crmSummary,
  } = req.body ?? {};

  if (!decisionType || typeof decisionType !== 'string') {
    return res.status(400).send({ message: 'decisionType é obrigatório' });
  }

  if (decisionType === 'descartado' && (!decisionReason || typeof decisionReason !== 'string')) {
    return res.status(400).send({ message: 'decisionReason é obrigatório para descarte' });
  }

  try {
    const actor = getResponsibleLabel(decoded.email) || decoded.email;
    const now = new Date();
    const existingDedupeKeys = await collectExistingAutomationDedupeKeys(triageItem);
    const idempotencyKey = typeof req.headers['idempotency-key'] === 'string'
      ? req.headers['idempotency-key']
      : `triage:${triageItem.id}:${decisionType}:${typeof postponeUntil === 'string' ? postponeUntil : 'na'}`;
    const normalizedDecisionInput = {
      decisionType,
      decisionReason: typeof decisionReason === 'string' ? decisionReason.trim() : null,
      decisionNote: typeof decisionNote === 'string' ? decisionNote.trim() : null,
      postponeUntil: typeof postponeUntil === 'string' ? postponeUntil : null,
      assignedQueue: typeof assignedQueue === 'string' ? assignedQueue.trim() : null,
      deadlineTitle: typeof deadlineTitle === 'string' ? deadlineTitle.trim() : null,
      dueDate: typeof dueDate === 'string' ? dueDate.trim() : null,
      deadlinePriority: typeof deadlinePriority === 'string' ? deadlinePriority.trim() : null,
      taskTitle: typeof taskTitle === 'string' ? taskTitle.trim() : null,
      taskDueDate: typeof taskDueDate === 'string' ? taskDueDate.trim() : null,
      taskPriority: typeof taskPriority === 'string' ? taskPriority.trim() : null,
      taskOwner: typeof taskOwner === 'string' ? taskOwner.trim() : null,
      taskDescription: typeof taskDescription === 'string' ? taskDescription.trim() : null,
    };
    const assistedDecision = assistTriageDecision({
      triageItem: {
        ...triageItem,
        sourceType: triageItem.capture?.sourceType ?? triageItem.sourceLabel ?? 'triage',
        priorityScore: deriveBasePriorityScore(triageItem),
        priorityReasons: [triageItem.suggestedReason],
      },
      decision: {
        triageItemId: triageItem.id,
        ...normalizedDecisionInput,
        idempotencyKey,
      },
      actor,
      now,
      existingDedupeKeys,
    });

    const result = await runTriageDecisionIdempotent({
      auditService: crmAuditService,
      triageItemId: triageItem.id,
      idempotencyKey,
      payload: {
        triageItemId: triageItem.id,
        ...normalizedDecisionInput,
      },
      execute: async () => {
        let generatedTaskId: number | null = null;
        let generatedDeadlineId: number | null = null;
        let generatedLeadId: number | null = null;
        let generatedOpportunityId: number | null = null;
        const plannedDecision = planTriageDecision({
          triageItem,
          decision: normalizedDecisionInput,
          actor,
          now,
          existingDedupeKeys,
        });

        if (decisionType === 'confirmado') {
          if (plannedDecision.automation.commandType === 'create_deadline_and_task' && triageItem.processId) {
            const deadline = await prisma.prazo.create({
              data: {
                processId: triageItem.processId,
                title: plannedDecision.automation.deadline.title || triageItem.event?.title || `Prazo derivado da triagem #${triageItem.id}`,
                dueDate: new Date(`${plannedDecision.automation.deadline.dueDate}T12:00:00`),
                status: 'critico',
                priority: plannedDecision.automation.deadline.priority || 'alta',
                origin: 'publicacao',
                responsible: actor,
                legalArea: triageItem.process?.phase || null,
                notes: plannedDecision.automation.deadline.notes || triageItem.suggestedReason,
                createdBy: actor,
              },
            });
            generatedDeadlineId = deadline.id;

            const task = await prisma.task.create({
              data: {
                title: plannedDecision.automation.task.title || `Tratar ${triageItem.event?.title?.toLowerCase() || 'publicação crítica'}`,
                description: plannedDecision.automation.task.description || triageItem.suggestedReason,
                processId: triageItem.processId,
                clientId: triageItem.clientId,
                clientName: triageItem.clientRecord?.name || triageItem.process?.client || null,
                origin: 'publicacao',
                dueDate: new Date(`${plannedDecision.automation.task.dueDate}T12:00:00`),
                status: 'pendente',
                priority: plannedDecision.automation.task.priority || 'alta',
                owner: plannedDecision.automation.task.owner || actor,
                createdBy: actor,
                notes: triageItem.capture.normalizedText,
                linkedToDeadline: true,
                linkedToPublication: true,
                immediateAction: true,
              },
            });
            generatedTaskId = task.id;
          } else if (plannedDecision.automation.commandType === 'create_task' && triageItem.processId) {
            const task = await prisma.task.create({
              data: {
                title: plannedDecision.automation.task.title || triageItem.event?.title || `Ação derivada da triagem #${triageItem.id}`,
                description: plannedDecision.automation.task.description || triageItem.suggestedReason,
                processId: triageItem.processId,
                clientId: triageItem.clientId,
                clientName: triageItem.clientRecord?.name || triageItem.process?.client || null,
                origin: 'publicacao',
                dueDate: new Date(`${plannedDecision.automation.task.dueDate}T12:00:00`),
                status: 'pendente',
                priority: plannedDecision.automation.task.priority || (triageItem.queueType === 'critica' ? 'alta' : 'media'),
                owner: plannedDecision.automation.task.owner || actor,
                createdBy: actor,
                notes: triageItem.capture.normalizedText,
                linkedToPublication: true,
                immediateAction: triageItem.queueType === 'critica',
              },
            });
            generatedTaskId = task.id;
          } else if (triageItem.suggestedAction === 'criar_oportunidade') {
            if (triageItem.crmOpportunityId) {
              generatedOpportunityId = triageItem.crmOpportunityId;
            } else {
              const opportunity = await prisma.crmOpportunity.create({
                data: {
                  clientId: triageItem.clientId,
                  cpf: triageItem.capture.cpf || null,
                  personName: typeof crmPersonName === 'string' && crmPersonName.trim()
                    ? crmPersonName.trim()
                    : triageItem.clientRecord?.name || triageItem.capture.personName || 'Cliente identificado',
                  source: 'publicacao_automatizada',
                  status: 'acao_recomendada',
                  summary: typeof crmSummary === 'string' && crmSummary.trim() ? crmSummary.trim() : triageItem.suggestedReason,
                },
              });
              generatedOpportunityId = opportunity.id;
            }
          } else if (triageItem.suggestedAction === 'criar_lead') {
            if (triageItem.crmLeadId) {
              generatedLeadId = triageItem.crmLeadId;
            } else {
              const lead = await prisma.crmLead.create({
                data: {
                  clientId: triageItem.clientId,
                  cpf: triageItem.capture.cpf || null,
                  personName: typeof crmPersonName === 'string' && crmPersonName.trim()
                    ? crmPersonName.trim()
                    : triageItem.capture.personName || 'Lead identificado',
                  source: 'publicacao_automatizada',
                  status: 'novo',
                  summary: typeof crmSummary === 'string' && crmSummary.trim() ? crmSummary.trim() : triageItem.suggestedReason,
                },
              });
              generatedLeadId = lead.id;
            }
          }
        }

        const decision = await prisma.triageDecision.create({
          data: {
            triageItemId: triageItem.id,
            decisionType: plannedDecision.decision.decisionType,
            decisionReason: plannedDecision.decision.decisionReason,
            decisionNote: plannedDecision.decision.decisionNote,
            decidedBy: plannedDecision.decision.decidedBy,
            generatedTaskId,
            generatedDeadlineId,
            generatedLeadId,
            generatedOpportunityId,
          },
        });

        const updated = await prisma.triageItem.update({
          where: { id: triageItem.id },
          data: {
            status: plannedDecision.itemUpdate.status,
            queueType: plannedDecision.itemUpdate.queueType,
            handledBy: plannedDecision.itemUpdate.handledBy,
            handledAt: plannedDecision.itemUpdate.handledAt,
            discardReason: plannedDecision.itemUpdate.discardReason,
            discardNote: plannedDecision.itemUpdate.discardNote,
            postponeUntil: plannedDecision.itemUpdate.postponeUntil,
            assignedQueue: plannedDecision.itemUpdate.assignedQueue,
            crmLeadId: generatedLeadId ?? triageItem.crmLeadId,
            crmOpportunityId: generatedOpportunityId ?? triageItem.crmOpportunityId,
          },
          include: {
            process: true,
            clientRecord: true,
            crmLead: true,
            crmOpportunity: true,
            capture: true,
            event: true,
          },
        });

        return {
          item: buildTriageItemPayload(updated),
          decision: buildTriageDecisionPayload(decision),
          projection: assistedDecision.projection,
          explanation: assistedDecision.explanation,
          automation: assistedDecision.automation,
        };
      },
    });

    return res.json(result.data);
  } catch (error) {
    const status = getCrmContractStatus(error);
    if (status) {
      return res.status(status).send({
        message: error instanceof Error ? error.message : 'Falha ao decidir triagem',
        code: getCrmContractCode(error),
        details: getCrmContractDetails(error),
      });
    }

    return res.status(500).send({
      message: error instanceof Error ? error.message : 'Falha ao decidir triagem',
    });
  }
});

app.post('/triage/:id/trigger-automation', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token nao fornecido ou invalido' });
  const access = await assertTriageAccess(decoded, Number(req.params.id));
  if ('error' in access && access.error) return res.status(access.error.status).send({ message: access.error.message });

  const commands = Array.isArray(req.body?.commands) ? req.body.commands : null;
  if (!commands || commands.length === 0) {
    return res.status(400).send({ message: 'commands é obrigatório' });
  }

  const actor = getResponsibleLabel(decoded.email) || decoded.email;
  const result = await triggerTriageAutomation({
    triageItemId: access.triageItem.id,
    commands,
    existingDedupeKeys: await collectExistingAutomationDedupeKeys(access.triageItem),
    executor: {
      async execute(command) {
        return executeTriageAutomationCommand({
          command,
          triageItem: access.triageItem,
          actor,
        });
      },
    },
  });

  res.json(result);
});

app.get('/triage/jobs', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token nao fornecido ou invalido' });
  if (!canAccessTriage(decoded)) return res.status(403).send({ message: 'Acesso negado' });

  const jobs = await prisma.publicationSourceJob.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  res.json(jobs.map((job: any) => ({
    id: job.id,
    sourceType: job.sourceType,
    scheduledFor: job.scheduledFor.toISOString(),
    startedAt: job.startedAt ? job.startedAt.toISOString() : null,
    finishedAt: job.finishedAt ? job.finishedAt.toISOString() : null,
    status: job.status,
    itemsCaptured: job.itemsCaptured,
    itemsCreated: job.itemsCreated,
    itemsUpdated: job.itemsUpdated,
    itemsFlaggedCritical: job.itemsFlaggedCritical,
    itemsSentToCrm: job.itemsSentToCrm,
    errorLog: job.errorLog ?? null,
  })));
});

app.post('/triage/jobs/run-cnj', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token nao fornecido ou invalido' });
  if (!canAccessTriage(decoded)) return res.status(403).send({ message: 'Acesso negado' });

  try {
    const result = await ingestCnjPublications(getResponsibleLabel(decoded.email) || decoded.email);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).send({ message: error instanceof Error ? error.message : 'Falha ao executar coleta CNJ' });
  }
});

app.post('/triage/jobs/run-cpf', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token nao fornecido ou invalido' });
  if (!canAccessTriage(decoded)) return res.status(403).send({ message: 'Acesso negado' });

  try {
    const result = await ingestCpfPublications(getResponsibleLabel(decoded.email) || decoded.email);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).send({ message: error instanceof Error ? error.message : 'Falha ao executar coleta CPF' });
  }
});

app.post('/triage/jobs/run-diario', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token nao fornecido ou invalido' });
  if (!canAccessTriage(decoded)) return res.status(403).send({ message: 'Acesso negado' });

  try {
    const result = await ingestDiarioPublications(getResponsibleLabel(decoded.email) || decoded.email);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).send({ message: error instanceof Error ? error.message : 'Falha ao executar coleta de diário oficial' });
  }
});

app.post('/triage/jobs/run-oab', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token nao fornecido ou invalido' });
  if (!canAccessTriage(decoded)) return res.status(403).send({ message: 'Acesso negado' });

  try {
    const result = await ingestOabPublications(getResponsibleLabel(decoded.email) || decoded.email);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).send({ message: error instanceof Error ? error.message : 'Falha ao executar coleta OAB' });
  }
});

app.post('/triage/jobs/:id/reprocess', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token nao fornecido ou invalido' });
  if (!canAccessTriage(decoded)) return res.status(403).send({ message: 'Acesso negado' });

  const sourceJob = await prisma.publicationSourceJob.findUnique({
    where: { id: Number(req.params.id) },
  });

  if (!sourceJob) return res.status(404).send({ message: 'Job não encontrado' });
  if (sourceJob.status !== 'failed' && sourceJob.status !== 'partial_failure') {
    return res.status(409).send({ message: 'Apenas jobs com falha podem ser reprocessados com segurança' });
  }

  const actor = getResponsibleLabel(decoded.email) || decoded.email;

  try {
    const result =
      sourceJob.sourceType === 'cnj'
        ? await ingestCnjPublications(actor)
        : sourceJob.sourceType === 'cpf'
          ? await ingestCpfPublications(actor)
          : sourceJob.sourceType === 'diario_oficial'
            ? await ingestDiarioPublications(actor)
            : sourceJob.sourceType === 'oab'
              ? await ingestOabPublications(actor)
              : null;

    if (!result) {
      return res.status(400).send({ message: 'Tipo de job não suportado para reprocessamento' });
    }

    res.status(201).json({
      previousJobId: sourceJob.id,
      reprocessedAt: new Date().toISOString(),
      result,
    });
  } catch (error) {
    res.status(500).send({ message: error instanceof Error ? error.message : 'Falha ao reprocessar job' });
  }
});

registerFinanceRoutes({
  app,
  prisma,
  getUserFromReq,
  devMockEnabled,
});

app.get('/', (req, res) => {
  res.send({ message: 'SaaS Jurídico API v1' });
});

app.listen(port, () => {
  console.log(`Backend rodando em http://localhost:${port}`);
});

function bootstrapFinanceSchedulers() {
  const enabled = process.env.FINANCE_SCHEDULER_ENABLED === '1';
  const auditService = new FinanceAuditService(new PrismaFinanceAuditRepository(prisma as any));
  const collectionsRepository = new PrismaFinanceCollectionsRepository(prisma as any);
  const dispatchJob = new FinanceCollectionDispatchJob({
    repository: collectionsRepository,
    auditService,
    transport: new MockFinanceTransport(),
    resolveDestination: async (schedule) => {
      const clientEmail = schedule?.entry?.clientRecord?.email;
      const clientPhone = schedule?.entry?.clientRecord?.phone;
      return schedule.channel === 'email'
        ? clientEmail || 'financeiro@cliente.local'
        : clientPhone || '+5500000000000';
    },
  });

  const registry = registerFinanceSchedulers({
    disabled: !enabled,
    collections: {
      onTick: async () => {
        await dispatchJob.runDueSchedules({
          now: new Date().toISOString(),
          actor: { source: 'system', role: 'FIN', email: 'scheduler@lexora.local' },
        });
      },
    },
  });

  const plans = registry.armAll(new Date());
  if (plans.collections.enabled) {
    console.log(`[finance] Scheduler armado para ${plans.collections.nextRunAt}`);
  } else {
    console.log('[finance] Scheduler desabilitado (defina FINANCE_SCHEDULER_ENABLED=1 para ativar)');
  }

  return registry;
}
