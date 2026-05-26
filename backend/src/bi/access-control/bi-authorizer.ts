import { ensureAuthorized } from '../../authz/guards/authz.guard';

export type BiActor = {
  userId: number;
  role: string;
  teamIds?: Array<number | string>;
  portfolioIds?: Array<number | string>;
};

export function ensureBiAuthorized(input: {
  actor: BiActor;
  permissionKey: 'bi.view' | 'bi.snapshot.generate' | 'bi.export.generate';
  scopeType: 'global' | 'team' | 'portfolio' | 'user' | 'client';
  scopeId?: string | number | null;
}) {
  const context = input.scopeType === 'team'
    ? { teamId: input.scopeId ?? null }
    : input.scopeType === 'portfolio'
      ? { portfolioId: input.scopeId ?? null }
      : input.scopeType === 'user'
        ? { ownerUserId: typeof input.scopeId === 'number' ? input.scopeId : Number(input.scopeId ?? 0) || null }
        : {};

  return ensureAuthorized({
    actor: input.actor,
    permissionKey: input.permissionKey,
    resourceType: 'bi',
    resourceId: input.scopeId ?? input.scopeType,
    context,
  });
}
