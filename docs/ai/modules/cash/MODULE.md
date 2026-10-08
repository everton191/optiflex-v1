# Cash

## Purpose

Unificar vendas, recebimentos, abertura e fechamento de caixa em uma tela adaptada às permissions do usuário.

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

`CashService.open`, `receive` e `close`; a página também usa SalesService e WorkOrderService.

## Repositories

`CashRepository` / `LocalCashRepository`: `current`, `listSessions`, `listEntries`, `openSession`, `recordReceipt` e `closeSession`. Abertura, recebimento e fechamento são transacionais no IndexedDB.

## Stores / Hooks

Sem store/hook. Estado temporário e tabs usam `useState`.

## Models

`CashSession` (com `expectedBalance`, `closingBalance`, `difference`, `closedBy`, `closingNote`), `CashEntry`; Sale/WorkOrder são dependências. `cashTotals` centraliza o cálculo por centavos.

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

Não recriar telas separadas de Venda/Recebimento. Não receber sem sessão aberta. Não confiar em bloqueio de botão como idempotência: a garantia é a transação de `recordReceipt`/`closeSession`.

## Common Tasks

### Alterar abertura

→ CashDeskPage + CashService.open + CashRepository.openSession.

### Alterar recebimento

→ CashDeskPage + CashService.receive + CashRepository.recordReceipt + `Sale.paymentStatus`.

### Alterar fechamento

→ CashDeskPage + CashService.close + CashRepository.closeSession + `cashTotals`.

### Alterar botões/abas

→ CashDeskPage + estilos cash; revisar permissions por role.

## Related Modules

Sales, work-orders, customers, access e administration/stores.
