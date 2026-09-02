# Administration

## Purpose

Inicializar e expor organização, sessão, lojas, loja atual, usuários e configurações.

## Directory

Código distribuído entre `src/app/providers.tsx`, `src/app/pages.tsx`, `src/domain/access.ts`, `src/domain/administration-service.ts` e storage local.

## Routes

- `/admin/usuarios`
- `/admin/perfis`
- `/admin/configuracoes`

## Main Pages

`UsersPage`, `ProfilesPage`, `SettingsPage`.

## Components

`AppProviders`, `useAppContext`, seletor de loja no `AppShell`.

## Services

`AdministrationService`: initialize, listar lojas/usuários, consultar/trocar loja.

## Repositories

`AdministrationRepository`, `SettingsRepository`, `SessionRepository` e implementações locais.

## Stores

Não há store dedicada. React Context mantém o estado global.

## Models

`OrganizationSettings`, `LocalSession`, `Store`, `CurrentStoreContext`, `User`.

## Permissions

`stores.*`, `users.*`, `settings.manage`, `roles.*`.

## Dependencies

Access, Dexie, shell e Design System.

## Public API

`useAppContext`, `AdministrationService` e contratos de repository.

## Files Normally Modified

- Contexto/boot: `providers.tsx`.
- Regras de loja: `administration-service.ts`.
- Seeds/persistência: `local-repositories.ts`.
- UI: páginas administrativas e `AppShell`.

## Avoid Modifying

Não mudar schema ou seeds por ajuste visual. Não remover fallback sem definir experiência de falha.

## Common Tasks

### Alterar configuração

→ `SettingsPage`, `OrganizationSettings`, SettingsRepository.

### Alterar troca de loja

→ AppShell, provider, AdministrationService, CurrentStoreContext.

### Alterar usuários

→ UsersPage, User, repository e permissions.

## Related Modules

Access, application shell e todos os módulos filtrados por loja.
