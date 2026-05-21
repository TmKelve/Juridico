import { computeNextFinanceCollectionsSchedule } from './finance-collections-schedule';

export function registerFinanceSchedulers(input: {
  disabled?: boolean;
  collections: { onTick: () => Promise<void> };
}) {
  const timers: NodeJS.Timeout[] = [];

  return {
    armAll(base = new Date()) {
      const nextRun = computeNextFinanceCollectionsSchedule(base);
      if (!input.disabled) {
        const delay = Math.max(0, nextRun.getTime() - Date.now());
        timers.push(setTimeout(() => {
          void input.collections.onTick();
        }, delay));
      }

      return {
        collections: {
          enabled: !input.disabled,
          nextRunAt: nextRun.toISOString(),
        },
      };
    },
    stopAll() {
      while (timers.length) {
        const timer = timers.pop();
        if (timer) clearTimeout(timer);
      }
    },
  };
}
