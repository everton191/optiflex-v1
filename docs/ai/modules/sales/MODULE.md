# Sales

## Purpose

Criar orçamentos (com itens opcionais de estoque), confirmar vendas baixando saldo e iniciar ordem de serviço na área unificada de Caixa.

## Directory

UI em `CashDeskPage`; domínio em `sales.ts` e `sales-service.ts`; repository em storage.

## Routes

- `/caixa` — rota canônica, aba Vendas.
- `/vendas` — redirect para `/caixa`.

## Main Pages

`CashDeskPage` em `src/app/pages.tsx`.

## Components

`Input`, `Button`, `.commerce-form`, `.sale-items-form`, `.sale-items-list`, `.cash-tabs`, listas e badges.

## Services

`SalesService.list`, `createQuote` (calcula total e descrição a partir dos itens), `confirm` (transação que confirma a venda e baixa o estoque).

## Repositories

`SaleRepository` / `LocalSaleRepository`.

## Stores / Hooks

Estado React local; sem store/hook dedicado.

## Models

`Sale`, `SaleStatus`, `SalePaymentStatus`, `SaleItem`; helpers `itemsTotalCents`/`itemsTotal` (regra em `src/domain/money.ts`) e `stockMovementsFor`.

## Permissions

`sales.read`, `sales.manage`; rota compartilhada exige `cash.read`.

## Dependencies

Customers, cash, work-orders, inventory (estoque) e currentStore.

## Public API

`SalesService`, `SaleRepository`.

## Files Normally Modified

- UI/abas: `CashDeskPage` (form de venda e seletor de itens).
- Regras: `sales-service.ts`.
- Regra de dinheiro: `src/domain/money.ts` (compartilhado com cash; F1-09).
- Tipos: `sales.ts` (`SaleItem`, `stockMovementsFor`).
- Persistência: `LocalSaleRepository.confirm` (transação venda + estoque).
- Backup: validação de `items` em `backup.ts`.
- Acesso: `access.ts` e `/caixa`.

## Avoid Modifying

Não recriar página `/vendas`; ela redireciona para o Caixa. Não confirmar venda sem status `QUOTE` nem sem a transação que baixa o estoque.

## Common Tasks

### Alterar formulário

→ CashDeskPage + `.commerce-form`.

### Alterar confirmação

→ SalesService + `LocalSaleRepository.confirm` + status/ações da UI.

### Alterar itens ou baixa de estoque

→ `sales.ts` (`SaleItem`/`stockMovementsFor`) + validações de `createQuote` + `applyStockMovement` + testes `sales-service.test.ts` e `sale-stock.test.ts`.

### Alterar listagem

→ `SalesService.list` + LocalSaleRepository + CashDeskPage.

## Related Modules

Customers, cash, work-orders e inventory.
