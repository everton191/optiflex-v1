# Cash

## Purpose

Unificar vendas, recebimentos, abertura, suprimento/sangria e fechamento de caixa em uma tela adaptada às permissions do usuário.

## Directory

UI em `CashDeskPage` dentro de `src/app/pages.tsx`; domínio em `cash.ts` e `cash-service.ts`; repository local em storage.

## Routes

- `/caixa` — canônica.
- `/pagamentos` e `/vendas` — redirects compatíveis.

## Main Pages

`CashDeskPage`, com abas Vendas, Recebimentos e Sessão conforme perfil.

## Components

`Button`, `Input`, `Card`, `.cash-tabs`, `.cash-panel`, `.cash-totals`, `.summary-card`, `.sale-items-form`, `.sale-items-list`, listas.

## Services

`CashService.open`, `receive(storeId, saleId, amount, paymentMethod)` (forma obrigatória), `recordMovement(storeId, type, amount, reason, author?)` e `close`; a página também usa SalesService e WorkOrderService.

## Repositories

`CashRepository` / `LocalCashRepository`: `current`, `listSessions`, `listEntries`, `openSession`, `recordReceipt`, `recordMovement` e `closeSession`. Abertura, recebimento, movimentações (sangria/suprimento) e fechamento são transacionais no IndexedDB.

## Stores / Hooks

Sem store/hook. Estado temporário e tabs usam `useState`.

## Models

`CashSession` (com `expectedBalance`, `closingBalance`, `difference`, `closedBy`, `closingNote`), `CashEntry` (com `paymentMethod?`, `reason?`, `author?`), `PaymentMethod` (`CASH`/`PIX`/`CARD` legado/`DEBIT`/`CREDIT`), `paymentMethodOptions` (opções de novos recebimentos), `CashMovementType` (`WITHDRAWAL`/`DEPOSIT`), `paymentMethodLabels`, `assertValidPaymentMethod`; Sale/WorkOrder são dependências. `cashTotals` centraliza o cálculo por centavos e expõe `byMethod` (regra em `src/domain/money.ts`).

## Permissions

`cash.read`, `cash.manage`, além de `sales.read/manage` para a aba Vendas.

## Dependencies

Sales, customers, work-orders, currentStore e access.

## Public API

`CashService`, `CashRepository`.

## Files Normally Modified

- UI/ações: `CashDeskPage`.
- Estilos: classes `cash-*`, `summary-card`, `commerce-form`.
- Regras: `cash-service.ts`.
- Persistência: `LocalCashRepository` + `cashSessions`/`cashEntries`.
- Rotas/acesso: router, AppShell e access.

## Avoid Modifying

Não recriar telas separadas de Venda/Recebimento. Não receber sem sessão aberta. Não confiar em bloqueio de botão como idempotência: a garantia é a transação de `recordReceipt`/`recordMovement`/`closeSession`.

## Common Tasks

### Alterar abertura

→ CashDeskPage + CashService.open + CashRepository.openSession.

### Alterar recebimento

→ CashDeskPage + CashService.receive (forma obrigatória) + CashRepository.recordReceipt + `Sale.paymentStatus` + `paymentMethodOptions`/`paymentMethodLabels` (F4-10: totais por forma em `cashTotals.byMethod`).

### Alterar sangria/suprimento

→ CashDeskPage (aba Sessão) + CashService.recordMovement + CashRepository.recordMovement; motivo é obrigatório e sangria não pode exceder o saldo esperado (verificado na transação com `cashTotals`).

### Alterar fechamento

→ CashDeskPage + CashService.close + CashRepository.closeSession + `cashTotals`.

### Alterar botões/abas

→ CashDeskPage + estilos cash; revisar permissions por role.

## Related Modules

Sales, work-orders, customers, access e administration/stores.
