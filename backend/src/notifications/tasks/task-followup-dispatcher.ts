export interface TaskFollowupDispatchInput {
  taskId: number;
  title: string;
  dueDate: string | null;
  ownerLabel: string;
  reason: 'overdue' | 'sla_risk' | 'manual';
  channel: 'in_app' | 'internal_feed';
}

export interface TaskFollowupDispatchResult {
  sent: boolean;
  notificationId?: string | null;
  dispatchedAt: string;
  reason?: string | null;
}

export interface TaskFollowupDispatcher {
  dispatch(input: TaskFollowupDispatchInput): Promise<TaskFollowupDispatchResult>;
}

export class InMemoryTaskFollowupDispatcher implements TaskFollowupDispatcher {
  readonly sent: Array<TaskFollowupDispatchInput & { notificationId: string; dispatchedAt: string }> = [];

  async dispatch(input: TaskFollowupDispatchInput): Promise<TaskFollowupDispatchResult> {
    const dispatchedAt = new Date().toISOString();
    const notificationId = `task_followup_${input.taskId}_${this.sent.length + 1}`;
    this.sent.push({ ...input, notificationId, dispatchedAt });
    return { sent: true, notificationId, dispatchedAt };
  }
}
