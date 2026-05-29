interface SidebarBrandProps {
  isCollapsed?: boolean
}

export function SidebarBrand({ isCollapsed }: SidebarBrandProps) {
  return (
    <div className="mb-6 flex h-10 w-full shrink-0 items-center justify-center px-2" aria-label="Lexora">
      <img
        src="/lexora_logo_white.svg"
        alt="Lexora"
        className={`h-8 w-32 shrink-0 object-contain ${isCollapsed ? 'hidden' : 'block'}`}
      />
      <img
        src="/lexora_icon_white.svg"
        alt="Lexora"
        aria-hidden="true"
        className={`h-8 w-8 shrink-0 object-contain ${isCollapsed ? 'block' : 'hidden'}`}
      />
    </div>
  )
}
