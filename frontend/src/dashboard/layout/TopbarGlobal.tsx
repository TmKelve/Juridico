import type { ReactNode } from 'react';

interface TopbarGlobalProps {
  children: ReactNode;
}

export function TopbarGlobal({ children }: TopbarGlobalProps) {
  return <div className="shell-topbar">{children}</div>;
}
