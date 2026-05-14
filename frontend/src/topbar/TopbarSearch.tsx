import { Search } from 'lucide-react'

interface TopbarSearchProps {
  placeholder?: string
}

export function TopbarSearch({ placeholder = 'Buscar...' }: TopbarSearchProps) {
  return (
    <label className="topbar-search" aria-label="Busca global">
      <Search size={15} className="topbar-search-icon" aria-hidden="true" />
      <input
        type="search"
        placeholder={placeholder}
        aria-label="Buscar processo, cliente, tarefa ou responsável"
      />
    </label>
  )
}
