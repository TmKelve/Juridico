import type { CreatePlanInput, PlanRecord, UpdatePlanInput } from './plan.types';

export interface PlanDomainRepository {
  findByCode(code: string): Promise<PlanRecord | null>;
  findById(planId: number): Promise<PlanRecord | null>;
  create(input: CreatePlanInput): Promise<PlanRecord>;
  update(input: UpdatePlanInput): Promise<PlanRecord>;
}

export class PlanDomainError extends Error {
  constructor(
    readonly code: string,
    readonly statusCode: number,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'PlanDomainError';
  }
}

export class PlanDomainService {
  constructor(private readonly repository: PlanDomainRepository) {}

  async createPlan(input: CreatePlanInput): Promise<PlanRecord> {
    const existing = await this.repository.findByCode(input.code);
    if (existing) {
      throw new PlanDomainError('PLAN_ALREADY_EXISTS', 409, 'Já existe plano com este código.', { code: input.code });
    }
    return this.repository.create(input);
  }

  async updatePlan(input: UpdatePlanInput): Promise<PlanRecord> {
    const existing = await this.repository.findById(input.planId);
    if (!existing) {
      throw new PlanDomainError('PLAN_NOT_FOUND', 404, 'Plano não encontrado.', { planId: input.planId });
    }
    return this.repository.update(input);
  }
}
