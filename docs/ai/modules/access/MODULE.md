# Access

## Purpose

Definir roles, scopes, permissions, guards de rota, visibilidade de navegação/ações e a sessão local (login, demonstração, expiração, saída).

## Directory

- Domínio: `src/domain/access.ts`.
- Senha: `src/domain/password.ts` (hash SHA-256 + salt, validação).
- Autenticação: `src/domain/authentication-service.ts` (`login`, `loginDemo`, `logout`, `changePassword`).
- Guards: `src/app/permissions.tsx`.
- Rotas: `src/app/router.tsx`.
- Menu: `src/shell/AppShell.tsx`.
- Páginas: `LoginPage`, `BlockedPage`, `ChangePasswordPage` em `src/app/pages.tsx`.

## Routes

`/login` e `/bloqueado` são públicas; `/trocar-senha` é autenticada. `RequireSession` envolve todo o app (sem sessão → `/login`; inativa → `/bloqueado`) e `RequirePermission` cobre as demais. `/sem-acesso` renderiza `ForbiddenPage`.

## Main Pages

- `LoginPage` — e-mail/senha, modo demonstração explícito, aviso `?motivo=expirada`, limpar sessão guardada.
- `BlockedPage` — usuário inativo; sair ou entrar com outra conta.
- `ChangePasswordPage` — troca/primeira senha com confirmação.
- `ProfilesPage` apresenta perfis em linguagem de negócio.
- `ForbiddenPage` informa acesso negado.

## Components

- `RequireSession`, `RequirePermission`.
- `Can` (null-safe sem sessão).

## Services / Repositories / Stores

`AuthenticationService` (sessão local) usa `SessionRepository` (`get(): Promise<LocalSession | null>`, `save`, `clear`) e `AdministrationRepository`. Sessão e consumidores passam por `AppProviders` (`session: LocalSession | null`, `useSession()`).

## Models

`RoleKey`, `Permission`, `Scope`, `RoleDefinition`, `LocalSession` (`issuedAt`, `demo`), `User` (`passwordHash`, `passwordSalt`).

## Permissions

A matriz completa está em `rolePermissions`; consulte `docs/ai/06_PERMISSION_MAP.md`.

## Dependencies

React Context e React Router nos guards; o domínio em si é puro.

## Public API

`hasPermission`, `rolePermissions`, `roleDefinitions`, `isSessionExpired`, `sessionUserState`, `useSession` e tipos exportados.

## Shared Components

`RequireSession`, `RequirePermission`, `Can`, `AppProviders`.

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

### Trocar a primeira senha de um usuário sem credencial

→ `/trocar-senha` exige sessão; sem `passwordHash` atual, só define a nova. Depois disso o login e-mail/senha passa a valer.

## Related Modules

Administration, shell, dashboard, clinical, sales, cash e inventory.
