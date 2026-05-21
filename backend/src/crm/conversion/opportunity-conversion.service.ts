import { CrmContractError } from '../opportunities/crm-opportunity.types';
import {
  assertOpportunityReadyForConversion,
  getResponsibleLabel,
  resolveOpportunitySummary,
} from '../opportunities/crm-opportunity.utils';
import type {
  CrmClientRecord,
  CrmProcessRecord,
} from '../opportunities/crm-opportunity.types';
import type {
  OpportunityConversionCommand,
  OpportunityConversionRepository,
  OpportunityConversionResult,
} from './opportunity-conversion.types';

export class CrmOpportunityConversionService {
  constructor(private readonly repository: OpportunityConversionRepository) {}

  async execute(command: OpportunityConversionCommand): Promise<OpportunityConversionResult> {
    const opportunity = await this.repository.findOpportunityById(command.opportunityId);
    if (!opportunity) {
      throw new CrmContractError('CRM_OPPORTUNITY_NOT_FOUND', 404, 'Oportunidade não encontrada.');
    }

    if (opportunity.convertedProcessId) {
      const linkedProcess = await this.repository.findProcessById(opportunity.convertedProcessId);
      return {
        outcome: 'already_converted',
        opportunity,
        process: linkedProcess,
        client: opportunity.clientRecord ?? null,
        idempotent: true,
      };
    }

    assertOpportunityReadyForConversion(opportunity);

    if (command.processNumber) {
      const existingProcess = await this.repository.findProcessByNumber(command.processNumber);
      if (existingProcess) {
        throw new CrmContractError(
          'CRM_PROCESS_NUMBER_ALREADY_EXISTS',
          409,
          'Esse numero de processo ja esta cadastrado na carteira.',
          {
            processId: existingProcess.id,
            processNumber: command.processNumber,
          },
        );
      }
    }

    const client = await this.resolveClient(command, opportunity.cpf ?? null);
    const conversion = await this.repository.runInTransaction(async (tx) => {
      const process = await tx.createProcess({
        title: command.processTitle,
        processNumber: command.processNumber,
        client: client.name,
        clientId: client.id,
        phase: command.processPhase,
        status: command.processStatus,
        ownerId: command.actor.sub,
      });

      const updatedOpportunity = await tx.updateOpportunityAfterConversion({
        opportunityId: opportunity.id,
        clientId: client.id,
        convertedProcessId: process.id,
        personName: client.name,
        status: 'ganha',
        summary: resolveOpportunitySummary(opportunity.summary, command.summary),
        contactEvent: {
          kind: 'conversao',
          summary: `Convertida em cliente e processo #${process.id}.`,
          createdBy: command.actor.email,
          createdAt: new Date(),
        },
      });

      return {
        opportunity: updatedOpportunity,
        process,
      };
    });

    return {
      outcome: 'converted',
      opportunity: conversion.opportunity,
      process: conversion.process,
      client,
      idempotent: false,
    };
  }

  private async resolveClient(command: OpportunityConversionCommand, cpf: string | null): Promise<CrmClientRecord> {
    if (command.clientId) {
      const explicitClient = await this.repository.findClientById(command.clientId);
      if (!explicitClient) {
        throw new CrmContractError('CRM_CLIENT_NOT_FOUND', 404, 'Cliente informado não encontrado.', {
          clientId: command.clientId,
        });
      }

      return this.updateClientForConversion(explicitClient, command, cpf);
    }

    if (cpf) {
      const clientByCpf = await this.repository.findClientByCpfCnpj(cpf);
      if (clientByCpf) {
        return this.updateClientForConversion(clientByCpf, command, cpf);
      }
    }

    const clientByName = await this.repository.findClientByName(command.clientName);
    if (clientByName) {
      return this.updateClientForConversion(clientByName, command, cpf);
    }

    return this.repository.createClient({
      name: command.clientName,
      type: 'PF',
      cpfCnpj: cpf,
      status: 'ativo',
      legalArea: command.processPhase,
      responsible: getResponsibleLabel(command.actor.email),
      notes: 'Cliente criado a partir da conversão de oportunidade do CRM Jurídico.',
    });
  }

  private async updateClientForConversion(
    client: CrmClientRecord,
    command: OpportunityConversionCommand,
    cpf: string | null,
  ) {
    return this.repository.updateClient(client.id, {
      cpfCnpj: cpf || client.cpfCnpj || null,
      legalArea: command.processPhase || client.legalArea || null,
      responsible: getResponsibleLabel(command.actor.email) || client.responsible || null,
      status: client.status || 'ativo',
    });
  }
}
