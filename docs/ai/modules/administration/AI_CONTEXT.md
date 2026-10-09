# AI CONTEXT — Administration

## Current Status

- Seed local de duas lojas e dois usuários.
- Contexto global carrega dados em paralelo.
- CRUD de usuários (criar/editar função e lojas, inativar/reativar) com validação de e-mail/duplicidade.
- Configuração permite nome da organização e cargo clínico exibido.
- Troca de loja persiste no IndexedDB.

## Current Decisions

- Sessão padrão é OWNER local.
- Falha de carregamento bloqueia as páginas e oferece nova tentativa; não concede OWNER nem cria loja fictícia.
- Sessão cujo usuário está inativo é bloqueada na entrada (`sessionUserState`); não é possível inativar o usuário da sessão atual.
- Escopo do usuário é derivado do papel (`roleDefinitions`), não digitado.
- Cargo clínico visível não controla autorização.

## Known Problems

- Não há login ou troca de usuário na interface.
- Lojas não possuem formulário de manutenção.
- Sessão local padrão ainda é demonstração, não autenticação real.

## Pending Work

- CRUD de lojas.
- Autenticação real.
- Recuperação administrativa para loja atual inválida/inativa.

## Important Files Right Now

- `src/app/providers.tsx`.
- `src/domain/administration-service.ts`.
- `src/infrastructure/storage/local-repositories.ts`.
- `src/domain/access.ts`.

## Recent Structural Changes

- F2-04 (08/10/2026): CRUD de usuários em `administration-service.ts` + `UsersPage`; bloqueio de sessão inativa em `providers.tsx`; `administration-service.test.ts` (9) e `access.test.ts` (10).
- Migração 9 adiciona os índices `name` de lojas/usuários que faltavam e causavam SchemaError no boot.
- Testes cobrem inicialização e preservação das tabelas na migração 8 → 9.
- Boot possui loading, erro e retry; cancela resultados de efeitos desmontados.

- Labels de perfis foram simplificados na UI.
- Menu passou a refletir a role da sessão.

## Be Careful With

- Revisar estado canônico, persistido e experiência de erro em conjunto.
- `currentStoreId` é dependência de attendance, sales, cash e inventory.

## Next Likely Task

Criar manutenção de lojas sem acoplar páginas ao Dexie.
