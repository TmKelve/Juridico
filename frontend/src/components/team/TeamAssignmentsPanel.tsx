import { BriefcaseBusiness, LifeBuoy, UsersRound } from 'lucide-react';
import type { ApiUser } from '../../api';

export interface TeamSummary {
  id: string;
  name: string;
  coverage: string;
  primaryOwner: string;
  backupOwner?: string | null;
  members: ApiUser[];
  openTasks: number;
  pendingAttendances: number;
  active: boolean;
}

export interface TeamAssignmentsPanelProps {
  teams: TeamSummary[];
}

export function TeamAssignmentsPanel({ teams }: TeamAssignmentsPanelProps) {
  if (!teams.length) {
    return (
      <section className="users-card">
        <div className="users-card-head">
          <div>
            <p className="users-card-kicker">Equipe</p>
            <h3>Sem equipe materializada</h3>
          </div>
        </div>
        <p className="users-card-empty">
          A costura de ownership ainda nao publicou portfolios e membros da equipe nesta rota.
        </p>
      </section>
    );
  }

  return (
    <section className="users-card">
      <div className="users-card-head">
        <div>
          <p className="users-card-kicker">Equipe</p>
          <h3>Distribuicao operacional</h3>
        </div>
      </div>

      <div className="users-team-grid">
        {teams.map((team) => (
          <article key={team.id} className={`users-team-card${team.active ? '' : ' users-team-card--inactive'}`}>
            <div className="users-team-topline">
              <strong>{team.name}</strong>
              <span>{team.coverage}</span>
            </div>
            <div className="users-team-meta">
              <span><BriefcaseBusiness size={14} /> Owner: {team.primaryOwner}</span>
              <span><LifeBuoy size={14} /> Backup: {team.backupOwner || 'Nao definido'}</span>
              <span><UsersRound size={14} /> {team.members.length} membro(s)</span>
            </div>
            <div className="users-team-kpis">
              <div>
                <small>Tarefas abertas</small>
                <strong>{team.openTasks}</strong>
              </div>
              <div>
                <small>Atendimentos pendentes</small>
                <strong>{team.pendingAttendances}</strong>
              </div>
            </div>
            <ul className="users-team-members">
              {team.members.map((member) => (
                <li key={member.id}>
                  <span>{member.email}</span>
                  <strong>{member.role}</strong>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
