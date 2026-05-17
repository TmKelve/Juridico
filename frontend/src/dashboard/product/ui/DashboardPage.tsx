import { DashboardContainer } from '../../containers/DashboardContainer';
import '../../../Dashboard.css';

interface DashboardPageProps {
  user: { id: number; email: string; role: string };
}

export function DashboardPage({ user }: DashboardPageProps) {
  return <DashboardContainer user={user} />;
}
