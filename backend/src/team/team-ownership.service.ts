import type { ManagementAuditEventRecord, ManagementAuditService } from '../audit/team';

export interface TeamRecord {
  id: number;
  name: string;
  memberUserIds: number[];
  active: boolean;
}

export interface TeamUserRecord {
  id: number;
}

export interface PortfolioOwnershipRecord {
  portfolioId: number;
  name: string;
  teamId: number;
  primaryOwnerUserId: number;
  backupOwnerUserId: number | null;
  memberUserIds: number[];
  active: boolean;
}

export interface AssignOwnershipInput {
  portfolioId: number;
  primaryOwnerUserId: number;
  backupOwnerUserId: number | null;
  teamId: number;
  memberUserIds: number[];
  actorUserId: number;
  idempotencyKey?: string | null;
}

export interface AssignOwnershipResult {
  portfolio: PortfolioOwnershipRecord;
  auditEvent: ManagementAuditEventRecord;
  idempotency: 'created' | 'replayed';
}

export interface TeamOwnershipRepository {
  findTeamById(teamId: number): Promise<TeamRecord | null>;
  findUserById(userId: number): Promise<TeamUserRecord | null>;
  findPortfolioById(portfolioId: number): Promise<PortfolioOwnershipRecord | null>;
  savePortfolio(portfolio: PortfolioOwnershipRecord): Promise<PortfolioOwnershipRecord>;
}

export interface TeamPermissionPort {
  assertAllowed(input: {
    permissionKey: 'team.assignOwnership';
    actorUserId: number;
    portfolioId: number;
    teamId: number;
  }): Promise<void>;
}

export class TeamOwnershipError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly statusCode: number = 400,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'TeamOwnershipError';
  }
}

export class TeamOwnershipService {
  constructor(private readonly dependencies: {
    repository: TeamOwnershipRepository;
    auditService: Pick<ManagementAuditService, 'record' | 'runIdempotent'>;
    authorizer?: TeamPermissionPort;
  }) {}

  async assignOwnership(input: AssignOwnershipInput): Promise<AssignOwnershipResult> {
    const normalized = normalizeAssignOwnershipInput(input);
    const team = await this.dependencies.repository.findTeamById(normalized.teamId);
    if (!team || !team.active) {
      throw new TeamOwnershipError('TEAM_NOT_FOUND', 'Equipe nao encontrada.', 404, { teamId: normalized.teamId });
    }

    const portfolio = await this.dependencies.repository.findPortfolioById(normalized.portfolioId);
    if (!portfolio || !portfolio.active) {
      throw new TeamOwnershipError('PORTFOLIO_NOT_FOUND', 'Carteira nao encontrada.', 404, { portfolioId: normalized.portfolioId });
    }

    await this.assertKnownUsers([normalized.primaryOwnerUserId, normalized.backupOwnerUserId, normalized.actorUserId]);
    assertMembersBelongToTeam(team, normalized.memberUserIds, normalized.primaryOwnerUserId, normalized.backupOwnerUserId);

    if (this.dependencies.authorizer) {
      await this.dependencies.authorizer.assertAllowed({
        permissionKey: 'team.assignOwnership',
        actorUserId: normalized.actorUserId,
        portfolioId: normalized.portfolioId,
        teamId: normalized.teamId,
      });
    }

    const response = await this.dependencies.auditService.runIdempotent({
      key: normalized.idempotencyKey,
      scope: 'team.assignOwnership',
      entityType: 'portfolio',
      entityId: normalized.portfolioId,
      action: 'team.assignOwnership',
      payload: normalized,
      execute: async () => {
        const before = toOwnershipSnapshot(portfolio);
        const nextPortfolio: PortfolioOwnershipRecord = {
          ...portfolio,
          teamId: normalized.teamId,
          primaryOwnerUserId: normalized.primaryOwnerUserId,
          backupOwnerUserId: normalized.backupOwnerUserId,
          memberUserIds: normalized.memberUserIds,
        };

        const saved = await this.dependencies.repository.savePortfolio(nextPortfolio);
        const auditEvent = await this.dependencies.auditService.record({
          scope: 'team',
          action: 'team.assignOwnership',
          status: 'success',
          entityType: 'portfolio',
          entityId: saved.portfolioId,
          actor: `user:${normalized.actorUserId}`,
          occurredAt: new Date().toISOString(),
          context: {
            portfolioId: saved.portfolioId,
            teamId: saved.teamId,
            primaryOwnerUserId: saved.primaryOwnerUserId,
            backupOwnerUserId: saved.backupOwnerUserId,
            memberUserIds: saved.memberUserIds,
          },
          diff: {
            before,
            after: toOwnershipSnapshot(saved),
          },
          idempotencyKey: normalized.idempotencyKey,
        });

        return {
          portfolio: saved,
          auditEvent,
        };
      },
    });

    return {
      ...response.data,
      idempotency: response.mode,
    };
  }

  private async assertKnownUsers(userIds: Array<number | null>) {
    for (const userId of userIds) {
      if (userId === null) continue;
      const user = await this.dependencies.repository.findUserById(userId);
      if (!user) {
        throw new TeamOwnershipError('OWNERSHIP_INVALID', 'Usuario de ownership nao encontrado.', 400, { userId });
      }
    }
  }
}

export class InMemoryTeamOwnershipRepository implements TeamOwnershipRepository {
  private readonly teams = new Map<number, TeamRecord>();
  private readonly users = new Map<number, TeamUserRecord>();
  private readonly portfolios = new Map<number, PortfolioOwnershipRecord>();

  constructor(seed: {
    teams?: TeamRecord[];
    users?: TeamUserRecord[];
    portfolios?: PortfolioOwnershipRecord[];
  } = {}) {
    for (const team of seed.teams ?? []) this.teams.set(team.id, cloneTeam(team));
    for (const user of seed.users ?? []) this.users.set(user.id, { ...user });
    for (const portfolio of seed.portfolios ?? []) this.portfolios.set(portfolio.portfolioId, clonePortfolio(portfolio));
  }

  async findTeamById(teamId: number) {
    const team = this.teams.get(teamId);
    return team ? cloneTeam(team) : null;
  }

  async findUserById(userId: number) {
    const user = this.users.get(userId);
    return user ? { ...user } : null;
  }

  async findPortfolioById(portfolioId: number) {
    const portfolio = this.portfolios.get(portfolioId);
    return portfolio ? clonePortfolio(portfolio) : null;
  }

  async savePortfolio(portfolio: PortfolioOwnershipRecord) {
    const clone = clonePortfolio(portfolio);
    this.portfolios.set(clone.portfolioId, clone);
    return clonePortfolio(clone);
  }
}

function normalizeAssignOwnershipInput(input: AssignOwnershipInput) {
  const portfolioId = toPositiveInteger(input.portfolioId, 'portfolioId');
  const primaryOwnerUserId = toPositiveInteger(input.primaryOwnerUserId, 'primaryOwnerUserId');
  const teamId = toPositiveInteger(input.teamId, 'teamId');
  const actorUserId = toPositiveInteger(input.actorUserId, 'actorUserId');
  const backupOwnerUserId = input.backupOwnerUserId === null ? null : toPositiveInteger(input.backupOwnerUserId, 'backupOwnerUserId');
  if (backupOwnerUserId !== null && backupOwnerUserId === primaryOwnerUserId) {
    throw new TeamOwnershipError('OWNERSHIP_INVALID', 'Backup owner deve ser diferente do owner principal.');
  }

  return {
    portfolioId,
    primaryOwnerUserId,
    backupOwnerUserId,
    teamId,
    actorUserId,
    memberUserIds: normalizeMemberIds(input.memberUserIds, { primaryOwnerUserId, backupOwnerUserId }),
    idempotencyKey: normalizeOptionalString(input.idempotencyKey),
  };
}

function normalizeMemberIds(memberUserIds: number[], required: { primaryOwnerUserId: number; backupOwnerUserId: number | null }) {
  if (!Array.isArray(memberUserIds)) {
    throw new TeamOwnershipError('OWNERSHIP_INVALID', 'memberUserIds deve ser um array.');
  }

  const normalized = Array.from(new Set(memberUserIds.map((value, index) => toPositiveInteger(value, `memberUserIds[${index}]`))));
  if (!normalized.includes(required.primaryOwnerUserId)) normalized.unshift(required.primaryOwnerUserId);
  if (required.backupOwnerUserId !== null && !normalized.includes(required.backupOwnerUserId)) normalized.push(required.backupOwnerUserId);
  return normalized;
}

function assertMembersBelongToTeam(
  team: TeamRecord,
  memberUserIds: number[],
  primaryOwnerUserId: number,
  backupOwnerUserId: number | null,
) {
  const teamMemberIds = new Set(team.memberUserIds);
  for (const userId of memberUserIds) {
    if (!teamMemberIds.has(userId)) {
      throw new TeamOwnershipError('OWNERSHIP_INVALID', 'Membro nao pertence ao time informado.', 400, { teamId: team.id, userId });
    }
  }

  if (!memberUserIds.includes(primaryOwnerUserId)) {
    throw new TeamOwnershipError('OWNERSHIP_INVALID', 'Owner principal deve fazer parte da carteira.');
  }

  if (backupOwnerUserId !== null && !memberUserIds.includes(backupOwnerUserId)) {
    throw new TeamOwnershipError('OWNERSHIP_INVALID', 'Owner backup deve fazer parte da carteira.');
  }
}

function toOwnershipSnapshot(portfolio: PortfolioOwnershipRecord) {
  return {
    teamId: portfolio.teamId,
    primaryOwnerUserId: portfolio.primaryOwnerUserId,
    backupOwnerUserId: portfolio.backupOwnerUserId,
    memberUserIds: [...portfolio.memberUserIds],
  };
}

function toPositiveInteger(value: number, field: string) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new TeamOwnershipError('OWNERSHIP_INVALID', `${field} invalido.`, 400, { field });
  }
  return value;
}

function normalizeOptionalString(value: string | null | undefined) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length ? normalized : null;
}

function cloneTeam(team: TeamRecord): TeamRecord {
  return { ...team, memberUserIds: [...team.memberUserIds] };
}

function clonePortfolio(portfolio: PortfolioOwnershipRecord): PortfolioOwnershipRecord {
  return { ...portfolio, memberUserIds: [...portfolio.memberUserIds] };
}
