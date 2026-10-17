# AI CONTEXT — Administration

## Current Status

- Seed local de duas lojas e dois usuários.
- Contexto global carrega dados em paralelo.
- CRUD de usuários (criar/editar função e lojas, inativar/reativar) com validação de e-mail/duplicidade.
- CRUD de lojas em `/admin/lojas` (`StoresPage`, F2-02 `c4e4e31`): criar/renomear/inativar/reativar com nome único e inativação não destrutiva; `refreshStores` mantém o seletor do topo atualizado na hora.
- Configuração permite nome da organização, cargo clínico e **identificação completa da empresa** (F2-01 `4f78fe6`): razão social, CNPJ (formatado ao digitar e validado por dígito verificador), telefone, e-mail e endereço (rua, número, bairro, cidade, UF, CEP) — opcionais normalizados para `undefined` quando vazios; identificação (razão social · CNPJ · cidade/UF) aparece no dashboard.
- **Auditoria de alterações** (F1-10 `2a58572`): `AuditService` + tabela `auditEntries` (Dexie v15) gravam CREATE/UPDATE/CANCEL/ADJUSTMENT imutáveis (autor da sessão, loja, data, motivo/resumo) em cancelamento de venda, ajuste de estoque e cadastros de loja/usuário; consulta em `/admin/auditoria` (`AuditPage`, guarda `settings.manage`) e validação no backup (schema 14).
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

- F1-10 (08/10/2026, `2a58572`): `src/domain/audit.ts` + `audit-service.ts`; Dexie v15 com `auditEntries`; `LocalAuditRepository`; `SalesService.cancel`/`InventoryService.adjust`/`AdministrationService` auditam com `AuditService` opcional e autor da sessão (providers/Cash/Inventory); `/admin/auditoria` com filtros; backup schema 14 valida `auditEntries` (legados 10–13 injetam `[]`); testes novos: audit-service (4), sales +2, inventory +1, administration +3, backup +1, guards 22 rotas; 346/346.
- F2-01 (08/10/2026, `4f78fe6`): `src/domain/organization.ts` (CNPJ com dígitos verificadores, `normalizeOrganizationSettings`/`assertValidOrganizationSettings`); `OrganizationSettings` com campos jurídicos/endereço/contatos (opcionais, sem bump); `saveSettings` valida+normaliza antes de persistir; `SettingsPage` com seções "Dados da empresa" e "Endereço" + erro na UI; dashboard exibe a identificação; backup valida bloco `settings`; testes `organization.test.ts` (7) + backup (+1). 335/335.
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

Fila do KANBAN: F8-17 preparação de versões (`#151`) — fora do módulo administration; F1-10 (`#18`) concluída em `2a58572`.
