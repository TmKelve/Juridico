import { buildAgendaPayload } from '../../agenda.contract';

export type MobileFeedTask = {
  id: number;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
};

export type MobileFeedDeadline = {
  id: number;
  title: string;
  status: string;
  dueDate: string;
};

export class MobileFeedAdapter {
  build(input: {
    tasks?: MobileFeedTask[];
    deadlines?: MobileFeedDeadline[];
    agendaEvents?: Array<Parameters<typeof buildAgendaPayload>[0]>;
    pendingTimesheet?: Array<{ id: string; startedAt: string; status: string; durationMinutes: number }>;
  }) {
    const items: Array<Record<string, unknown>> = [];

    for (const task of input.tasks ?? []) {
      items.push({
        type: 'task',
        priority: task.priority,
        title: task.title,
        entityId: task.id,
        dueDate: task.dueDate,
        status: task.status,
      });
    }

    for (const deadline of input.deadlines ?? []) {
      items.push({
        type: 'deadline',
        priority: deadline.status === 'atrasado' ? 'critica' : 'alta',
        title: deadline.title,
        entityId: deadline.id,
        dueDate: deadline.dueDate,
        status: deadline.status,
      });
    }

    for (const event of input.agendaEvents ?? []) {
      const payload = buildAgendaPayload(event);
      items.push({
        type: 'agenda',
        priority: payload.priority,
        title: payload.title,
        entityId: payload.id,
        dueDate: payload.date,
        status: payload.status,
      });
    }

    for (const entry of input.pendingTimesheet ?? []) {
      items.push({
        type: 'timesheet_pending',
        priority: 'media',
        title: `Apontamento pendente ${entry.durationMinutes}min`,
        entityId: entry.id,
        dueDate: entry.startedAt.slice(0, 10),
        status: entry.status,
      });
    }

    return {
      items,
      generatedAt: new Date().toISOString(),
    };
  }
}
