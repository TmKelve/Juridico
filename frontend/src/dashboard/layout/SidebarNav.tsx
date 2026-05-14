import type { ReactNode } from 'react';

interface SidebarNavProps {
  children: ReactNode;
}

export function SidebarNav({ children }: SidebarNavProps) {
  return <aside className="shell-sidebar">{children}</aside>;
}
