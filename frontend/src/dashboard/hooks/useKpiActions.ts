import { useMemo } from 'react';
import { trackEvent } from '../../monitoring';

export function useKpiActions() {
  return useMemo(() => {
    return {
      onKpiClick: (kpiId: string) => trackEvent('kpi_click', { kpi: kpiId }),
      onShortcutClick: (action: string) => trackEvent('shortcut_click', { action }),
      onQueueOpen: (id: string | number) => trackEvent('queue_row_open', { id }),
    };
  }, []);
}
