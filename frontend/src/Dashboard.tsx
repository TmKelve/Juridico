import { DashboardPage } from './dashboard/product/ui/DashboardPage';

interface DashboardProps {
  user: { id: number; email: string; role: string };
}

export function Dashboard({ user }: DashboardProps) {
  return <DashboardPage user={user} />;
}
