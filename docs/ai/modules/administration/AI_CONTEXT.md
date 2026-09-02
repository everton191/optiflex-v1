# AI CONTEXT — Administration

## Current Status

- Seed local de duas lojas e dois usuários.
- Contexto global carrega dados em paralelo.
- Configuração permite nome da organização e cargo clínico exibido.
- Troca de loja persiste no IndexedDB.

## Current Decisions

- Sessão padrão é OWNER local.
- Falha do IndexedDB ativa fallback em memória.
- Cargo clínico visível não controla autorização.

## Known Problems

- Não há login ou troca de usuário na interface.
- Usuários/lojas não possuem formulário de manutenção.
- Fallback não persiste mudanças.

## Pending Work

- CRUD de lojas e usuários.
- Autenticação real.
- Estado de erro visível para falha de storage.

## Important Files Right Now

- `src/app/providers.tsx`.
- `src/domain/administration-service.ts`.
- `src/infrastructure/storage/local-repositories.ts`.
- `src/domain/access.ts`.

## Recent Structural Changes

- Labels de perfis foram simplificados na UI.
- Menu passou a refletir a role da sessão.

## Be Careful With

- Revisar estado canônico, local e fallback em conjunto.
- `currentStoreId` é dependência de attendance, sales, cash e inventory.

## Next Likely Task

Criar manutenção de usuários/lojas sem acoplar páginas ao Dexie.
