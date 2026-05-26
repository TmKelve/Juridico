import type express from 'express';
import { buildExecutiveDashboardPayload } from '../models/executive-metric.payload';
import { ensureBiAuthorized } from '../access-control/bi-authorizer';

type UserToken = { sub: number; role: string; email: string };

type ProductivityService = {
  buildMetrics(query: any, snapshots: any[]): any[];
};

type FinanceService = {
  buildMetrics(query: any, items: any[]): any[];
};

type SnapshotService = {
  store(input: {
    metrics: any[];
    scopeType: string;
    scopeId: string;
    referenceDate: string;
    windowFrom: string;
    windowTo: string;
    generatedBy: string;
  }): Promise<Array<{ id: string }>>;
};

type ExportService = {
  generate(input: {
    dashboardKey: string;
    format: 'csv' | 'xlsx' | 'pdf';
    requestedBy: string;
  }): Promise<unknown>;
};

export function registerBiRoutes(input: {
  app: express.Express;
  getUserFromReq: (req: express.Request) => UserToken | null;
  productivityService: ProductivityService;
  financeService: FinanceService;
  snapshotService: SnapshotService;
  exportService: ExportService;
  loadProductivitySnapshots?: (query: {
    scopeType: string;
    scopeId: string | null;
    from: string;
    to: string;
  }) => Promise<any[]>;
  loadFinanceSnapshots?: (query: {
    from: string;
    to: string;
  }) => Promise<any[]>;
}) {
  function requireBi(req: express.Request, res: express.Response, permissionKey: 'bi.view' | 'bi.snapshot.generate' | 'bi.export.generate') {
    const decoded = input.getUserFromReq(req);
    if (!decoded) {
      res.status(401).send({ message: 'Token nao fornecido ou invalido' });
      return null;
    }
    return decoded;
  }

  input.app.post('/bi/metrics/query', async (req, res) => {
    const decoded = requireBi(req, res, 'bi.view');
    if (!decoded) return;
    try {
      ensureBiAuthorized({
        actor: { userId: decoded.sub, role: decoded.role },
        permissionKey: 'bi.view',
        scopeType: req.body.scopeType ?? 'global',
        scopeId: req.body.scopeId ?? null,
      });

      const query = {
        scopeType: req.body.scopeType ?? 'global',
        scopeId: req.body.scopeId ?? null,
        from: req.body.from,
        to: req.body.to,
        groupBy: req.body.groupBy ?? 'day',
        timezone: req.body.timezone ?? 'America/Sao_Paulo',
        asOf: req.body.asOf ?? null,
      };

      const productivitySnapshots = req.body.productivitySnapshots
        ?? await input.loadProductivitySnapshots?.({
          scopeType: query.scopeType,
          scopeId: query.scopeId ? String(query.scopeId) : null,
          from: query.from,
          to: query.to,
        })
        ?? [];
      const financeSnapshots = req.body.financeSnapshots
        ?? await input.loadFinanceSnapshots?.({
          from: query.from,
          to: query.to,
        })
        ?? [];

      const productMetrics = input.productivityService.buildMetrics(query, productivitySnapshots);
      const financeMetrics = input.financeService.buildMetrics(query, financeSnapshots);

      res.json({
        items: [...productMetrics, ...financeMetrics],
        warnings: [],
      });
    } catch (error: any) {
      res.status(403).send({ message: error?.message ?? 'Acesso negado a BI' });
    }
  });

  input.app.post('/bi/snapshots/generate', async (req, res) => {
    const decoded = requireBi(req, res, 'bi.snapshot.generate');
    if (!decoded) return;
    try {
      ensureBiAuthorized({
        actor: { userId: decoded.sub, role: decoded.role },
        permissionKey: 'bi.snapshot.generate',
        scopeType: req.body.scopeType ?? 'global',
        scopeId: req.body.scopeId ?? null,
      });

      const metrics = Array.isArray(req.body.metrics)
        ? req.body.metrics
        : [
            ...input.productivityService.buildMetrics(
              {
                scopeType: req.body.scopeType ?? 'global',
                scopeId: req.body.scopeId ?? null,
                from: req.body.windowFrom,
                to: req.body.windowTo,
                groupBy: 'day',
                timezone: 'America/Sao_Paulo',
                asOf: null,
              },
              (await input.loadProductivitySnapshots?.({
                scopeType: req.body.scopeType ?? 'global',
                scopeId: req.body.scopeId ? String(req.body.scopeId) : null,
                from: req.body.windowFrom,
                to: req.body.windowTo,
              })) ?? [],
            ),
            ...input.financeService.buildMetrics(
              {
                scopeType: req.body.scopeType ?? 'global',
                scopeId: req.body.scopeId ?? null,
                from: req.body.windowFrom,
                to: req.body.windowTo,
                groupBy: 'day',
                timezone: 'America/Sao_Paulo',
                asOf: null,
              },
              (await input.loadFinanceSnapshots?.({
                from: req.body.windowFrom,
                to: req.body.windowTo,
              })) ?? [],
            ),
          ];
      const created = await input.snapshotService.store({
        metrics,
        scopeType: req.body.scopeType ?? 'global',
        scopeId: String(req.body.scopeId ?? 'global'),
        referenceDate: req.body.referenceDate,
        windowFrom: req.body.windowFrom,
        windowTo: req.body.windowTo,
        generatedBy: `user:${decoded.sub}`,
      });

      res.status(201).json({
        snapshot: {
          count: created.length,
          ids: created.map((item) => item.id),
        },
      });
    } catch (error: any) {
      res.status(403).send({ message: error?.message ?? 'Falha ao gerar snapshot BI' });
    }
  });

  input.app.get('/bi/dashboard/:dashboardKey', async (req, res) => {
    const decoded = requireBi(req, res, 'bi.view');
    if (!decoded) return;
    try {
      const scopeType = typeof req.query.scopeType === 'string' ? req.query.scopeType : 'global';
      const scopeId = typeof req.query.scopeId === 'string' ? req.query.scopeId : null;
      ensureBiAuthorized({
        actor: { userId: decoded.sub, role: decoded.role },
        permissionKey: 'bi.view',
        scopeType: scopeType as any,
        scopeId,
      });

      const query = {
        scopeType,
        scopeId,
        from: typeof req.query.from === 'string' ? req.query.from : '',
        to: typeof req.query.to === 'string' ? req.query.to : '',
        groupBy: typeof req.query.groupBy === 'string' ? req.query.groupBy : 'day',
        timezone: typeof req.query.timezone === 'string' ? req.query.timezone : 'America/Sao_Paulo',
        asOf: typeof req.query.asOf === 'string' ? req.query.asOf : null,
      };

      const metrics = [
        ...input.productivityService.buildMetrics(
          query,
          (await input.loadProductivitySnapshots?.({
            scopeType: query.scopeType,
            scopeId: query.scopeId ? String(query.scopeId) : null,
            from: query.from,
            to: query.to,
          })) ?? [],
        ),
        ...input.financeService.buildMetrics(
          query,
          (await input.loadFinanceSnapshots?.({
            from: query.from,
            to: query.to,
          })) ?? [],
        ),
      ];

      res.json({
        dashboard: buildExecutiveDashboardPayload({
          dashboardKey: req.params.dashboardKey,
          metrics,
          definitionsVersion: 'l-v1',
        }),
      });
    } catch (error: any) {
      res.status(403).send({ message: error?.message ?? 'Falha ao carregar dashboard BI' });
    }
  });

  input.app.post('/bi/exports', async (req, res) => {
    const decoded = requireBi(req, res, 'bi.export.generate');
    if (!decoded) return;
    try {
      ensureBiAuthorized({
        actor: { userId: decoded.sub, role: decoded.role },
        permissionKey: 'bi.export.generate',
        scopeType: req.body.scopeType ?? 'global',
        scopeId: req.body.scopeId ?? null,
      });

      const generated = await input.exportService.generate({
        dashboardKey: req.body.dashboardKey,
        format: req.body.format,
        requestedBy: `user:${decoded.sub}`,
      });

      res.status(201).json({ exportJob: generated });
    } catch (error: any) {
      res.status(403).send({ message: error?.message ?? 'Falha ao gerar export BI' });
    }
  });
}
