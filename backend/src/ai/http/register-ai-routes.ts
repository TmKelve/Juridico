import type express from 'express';
import { ensureAuthorized } from '../../authz/guards/authz.guard';
import { createAiProviderFromEnv } from '../core/ai-provider.router';
import { PublicationSummarizerService } from '../summarization/publication-summarizer.service';
import { TriageRecommendationService } from '../recommendation/triage-recommendation.service';
import { InMemoryAiAuditService } from '../audit/ai-audit.service';

type UserToken = { sub: number; role: string; email: string };

export function registerAiRoutes(input: {
  app: express.Express;
  getUserFromReq: (req: express.Request) => UserToken | null;
  auditService?: InMemoryAiAuditService;
}) {
  const provider = createAiProviderFromEnv();
  const summarizer = new PublicationSummarizerService(provider);
  const recommendationService = new TriageRecommendationService(provider);
  const auditService = input.auditService ?? new InMemoryAiAuditService();

  function requireAi(
    req: express.Request,
    res: express.Response,
    permissionKey: 'ai.summary.generate' | 'ai.recommendation.generate' | 'ai.audit.view',
  ) {
    const decoded = input.getUserFromReq(req);
    if (!decoded) {
      res.status(401).send({ message: 'Token nao fornecido ou invalido' });
      return null;
    }

    try {
      ensureAuthorized({
        actor: { userId: decoded.sub, role: decoded.role },
        permissionKey,
        resourceType: 'ai',
        resourceId: typeof req.body?.targetId === 'number' || typeof req.body?.targetId === 'string' ? req.body.targetId : null,
        context: { ownerUserId: decoded.sub },
      });
    } catch (error: any) {
      res.status(403).send({ message: error?.message ?? 'Acesso negado a IA' });
      return null;
    }

    return decoded;
  }

  input.app.post('/ai/summary', async (req, res) => {
    const decoded = requireAi(req, res, 'ai.summary.generate');
    if (!decoded) return;

    try {
      const result = await summarizer.summarize({
        commandKey: 'ai.summary.generate',
        promptVersion: req.body.promptVersion ?? 'k-summary-v1',
        modelVersion: req.body.modelVersion ?? 'k-summary-model-v1',
        correlationId: req.body.correlationId ?? `summary:${req.body.targetType}:${req.body.targetId}`,
        targetType: req.body.targetType,
        targetId: req.body.targetId,
        sourceText: req.body.sourceText,
        processLabel: req.body.processLabel ?? null,
        clientLabel: req.body.clientLabel ?? null,
      });

      await auditService.record({
        executionId: `summary:${req.body.targetType}:${req.body.targetId}`,
        commandKey: 'ai.summary.generate',
        targetType: String(req.body.targetType),
        targetId: String(req.body.targetId),
        actionTaken: 'accepted',
        actor: `user:${decoded.sub}`,
        status: 'success',
        promptVersion: req.body.promptVersion ?? 'k-summary-v1',
        modelVersion: req.body.modelVersion ?? 'k-summary-model-v1',
        provider: result.data.meta.provider,
        latencyMs: result.data.meta.latencyMs,
        estimatedCostUsd: result.data.meta.estimatedCostUsd,
        correlationId: req.body.correlationId ?? null,
        occurredAt: new Date().toISOString(),
      });

      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).send({ message: error?.message ?? 'Falha ao gerar resumo IA' });
    }
  });

  input.app.post('/ai/recommendation', async (req, res) => {
    const decoded = requireAi(req, res, 'ai.recommendation.generate');
    if (!decoded) return;

    try {
      const result = await recommendationService.recommend({
        commandKey: 'ai.recommendation.generate',
        promptVersion: req.body.promptVersion ?? 'k-recommendation-v1',
        modelVersion: req.body.modelVersion ?? 'k-recommendation-model-v1',
        correlationId: req.body.correlationId ?? `recommendation:${req.body.targetType}:${req.body.targetId}`,
        targetType: req.body.targetType,
        targetId: req.body.targetId,
        policyProfile: req.body.policyProfile ?? 'default',
        facts: req.body.facts ?? {},
      });

      await auditService.record({
        executionId: `recommendation:${req.body.targetType}:${req.body.targetId}`,
        commandKey: 'ai.recommendation.generate',
        targetType: String(req.body.targetType),
        targetId: String(req.body.targetId),
        actionTaken: 'accepted',
        actor: `user:${decoded.sub}`,
        status: 'success',
        promptVersion: req.body.promptVersion ?? 'k-recommendation-v1',
        modelVersion: req.body.modelVersion ?? 'k-recommendation-model-v1',
        provider: result.data.meta.provider,
        latencyMs: result.data.meta.latencyMs,
        estimatedCostUsd: result.data.meta.estimatedCostUsd,
        correlationId: req.body.correlationId ?? null,
        occurredAt: new Date().toISOString(),
      });

      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).send({ message: error?.message ?? 'Falha ao gerar recomendacao IA' });
    }
  });

  input.app.get('/ai/audit', async (req, res) => {
    const decoded = requireAi(req, res, 'ai.audit.view');
    if (!decoded) return;

    const items = await auditService.list({
      commandKey: typeof req.query.commandKey === 'string' ? req.query.commandKey : undefined,
      targetType: typeof req.query.targetType === 'string' ? req.query.targetType : undefined,
      targetId: typeof req.query.targetId === 'string' ? req.query.targetId : undefined,
      limit: typeof req.query.limit === 'string' ? Number(req.query.limit) : undefined,
    });

    res.json(items);
  });
}
