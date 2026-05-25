import { TaskFollowupService } from '../../tasks/followup/task-followup.service';

export class TaskFollowupJob {
  constructor(private readonly service: TaskFollowupService) {}

  async run(input: {
    referenceAt?: string;
    batchSize?: number;
    dedupeKey: string;
    actor?: 'scheduler' | 'system';
  }) {
    return this.service.execute({
      referenceAt: input.referenceAt ?? new Date().toISOString(),
      batchSize: input.batchSize ?? 50,
      actor: input.actor ?? 'scheduler',
      dedupeKey: input.dedupeKey,
    });
  }
}
