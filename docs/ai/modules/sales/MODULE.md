# Sales

## Purpose

Criar orçamentos, confirmar vendas e iniciar ordem de serviço na área unificada de Caixa.

## Directory

UI em `CashDeskPage`; domínio em `sales.ts` e `sales-service.ts`; repository em storage.

## Routes

- `/caixa` — rota canônica, aba Vendas.
- `/vendas` — redirect para `/caixa`.

## Main Pages

`CashDeskPage` em `src/app/pages.tsx`.

## Components

`Input`, `Button`, `.commerce-form`, `.cash-tabs`, listas e badges.

## Services

`SalesService.list`, `createQuote`, `confirm`.

## Repositories

`SaleRepository` / `LocalSaleRepository`.

## Stores / Hooks

Estado React local; sem store/hook dedicado.

## Models

`Sale`, `SaleStatus`.

## Permissions

`sales.read`, `sales.manage`; rota compartilhada exige `cash.read`.

## Dependencies

Customers, cash, work-orders e currentStore.

## Public API

`SalesService`, `SaleRepository`.

## Files Normally Modified

- UI/abas: `CashDeskPage`.
- Regras: `sales-service.ts`.
- Tipos: `sales.ts`.
- Persistência: `LocalSaleRepository`.
- Acesso: `access.ts` e `/caixa`.

## Avoid Modifying

Não recriar página `/vendas`; ela redireciona para o Caixa. Não confirmar venda sem status `QUOTE`.

## Common Tasks

### Alterar formulário

→ CashDeskPage + `.commerce-form`.

### Alterar confirmação

→ SalesService + status/ações da UI.

### Alterar listagem

→ `SalesService.list` + LocalSaleRepository + CashDeskPage.

## Related Modules

Customers, cash e work-orders.
