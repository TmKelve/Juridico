import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../api';
import { trackEvent, trackPageView } from '../../monitoring';
import type { ApiProcess } from '../../api';
import type { ResponsibilityItem } from '../types';

interface UseDashboardHomeDataResult {
  profile: string;
  items: ResponsibilityItem[];
  loading: boolean;
  error: string;
  reload: () => Promise<void>;
}

export function useDashboardHomeData(role: string, userId: number, userEmail: string): UseDashboardHomeDataResult {
  const [profile, setProfile] = useState(role);
  const [items, setItems] = useState<ResponsibilityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [homeRes, processesRes] = await Promise.all([api.getHome(), api.getProcesses()]);

      if (homeRes.status === 200) {
        setProfile(homeRes.data.profile);
      }

      if (processesRes.status === 200) {
        const processes = Array.isArray(processesRes.data) ? processesRes.data : [];
        const advScoped = processes.filter((process: ApiProcess) => {
          const ownerEmail = String(process.owner?.email || '').toLowerCase();
          return process.ownerId === userId || ownerEmail === userEmail.toLowerCase();
        });

        const scopedProcesses = role === 'ADV'
          ? (advScoped.length > 0 ? advScoped : processes)
          : processes;

        const mappedItems: ResponsibilityItem[] = scopedProcesses.slice(0, 12).map((p: ApiProcess, index: number) => {
          const normalizedStatus = String(p.status || '').toLowerCase();
          const type = normalizedStatus === 'pausado' ? 'atrasados' : index < 4 ? 'hoje' : 'amanha';
          const pendingSummary = normalizedStatus === 'pausado'
            ? 'Doc. complementar + validação interna'
            : normalizedStatus === 'ativo'
              ? 'Aguardando manifestação da parte'
              : 'Sem pendências críticas';

          return {
            id: p.id,
            title: p.title,
            client: p.client,
            phase: p.phase || 'Sem fase',
            owner: p.owner?.email?.split('@')[0] || 'Equipe Lexora',
            status: p.status || 'ativo',
            type,
            sla: type === 'atrasados' ? 'Vencido' : type === 'hoje' ? 'Hoje' : 'Amanhã',
            pendingSummary,
          };
        });

        setItems(mappedItems);
      }

      trackEvent('dashboard_home_loaded', { role, scope: role === 'ADV' ? 'mine' : 'all' });
    } catch (err) {
      setError('Erro ao carregar dashboard');
      trackEvent('dashboard_home_error', { error: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }, [role, userId, userEmail]);

  useEffect(() => {
    trackPageView('dashboard', { role, scope: role === 'ADV' ? 'mine' : 'all' });
    reload();
  }, [reload, role]);

  return useMemo(() => ({ profile, items, loading, error, reload }), [profile, items, loading, error, reload]);
}
