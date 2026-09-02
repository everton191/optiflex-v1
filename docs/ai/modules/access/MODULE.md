# Access

## Purpose

Definir roles, scopes, permissions, guards de rota e visibilidade de navegação/ações.

## Directory

- Domínio: `src/domain/access.ts`.
- Guards: `src/app/permissions.tsx`.
- Rotas: `src/app/router.tsx`.
- Menu: `src/shell/AppShell.tsx`.

## Routes

Afeta todas as rotas protegidas. `/sem-acesso` renderiza `ForbiddenPage`.

## Main Pages

- `ProfilesPage` apresenta perfis em linguagem de negócio.
- `ForbiddenPage` informa acesso negado.

## Components

- `RequirePermission`.
- `Can` (disponível, sem consumidor atual).

## Services / Repositories / Stores

Não há AccessService. Sessão vem de `LocalSessionRepository` e `AppProviders`.

## Models

`RoleKey`, `Permission`, `Scope`, `RoleDefinition`, `LocalSession`, `User`.

## Permissions

A matriz completa está em `rolePermissions`; consulte `docs/ai/06_PERMISSION_MAP.md`.

## Dependencies

React Context e React Router nos guards; o domínio em si é puro.

## Public API

`hasPermission`, `rolePermissions`, `roleDefinitions` e tipos exportados.

## Shared Components

`RequirePermission`, `Can`, `AppProviders`.

## Files Normally Modified

- Nova permission/role: `access.ts`.
- Guard: `permissions.tsx`.
- Rota: `router.tsx`.
- Item de menu: `AppShell.tsx`.
- Cobertura: `access.test.ts`.

## Avoid Modifying

Não condicionar autorização ao rótulo profissional visível. A identidade técnica permanece `CLINICAL_PROFESSIONAL`.

## Common Tasks

### Alterar acesso de um perfil

→ `rolePermissions` + teste + menu/rotas afetados.

### Criar rota protegida

→ Permission, `RequirePermission`, menu filtrado e Route Map.

### Ocultar ação

→ `hasPermission` ou `Can`; o guard de rota continua necessário.

## Related Modules

Administration, shell, dashboard, clinical, sales, cash e inventory.
