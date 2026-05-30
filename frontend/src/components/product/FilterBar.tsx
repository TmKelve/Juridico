import type { HTMLAttributes, ReactNode } from 'react'

import { Search } from 'lucide-react'

import { Button } from '@/components/ui'
import { cn } from '@/lib/cn'
import { productSurfaceBase, productSurfaceStyle } from './styles'

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
  style,
  children,
  ...props
}: FilterBarProps) {
  return (
    <div
      className={cn(productSurfaceBase, 'flex flex-wrap items-center gap-3 p-3', className)}
      style={{ ...productSurfaceStyle, ...style }}
      {...props}
    >
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
