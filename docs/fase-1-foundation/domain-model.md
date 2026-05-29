# Domain Model - Fase 1

## Entidades novas
- `Company`
  - `id`, `slug`, `legalName`, `tradeName`, `documentNumber`, `status`, `createdAt`, `updatedAt`
- `CompanyMembership`
  - `id`, `companyId`, `userId`, `role`, `userType`, `status`, `isPrimary`, `createdAt`, `updatedAt`

## Relacoes
- `Company` 1:N `CompanyMembership`
- `User` 1:N `CompanyMembership`
- `Team` e `Portfolio` permanecem como estruturas internas da `Company`.

## Papel de `companyId`
- `companyId` passa a ser obrigatorio nos agregados operacionais criticos.
- Todo recurso operacional deve carregar ou resolver `companyId`.
- Toda query critica deve filtrar por `companyId`.
- Toda mutacao deve validar que actor e recurso pertencem a mesma company (exceto regras explicitas de plataforma).

## Decisao de identidade
- `User` e identidade global.
- Vinculo operacional e feito por `CompanyMembership`.
