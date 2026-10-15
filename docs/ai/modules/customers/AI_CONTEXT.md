# AI CONTEXT — Customers

## Current Status

- Busca por nome, CPF ou telefone.
- Cadastro de nome, telefone e CPF/CNPJ.
- CPF/CNPJ validado no domínio (dígitos verificadores, com ou sem máscara) em create/update.
- Edição com complementação (nome, telefone, CPF, e-mail, nascimento) em `/clientes/:customerId/editar` (F2-06, `00d0d9e`); botão "Editar cadastro" no perfil (`customers.manage`).
- Perfil com histórico de atendimentos e resumo de contatos (telefone, CPF, e-mail, nascimento).
- Dados persistidos no IndexedDB; edição preserva `id`/`createdAt` e dura após reload.

## Current Decisions

- Uma única `ReceptionService` atende customers e attendance.
- Busca normaliza para minúsculas pt-BR e filtra em memória.
- Após cadastrar, navega para `/atendimentos?customer=<id>` quando permitido; caso contrário, abre o perfil.
- `updateCustomer` carrega o registro existente, valida nome (trim), normaliza opcionais (string vazia vira `undefined`) e persiste via `save` (put) preservando `id`/`createdAt`.
- Criação e edição compartilham a validação de nome; e-mail/nascimento só existem na edição (complementação).

## Known Problems

- Busca lê toda a tabela antes de filtrar.
- Ainda não há prevenção de duplicidade de cadastro.
- Criação não oferece e-mail/nascimento (só a edição complementa).

## Pending Work

- Completar campos/validadores de formulário (telefone obrigatório no plano e duplicidade).
- Testes específicos de busca e componentes.

## Important Files Right Now

- `src/app/CustomersWorkspace.tsx` (`CustomersPage`, `CustomerNewPage`, `CustomerProfilePage`, `CustomerEditPage`; re-exportadas por `pages.tsx`).
- `src/domain/reception-service.ts` (`createCustomer`, `updateCustomer`).
- `src/domain/customer.ts`.
- `LocalCustomerRepository` em `local-repositories.ts`.

## Recent Structural Changes

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

Agenda e recepção (F3-01) ou testes de permissões (F8-06).
