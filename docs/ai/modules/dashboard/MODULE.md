# Dashboard

## Purpose

Exibir a visão geral da operação da loja atual com métricas reais, pendências e atalhos por perfil.

## Directory

Página em `src/app/DashboardWorkspace.tsx` (re-exportada em `src/app/pages.tsx`); cálculos puros em `src/domain/dashboard.ts`; estilos em `src/styles.css`.

## Routes

- `/` — rota index dentro de `AppShell`, guard `dashboard.view`.

## Main Pages

- `DashboardPage`: passos do fluxo, métricas do dia, gráfico de 7 dias e pendências com links.

## Components

- `Card` do Design System.
- `.flow-card`, `.flow-steps`, `.metric-grid`, `.dashboard-grid`, `.chart-placeholder`, `.pending-list`.

## Services / Repositories / Stores

Sem service próprio: consulta `SalesService`, `LocalCashRepository`, `ReceptionService`, `WorkOrderService` e `InventoryService` do escopo atual (`currentStoreId`).

## Models

- `LocalSession`, `OrganizationSettings` (contexto).
- Selectores: `salesTodayCents`, `receiptsTodayCents`, `salesByDay`, `chartHeights`, `waitingQueue`, `stockAlerts`, `openOrders`, `overdueOrders`, `pendingQuotes`.

## Permissions

- Rota guardada por `dashboard.view`.
- Cards e pendências aparecem conforme `sales.read`, `cash.read`/`cash.manage`, `attendance.queue.read` e `inventory.read`.

## Dependencies

React Router, App Context, Design System, access e módulos operacionais.

## Public API

`DashboardPage`, importada por `router.tsx`.

## Files Normally Modified

- Página: `src/app/DashboardWorkspace.tsx`.
- Cálculos: `src/domain/dashboard.ts` + `dashboard.test.ts`.
- Layout: `src/styles.css` nas classes `dashboard`, `flow-*`, `metric-*`, `chart-placeholder`, `pending-list`.
- Permissões: `src/domain/access.ts`.

## Avoid Modifying

Não apresentar valores fixos como se fossem dados reais. Não duplicar `Card` ou tokens dentro da página.

## Common Tasks

### Alterar métrica

→ `DashboardWorkspace` (montagem) + `dashboard.ts` (regra) + `dashboard.test.ts`.

### Alterar pendência

→ lista `pendencias` em `DashboardWorkspace` + rota/permission correspondentes.

### Alterar layout

→ `styles.css` (`.metric-grid`, `.dashboard-grid`, `.flow-steps`).

## Related Modules

Access, application shell, sales, cash, attendance, work-orders e inventory.
