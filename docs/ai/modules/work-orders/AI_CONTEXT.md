# AI CONTEXT — Work Orders

## Current Status

- Página `/ordens-servico` com filtros, transições, prazo, observações e cancelamento auditado.
- Rota de detalhe `/ordens-servico/:orderId` (`WorkOrderDetailPage`): situação, ações, insumos e histórico de eventos.
- Criação atômica por `saleId` (mesma transação) e ação rápida no `/caixa`.
- Baixa de insumos com atomicidade (order + estoque + movimento numa transação só).
- Testes do service (13) e do storage (8) passando; total do projeto 164/164.

## Current Decisions

- Ordem é criada manualmente a partir de venda `CONFIRMED`; `createFromConfirmedSale(sale, author)` grava o evento `CREATED`.
- Fluxo de status: OPEN → IN_PRODUCTION → READY → DELIVERED; OPEN/IN_PRODUCTION podem ir para CANCELLED **somente** via `cancel(order, reason, author)` — `transition` para `CANCELLED` lança "Cancelamento auditado".
- Cancelamento exige motivo (`cancelReason` persistido) e autor; gera evento `CANCELLED`.
- Histórico embutido em `WorkOrder.events` (`WorkOrderEvent[]`) — sem tabela nova, sem bump de versão Dexie; validado no backup (bloco `workOrders`).
- Eventos: `CREATED`, `STATUS`, `SCHEDULE`, `CANCELLED`, `INPUTS` (com autor e `at`).
- `transition`, `schedule`, `cancel` e `recordInputs` gravam `updatedAt`/`updatedBy` e validam `expectedStatus` para evitar atualização com dados obsoletos.
- Insumos: `recordInputs` cria movimentos `OUT` (`reason: "Insumos OS <id>"`) e só persiste se estoque cobrir todas as quantidades (rollback completo).
- Sem permission própria: rotas usam `sales.read`, ações usam `sales.manage`.

## Known Problems

- Sem itens/laboratório de terceiros (F3-15 fica para o card dele).
- Cancelamento de venda ainda não devolve estoque (escopo do F4-18 `#75`).

## Pending Work

- Laboratório parceiro (F3-15), acompanhamento de fabricação (F3-16), prazos e alertas (F3-17).
- Devolução de estoque ao cancelar a venda de origem (F4-18).

## Important Files Right Now

- `src/app/WorkOrdersWorkspace.tsx` (`WorkOrdersPage` + `WorkOrderDetailPage`).
- `src/domain/work-order-service.ts`.
- `src/domain/work-order.ts`.
- `LocalWorkOrderRepository.recordInputs`.
- `src/app/router.tsx` (rota `ordens-servico/:orderId`).

## Recent Structural Changes

- Rota de detalhe da OS com histórico de eventos.
- Cancelamento auditado (motivo + autor + evento) bloqueando `transition(CANCELLED)`.
- Registro de insumos com baixa atômica de estoque.
- Backup valida `cancelReason` e `events` das ordens.

## Be Careful With

- Unicidade por `saleId` deve permanecer dentro da transação.
- Guarda de status obsoleto (`expectedStatus`) protege contra corrida entre abas.
- `recordInputs` deve continuar numa única transação Dexie (rollback do teste "Saldo insuficiente").

## Next Likely Task

Fila do KANBAN: F4-18 estornos/cancelamentos (devolve estoque) ou F1-02 entidades e contratos.
