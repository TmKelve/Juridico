import { useMemo } from 'react';
import type { AgendaItem, AlertItem, MovementItem, ResponsibilityItem } from '../types';

export function useContextFeed(items: ResponsibilityItem[]) {
  const agenda = useMemo<AgendaItem[]>(() => {
    return [
      { id: 'a1', hour: '09:30', label: 'Audiência de instrução', context: '3ª Vara Cível' },
      { id: 'a2', hour: '11:00', label: 'Reunião com cliente', context: 'Contrato empresarial' },
      { id: 'a3', hour: '15:30', label: 'Prazo de manifestação', context: 'Processo #1029475' },
    ];
  }, []);

  const movements = useMemo<MovementItem[]>(() => {
    return items.slice(0, 4).map((item) => ({
      id: String(item.id),
      title: item.title,
      detail: `Atualização em ${item.phase}`,
    }));
  }, [items]);

  const alerts = useMemo<AlertItem[]>(() => {
    return [
      { id: 'al1', type: 'warning', text: `${items.filter((item) => item.status === 'pausado').length} processo(s) com bloqueio crítico` },
      { id: 'al2', type: 'info', text: `${items.filter((item) => item.status === 'ativo').length} processo(s) próximos de prazo` },
    ];
  }, [items]);

  return { agenda, movements, alerts };
}
