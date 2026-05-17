interface SidebarBrandProps {
  isCollapsed?: boolean
}

export function SidebarBrand({ isCollapsed }: SidebarBrandProps) {
  return (
    <div className="mb-6 flex items-center justify-center overflow-hidden px-2" aria-label="Lexora">
      <img
        src="/lexora-logo.svg"
        alt="Lexora"
        className={`h-8 w-auto max-w-[150px] brightness-0 invert ${isCollapsed ? 'md:hidden' : 'block'}`}
      />
      <img
        src="/lexora-logo.svg"
        alt=""
        aria-hidden="true"
        className={`h-8 w-8 brightness-0 invert [object-fit:none] [object-position:left_center] ${isCollapsed ? 'hidden md:block' : 'hidden'}`}
      />
    </div>
  )
}
