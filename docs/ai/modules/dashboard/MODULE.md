# Dashboard

## Purpose

Exibir visão geral da operação, métricas resumidas e atalhos para áreas permitidas ao perfil atual.

## Directory

Responsabilidade concentrada em `src/app/pages.tsx`; estilos em `src/styles.css`.

## Routes

- `/` — rota index dentro de `AppShell`.

## Main Pages

- `DashboardPage`.

## Components

- `Card` do Design System.
- `.flow-card`, `.flow-steps`, `.metric-grid`, `.dashboard-grid`.

## Services / Repositories / Stores

Não possui service ou repository próprios. Usa `AppProviders` para sessão e organização. Não existe store dedicada.

## Models

- `LocalSession` e `OrganizationSettings`, via contexto.

## Permissions

- `dashboard.view` existe na matriz, mas a rota `/` não tem guard explícito.
- Atalhos internos são filtrados com `hasPermission`.

## Dependencies

React Router, App Context, Design System e access.

## Public API

`DashboardPage`, importada diretamente por `router.tsx`.

## Shared Components

`Card`, `AppShell`, `useAppContext`.

## Files Normally Modified

- Conteúdo/atalhos: `src/app/pages.tsx` no símbolo `DashboardPage`.
- Layout: `src/styles.css` nas classes `dashboard`, `flow-*`, `metric-*`.
- Permissões: `src/domain/access.ts`.

## Avoid Modifying

Não alterar repositories ou schema para ajustar apenas o painel. Não assumir que métricas visuais são calculadas.

## Common Tasks

### Alterar métrica

→ `DashboardPage`; hoje os valores são mockados.

### Alterar atalho

→ `DashboardPage`, depois confirmar rota e permission.

### Alterar card global

→ `src/design-system/components.tsx` + `.card` em `styles.css`.

## Related Modules

Access, application shell e todos os módulos apontados pelos atalhos.
