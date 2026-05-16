import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { signUserToken, verifyToken, type UserToken } from './auth';
import { buildAgendaPayload } from './agenda.contract';
import { collectCnjPublications } from './cnj-publications.provider';
import { collectCpfPublications } from './cpf-publications.provider';
import { collectDiarioPublications } from './diario-publications.provider';
import { buildDeadlinePayload } from './deadlines.contract';
import { buildDocumentPayload } from './documents.contract';
import { lookupExternalProcess } from './process-lookup.provider';
import { buildPublicationPayload } from './publications.contract';
import { buildTaskPayload } from './tasks.contract';
import { buildTemplatePayload } from './templates.contract';
import { buildTriageDecisionPayload, buildTriageItemPayload } from './triage.contract';
import { inferQueueType, inferSuggestedAction, resolveTriageTarget } from './triage.matcher';

const app = express();
const port = process.env.PORT || 3000;
const prisma = new PrismaClient() as PrismaClient & {
  client: any;
  publicationCapture: any;
  publicationEvent: any;
  publicationSourceJob: any;
  crmLead: any;
  crmOpportunity: any;
  triageItem: any;
  triageDecision: any;
};
const clientStore = prisma.client;
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
const isProduction = process.env.NODE_ENV === 'production';
const authCookieName = 'Authorization';

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
      const alternateHost = parsed.hostname === 'localhost'
        ? '127.0.0.1'
        : parsed.hostname === '127.0.0.1'
          ? 'localhost'
          : null;

      if (alternateHost) {
        parsed.hostname = alternateHost;
        allowed.add(parsed.toString().replace(/\/$/, ''));
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

      const queueType = inferQueueType('cnj', capturePayload.rawText);
      const suggestedAction = inferSuggestedAction({
        sourceType: 'cnj',
        queueType,
        processId: target.processId,
        clientId: target.clientId,
        hasExistingClient: Boolean(target.clientId),
        normalizedText: capturePayload.rawText,
      });

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
            suggestedReason: capturePayload.summary,
            sourceLabel: 'CNJ',
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
            suggestedReason: capturePayload.summary,
            aiConfidenceBand: queueType === 'critica' ? 'alta' : 'media',
            aiScoreRaw: queueType === 'critica' ? 0.89 : 0.74,
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

      const event = existingEvent ?? await prisma.publicationEvent.create({
        data: {
          captureId: capture.id,
          clientId: matchedClient?.id ?? null,
          eventType: 'publicacao',
          eventAt: new Date(capturePayload.occurredAt),
          title: capturePayload.title,
          summary: capturePayload.summary,
          fullText: capturePayload.rawText,
          riskLevel: 'normal',
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
          suggestedAction: matchedClient ? 'criar_oportunidade' : 'criar_lead',
          clientId: matchedClient?.id ?? null,
          status: { in: ['pendente', 'em_revisao_manual', 'adiado'] },
        },
      });

      if (existingTriage) {
        await prisma.triageItem.update({
          where: { id: existingTriage.id },
          data: {
            eventId: event.id,
            suggestedReason: capturePayload.summary,
            sourceLabel: 'CPF',
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
            queueType: 'normal',
            status: 'pendente',
            suggestedAction: matchedClient ? 'criar_oportunidade' : 'criar_lead',
            suggestedReason: capturePayload.summary,
            aiConfidenceBand: 'media',
            aiScoreRaw: 0.76,
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

      const queueType = inferQueueType('diario_oficial', capturePayload.rawText);
      const suggestedAction = inferSuggestedAction({
        sourceType: 'diario_oficial',
        queueType,
        processId: target.processId,
        clientId: target.clientId,
        hasExistingClient: Boolean(target.clientId),
        normalizedText: capturePayload.rawText,
      });

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
            suggestedReason: capturePayload.summary,
            sourceLabel: 'Diário Oficial',
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
            suggestedReason: capturePayload.summary,
            aiConfidenceBand: queueType === 'critica' ? 'alta' : 'media',
            aiScoreRaw: queueType === 'critica' ? 0.87 : 0.7,
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

function scheduleCnjCollector() {
  const disabled = process.env.TRIAGE_SCHEDULER_DISABLED === 'true';
  if (disabled) return;

  const run = async () => {
    try {
      await ingestCnjPublications('scheduler');
    } catch (error) {
      console.error('[triage] CNJ scheduler failed:', error);
    } finally {
      const nextRun = computeNextScheduleDate(new Date(Date.now() + 60000));
      const waitMs = Math.max(60000, nextRun.getTime() - Date.now());
      setTimeout(run, waitMs);
    }
  };

  const firstRun = computeNextScheduleDate();
  const initialWaitMs = Math.max(60000, firstRun.getTime() - Date.now());
  setTimeout(run, initialWaitMs);
}

function scheduleCpfCollector() {
  const disabled = process.env.TRIAGE_SCHEDULER_DISABLED === 'true';
  if (disabled) return;

  const run = async () => {
    try {
      await ingestCpfPublications('scheduler');
    } catch (error) {
      console.error('[triage] CPF scheduler failed:', error);
    } finally {
      const nextRun = computeNextScheduleDate(new Date(Date.now() + 60000));
      const waitMs = Math.max(60000, nextRun.getTime() - Date.now());
      setTimeout(run, waitMs);
    }
  };

  const firstRun = computeNextScheduleDate();
  const initialWaitMs = Math.max(60000, firstRun.getTime() - Date.now());
  setTimeout(run, initialWaitMs);
}

function scheduleDiarioCollector() {
  const disabled = process.env.TRIAGE_SCHEDULER_DISABLED === 'true';
  if (disabled) return;

  const run = async () => {
    try {
      await ingestDiarioPublications('scheduler');
    } catch (error) {
      console.error('[triage] Diário oficial scheduler failed:', error);
    } finally {
      const nextRun = computeNextScheduleDate(new Date(Date.now() + 60000));
      const waitMs = Math.max(60000, nextRun.getTime() - Date.now());
      setTimeout(run, waitMs);
    }
  };

  const firstRun = computeNextScheduleDate();
  const initialWaitMs = Math.max(60000, firstRun.getTime() - Date.now());
  setTimeout(run, initialWaitMs);
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

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ message: 'Credenciais inválidas' });
  const passwordMatches = await bcrypt.compare(password, user.password);
  if (!passwordMatches) return res.status(401).json({ message: 'Credenciais inválidas' });

  const sessionUser = { id: user.id, email: user.email, role: user.role };
  const token = signUserToken(sessionUser);
  setAuthCookie(res, token);

  res.json({ user: sessionUser });
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

  const users = await prisma.user.findMany({ select: { id: true, email: true, role: true } });
  res.json(users);
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

  res.json(deadlines.map((deadline) => buildDeadlinePayload(deadline)));
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

  res.json(buildDeadlinePayload(deadline));
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

  res.status(201).json(buildDeadlinePayload(created));
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

  const { title, dueDate, priority, status, responsible, notes, origin } = req.body;
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

  res.json(buildDeadlinePayload(updated));
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

  res.json(documents.map((document) => buildDocumentPayload(document)));
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

  res.json(buildDocumentPayload(document));
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

  res.status(201).json(buildDocumentPayload(created));
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
    await prisma.documento.update({
      where: { id: current.id },
      data: { isLatestVersion: false },
    });

    const versioned = await prisma.documento.create({
      data: {
        processId: current.processId,
        title: typeof title === 'string' && title.trim() ? title.trim() : current.title,
        description: typeof notes === 'string' ? notes.trim() : current.description,
        status: status || 'aguardando_validacao',
        category: category || current.category,
        version: current.version + 1,
        isLatestVersion: true,
        origin: origin || current.origin,
        uploadedAt: new Date(),
        responsible: responsible ?? current.responsible,
        requiredChecklist: requiredChecklist ?? current.requiredChecklist,
        pendingForAdvance: pendingForAdvance ?? current.pendingForAdvance,
        mimeType: mimeType || current.mimeType,
        previewUrl: previewUrl === undefined ? current.previewUrl : previewUrl,
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

    return res.json(buildDocumentPayload(versioned));
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

  res.json(buildDocumentPayload(updated));
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

  const dueDate = req.body?.dueDate
    ? new Date(req.body.dueDate)
    : addDays(publication.publishedAt, 15);
  const title = typeof req.body?.title === 'string' && req.body.title.trim()
    ? req.body.title.trim()
    : `Prazo de manifestação - ${publication.process.title}`;
  const priority = req.body?.priority || (publication.impact === 'critico' || publication.impact === 'alto' ? 'alta' : 'media');
  const status = req.body?.status || (publication.impact === 'critico' ? 'critico' : 'aberto');
  const responsible = req.body?.responsible || getResponsibleLabel(decoded.email) || decoded.email;
  const notes = typeof req.body?.notes === 'string' && req.body.notes.trim()
    ? req.body.notes.trim()
    : `Prazo criado a partir da publicação ${publication.tribunal} em ${formatDateLabel(publication.publishedAt)}. ${publication.summary}`;

  const createdDeadline = await prisma.prazo.create({
    data: {
      processId: publication.processId,
      title,
      dueDate,
      priority,
      status,
      origin: 'publicacao',
      responsible,
      legalArea: publication.process.phase,
      notes,
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

  res.status(201).json({
    publication: buildPublicationPayload(updatedPublication),
    deadline: buildDeadlinePayload(createdDeadline),
  });
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
  const fieldLines = fields
    .filter((field) => field && typeof field === 'object')
    .map((field) => {
      const key = typeof (field as Record<string, unknown>).label === 'string' && String((field as Record<string, unknown>).label).trim()
        ? String((field as Record<string, unknown>).label).trim()
        : typeof (field as Record<string, unknown>).key === 'string'
          ? String((field as Record<string, unknown>).key)
          : 'campo';
      const value = typeof (field as Record<string, unknown>).value === 'string' && String((field as Record<string, unknown>).value).trim()
        ? String((field as Record<string, unknown>).value).trim()
        : 'não informado';
      return `- ${key}: ${value}`;
    });

  const description = [
    `Peça gerada a partir do modelo ${template.name} (${template.version}).`,
    `Processo: #${processRecord.id} - ${processRecord.title}`,
    `Cliente: ${processRecord.client}`,
    fieldLines.length ? 'Campos preenchidos:' : null,
    ...(fieldLines.length ? fieldLines : []),
  ].filter(Boolean).join('\n');

  const createdDocument = await prisma.documento.create({
    data: {
      processId: processRecord.id,
      title,
      description,
      status: 'aguardando_validacao',
      category: 'Peticao',
      origin: 'interno',
      responsible: getResponsibleLabel(decoded.email) || decoded.email,
      requiredChecklist: false,
      pendingForAdvance: false,
      mimeType: 'application/octet-stream',
      previewUrl: null,
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

  const usedAt = new Date();
  await prisma.template.update({
    where: { id: template.id },
    data: { lastUsedAt: usedAt, updatedOn: usedAt },
  });

  res.status(201).json({
    document: buildDocumentPayload(createdDocument),
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

  res.json(events.map((event) => buildAgendaPayload(event)));
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
    ADM: ['processes:*', 'users:*', 'finance:*', 'dashboard:*'],
    ADV: ['processes:read,write', 'documents:read,write', 'clients:read'],
    FIN: ['finance:read,write', 'clients:read']
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

  if (decoded.role === 'ADM' || decoded.role === 'FIN') {
    const allProcesses = await prisma.process.findMany({ include: { owner: true } });
    return res.json(allProcesses);
  }

  const own = await prisma.process.findMany({ where: { ownerId: decoded.sub }, include: { owner: true } });
  res.json(own);
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

  const process = await prisma.process.findUnique({ where: { id: Number(req.params.id) }, include: { owner: true } });
  if (!process) return res.status(404).send({ message: 'Processo não encontrado' });
  if (decoded.role === 'ADM' || decoded.role === 'FIN' || process.ownerId === decoded.sub) return res.json(process);

  return res.status(403).send({ message: 'Acesso negado' });
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

  res.json(items.map((item: any) => buildTriageItemPayload(item)));
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

  res.json({
    ...buildTriageItemPayload(triageItem),
    decisions: triageItem.decisions.map((decision: any) => buildTriageDecisionPayload(decision)),
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
  const { decisionType, decisionReason, decisionNote, postponeUntil, assignedQueue } = req.body ?? {};

  if (!decisionType || typeof decisionType !== 'string') {
    return res.status(400).send({ message: 'decisionType é obrigatório' });
  }

  if (decisionType === 'descartado' && (!decisionReason || typeof decisionReason !== 'string')) {
    return res.status(400).send({ message: 'decisionReason é obrigatório para descarte' });
  }

  let generatedTaskId: number | null = null;
  let generatedDeadlineId: number | null = null;
  let generatedLeadId: number | null = null;
  let generatedOpportunityId: number | null = null;

  if (decisionType === 'confirmado') {
    if (triageItem.suggestedAction === 'criar_prazo' && triageItem.processId) {
      const deadline = await prisma.prazo.create({
        data: {
          processId: triageItem.processId,
          title: triageItem.event?.title || `Prazo derivado da triagem #${triageItem.id}`,
          dueDate: addDays(new Date(), 2),
          status: 'critico',
          priority: 'alta',
          origin: 'publicacao',
          responsible: getResponsibleLabel(decoded.email) || decoded.email,
          legalArea: triageItem.process?.phase || null,
          notes: triageItem.suggestedReason,
          createdBy: getResponsibleLabel(decoded.email) || decoded.email,
        },
      });
      generatedDeadlineId = deadline.id;

      const task = await prisma.task.create({
        data: {
          title: `Tratar ${triageItem.event?.title?.toLowerCase() || 'publicação crítica'}`,
          description: triageItem.suggestedReason,
          processId: triageItem.processId,
          clientId: triageItem.clientId,
          clientName: triageItem.clientRecord?.name || triageItem.process?.client || null,
          origin: 'publicacao',
          dueDate: addDays(new Date(), 1),
          status: 'pendente',
          priority: 'alta',
          owner: getResponsibleLabel(decoded.email) || decoded.email,
          createdBy: getResponsibleLabel(decoded.email) || decoded.email,
          notes: triageItem.capture.normalizedText,
          linkedToDeadline: true,
          linkedToPublication: true,
          immediateAction: true,
        },
      });
      generatedTaskId = task.id;
    } else if (triageItem.suggestedAction === 'criar_tarefa' && triageItem.processId) {
      const task = await prisma.task.create({
        data: {
          title: triageItem.event?.title || `Ação derivada da triagem #${triageItem.id}`,
          description: triageItem.suggestedReason,
          processId: triageItem.processId,
          clientId: triageItem.clientId,
          clientName: triageItem.clientRecord?.name || triageItem.process?.client || null,
          origin: 'publicacao',
          dueDate: addDays(new Date(), 1),
          status: 'pendente',
          priority: triageItem.queueType === 'critica' ? 'alta' : 'media',
          owner: getResponsibleLabel(decoded.email) || decoded.email,
          createdBy: getResponsibleLabel(decoded.email) || decoded.email,
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
            personName: triageItem.clientRecord?.name || triageItem.capture.personName || 'Cliente identificado',
            source: 'publicacao_automatizada',
            status: 'acao_recomendada',
            summary: triageItem.suggestedReason,
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
            personName: triageItem.capture.personName || 'Lead identificado',
            source: 'publicacao_automatizada',
            status: 'novo',
            summary: triageItem.suggestedReason,
          },
        });
        generatedLeadId = lead.id;
      }
    }
  }

  const decision = await prisma.triageDecision.create({
    data: {
      triageItemId: triageItem.id,
      decisionType,
      decisionReason: typeof decisionReason === 'string' ? decisionReason.trim() : null,
      decisionNote: typeof decisionNote === 'string' ? decisionNote.trim() : null,
      decidedBy: getResponsibleLabel(decoded.email) || decoded.email,
      generatedTaskId,
      generatedDeadlineId,
      generatedLeadId,
      generatedOpportunityId,
    },
  });

  const nextStatus =
    decisionType === 'confirmado' || decisionType === 'descartado'
      ? decisionType
      : decisionType === 'revisao_manual'
        ? 'em_revisao_manual'
        : decisionType === 'adiado'
          ? 'adiado'
          : 'pendente';

  const updated = await prisma.triageItem.update({
    where: { id: triageItem.id },
    data: {
      status: nextStatus,
      queueType: decisionType === 'confirmado' || decisionType === 'descartado' ? 'tratados' : triageItem.queueType,
      handledBy: getResponsibleLabel(decoded.email) || decoded.email,
      handledAt: new Date(),
      discardReason: decisionType === 'descartado' && typeof decisionReason === 'string' ? decisionReason.trim() : triageItem.discardReason,
      discardNote: decisionType === 'descartado' && typeof decisionNote === 'string' ? decisionNote.trim() : triageItem.discardNote,
      postponeUntil: decisionType === 'adiado' && typeof postponeUntil === 'string' ? new Date(postponeUntil) : triageItem.postponeUntil,
      assignedQueue: typeof assignedQueue === 'string' && assignedQueue.trim() ? assignedQueue.trim() : triageItem.assignedQueue,
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

  res.json({
    item: buildTriageItemPayload(updated),
    decision: buildTriageDecisionPayload(decision),
  });
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

app.get('/', (req, res) => {
  res.send({ message: 'SaaS Jurídico API v1' });
});

app.listen(port, () => {
  console.log(`Backend rodando em http://localhost:${port}`);
});
