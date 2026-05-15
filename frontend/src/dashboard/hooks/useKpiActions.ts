import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { trackEvent } from '../../monitoring';

export function useKpiActions() {
  const navigate = useNavigate();

  return useMemo(() => {
    return {
      onKpiClick: (kpiId: string) => {
        trackEvent('kpi_click', { kpi: kpiId });

        if (kpiId === 'kpi-deadlines') navigate('/prazos');
        if (kpiId === 'kpi-tasks') navigate('/tarefas');
        if (kpiId === 'kpi-return') navigate('/atendimentos');
      },
      onShortcutClick: (action: string) => {
        trackEvent('shortcut_click', { action });

        if (action === 'nova_tarefa') navigate('/tarefas');
        if (action === 'ver_agenda') navigate('/agenda');
        if (action === 'ver_prazos') navigate('/prazos');
        if (action === 'ver_processos') navigate('/processos');
      },
      onQueueOpen: (id: string | number) => trackEvent('queue_row_open', { id }),
    };
  }, [navigate]);
}
