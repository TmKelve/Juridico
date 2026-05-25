import { AlertTriangle, CheckCircle2, LockKeyhole, ShieldAlert } from 'lucide-react';

export interface PermissionDecisionView {
  key: string;
  label: string;
  allowed: boolean;
  scope: 'own' | 'team' | 'portfolio' | 'global' | 'denied';
  sensitive?: boolean;
  source?: string;
  reason?: string;
}

export interface PermissionsMatrixProps {
  items: PermissionDecisionView[];
}

const SCOPE_LABEL: Record<PermissionDecisionView['scope'], string> = {
  own: 'Proprio',
  team: 'Equipe',
  portfolio: 'Carteira',
  global: 'Global',
  denied: 'Negado',
};

export function PermissionsMatrix({ items }: PermissionsMatrixProps) {
  return (
    <section className="users-card">
      <div className="users-card-head">
        <div>
          <p className="users-card-kicker">Permissoes</p>
          <h3>Matriz operacional</h3>
        </div>
      </div>

      <div className="users-permissions-list">
        {items.map((item) => (
          <article key={item.key} className={`users-permission-row${item.allowed ? '' : ' users-permission-row--blocked'}`}>
            <div className="users-permission-main">
              <div className="users-permission-titleline">
                {item.allowed ? <CheckCircle2 size={15} /> : <LockKeyhole size={15} />}
                <strong>{item.label}</strong>
                <span className={`users-scope users-scope--${item.scope}`}>{SCOPE_LABEL[item.scope]}</span>
                {item.sensitive ? <span className="users-sensitive"><ShieldAlert size={13} /> Sensivel</span> : null}
              </div>
              <p>{item.reason || 'Sem justificativa enriquecida publicada pela policy atual.'}</p>
            </div>
            <div className="users-permission-side">
              <code>{item.key}</code>
              <small>{item.source || 'legacy-permission-list'}</small>
            </div>
          </article>
        ))}
      </div>

      {!items.length && (
        <div className="users-card-empty users-card-empty--warning">
          <AlertTriangle size={16} />
          <span>Nenhuma permissao publicada pela rota atual.</span>
        </div>
      )}
    </section>
  );
}
