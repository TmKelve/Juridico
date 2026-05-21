export const PUBLICATION_SCHEDULE_HOURS = [6, 12, 18] as const;

export type PublicationSchedulerPlan = {
  enabled: boolean;
  firstRunAt: Date | null;
  initialDelayMs: number | null;
};

export type PublicationSchedulerOptions = {
  disabled?: boolean;
  now?: Date;
  minDelayMs?: number;
  computeNextRunAt?: (from: Date) => Date;
  onTick: () => Promise<void> | void;
  setTimeoutImpl?: (callback: () => void, delayMs: number) => unknown;
  clearTimeoutImpl?: (handle: unknown) => void;
  onError?: (error: unknown) => void;
};

function normalizeDelay(delayMs: number, minDelayMs: number) {
  return Math.max(minDelayMs, delayMs);
}

export function computeNextPublicationSchedule(
  from = new Date(),
  scheduledHours: readonly number[] = PUBLICATION_SCHEDULE_HOURS,
) {
  const next = new Date(from);
  const currentHour = from.getHours();
  const currentMinute = from.getMinutes();

  const nextHour = scheduledHours.find((hour) => hour > currentHour || (hour === currentHour && currentMinute === 0));
  if (typeof nextHour === 'number') {
    next.setHours(nextHour, 0, 0, 0);
    if (next <= from) {
      next.setHours(nextHour + 6, 0, 0, 0);
    }
    return next;
  }

  next.setDate(next.getDate() + 1);
  next.setHours(scheduledHours[0] ?? 6, 0, 0, 0);
  return next;
}

export function createPublicationSchedulerPlan(input?: {
  disabled?: boolean;
  now?: Date;
  minDelayMs?: number;
}) {
  const now = input?.now ?? new Date();
  const minDelayMs = input?.minDelayMs ?? 60_000;

  if (input?.disabled) {
    return {
      enabled: false,
      firstRunAt: null,
      initialDelayMs: null,
    } satisfies PublicationSchedulerPlan;
  }

  const firstRunAt = computeNextPublicationSchedule(now);
  return {
    enabled: true,
    firstRunAt,
    initialDelayMs: normalizeDelay(firstRunAt.getTime() - now.getTime(), minDelayMs),
  } satisfies PublicationSchedulerPlan;
}

export function createPublicationScheduler(options: PublicationSchedulerOptions) {
  const setTimeoutImpl = options.setTimeoutImpl ?? setTimeout;
  const clearTimeoutImpl = options.clearTimeoutImpl ?? ((handle: unknown) => clearTimeout(handle as Parameters<typeof clearTimeout>[0]));
  const minDelayMs = options.minDelayMs ?? 60_000;
  const computeNextRunAt = options.computeNextRunAt ?? computeNextPublicationSchedule;
  let timerHandle: unknown = null;
  let stopped = false;

  const scheduleNext = (referenceTime: Date) => {
    const nextRunAt = computeNextRunAt(referenceTime);
    const delayMs = normalizeDelay(nextRunAt.getTime() - referenceTime.getTime(), minDelayMs);
    timerHandle = setTimeoutImpl(run, delayMs);
    return { nextRunAt, delayMs };
  };

  const run = async () => {
    if (stopped) return;

    try {
      await options.onTick();
    } catch (error) {
      options.onError?.(error);
    } finally {
      scheduleNext(new Date(Date.now() + minDelayMs));
    }
  };

  return {
    start(now = options.now ?? new Date()) {
      if (options.disabled) {
        return createPublicationSchedulerPlan({ disabled: true, now, minDelayMs });
      }

      stopped = false;
      return createPublicationSchedulerPlan({
        disabled: false,
        now,
        minDelayMs,
      });
    },
    arm(now = options.now ?? new Date()) {
      if (options.disabled) {
        return createPublicationSchedulerPlan({ disabled: true, now, minDelayMs });
      }

      stopped = false;
      const plan = createPublicationSchedulerPlan({ disabled: false, now, minDelayMs });
      timerHandle = setTimeoutImpl(run, plan.initialDelayMs ?? minDelayMs);
      return plan;
    },
    stop() {
      stopped = true;
      if (timerHandle != null) {
        clearTimeoutImpl(timerHandle);
        timerHandle = null;
      }
    },
    scheduleNext,
  };
}
