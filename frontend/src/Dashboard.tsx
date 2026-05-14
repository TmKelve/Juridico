import { DashboardContainer } from './dashboard/containers/DashboardContainer';
import './Dashboard.css';

interface DashboardProps {
  user: { id: number; email: string; role: string };
}

export function Dashboard({ user }: DashboardProps) {
  return <DashboardContainer user={user} />;
}
