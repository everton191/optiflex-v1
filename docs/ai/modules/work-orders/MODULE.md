# Work Orders

## Purpose

Criar uma ordem de serviço única a partir de uma venda confirmada.

## Directory

Domínio em `src/domain/work-order.ts` e `work-order-service.ts`; UI dentro de `CashDeskPage`; repository em storage.

## Routes

Não possui rota própria. A ação está em `/caixa`, aba Vendas.

## Main Pages

Não há página própria; `CashDeskPage` é a consumidora.

## Components

Button e feedback na lista de vendas.

## Services

`WorkOrderService.list`, `createFromConfirmedSale`.

## Repositories

`WorkOrderRepository` / `LocalWorkOrderRepository`.

## Stores / Hooks

Sem store/hook. Lista fica no estado do `CashDeskPage`.

## Models

`WorkOrder`, `WorkOrderStatus`.

## Permissions

Não há permission específica; ação é exibida sob `sales.manage`.

## Dependencies

Sale confirmada e store/customer IDs da venda.

## Public API

`WorkOrderService`, `WorkOrderRepository`.

## Files Normally Modified

- Regra: `work-order-service.ts`.
- Estado/modelo: `work-order.ts`.
- Persistência: `LocalWorkOrderRepository`.
- Ação visual: `CashDeskPage`.

## Avoid Modifying

Não remover verificação de venda confirmada ou idempotência por `saleId`.

## Common Tasks

### Alterar criação

→ `createFromConfirmedSale` + repository + testes.

### Alterar status

→ WorkOrderStatus + futura UI de produção.

### Criar página de acompanhamento

→ nova rota/permission/page em tarefa funcional própria.

## Related Modules

Sales e, futuramente, inventory/laboratories.
