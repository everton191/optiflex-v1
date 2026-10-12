# AI CONTEXT — Administration

## Current Status

- Seed local de duas lojas e dois usuários.
- Contexto global carrega dados em paralelo.
- CRUD de usuários (criar/editar função e lojas, inativar/reativar) com validação de e-mail/duplicidade.
- CRUD de lojas em `/admin/lojas` (`StoresPage`, F2-02 `c4e4e31`): criar/renomear/inativar/reativar com nome único e inativação não destrutiva; `refreshStores` mantém o seletor do topo atualizado na hora.
- Configuração permite nome da organização e cargo clínico exibido.
- Troca de loja persiste no IndexedDB.

## Current Decisions

- Sessão padrão é OWNER local.
- Falha de carregamento bloqueia as páginas e oferece nova tentativa; não concede OWNER nem cria loja fictícia.
- Sessão cujo usuário está inativo é bloqueada na entrada (`sessionUserState`); não é possível inativar o usuário da sessão atual.
- Escopo do usuário é derivado do papel (`roleDefinitions`), não digitado.
- Cargo clínico visível não controla autorização.
- Inativação de loja: só altera `active` (nada é apagado), exige ao menos uma loja ativa e bloqueia a loja atual (troque antes); `selectStore` recusa inativas e o fallback do provider troca a loja atual se ela ficar inativa.
- Rota/menus de lojas exigem `stores.manage` (OWNER e NETWORK_ADMINISTRATOR).

## Known Problems

- Não há login ou troca de usuário na interface.
- Sessão local padrão ainda é demonstração, não autenticação real.

## Pending Work

- Autenticação real.
- Recuperação administrativa para loja atual inválida/inativa (fallback existe; UX de aviso pode melhorar).

## Important Files Right Now

- `src/app/providers.tsx`.
- `src/domain/administration-service.ts`.
- `src/infrastructure/storage/local-repositories.ts`.
- `src/domain/access.ts`.

## Recent Structural Changes

- F2-02 (08/10/2026, `c4e4e31`): `StoresPage` + rota `/admin/lojas` (`stores.manage`), `createStore/updateStore/setStoreActive`, `refreshStores` no contexto, guarda de loja atual no fallback do provider; `administration-service.test.ts` +7 e `storage/administration.test.ts` (3).
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

Fila do KANBAN: F3-02 cadastro de atendimento (`#41`) ou F2-07 validação de CPF/CNPJ (`#29`). (F2-02 concluída em `c4e4e31`.)
