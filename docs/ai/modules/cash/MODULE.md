# Cash

## Purpose

Unificar vendas, recebimentos e abertura de caixa em uma tela adaptada às permissions do usuário.

## Directory

UI em `CashDeskPage` dentro de `src/app/pages.tsx`; domínio em `cash.ts` e `cash-service.ts`; repository local em storage.

## Routes

- `/caixa` — canônica.
- `/pagamentos` e `/vendas` — redirects compatíveis.

## Main Pages

`CashDeskPage`, com abas Vendas, Recebimentos e Abertura conforme perfil.

## Components

`Button`, `Input`, `Card`, `.cash-tabs`, `.cash-panel`, `.summary-card`, listas.

## Services

`CashService.open`, `receive`; a página também usa SalesService e WorkOrderService.

## Repositories

`CashRepository` / `LocalCashRepository`.

## Stores / Hooks

Sem store/hook. Estado temporário e tabs usam `useState`.

## Models

`CashSession`, `CashEntry`; Sale/WorkOrder são dependências.

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

Não recriar telas separadas de Venda/Recebimento. Não receber sem sessão aberta. Não tratar prevenção visual de clique repetido como idempotência durável.

## Common Tasks

### Alterar abertura

→ CashDeskPage + CashService.open + CashSession.

### Alterar recebimento

→ CashDeskPage + CashService.receive + CashEntry.

### Implementar fechamento

→ novo método/contrato/repository/UI + testes; hoje não existe.

### Alterar botões/abas

→ CashDeskPage + estilos cash; revisar permissions por role.

## Related Modules

Sales, work-orders, customers, access e administration/stores.
