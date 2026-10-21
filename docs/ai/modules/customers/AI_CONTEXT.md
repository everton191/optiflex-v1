# AI CONTEXT — Customers

## Current Status

- Busca por nome, CPF ou telefone.
- Cadastro de nome, telefone e CPF/CNPJ.
- CPF/CNPJ validado no domínio (dígitos verificadores, com ou sem máscara) em create/update.
- Edição com complementação (nome, telefone, CPF, e-mail, nascimento) em `/clientes/:customerId/editar` (F2-06, `00d0d9e`); botão "Editar cadastro" no perfil (`customers.manage`).
- Perfil com **linha do tempo unificada** (F2-09/#153, `4ed148a`): atendimentos, vendas, OS e pagamentos do caixa em "Histórico" com filtros por tipo; `CustomerHistoryService` agrega as coleções por loja/`customerId`/`saleId`; `historyKindsFor(role)` esconde tipos sem permissão (vendedor não vê atendimentos/anamnese); links por permissão (consulta clínica só na própria loja). Antes: apenas atendimentos.
- Prevenção de duplicidade no cadastro novo (F2-08/#30, 08/10/2026): `findDuplicateCustomer`/`normalizeSearchText` em `customer.ts`; aviso com o cadastro encontrado e "Cadastrar mesmo assim" com motivo obrigatório.
- Dados persistidos no IndexedDB; edição preserva `id`/`createdAt` e dura após reload.

## Current Decisions

- Uma única `ReceptionService` atende customers e attendance.
- Busca normaliza para minúsculas pt-BR e filtra em memória.
- Duplicidade = CPF idêntico (dígitos normalizados, com ou sem máscara) OU nome+telefone iguais após normalização (sem acentos/caixa/pontuação, telefone só dígitos); campos vazios nunca casam. Sem bloqueio absoluto: o aviso libera o cadastro com motivo (auditoria quando F1-10 existir); o helper aceita `excludeId` para uso na edição.
- Após cadastrar, navega para `/atendimentos?customer=<id>` quando permitido; caso contrário, abre o perfil.
- `updateCustomer` carrega o registro existente, valida nome (trim), normaliza opcionais (string vazia vira `undefined`) e persiste via `save` (put) preservando `id`/`createdAt`.
- Criação e edição compartilham a validação de nome; e-mail/nascimento só existem na edição (complementação).

## Known Problems

- Busca lê toda a tabela antes de filtrar.
- Aviso de duplicidade depende da lista de clientes carregar no mount; se a carga falhar, o aviso é silenciado (melhor esforço). Edição de cadastro existente ainda não avisa duplicidade.
- Criação não oferece e-mail/nascimento (só a edição complementa).

## Pending Work

- Completar campos/validadores de formulário (telefone obrigatório no plano); duplicidade na edição (`CustomerEditPage`).
- Testes específicos de busca e componentes.

## Important Files Right Now

- `src/app/CustomersWorkspace.tsx` (`CustomersPage`, `CustomerNewPage`, `CustomerProfilePage`, `CustomerEditPage`; re-exportadas por `pages.tsx`).
- `src/domain/reception-service.ts` (`createCustomer`, `updateCustomer`).
- `src/domain/customer.ts`.
- `LocalCustomerRepository` em `local-repositories.ts`.

## Recent Structural Changes

- F2-09 (08/10/2026, `4ed148a`): `src/domain/customer-history.ts` (seletor puro `buildCustomerHistory`, `historyKindsFor`, kinds ATTENDANCE/SALE/WORK_ORDER/PAYMENT) + `customer-history-service.ts` (agrega atendimentos globais do cliente, vendas/OS da loja e recebimentos do caixa por `saleId`); `CustomerProfilePage` com timeline + filtros por tipo; `attendanceTypeLabels`/`attendanceStatusLabels` movidos de `ReceptionWorkspace` para `domain/customer.ts`; testes `customer-history.test.ts` (4); 350/350.
- F2-06 (`00d0d9e`): `updateCustomer` (validação/normalização, preserva `id`/`createdAt`), `CustomerEditPage` + rota `clientes/:customerId/editar` (`customers.manage`), botão "Editar cadastro" no perfil, CSS `.page-title-actions`/`.button.secondary`.
- Nome vazio após trim é rejeitado; contatos são normalizados.
- Cadastro impede envio repetido durante gravação e exibe erro sem limpar campos.
- Listagem/perfil têm loading, erro, retry e descarte de consultas antigas.
- Pré-seleção do cliente na fila corrigida; testes de service e persistência adicionados.
- Validação de CPF/CNPJ (F2-07/#29, `5868e80`): helpers em `customer.ts`, mensagem clara no cadastro/edição e rótulo do campo como CPF/CNPJ.

## Be Careful With

- Customer é consumido também por attendance e sales.
- Mudança de campos pode exigir nova versão Dexie (e-mail/nascimento são opcionais sem índice → sem bump).

## Next Likely Task

F3-12 (#51) descontos e aprovação (requer limites por perfil) ou F8-04 (#138) testes offline.
