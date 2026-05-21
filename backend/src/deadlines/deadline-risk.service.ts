import type { DeadlineRiskEvaluation, DeadlineRiskInput, DeadlineRiskLevel, DeadlineRiskReason } from './deadline-risk.types';

function buildReason(code: DeadlineRiskReason['code'], weight: number, message: string): DeadlineRiskReason {
  return { code, weight, message };
}

function mapLevel(score: number): DeadlineRiskLevel {
  if (score >= 80) return 'critico';
  if (score >= 45) return 'atencao';
  if (score >= 15) return 'normal';
  return 'baixo';
}

function differenceInHours(now: Date, dueDate: string) {
  const dueAt = new Date(`${dueDate}T00:00:00.000Z`);
  return (dueAt.getTime() - now.getTime()) / 3600000;
}

export class DeadlineRiskService {
  evaluate(input: DeadlineRiskInput, options: { now?: Date } = {}): DeadlineRiskEvaluation {
    const now = options.now ?? new Date();

    if (input.completedAt || input.status === 'concluido') {
      return {
        level: 'baixo',
        score: 0,
        reasons: [buildReason('COMPLETED', 0, 'Prazo já concluído.')],
        computedAt: now.toISOString(),
      };
    }

    const reasons: DeadlineRiskReason[] = [];
    const hoursUntilDue = differenceInHours(now, input.dueDate);

    if (hoursUntilDue < 0) {
      reasons.push(buildReason('OVERDUE', 70, 'Prazo vencido.'));
    } else if (hoursUntilDue <= 24) {
      reasons.push(buildReason('DUE_IN_24H', 55, 'Prazo vence em até 24 horas.'));
    } else if (hoursUntilDue <= 72) {
      reasons.push(buildReason('DUE_IN_72H', 35, 'Prazo vence em até 72 horas.'));
    }

    if (input.origin === 'publicacao' || input.publicationId) {
      reasons.push(buildReason('PUBLICATION_ORIGIN', 15, 'Prazo originado de publicação.'));
    }

    if (input.priority === 'critica') {
      reasons.push(buildReason('CRITICAL_PRIORITY', 15, 'Prazo com prioridade crítica.'));
    } else if (input.priority === 'alta') {
      reasons.push(buildReason('HIGH_PRIORITY', 10, 'Prazo com prioridade alta.'));
    }

    if (input.processPhase?.toLowerCase() === 'recursal') {
      reasons.push(buildReason('RECURSAL_PHASE', 10, 'Prazo em fase recursal.'));
    }

    if (!input.agendaEventId || input.agendaSyncStatus === 'missing') {
      reasons.push(buildReason('NO_AGENDA_EVENT', 15, 'Prazo sem evento de agenda vinculado.'));
    } else if (input.agendaSyncStatus === 'failed') {
      reasons.push(buildReason('AGENDA_SYNC_FAILED', 20, 'Falha de sincronização com agenda.'));
    } else if (input.agendaSyncStatus === 'retrying') {
      reasons.push(buildReason('AGENDA_SYNC_RETRYING', 10, 'Sincronização com agenda em retry.'));
    }

    const score = Math.min(100, reasons.reduce((total, reason) => total + reason.weight, 0));

    return {
      level: mapLevel(score),
      score,
      reasons,
      computedAt: now.toISOString(),
    };
  }
}
