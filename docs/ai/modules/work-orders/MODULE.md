# Work Orders

## Purpose

Criar uma ordem única por venda confirmada e acompanhar produção, prazo e entrega.

## Directory

Domínio em `src/domain/work-order.ts` e `work-order-service.ts`; página em `src/app/WorkOrdersWorkspace.tsx` (re-exportada em `pages.tsx`); ação de criação também em `CashDeskPage`.

## Routes

- `/ordens-servico` (guard: `sales.read`).

## Main Pages

`WorkOrdersPage`: filtros por status, criação a partir de vendas confirmadas sem ordem, transições de status, prazo e observações.

## Components

Botões de transição, filtros `.status-filters`, formulário `.orders-form` e Badge de status.

## Services

`WorkOrderService.list`, `getBySale`, `createFromConfirmedSale`, `transition`, `schedule`.

## Repositories

`WorkOrderRepository` / `LocalWorkOrderRepository`: `create` atômico por `saleId` e `update` transacional com `expectedStatus`.

## Stores / Hooks

Sem store/hook; estado local + `currentStoreId` + `session.userName`.

## Models

`WorkOrder` (`status`, `dueAt?`, `notes?`, `updatedAt?`, `updatedBy?`), `WorkOrderStatus`, `workOrderStatusLabels`, `workOrderTransitions`, `canTransition`.

## Permissions

`sales.read` para a rota; `sales.manage` para criação, transições e prazo.

## Dependencies

Sales confirmadas, clientes, loja atual e sessão.

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

Não pular estados nem criar mais de uma ordem por venda. Não editar `createdAt`/`saleId`/`customerId`/`storeId` em atualização.

## Common Tasks

### Alterar transições

→ `workOrderTransitions` + `WorkOrderService.transition` + testes.

### Alterar prazo/observações

→ `WorkOrderService.schedule` + `WorkOrdersWorkspace`.

### Alterar persistência

→ contrato + `LocalWorkOrderRepository` + nova versão Dexie apenas se mudar índices.

## Related Modules

Sales (origem da venda), dashboard (próxima fase) e futuramente inventory/laboratório.
