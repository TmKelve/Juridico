import { Search } from 'lucide-react'

interface TopbarSearchProps {
  placeholder?: string
}

export function TopbarSearch({ placeholder = 'Buscar...' }: TopbarSearchProps) {
  return (
    <label className="hidden h-9 w-full max-w-[23.75rem] items-center gap-2 rounded-full border border-transparent bg-slate-100 px-3 transition-colors hover:bg-slate-200 focus-within:border-blue-400 focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(59,130,246,0.14)] md:inline-flex" aria-label="Busca global">
      <Search size={15} className="shrink-0 text-slate-400" aria-hidden="true" />
      <input
        type="search"
        placeholder={placeholder}
        aria-label="Buscar processo, cliente, tarefa ou responsável"
        className="min-h-0 w-full border-none bg-transparent p-0 text-sm text-slate-900 outline-none placeholder:text-slate-400"
      />
    </label>
  )
}
