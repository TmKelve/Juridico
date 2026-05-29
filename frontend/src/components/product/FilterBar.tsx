import type { HTMLAttributes, ReactNode } from 'react'

import { Search } from 'lucide-react'

import { Button } from '@/components/ui'
import { cn } from '@/lib/cn'

interface FilterBarProps extends HTMLAttributes<HTMLDivElement> {
  searchPlaceholder?: string
  searchValue?: string
  searchId?: string
  searchAriaLabel?: string
  onSearchChange?: (value: string) => void
  actions?: ReactNode
}

export function FilterBar({
  searchPlaceholder = 'Buscar...',
  searchValue,
  searchId,
  searchAriaLabel,
  onSearchChange,
  actions,
  className,
  children,
  ...props
}: FilterBarProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-3',
        className,
      )}
      {...props}
    >
      {/* Search: flex-row pattern — icon sibling, no padding-left override needed */}
      <div className="filterbar-search-wrap">
        <Search className="filterbar-search-icon" aria-hidden="true" />
        <input
          id={searchId}
          className="filterbar-search-input"
          type="search"
          placeholder={searchPlaceholder}
          value={searchValue}
          aria-label={searchAriaLabel}
          onChange={(event) => onSearchChange?.(event.target.value)}
        />
      </div>
      {children}
      {actions ? <div className="ml-auto flex items-center gap-2">{actions}</div> : null}
      {!children && !actions ? (
        <Button variant="outline" size="sm">
          Limpar
        </Button>
      ) : null}
    </div>
  )
}
