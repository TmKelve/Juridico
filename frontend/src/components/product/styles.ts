import type { CSSProperties } from 'react'

/** Classes Tailwind estruturais (shape + border width). Cores via productSurfaceStyle. */
export const productSurfaceBase = 'rounded-lg border'

/** Cores do card surface usando tokens canônicos. Usar junto com productSurfaceBase. */
export const productSurfaceStyle: CSSProperties = {
  backgroundColor: 'var(--bg-surface)',
  borderColor: 'var(--border-default)',
}
