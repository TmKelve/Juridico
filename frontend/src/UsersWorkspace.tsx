import { ShieldCheck, UsersRound } from 'lucide-react';
import type { ApiUser } from './api';
import { PermissionsMatrix, type PermissionDecisionView } from './components/permissions/PermissionsMatrix';
import { TeamAssignmentsPanel, type TeamSummary } from './components/team/TeamAssignmentsPanel';
import './UsersWorkspace.css';

export interface UsersWorkspaceGap {
  id: string;
  title: string;
  description: string;
  dependency: string;
}

export interface UsersWorkspaceProps {
  users: ApiUser[];
  permissions?: string[];
  teams?: TeamSummary[];
  permissionMatrix?: PermissionDecisionView[];
  gaps?: UsersWorkspaceGap[];
}

function roleLabel(role: string) {
  const labels = {
    ADM: 'Administrador',
    ADV: 'Advogado',
    ATD: 'Atendimento',
    FIN: 'Financeiro',
  } as const;

  return labels[role as keyof typeof labels] || role;
}

function buildFallbackPermissionMatrix(permissions: string[]): PermissionDecisionView[] {
  if (!permissions.length) {
    return [
      {
        key: 'users:manage',
        label: 'Gerenciar usuarios',
        allowed: false,
        scope: 'denied',
        sensitive: true,
        source: 'pending-authz-route',
        reason: 'A rota atual ainda nao publicou decisoes estruturadas de authz.',
      },
    ];
  }

  return permissions.map((permission) => ({
    key: permission,
    label: permission.replace(':', ' · '),
    allowed: true,
    scope: permission.includes('manage') ? 'global' : permission.includes('attendance') ? 'team' : 'own',
    sensitive: permission.includes('manage') || permission.includes('permission'),
    source: 'legacy-permission-list',
    reason: 'Permissao recebida da rota atual sem metadata adicional de escopo.',
  }));
}

export function UsersWorkspace({
  users,
  permissions = [],
  teams = [],
  permissionMatrix,
  gaps = [],
}: UsersWorkspaceProps) {
  const computedPermissionMatrix = permissionMatrix?.length ? permissionMatrix : buildFallbackPermissionMatrix(permissions);
  const activeUsers = users.length;
  const adminCount = users.filter((user) => user.role === 'ADM').length;
  const teamCount = teams.length;
  const sensitivePermissionCount = computedPermissionMatrix.filter((item) => item.sensitive).length;

  return (
    <div className="users-workspace">
      <section className="users-hero">
        <div className="users-hero-copy">
          <p className="users-eyebrow">Administracao operacional</p>
          <h2>Usuarios, equipe e permissoes com foco em ownership e bloqueio seguro.</h2>
          <p>
            Esta base prepara a extracao da tela administrativa sem depender da costura final em
            `App.tsx` e nas rotas compartilhadas do orquestrador.
          </p>
        </div>

        <div className="users-kpi-grid" aria-label="Indicadores administrativos">
          <article className="users-kpi-card">
            <p>Usuarios ativos</p>
            <strong>{activeUsers}</strong>
            <small>Fonte atual: `GET /users`</small>
          </article>
          <article className="users-kpi-card">
            <p>Perfis ADM</p>
            <strong>{adminCount}</strong>
            <small>Gate visual minimo de `/usuarios`</small>
          </article>
          <article className="users-kpi-card">
            <p>Equipes materializadas</p>
            <strong>{teamCount}</strong>
            <small>Depende de ownership/portfolio no backend</small>
          </article>
          <article className="users-kpi-card">
            <p>Permissoes sensiveis</p>
            <strong>{sensitivePermissionCount}</strong>
            <small>Exigir auditoria e deny-by-default</small>
          </article>
        </div>
      </section>

      <div className="users-grid">
        <section className="users-card">
          <div className="users-card-head">
            <div>
              <p className="users-card-kicker">Usuarios</p>
              <h3>Base administrativa atual</h3>
            </div>
          </div>

          <table className="users-list" aria-label="Lista de usuarios">
            <thead>
              <tr>
                <th>ID</th>
                <th>Usuario</th>
                <th>Perfil</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td>
                    <strong>{user.email}</strong>
                  </td>
                  <td>
                    <span className="users-role-badge">{roleLabel(user.role)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!users.length ? (
            <p className="users-card-empty">Nenhum usuario retornado pela rota atual.</p>
          ) : null}
        </section>

        <div className="users-gap-grid">
          <article className="users-gap-card">
            <div className="users-card-head">
              <div>
                <p className="users-card-kicker">Seguranca</p>
                <h3>Contrato de bloqueio</h3>
              </div>
              <ShieldCheck size={18} />
            </div>
            <p>`ADV` e outros perfis nao administrativos devem ser redirecionados ao tentar abrir `/usuarios`.</p>
          </article>

          <article className="users-gap-card">
            <div className="users-card-head">
              <div>
                <p className="users-card-kicker">Equipe</p>
                <h3>Dependencia de ownership</h3>
              </div>
              <UsersRound size={18} />
            </div>
            <p>Portfolio, backup owner e distribuicao por equipe aguardam rota compartilhada do epic IJ.</p>
          </article>

          {gaps.map((gap) => (
            <article key={gap.id} className="users-gap-card">
              <strong>{gap.title}</strong>
              <p>{gap.description}</p>
              <small>Dependencia: {gap.dependency}</small>
            </article>
          ))}
        </div>
      </div>

      <TeamAssignmentsPanel teams={teams} />
      <PermissionsMatrix items={computedPermissionMatrix} />
    </div>
  );
}
