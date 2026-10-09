# Work Orders

## Purpose

Criar uma ordem única por venda confirmada e acompanhar produção, prazo e entrega.

## Directory

Domínio em `src/domain/work-order.ts` e `work-order-service.ts`; página em `src/app/WorkOrdersWorkspace.tsx` (re-exportada em `pages.tsx`); ação de criação também em `CashDeskPage`.

## Routes

- `/ordens-servico` (guard: `sales.read`).
- `/ordens-servico/:orderId` (guard: `sales.read`) — página de detalhe.

## Main Pages

`WorkOrdersPage`: filtros por status, criação a partir de vendas confirmadas sem ordem, transições de status, prazo, observações e formulário de cancelamento com motivo obrigatório.

`WorkOrderDetailPage`: situação completa da OS, ações de transição/cancelamento/prazo, registro de insumos (produto + quantidade, baixa atômica de estoque) e histórico de eventos (quando, quê, por quem).

## Components

Botões de transição, filtros `.status-filters`, formulário `.orders-form` e Badge de status.

## Services

`WorkOrderService.list`, `getBySale`, `createFromConfirmedSale(sale, author)`, `transition`, `cancel(order, reason, author)`, `schedule`, `recordInputs(order, items, author)`.

## Repositories

`WorkOrderRepository` / `LocalWorkOrderRepository`: `create` atômico por `saleId`, `update` transacional com `expectedStatus` e `recordInputs` (transação única `workOrders` + `inventoryItems` + `inventoryMovements`, rollback se saldo insuficiente).

## Stores / Hooks

Sem store/hook; estado local + `currentStoreId` + `session.userName`.

## Models

`WorkOrder` (`status`, `dueAt?`, `notes?`, `updatedAt?`, `updatedBy?`, `cancelReason?`, `events?: WorkOrderEvent[]`), `WorkOrderStatus`, `workOrderStatusLabels`, `workOrderTransitions`, `canTransition`, `WorkOrderEvent` (`id`, `type` CREATED/STATUS/SCHEDULE/CANCELLED/INPUTS, `from?`, `to?`, `note?`, `author`, `at`), `workOrderEventLabels`, `WorkOrderInput` (`itemId`, `name`, `quantity`).

## Permissions

`sales.read` para as rotas; `sales.manage` para criação, transições, cancelamento, prazo e insumos.

## Dependencies

Sales confirmadas, clientes, loja atual, sessão e inventory (insumos na OS).

## Public API

`WorkOrderService`, `WorkOrderRepository`.

## Files Normally Modified

- Página: `src/app/WorkOrdersWorkspace.tsx`.
- Fluxo/validações: `work-order-service.ts`.
- Transições: `work-order.ts`.
- Persistência: `LocalWorkOrderRepository`.
- Menu/rota: `AppShell.tsx`, `router.tsx`.
- Backup: campos opcionais em `backup.ts`.

## Avoid Modifying

Não pular estados nem criar mais de uma ordem por venda. Não editar `createdAt`/`saleId`/`customerId`/`storeId` em atualização. Cancelamento exige motivo auditado: `transition(..., "CANCELLED")` é bloqueado de propósito — usar `cancel`.

## Common Tasks

### Alterar transições

→ `workOrderTransitions` + `WorkOrderService.transition` + testes.

### Alterar prazo/observações

→ `WorkOrderService.schedule` + `WorkOrdersWorkspace`.

### Cancelar com auditoria

→ `WorkOrderService.cancel` (motivo obrigatório, evento `CANCELLED`, `cancelReason` persistido). Nunca via `transition`.

### Registrar insumos

→ `WorkOrderService.recordInputs` + `LocalWorkOrderRepository.recordInputs` + testes de atomicidade (`work-orders.test.ts`).

### Histórico de eventos

→ eventos embutidos em `WorkOrder.events` (sem tabela nova, sem bump de versão); validação em `backup.ts` (bloco `workOrders`).

### Alterar persistência

→ contrato + `LocalWorkOrderRepository` + nova versão Dexie apenas se mudar índices.

## Related Modules

Sales (origem da venda), dashboard (próxima fase), inventory (baixa de insumos) e futuramente laboratório.
