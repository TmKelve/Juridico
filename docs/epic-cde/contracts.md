# Contratos do Epic CDE

## Fonte de verdade atual
- `backend/src/crm/conversion/opportunity-conversion.service.ts`
- `backend/src/crm/conversion/opportunity-conversion.validators.ts`
- `backend/src/crm/process-link/link-process.service.ts`
- `backend/src/crm/documents/opportunity-documents.service.ts`
- `backend/src/crm/contact-history/opportunity-contact-history.service.ts`
- `backend/src/publications/deadline-automation/create-from-publication.service.ts`
- `backend/src/publications/deadline-automation/create-from-publication.validators.ts`
- `backend/src/deadlines/batch-actions/deadline-bulk-action.service.ts`
- `backend/src/deadlines/deadline-risk.service.ts`
- `backend/src/main.ts`
- `frontend/src/CrmJuridico.tsx`
- `frontend/src/Deadlines.tsx`
- `frontend/adv.screens.smoke.test.ts`
- `frontend/admin.users.smoke.test.ts`

## `crm.opportunity.linkProcess`
Rota: `POST /crm/opportunities/:id/link-process`

Payload de entrada:
```json
{
  "processId": 184,
  "confirmLink": true,
  "summary": "O caso comercial corresponde ao processo já cadastrado."
}
```

Payload de saída:
```json
{
  "opportunity": {
    "id": 22,
    "convertedProcessId": 184,
    "status": "ganha"
  },
  "process": {
    "id": 184,
    "title": "Execução contratual",
    "processNumber": "0001234-55.2026.8.26.0100",
    "phase": "Inicial",
    "status": "Ativo",
    "clientId": 91,
    "client": "Cliente XPTO"
  },
  "outcome": "linked",
  "idempotent": false
}
```

Erros esperados:
- `CRM_LINK_CONFIRMATION_REQUIRED`
- `CRM_OPPORTUNITY_NOT_FOUND`
- `CRM_PROCESS_NOT_FOUND`
- `CRM_OPPORTUNITY_ALREADY_CONVERTED`

Regra de idempotência:
- o serviço retorna `outcome=already_linked` e `idempotent=true` quando a oportunidade já aponta para o mesmo processo.

## `crm.opportunity.attachDocument`
Rota: `POST /crm/opportunities/:id/documents`

Payload de entrada:
```json
{
  "title": "Checklist inicial assinado",
  "category": "Checklist",
  "responsible": "advogado",
  "previewUrl": "https://storage.lexora.local/checklist.pdf",
  "requiredChecklist": true,
  "pendingForAdvance": false,
  "externalDocumentId": "doc-ext-001"
}
```

Payload de saída:
```json
{
  "mode": "created",
  "idempotencyKey": "crm-doc-22-001",
  "data": {
    "document": {
      "id": 10,
      "opportunityId": 22,
      "documentId": 301,
      "title": "Checklist inicial assinado",
      "category": "Checklist",
      "status": "pendente",
      "mimeType": "application/pdf"
    },
    "auditEvent": {
      "scope": "crm.opportunity.attachDocument",
      "action": "document_attached",
      "status": "completed"
    }
  }
}
```

Erros esperados:
- `CRM_OPPORTUNITY_NOT_FOUND`
- `CRM_DOCUMENT_TITLE_REQUIRED`
- `CRM_INVALID_MIME_TYPE`

Regra de idempotência:
- se o mesmo `Idempotency-Key` for reaplicado, o backend devolve `mode=replayed` sem duplicar anexo nem auditoria.

## `crm.opportunity.convert`
Rota: `POST /crm/opportunities/:id/convert`

Payload de entrada:
```json
{
  "clientId": 91,
  "clientName": "Cliente XPTO",
  "processTitle": "Execução contratual",
  "processNumber": "0001234-55.2026.8.26.0100",
  "processPhase": "Inicial",
  "processStatus": "Ativo",
  "summary": "Cliente validou proposta e documentação inicial.",
  "confirmConversion": true
}
```

Payload de saída:
```json
{
  "opportunity": {
    "id": 22,
    "convertedProcessId": 184,
    "status": "ganha"
  },
  "client": {
    "id": 91,
    "name": "Cliente XPTO",
    "cpfCnpj": "12345678900",
    "status": "ativo",
    "responsible": "advogado"
  },
  "process": {
    "id": 184,
    "title": "Execução contratual",
    "processNumber": "0001234-55.2026.8.26.0100",
    "phase": "Inicial",
    "status": "Ativo",
    "clientId": 91,
    "client": "Cliente XPTO"
  },
  "outcome": "converted",
  "idempotent": false
}
```

Erros esperados:
- `CRM_CONVERSION_CONFIRMATION_REQUIRED`
- `CRM_PROCESS_NUMBER_ALREADY_EXISTS`
- `CRM_OPPORTUNITY_NOT_FOUND`
- `CRM_CLIENT_NOT_FOUND`

Regra de idempotência:
- conversão repetida de oportunidade já operacionalizada reaproveita o vínculo existente e retorna `idempotent=true`.

## `crm.opportunity.addContactEvent`
Rota: `POST /crm/opportunities/:id/contact-events`

Payload de entrada:
```json
{
  "kind": "follow_up",
  "summary": "Cliente pediu retorno após análise interna.",
  "nextContactAt": "2026-05-22T15:00:00.000Z"
}
```

Payload de saída:
- objeto completo da oportunidade com `contactEvents`, `lastContactAt` e `nextContactAt` atualizados.

Erros esperados:
- `CRM_OPPORTUNITY_NOT_FOUND`
- `CRM_CONTACT_SUMMARY_REQUIRED`
- `CRM_NEXT_CONTACT_REQUIRED`

Regra de idempotência:
- não há replay automático; cada envio válido é um evento novo e auditável na cadência comercial.

## `deadlines.createFromPublication`
Rota: `POST /publications/:id/create-deadline`

Payload de entrada:
```json
{
  "title": "Apresentar manifestação",
  "dueDate": "2026-05-24",
  "priority": "alta",
  "notes": "Prazo criado a partir da publicação elegível."
}
```

Payload de saída:
```json
{
  "deadline": {
    "id": 88,
    "publicationId": 40,
    "agendaEventId": 190,
    "agendaSyncStatus": "synced"
  },
  "auditEvent": {
    "action": "deadline_created_from_publication",
    "status": "completed"
  },
  "idempotency": {
    "key": "publication:40",
    "status": "completed",
    "replayed": false
  }
}
```

Erros esperados:
- `DEADLINE_PUBLICATION_NOT_FOUND`
- `DEADLINE_PUBLICATION_NOT_ELIGIBLE`
- `DEADLINE_DUPLICATE_REQUEST`

Regra de idempotência:
- exige `Idempotency-Key`; quando ausente, o backend usa fallback `publication:<id>`.
- replay da mesma chave devolve o resultado anterior sem duplicar prazo, agenda ou auditoria.

## `deadlines.bulkAction`
Rota: `POST /deadlines/bulk-action`

Payload de entrada:
```json
{
  "action": {
    "type": "complete",
    "deadlineIds": [88, 89],
    "reason": "Peca protocolada e conferida - lote de fechamento da manha"
  }
}
```

Payload de saída:
```json
{
  "summary": {
    "requested": 2,
    "updated": 2,
    "skipped": 0,
    "failed": 0
  },
  "items": [
    {
      "deadlineId": 88,
      "status": "updated"
    }
  ],
  "auditEvents": [],
  "agendaEvents": [],
  "idempotency": {
    "key": "bulk-1747780000000",
    "status": "completed",
    "replayed": false
  }
}
```

Erros esperados:
- `DEADLINE_ACTION_NOT_SUPPORTED`
- `DEADLINE_NOT_FOUND`
- `DEADLINE_INVALID_STATUS_TRANSITION`

Regra de idempotência:
- replay da mesma chave em `deadlines.bulkAction` retorna o resultado salvo e não duplica efeitos.

Eventos esperados:
- `deadline_completed`

## `deadlines.riskEvaluation`
Origem: `GET /deadlines`, `GET /deadlines/:id` e automações de conclusão/criação.

Payload de saída embutido:
```json
{
  "risk": {
    "level": "critico",
    "score": 94,
    "reasons": [
      {
        "code": "due_today",
        "weight": 30,
        "message": "Prazo vence hoje."
      }
    ],
    "computedAt": "2026-05-21T03:15:00.000Z"
  }
}
```

Erros esperados:
- não expõe erro dedicado; risco é calculado no payload dos prazos válidos.

Regra de idempotência:
- cálculo puro e determinístico a partir do estado do prazo, sem mutação.

## `audit.event`
Origem:
- `GET /crm/opportunities/:id/audit`
- auditoria persistida em `CrmAuditEvent`

Payload de saída:
```json
{
  "id": "evt_01",
  "scope": "crm.opportunity.convert",
  "entityType": "crm_opportunity",
  "entityId": 22,
  "action": "conversion_completed",
  "status": "completed",
  "summary": "Oportunidade convertida em processo operacional.",
  "actor": {
    "email": "advogado@juridico.com",
    "role": "ADV"
  },
  "occurredAt": "2026-05-21T03:30:00.000Z"
}
```

Erros esperados:
- `CRM_OPPORTUNITY_NOT_FOUND`
- `CRM_AUDIT_ENTITY_NOT_FOUND`

Regra de idempotência:
- eventos produzidos por fluxos idempotentes herdam a mesma chave para evitar duplicidade lógica na trilha.

## Contrato de ambiente previsível
- Seed precisa conter usuário ADM e usuário ADV.
- Seed precisa conter oportunidade CRM para conversão.
- Seed precisa conter publicação elegível para virar prazo.
- Seed precisa conter ao menos um prazo com trilha para validar a tela de Prazos.

## Critério de aceite operacional
- Não integrar sem evidências de build, smoke e contrato.
- Não aceitar mudança que remova labels ou ações que o smoke usa como contrato visual.
- Não aceitar mudança que quebre replay idempotente ou o caminho de conversão CRM.
- `frontend/adv.screens.smoke.test.ts` e `frontend/admin.users.smoke.test.ts` permanecem como contrato visual mínimo do ambiente.
