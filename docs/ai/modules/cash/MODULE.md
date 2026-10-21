# Cash

## Purpose

Unificar vendas, recebimentos, abertura, suprimento/sangria e fechamento de caixa em uma tela adaptada às permissions do usuário.

## Directory

UI em `CashDeskPage` dentro de `src/app/CashWorkspace.tsx`; domínio em `cash.ts` e `cash-service.ts`; repository local em storage.

## Routes

- `/caixa` — canônica.
- `/pagamentos` e `/vendas` — redirects compatíveis.

## Main Pages

`CashDeskPage`, com abas Vendas, Recebimentos e Sessão conforme perfil.

## Components

`Button`, `Input`, `Card`, `.cash-tabs`, `.cash-panel`, `.cash-totals`, `.summary-card`, `.sale-items-form`, `.sale-items-list`, listas.

## Services

`CashService.open`, `receive(storeId, saleId, amount, paymentMethod, reference?)` (forma obrigatória; `reference` opcional só aceita com PIX e é gravada em `reason`), `recordMovement(storeId, type, amount, reason, author?)` e `close`; a página também usa SalesService e WorkOrderService.

## Repositories

`CashRepository` / `LocalCashRepository`: `current`, `listSessions`, `listEntries`, `openSession`, `recordReceipt`, `recordMovement` e `closeSession`. Abertura, recebimento, movimentações (sangria/suprimento) e fechamento são transacionais no IndexedDB.

## Stores / Hooks

Sem store/hook. Estado temporário e tabs usam `useState`.

## Models

`CashSession` (com `expectedBalance`, `closingBalance`, `difference`, `closedBy`, `closingNote`), `CashEntry` (com `paymentMethod?`, `reason?`, `author?`), `CashEntryType` (`RECEIPT`/`WITHDRAWAL`/`DEPOSIT`/`REFUND`), `PaymentMethod` (`CASH`/`PIX`/`CARD` legado/`DEBIT`/`CREDIT`), `paymentMethodOptions` (opções de novos recebimentos), `CashMovementType` (`WITHDRAWAL`/`DEPOSIT`; `RECEIPT`/`REFUND` excluídos), `paymentMethodLabels`, `assertValidPaymentMethod`; `SalePaymentStatus` (`PENDING`/`PARTIAL`/`PAID`); Sale/WorkOrder são dependências. `cashTotals` centraliza o cálculo por centavos e expõe `byMethod` e `refunds` (regra em `src/domain/money.ts`); `receiptPlan(received, pending)` devolve `{ appliedCents, changeCents }` (troco em centavos sem drift; F4-11).

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

→ CashDeskPage + CashService.receive (forma obrigatória; valor parcial com placeholder = saldo pendente) + CashRepository.recordReceipt (grava `PARTIAL`/`PAID`; valida `paid + amount > total` na transação) + `Sale.paymentStatus` + `paymentMethodOptions`/`paymentMethodLabels` (F4-10: totais por forma em `cashTotals.byMethod`).

### Alterar sangria/suprimento

→ CashDeskPage (aba Sessão) + CashService.recordMovement + CashRepository.recordMovement; motivo é obrigatório e sangria não pode exceder o saldo esperado (verificado na transação com `cashTotals`).

### Alterar estorno (cancelamento de venda paga)

→ `SalesService.cancel` + `LocalSaleRepository.cancel` (transação venda+estoque+caixa; cria `CashEntry.REFUND`); exige caixa aberto quando há recebimento; UI na aba Vendas (`.cancel-sale-form`).

### Alterar fechamento

→ CashDeskPage + CashService.close + CashRepository.closeSession + `cashTotals`.

### Alterar botões/abas

→ CashDeskPage + estilos cash; revisar permissions por role.

## Related Modules

Sales, work-orders, customers, access e administration/stores.
