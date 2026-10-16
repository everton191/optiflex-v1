# Administration

## Purpose

Inicializar e expor organização, sessão, lojas, loja atual, usuários e configurações.

## Directory

Código distribuído entre `src/app/providers.tsx`, `src/app/AdminWorkspace.tsx` (UI, F1-03), `src/domain/access.ts`, `src/domain/organization.ts` (normalização/validação da identificação da empresa, F2-01), `src/domain/administration-service.ts` e storage local.

## Routes

- `/admin/lojas`
- `/admin/usuarios`
- `/admin/perfis`
- `/admin/configuracoes`

## Main Pages

`StoresPage`, `UsersPage`, `ProfilesPage`, `SettingsPage` (identificação completa da organização: nome, cargo clínico, razão social, CNPJ formatado/validado, telefone, e-mail e endereço — campos opcionais normalizados para `undefined` quando vazios; exibição no dashboard).

## Components

`AppProviders`, `useAppContext`, seletor de loja no `AppShell`.

## Services

`AdministrationService`: initialize, listar lojas/usuários, consultar/trocar loja, criar/editar loja (`StoreInput`: nome único sem maiúsculas/acentos de comparação) e ativar/inativar (`setStoreActive`), criar/editar usuário (`UserInput`), ativar/inativar com proteção da sessão atual. Inativação de loja é **não destrutiva**: exige ao menos uma loja ativa, bloqueia a loja atual (troque antes) e só altera `active` — nenhum dado é apagado; `selectStore` recusa loja inativa.

## Repositories

`AdministrationRepository`, `SettingsRepository`, `SessionRepository` e implementações locais.

## Stores

Não há store dedicada. React Context mantém o estado global.

## Models

`OrganizationSettings` (`organizationName`, `clinicalProfessionalLabel` + opcionais `legalName`, `cnpj`, `phone`, `email`, `addressStreet`, `addressNumber`, `addressDistrict`, `addressCity`, `addressState`, `addressZip` — sem bump Dexie: linha única `current`), `LocalSession`, `Store`, `CurrentStoreContext`, `User`; helpers em `organization.ts`: `onlyDigits`, `formatCnpj`, `isValidCnpj` (dígitos verificadores), `normalizeOrganizationSettings`, `assertValidOrganizationSettings`.

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

Não mudar schema ou seeds por ajuste visual. Preservar a experiência de falha com nova tentativa; não liberar o aplicativo com sessão/loja fictícias quando o carregamento falhar.

## Common Tasks

### Alterar configuração

→ `SettingsPage`, `OrganizationSettings`, `organization.ts` (normaliza/valida: CNPJ com dígito verificador, e-mail, UF com 2 letras, CEP com 8 dígitos), `saveSettings` do provider (valida antes do `SettingsRepository.save`) e bloco `settings` do `backup.ts` (aceita campos novos, rejeita CNPJ inválido).

### Alterar troca de loja

→ AppShell, provider, AdministrationService, CurrentStoreContext.

### Alterar usuários

→ `UsersPage`, `UserInput`, `AdministrationService.createUser/updateUser/setUserActive`, `sessionUserState` (`access.ts`) e permissão `users.manage`. Usuário inativo não entra (`providers.tsx`).

### Criar/editar/inativar lojas

→ `StoresPage` (`/admin/lojas`), `StoreInput`, `AdministrationService.createStore/updateStore/setStoreActive` + `refreshStores` do contexto (seletor atualiza na hora); guarda de rota `stores.manage`; fallback do provider troca a loja atual se ela ficar inativa (`providers.tsx`).

## Related Modules

Access, application shell e todos os módulos filtrados por loja.
