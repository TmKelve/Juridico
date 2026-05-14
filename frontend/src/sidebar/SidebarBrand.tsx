interface SidebarBrandProps {
  isCollapsed?: boolean
}

export function SidebarBrand({ isCollapsed }: SidebarBrandProps) {
  return (
    <div className={`sidebar-brand${isCollapsed ? ' is-collapsed' : ''}`} aria-label="Lexora">
      <img
        src="/lexora-logo.svg"
        alt="Lexora"
        className="sidebar-brand-wordmark"
      />
      <img
        src="/lexora-logo.svg"
        alt=""
        aria-hidden="true"
        className="sidebar-brand-icon"
      />
    </div>
  )
}
