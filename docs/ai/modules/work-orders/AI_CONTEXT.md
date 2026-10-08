# AI CONTEXT — Work Orders

## Current Status

- Página `/ordens-servico` com filtros, transições, prazo e observações.
- Criação atômica por `saleId` (mesma transação) e ação rápida no `/caixa`.
- Testes do service (9) e do storage (6) passando.

## Current Decisions

- Ordem é criada manualmente a partir de venda `CONFIRMED`.
- Fluxo de status: OPEN → IN_PRODUCTION → READY → DELIVERED; OPEN/IN_PRODUCTION podem ir para CANCELLED.
- `transition` e `schedule` gravam `updatedAt`/`updatedBy` e validam `expectedStatus` para evitar atualização com dados obsoletos.
- Sem permission própria: rota usa `sales.read`, ações usam `sales.manage`.
- Campos novos (`dueAt`, `notes`, `updatedAt`, `updatedBy`) são opcionais e sem índice → sem bump de versão Dexie.

## Known Problems

- Sem histórico completo de eventos (apenas última alteração).
- Sem itens, laboratório ou baixa automática de estoque.
- Sem rota de detalhe `/ordens-servico/:id`.

## Pending Work

- Baixa de estoque ao concluir/entregar OS (vincular à Fase de integração).
- Histórico de eventos da ordem.

## Important Files Right Now

- `src/app/WorkOrdersWorkspace.tsx`.
- `src/domain/work-order-service.ts`.
- `src/domain/work-order.ts`.
- `LocalWorkOrderRepository`.

## Recent Structural Changes

- Nova rota e item de menu "Ordens de serviço".
- Contrato `save` substituído por `create`/`update` transacionais.
- Backup valida `dueAt`/`notes`/`updatedAt`/`updatedBy`.

## Be Careful With

- Unicidade por `saleId` deve permanecer dentro da transação.
- Guarda de status obsoleto (`expectedStatus`) protege contra corrida entre abas.

## Next Likely Task

Fase D — Dashboard com indicadores por função usando vendas, caixa, estoque e OS.
