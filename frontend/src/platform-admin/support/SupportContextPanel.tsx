import type { SupportContextItem } from './types'

interface PlatformAdminSupportPanelProps {
  contexts: SupportContextItem[]
}

export function PlatformAdminSupportPanel({ contexts }: PlatformAdminSupportPanelProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <header className="mb-3">
        <h2 className="text-sm font-semibold text-slate-900">Suporte Contextual (Read-only)</h2>
        <p className="text-xs text-slate-500">Consulta rápida para operação, sem ações destrutivas.</p>
      </header>
      <ul className="space-y-2">
        {contexts.map((item) => (
          <li key={item.id} className="rounded-lg border border-slate-200 px-3 py-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                <p className="text-xs text-slate-600">Owner: {item.owner}</p>
              </div>
              <span className="text-xs text-slate-500">{item.updatedAtLabel}</span>
            </div>
            <p className="mt-1 text-sm text-slate-700">{item.description}</p>
            <a className="mt-2 inline-block text-xs font-semibold text-sky-700 hover:text-sky-800" href={item.link}>
              Abrir referência
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
