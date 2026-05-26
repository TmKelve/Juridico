export type AutomationCommandType =
  | 'create_deadline'
  | 'create_task'
  | 'create_deadline_and_task'
  | 'none';

export type AutomationCommand = {
  commandType: AutomationCommandType;
  dedupeKey: string;
  correlationId: string | null;
  publicationId: number | null;
  triageItemId: number | null;
  processId: number | null;
  clientId: number | null;
  derivedActions: DerivedActionRecord[];
  fallbacks: FallbackRecord[];
  deadline: {
    title: string | null;
    dueDate: string | null;
    priority: string | null;
    notes: string | null;
  };
  task: {
    title: string | null;
    dueDate: string | null;
    priority: string | null;
    owner: string | null;
    description: string | null;
  };
  skipReason?: 'not_confirmed' | 'unsupported_action' | 'missing_process' | 'duplicate_dedupe_key';
};

export type DerivedActionRecord = {
  entityType: 'triage' | 'crm_lead' | 'crm_opportunity' | 'deadline' | 'task';
  entityId: number;
  correlationId: string | null;
  sourceType: string;
  sourceReference: string;
  originStage: string;
  status: string;
  title: string;
  summary: string | null;
  url: string | null;
  createdAt: string;
};

export type FallbackRecord = {
  code: string;
  message: string;
};

export type AutomationPlanningItem = {
  id: number;
  suggestedAction: string;
  suggestedReason: string;
  queueType: string;
  processId: number | null;
  clientId: number | null;
  process?: { phase?: string | null; client?: string | null } | null;
  clientRecord?: { name?: string | null } | null;
  capture: {
    normalizedText: string;
    sourceReference?: string | null;
  };
  event?: {
    publicationId?: number | null;
    title?: string | null;
  } | null;
};

export type AutomationPlanningInput = {
  decisionType: string;
  dueDate?: string | null;
  deadlineTitle?: string | null;
  deadlinePriority?: string | null;
  taskDueDate?: string | null;
  taskTitle?: string | null;
  taskPriority?: string | null;
  taskOwner?: string | null;
  taskDescription?: string | null;
};

function toIsoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function addDays(base: Date, amount: number) {
  const next = new Date(base);
  next.setUTCDate(next.getUTCDate() + amount);
  return next;
}

function normalizeTitle(value?: string | null) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized || null;
}

function buildFallback(reason: NonNullable<AutomationCommand['skipReason']>): FallbackRecord {
  const messages: Record<NonNullable<AutomationCommand['skipReason']>, string> = {
    not_confirmed: 'Automação não executada porque a decisão ainda não foi confirmada.',
    unsupported_action: 'A ação sugerida ainda não possui automação compatível.',
    missing_process: 'A automação depende de processo vinculado para continuar.',
    duplicate_dedupe_key: 'A automação foi suprimida por chave de deduplicação já utilizada.',
  };

  return {
    code: reason,
    message: messages[reason],
  };
}

function buildNoneCommand(item: AutomationPlanningItem, reason: AutomationCommand['skipReason']): AutomationCommand {
  const publicationId = item.event?.publicationId ?? null;
  const correlationId = publicationId ? `pub:${publicationId}` : `triage:${item.id}`;
  return {
    commandType: 'none',
    dedupeKey: '',
    correlationId,
    publicationId,
    triageItemId: item.id,
    processId: item.processId,
    clientId: item.clientId,
    derivedActions: [],
    fallbacks: reason ? [buildFallback(reason)] : [],
    deadline: {
      title: null,
      dueDate: null,
      priority: null,
      notes: null,
    },
    task: {
      title: null,
      dueDate: null,
      priority: null,
      owner: null,
      description: null,
    },
    skipReason: reason,
  };
}

export function planAutomationCommand(params: {
  triageItem: AutomationPlanningItem;
  input: AutomationPlanningInput;
  actor: string;
  now: Date;
}): AutomationCommand {
  const { triageItem, input, actor, now } = params;

  if (input.decisionType !== 'confirmado') {
    return buildNoneCommand(triageItem, 'not_confirmed');
  }

  if (!triageItem.processId && (triageItem.suggestedAction === 'criar_prazo' || triageItem.suggestedAction === 'criar_tarefa')) {
    return buildNoneCommand(triageItem, 'missing_process');
  }

  const publicationId = triageItem.event?.publicationId ?? null;
  const publicationRef = publicationId ? `pub:${publicationId}` : `triage:${triageItem.id}`;
  const notes = normalizeTitle(input.taskDescription) ?? triageItem.suggestedReason;

  if (triageItem.suggestedAction === 'criar_prazo') {
    const eventTitle = normalizeTitle(triageItem.event?.title) ?? `Prazo derivado da triagem #${triageItem.id}`;
    const taskTitle = normalizeTitle(input.taskTitle) ?? `Tratar ${eventTitle.toLowerCase()}`;
    return {
      commandType: 'create_deadline_and_task',
      dedupeKey: `${publicationRef}|process:${triageItem.processId}|deadline-and-task`,
      correlationId: publicationRef,
      publicationId,
      triageItemId: triageItem.id,
      processId: triageItem.processId,
      clientId: triageItem.clientId,
      derivedActions: [
        {
          entityType: 'deadline',
          entityId: triageItem.id,
          correlationId: publicationRef,
          sourceType: 'publication',
          sourceReference: triageItem.capture.sourceReference ?? publicationRef,
          originStage: 'gerou_prazo',
          status: 'planned',
          title: normalizeTitle(input.deadlineTitle) ?? eventTitle,
          summary: notes,
          url: null,
          createdAt: now.toISOString(),
        },
        {
          entityType: 'task',
          entityId: triageItem.id,
          correlationId: publicationRef,
          sourceType: 'publication',
          sourceReference: triageItem.capture.sourceReference ?? publicationRef,
          originStage: 'gerou_tarefa',
          status: 'planned',
          title: taskTitle,
          summary: notes,
          url: null,
          createdAt: now.toISOString(),
        },
      ],
      fallbacks: [],
      deadline: {
        title: normalizeTitle(input.deadlineTitle) ?? eventTitle,
        dueDate: normalizeTitle(input.dueDate) ?? toIsoDate(addDays(now, 2)),
        priority: normalizeTitle(input.deadlinePriority) ?? 'alta',
        notes,
      },
      task: {
        title: taskTitle,
        dueDate: normalizeTitle(input.taskDueDate) ?? toIsoDate(addDays(now, 1)),
        priority: normalizeTitle(input.taskPriority) ?? 'alta',
        owner: normalizeTitle(input.taskOwner) ?? actor,
        description: notes,
      },
    };
  }

  if (triageItem.suggestedAction === 'criar_tarefa') {
    const taskTitle = normalizeTitle(input.taskTitle) ?? normalizeTitle(triageItem.event?.title) ?? `Ação derivada da triagem #${triageItem.id}`;
    return {
      commandType: 'create_task',
      dedupeKey: `${publicationRef}|process:${triageItem.processId}|task`,
      correlationId: publicationRef,
      publicationId,
      triageItemId: triageItem.id,
      processId: triageItem.processId,
      clientId: triageItem.clientId,
      derivedActions: [
        {
          entityType: 'task',
          entityId: triageItem.id,
          correlationId: publicationRef,
          sourceType: 'publication',
          sourceReference: triageItem.capture.sourceReference ?? publicationRef,
          originStage: 'gerou_tarefa',
          status: 'planned',
          title: taskTitle,
          summary: notes,
          url: null,
          createdAt: now.toISOString(),
        },
      ],
      fallbacks: [],
      deadline: {
        title: null,
        dueDate: null,
        priority: null,
        notes: null,
      },
      task: {
        title: taskTitle,
        dueDate: normalizeTitle(input.taskDueDate) ?? toIsoDate(addDays(now, 1)),
        priority: normalizeTitle(input.taskPriority) ?? (triageItem.queueType === 'critica' ? 'alta' : 'media'),
        owner: normalizeTitle(input.taskOwner) ?? actor,
        description: notes,
      },
    };
  }

  return buildNoneCommand(triageItem, 'unsupported_action');
}

export function applyAutomationDedupe(
  command: AutomationCommand,
  existingDedupeKeys: ReadonlySet<string>,
) {
  if (!command.dedupeKey) return command;
  if (!existingDedupeKeys.has(command.dedupeKey)) return command;
  return {
    ...command,
    commandType: 'none' as const,
    skipReason: 'duplicate_dedupe_key' as const,
    derivedActions: [],
    fallbacks: [buildFallback('duplicate_dedupe_key')],
  };
}
