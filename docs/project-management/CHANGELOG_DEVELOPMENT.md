# CHANGELOG — desenvolvimento do Opticore

Registro de entregas relevantes. Formato: data · commit · escopo · evidência.

## 08/10/2026

### `e56939e` — feat: add work order detail route, event history, audited cancellation and stock inputs (F3-14 OS)

- Rota `/ordens-servico/:orderId` (guard `sales.read`) com `WorkOrderDetailPage`: situação completa, ações de transição/cancelamento/prazo, registro de insumos e histórico de eventos.
- Eventos auditados embutidos em `WorkOrder.events` (`WorkOrderEvent`: CREATED/STATUS/SCHEDULE/CANCELLED/INPUTS, autor + `at`) — sem tabela nova e sem bump de versão Dexie; `backup.ts` valida `events` e `cancelReason` no bloco `workOrders`.
- Cancelamento auditado: `WorkOrderService.cancel(order, reason, author)` exige motivo (persistido em `cancelReason`) e grava evento `CANCELLED`; `transition(..., "CANCELLED")` agora lança "Cancelamento auditado" de propósito.
- Insumos: `LocalWorkOrderRepository.recordInputs` baixa estoque numa única transação Dexie (`workOrders` + `inventoryItems` + `inventoryMovements`, rollback se saldo insuficiente), com movimentos `OUT` (`Insumos OS <id>`) e evento `INPUTS`.
- `createFromConfirmedSale(sale, author)` grava evento `CREATED` com autor; `schedule` grava evento `SCHEDULE` com prazo/notas; lista ganhou botão "Detalhes" e form de cancelamento com motivo.
- Evidência: `npm.cmd test` **164/164** (20 arquivos; `work-order-service.test.ts` +4 e `work-orders.test.ts` +2), build 0, tsc 0.
- Card: F3-14/#53 → DONE (libera F3-15/F3-16/F3-17 no lado de OS; devolução de estoque ao cancelar a venda fica no F4-18/#75).

### `6ce9c9a` — feat: store real clinical attachment content with upload, preview and backup (F3-09 anexos clínicos)

- Nova tabela `attachments` no IndexedDB (schema `opticore-v1` **v11**, `database.ts`): conteúdo em base64 por id (`ClinicalAttachmentContent`), separado dos metadados.
- Domínio (`clinical.ts`): `ClinicalAttachment.category` opcional (EXAM/IMAGE/DOCUMENT + rótulos), `ATTACHMENT_MAX_BYTES` (5 MB), `ATTACHMENT_ALLOWED_MIME_TYPES` (PDF/JPG/PNG) e `assertValidAttachment`/`assertValidAttachmentCategory` com mensagens claras.
- `ClinicalService`: `storeAttachment` (valida, gera id e grava conteúdo), `readAttachmentContent` e `dropAttachmentContent`; `ClinicalDraft.attach`/`detach` integram anexos ao autosave (bloqueados em documento finalizado).
- UI (`ClinicalWorkspace`): seção de anexos com upload (arquivo + categoria), lista com tamanho/data, prévia em nova aba (object URL revogada) e exclusão com `confirm()`; conteúdo só é apagado quando nenhuma versão finalizada ainda referencia o anexo.
- Backup: tabela `attachments` entra em `backupTables`; snapshots novos com `schema: 11` e arquivos legados `schema: 10` (sem a tabela) continuam importáveis; conteúdo validado como base64.
- Evidência: `npm.cmd test` **158/158** (20 arquivos; novos `domain/clinical-attachments.test.ts` com 3 casos, `clinical.test.ts` +5, `backup.test.ts` +1 e `database.test.ts` ajustado para verno 11), build 0, tsc 0.
- Card: F3-09/#48 → DONE (fecha o P0 de perda de dado clínico; libera F5-11, F8-04, F8-08 e F8-10).

### `a2c1369` — feat: enforce record and store scope from the active session (F1-11 escopo por registro)

- `src/domain/access-context.ts`: `AccessContext` (escopo da role + lojas do usuário), `buildAccessContext`, `canAccessStore`, `canAccessRecord`, contexto ativo global (`setAccessContext`) e guards `assertStoreAccess`/`assertRecordAccess`.
- Enforcement nos repositories (`local-repositories.ts`): `assertStoreAccess` nas listagens por loja; `assertRecordAccess` nas escritas de atendimento, venda/confirm, OS, estoque/movimentos, caixa e prontuário; histórico do cliente (`listByCustomer`) filtrado pela loja acessível. Sem contexto ativo (testes/backup) não há restrição.
- `AppProviders`: monta/desmonta o contexto junto com sessão/usuários/loja; `selectStore` valida o destino e o carregamento migra para a primeira loja acessível; `AppShell` lista no seletor só as lojas acessíveis (mensagem real de erro na troca).
- Escopo `SELF` (somente registros do próprio usuário) implementado e testado, sem role em uso ainda; registros sem `storeId` (clientes/configurações) permanecem compartilhados.
- Evidência: `npm.cmd test` **149/149** (19 arquivos; novos `domain/access-scope.test.ts` com 8 casos e `storage/access-scope.test.ts` com 4), build 0, tsc 0.
- Card: F1-11/#19 → DONE (fecha o par identidade→autorização; libera F2-05 e F8-06).

### `bae739b` — feat: add local login, session guard and password change (F7-02 tela de login)

- `src/domain/password.ts`: hash SHA-256 com salt por usuário (`generateSalt`, `hashPassword`, `verifyPassword`, `assertPasswordStrength` ≥ 8).
- `AuthenticationService` (`authentication-service.ts`): `login` (mensagem única anti-enumeração; ativo verificado após a senha), `loginDemo` (`demo: true`), `logout` (limpa sessão), `changePassword` (confirma a atual quando já existe credencial; primeira senha sem atual).
- `LocalSession.issuedAt` + TTL 12 h (`SESSION_TTL_HOURS`/`isSessionExpired`): expirada limpa no carregamento; `SessionRepository.get()` agora retorna `null` (fim do `defaultSession`/OWNER automático) e ganhou `clear()`.
- Rotas `/login`, `/bloqueado`, `/trocar-senha`; `RequireSession` envolve todo o app; consumidores de sessão migraram para `useSession()`.
- `UsersPage`: campo opcional de senha (criar/editar) + indicador "Senha definida/Sem senha local"; `User.passwordHash/passwordSalt` via `AdministrationService`.
- AppShell: botão **Sair**, selo **Demonstração**, link **Trocar senha**; página de login com seção demo explícito.
- Evidência: `npm.cmd test` **137/137** (17 arquivos; novos `authentication-service.test.ts` com 7 casos, `access.test.ts` +2, `administration-service.test.ts` +2), build 0, tsc 0.
- Card: F7-02/#117 → DONE (libera F1-11/#19 na fila).

### `715e6e9` — feat: add user CRUD with roles, stores and active status (F2-04 usuários e funções)

- `AdministrationService.createUser/updateUser/setUserActive`: validação de nome/e-mail/duplicidade (case-insensitive), escopo derivado do papel, lojas obrigatórias só para escopo de loja, proteção da sessão atual contra auto-inativação.
- `sessionUserState` (`access.ts`): usuário inativo não entra — `providers.tsx` bloqueia a sessão com tela própria.
- `UsersPage` com formulário criar/editar (nome, e-mail, função, lojas em checkboxes), botões Editar/Inativar/Reativar e selo Ativo/Inativo; ações atrás de `users.manage`.
- Evidência: `npm.cmd test` **126/126** (16 arquivos; novos `administration-service.test.ts` com 9 casos, `access.test.ts` +2), build 0, tsc 0.
- Card: F2-04/#26 → DONE (libera F7-02 na fila).

### `7dc1d7b` — feat: enforce single money rounding rule (F1-09 precisão monetária)

- Novo `src/domain/money.ts`: regra única (`isMoney`, `requireMoney`, `toCents`, `fromCents`, `roundMoney`) — fronteira em reais finitos, cálculo em centavos inteiros.
- `itemsTotalCents` + `itemsTotal` via centavos (0.1 + 0.2 = 0.3 exato); helpers locais `cents`/`money` removidos de `cash.ts`/`cash-service.ts` em favor do compartilhado.
- Correções de fuga: `createQuote` rejeitava `NaN`/`Infinity` (`NaN <= 0` é falso); `confirm` agora valida total e itens; `stockState` trata saldo não finito como `OUT`.
- Evidência: `npm.cmd test` **115/115** (15 arquivos; novos `money.test.ts` com 10 casos), build 0, tsc 0.
- Card: F1-09/#17 → DONE.

## 07/10/2026

### `d6ab1d4` — feat: deduct stock when confirming sales with items (Fase E do fluxo operacional)

- `Sale.items` + `stockMovementsFor`; `createQuote` valida itens e calcula total/descrição.
- `SaleRepository.confirm(sale, movements)` transacional: confirma venda + baixa saldo + movimento `OUT` (guarda contra confirmação obsoleta).
- Helper compartilhado `applyStockMovement` (anti-saldo-negativo) reutilizado por venda e estoque.
- UI do Caixa: seletor `.sale-items-form` (produto/quantidade/preço) com saldo insuficiente avisado.
- Backup valida `items` e vínculo produto↔loja.
- Evidência: `npm.cmd test` **101/101**, build 0, tsc 0 (14 arquivos de teste; novos `sales-service.test.ts`, `sale-stock.test.ts`).
- Cards: F3-13 → DONE; F4-7 → DONE; F1-04/F4-01..03 confirmados.

### `a1be9b5` — feat: drive dashboard with real store metrics

- `src/domain/dashboard.ts` com seletores puros + `dashboard.test.ts` (8 casos).
- Pendências do dashboard viram links; passo "Ordens" no fluxo; guard `dashboard.view`.
- Card: F4-20 → DONE.

### `8a68d67` — feat: track work order production flow with due dates

- `WorkOrdersWorkspace` + rota `/ordens-servico`; `dueAt/notes/updatedAt/updatedBy`.
- Transições OPEN→IN_PRODUCTION→READY→DELIVERED (+CANCELLED); criação atômica por `saleId`; guarda de status obsoleto.
- Evidência: `work-order-service.test.ts` (9) + `work-orders.test.ts` (6).
- Card: F3-14 → IN PROGRESS (restam detalhe/histórico/lab/insumos).

### `3f2c0c1` — feat: add stock registration, movements and history

- `InventoryWorkspace` (cadastro/edição, IN/OUT/ADJUSTMENT, histórico, alertas); contrato transacional.
- Evidência: `inventory-service.test.ts` (10) + `inventory.test.ts` (7).
- Cards: F4-01..04 → DONE.

### `cbcf80f` — feat: add cash closing, durable receipts and sale payment status

- Fechamento com conferência (esperado/contado/diferença/autor/observação); recebimento transacional anti-duplicado; `paymentStatus` durável; abas Vendas/Recebimentos/Sessão.
- Evidência: `cash-service.test.ts` + `cash.test.ts`.
- Cards: F4-08/09/17 → DONE.

### `f3dda20` — chore: preserve local clinical workspace, backup and reception work

- Commit-base da branch `feat/operational-flow-v2` (preserva trabalho local pré-existente).

## 04/09/2026

- Auditoria `docs/DEVELOPMENT_AUDIT_A_H.md` publicada (fases A–H, evidências, bloqueios P0/P1, checklist final).
- Correções: boot por índices ausentes, seleção cliente→atendimento, estados assíncronos da recepção; 12 testes + build à época.

## Antes (histórico no `v1`)

- `3510602` docs: add AI structural project map (HEAD do `v1`).
- `78e9860` feat: unify cash workflow and role menus.
