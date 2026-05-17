import type { LucideIcon } from 'lucide-react';

export type QueueFilter = 'todos' | 'hoje' | 'atrasados' | 'amanha';

export interface DashboardKpi {
  id: string;
  title: string;
  value: string | number;
  microtext: string;
  icon: LucideIcon;
  color: 'primary' | 'success' | 'warning' | 'error' | 'info';
}

export interface ResponsibilityItem {
  id: number | string;
  title: string;
  client: string;
  phase: string;
  owner: string;
  status: string;
  type: 'hoje' | 'atrasados' | 'amanha';
  sla: string;
  pendingSummary: string;
}

export interface AgendaItem {
  id: string;
  hour: string;
  label: string;
  context: string;
  type?: 'audiencia' | 'reuniao' | 'prazo' | 'tarefa';
}

export interface MovementItem {
  id: string;
  title: string;
  detail: string;
}

export interface AlertItem {
  id: string;
  type: 'warning' | 'info';
  text: string;
}

export interface ChartSeries {
  label: string;
  value: number;
  color: string;
}
