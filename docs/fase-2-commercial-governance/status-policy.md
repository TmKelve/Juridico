# Status Policy

Decisões fechadas:
1. `Company.status` e `Subscription.status` são separados; `Company.status` é sincronizado a partir de `Subscription.status` por regra soberana.
2. `read_only` = bloqueio total de escrita no backend (não seletivo por módulo nesta fase).
3. `suspended` = tenant bloqueado operacionalmente (leitura e escrita); plataforma mantém acesso administrativo.
4. `grace_period` = permitido operar; política comercial de cobrança ativa em paralelo.
5. `cancelled` = bloqueio operacional; retenção e ciclo vigente ficam documentados para Fase 3.

Mapa base:
- `active` => acesso normal
- `past_due` => alerta comercial; escrita bloqueada pela policy atual
- `grace_period` => acesso permitido
- `read_only` => leitura permitida, escrita bloqueada
- `suspended` => operação tenant bloqueada
- `cancelled` => operação tenant bloqueada
