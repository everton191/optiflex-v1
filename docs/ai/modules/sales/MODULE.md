# Sales

## Purpose

Criar orçamentos (com itens opcionais de estoque e tratamentos/serviços sem estoque), gerenciar o ciclo de vida da negociação (rascunho → enviado → aceito/recusado/expirado), editar rascunhos, confirmar vendas baixando saldo e iniciar ordem de serviço na área unificada de Caixa.

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

`SalesService.list`, `createQuote` (calcula total e descrição a partir dos itens; aceita `discount?` + `context` {appliedBy, role} — F3-12), `updateQuote` (edita apenas rascunho, com a mesma validação do create; substitui/limpa o desconto), `transitionQuote` (muda `quoteStatus` conforme `quoteTransitions`), `confirm` (transação que confirma a venda e baixa o estoque; bloqueia recusado/expirado e desconto acima do limite sem aprovação), `approveDiscount` (grava `approvedBy`/`approvedAt`, proíbe autoprovação, valida limite do aprovador e audita — F3-12), `cancel` (motivo obrigatório; cotação via `save`, confirmada via `repository.cancel` devolvendo estoque e estornando caixa).

## Repositories

`SaleRepository` / `LocalSaleRepository`.

## Stores / Hooks

Estado React local; sem store/hook dedicado.

## Models

`Sale`, `SaleStatus`, `SalePaymentStatus`, `QuoteStatus` (`DRAFT`/`SENT`/`ACCEPTED`/`REJECTED`/`EXPIRED` em `Sale.quoteStatus?`, ausente = rascunho), `quoteStatusLabels`, `quoteTransitions`, `quoteStatusOf`, `SaleItem` (com `cancelReason?`/`cancelledAt?`/`cancelledBy?`); helpers `itemsTotalCents`/`itemsTotal` (regra em `src/domain/money.ts`), `stockMovementsFor` e `refundStockMovementsFor`.

`SaleTreatment` (`name`, `price`) em `Sale.treatments?`: linha de serviço sem estoque — entra no total e na OS, nunca gera movimento (`stockMovementsFor` só percorre `items`). No Caixa, o seletor "Serviço do catálogo" (F2-12) preenche nome/preço a partir de `ServiceCatalogItem` (catálogo gerido em Estoque → Serviços; `service-catalog.ts`/`service-catalog-service.ts`, Dexie v17 `services`).

`SaleDiscount` (F3-12): `{ type: PERCENT|AMOUNT, value, reason?, grossTotal, appliedBy, appliedByRole, appliedAt, approvedBy?, approvedAt? }` em `Sale.discount?`; `Sale.total` é o líquido. Funções puras: `assertValidSaleDiscount`, `saleDiscountAmountCents` (clampa ao bruto), `saleTotalWithDiscount`, `discountWithinAuthority`/`discountRequiresApproval`/`canApproveDiscount` (limites em `discountAuthorityByRole`: SELLER/CASHIER 5% ou R$ 50, STORE_MANAGER 15% ou R$ 300, OWNER/NETWORK_ADMINISTRATOR 30% ou R$ 1000), `assertDiscountNotZeroing`, `saleGrossTotal`, `saleDiscountAmount`, `saleDiscountTypeLabels`.

## Permissions

`sales.read`, `sales.manage`; rota compartilhada exige `cash.read`.

## Dependencies

Customers, cash, work-orders, inventory (estoque) e currentStore.

## Public API

`SalesService`, `SaleRepository`.

## Files Normally Modified

- UI/abas: `CashDeskPage` (form de venda, seletor de itens, filtros da lista, ações de negociação e cancelamento).
- Regras: `sales-service.ts`.
- Regra de dinheiro: `src/domain/money.ts` (compartilhado com cash; F1-09).
- Tipos: `sales.ts` (`SaleItem`, estados do orçamento, `stockMovementsFor`, `refundStockMovementsFor`).
- Persistência: `LocalSaleRepository.confirm`/`cancel` (transação venda + estoque + caixa).
- Backup: validação de `items`, `quoteStatus` e campos de cancelamento em `backup.ts`.
- Acesso: `access.ts` e `/caixa`.

## Avoid Modifying

Não recriar página `/vendas`; ela redireciona para o Caixa. Não confirmar venda sem status `QUOTE` nem sem a transação que baixa o estoque; não confirmar orçamento recusado/expirado nem editar fora do rascunho.

## Common Tasks

### Alterar formulário

→ CashDeskPage + `.commerce-form`.

### Alterar confirmação

→ SalesService + `LocalSaleRepository.confirm` + status/ações da UI.

### Alterar cancelamento/estorno

→ SalesService.cancel + `LocalSaleRepository.cancel` (devolve estoque via `refundStockMovementsFor` e cria `REFUND` no caixa) + form `.cancel-sale-form` em CashDeskPage + backup (campos de cancelamento).

### Alterar itens ou baixa de estoque

→ `sales.ts` (`SaleItem`/`stockMovementsFor`) + validações de `createQuote` + `applyStockMovement` + testes `sales-service.test.ts` e `sale-stock.test.ts`.

### Alterar listagem

→ `SalesService.list` + LocalSaleRepository + CashDeskPage (filtros `.status-filters`).

### Alterar estados do orçamento

→ `quoteTransitions`/`quoteStatusOf` em `sales.ts` + `transitionQuote`/`updateQuote`/`confirm` em `sales-service.ts` + ações por estado e impressão em CashDeskPage + validação de `quoteStatus` em `backup.ts`.

## Related Modules

Customers, cash, work-orders e inventory.
