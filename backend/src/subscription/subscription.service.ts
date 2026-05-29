import { deriveCompanyStatusFromSubscriptionStatus } from '../company-status/company-status.sync';
import { isValidSubscriptionTransition } from './subscription.transitions';
import type {
  CreateSubscriptionInput,
  SubscriptionRecord,
  SubscriptionTransitionRecord,
  TransitionSubscriptionInput,
  TransitionSubscriptionResult,
} from './subscription.types';

export interface SubscriptionDomainRepository {
  findSubscriptionById(subscriptionId: number): Promise<SubscriptionRecord | null>;
  createSubscription(input: CreateSubscriptionInput): Promise<SubscriptionRecord>;
  findTransitionByIdempotencyKey(subscriptionId: number, idempotencyKey: string): Promise<SubscriptionTransitionRecord | null>;
  createTransition(input: {
    subscriptionId: number;
    fromStatus: SubscriptionRecord['status'];
    toStatus: SubscriptionRecord['status'];
    reason?: string;
    actor?: string;
    idempotencyKey?: string;
    metadata?: Record<string, unknown>;
  }): Promise<SubscriptionTransitionRecord>;
  updateSubscriptionStatus(input: {
    subscriptionId: number;
    status: SubscriptionRecord['status'];
    cancelledAt?: string | null;
  }): Promise<SubscriptionRecord>;
  updateCompanyStatus(companyId: number, status: string): Promise<void>;
}

export class SubscriptionDomainError extends Error {
  constructor(
    readonly code: string,
    readonly statusCode: number,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'SubscriptionDomainError';
  }
}

export class SubscriptionDomainService {
  constructor(private readonly repository: SubscriptionDomainRepository) {}

  async createSubscription(input: CreateSubscriptionInput): Promise<SubscriptionRecord> {
    const created = await this.repository.createSubscription({
      ...input,
      status: input.status ?? 'draft',
    });
    const companyStatus = deriveCompanyStatusFromSubscriptionStatus(created.status);
    await this.repository.updateCompanyStatus(created.companyId, companyStatus);
    return created;
  }

  async transitionSubscription(input: TransitionSubscriptionInput): Promise<TransitionSubscriptionResult> {
    const subscription = await this.repository.findSubscriptionById(input.subscriptionId);
    if (!subscription) {
      throw new SubscriptionDomainError('SUBSCRIPTION_NOT_FOUND', 404, 'Assinatura não encontrada.', {
        subscriptionId: input.subscriptionId,
      });
    }

    if (input.idempotencyKey) {
      const replay = await this.repository.findTransitionByIdempotencyKey(subscription.id, input.idempotencyKey);
      if (replay) {
        const replayedSubscription = await this.repository.findSubscriptionById(subscription.id);
        if (!replayedSubscription) {
          throw new SubscriptionDomainError('SUBSCRIPTION_NOT_FOUND', 404, 'Assinatura não encontrada.', {
            subscriptionId: subscription.id,
          });
        }
        return {
          subscription: replayedSubscription,
          transition: replay,
          companyStatus: deriveCompanyStatusFromSubscriptionStatus(replayedSubscription.status),
          idempotentReplay: true,
        };
      }
    }

    if (!isValidSubscriptionTransition(subscription.status, input.toStatus)) {
      throw new SubscriptionDomainError('SUBSCRIPTION_INVALID_TRANSITION', 422, 'Transição de assinatura inválida.', {
        fromStatus: subscription.status,
        toStatus: input.toStatus,
      });
    }

    const transitioned = await this.repository.createTransition({
      subscriptionId: subscription.id,
      fromStatus: subscription.status,
      toStatus: input.toStatus,
      reason: input.reason,
      actor: input.actor,
      idempotencyKey: input.idempotencyKey,
      metadata: input.metadata,
    });

    const updated = await this.repository.updateSubscriptionStatus({
      subscriptionId: subscription.id,
      status: input.toStatus,
      cancelledAt: input.toStatus === 'cancelled' ? new Date().toISOString() : null,
    });

    const companyStatus = deriveCompanyStatusFromSubscriptionStatus(updated.status);
    await this.repository.updateCompanyStatus(updated.companyId, companyStatus);

    return {
      subscription: updated,
      transition: transitioned,
      companyStatus,
      idempotentReplay: false,
    };
  }
}
