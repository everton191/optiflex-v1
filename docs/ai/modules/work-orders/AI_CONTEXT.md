# AI CONTEXT — Work Orders

## Current Status

- Criação a partir de Sale `CONFIRMED`.
- Idempotência por busca de `saleId` existente.
- Status inicial `OPEN`.
- Persistência IndexedDB disponível.

## Current Decisions

- Ordem é criada manualmente após confirmar a venda.
- Não existe página ou item de menu próprio.

## Known Problems

- Não há transições `IN_PRODUCTION`, `READY`, `DELIVERED` ou cancelamento na UI.
- Não há itens, laboratório, prazo ou observações.
- Sem permission específica.

## Pending Work

- Tela de acompanhamento.
- Fluxo de produção/entrega.
- Ligação com laboratório e produtos.
- Testes do service.

## Important Files Right Now

- `src/domain/work-order-service.ts`.
- `src/domain/work-order.ts`.
- `LocalWorkOrderRepository`.
- `CashDeskPage`.

## Recent Structural Changes

- A ação permaneceu na aba Vendas após unificação do Caixa.

## Be Careful With

- Preservar idempotência ao adicionar novas ações.
- Migração necessária se o modelo persistido mudar.

## Next Likely Task

Criar listagem e transições controladas de produção.
