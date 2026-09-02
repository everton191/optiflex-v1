# AI CONTEXT — Customers

## Current Status

- Busca por nome, CPF ou telefone.
- Cadastro de nome, telefone e CPF.
- Perfil com histórico de atendimentos.
- Dados persistidos no IndexedDB.

## Current Decisions

- Uma única `ReceptionService` atende customers e attendance.
- Busca normaliza para minúsculas pt-BR e filtra em memória.
- Após cadastrar, navega para `/atendimentos?customer=<id>`.

## Known Problems

- `AttendancePage` ainda não consome o query parameter `customer`.
- Não há edição/exclusão de cliente.
- Busca lê toda a tabela antes de filtrar.
- Não há validação de CPF ou duplicidade.

## Pending Work

- Pré-selecionar cliente no novo atendimento.
- Validadores de formulário.
- Testes para busca e criação.

## Important Files Right Now

- `src/app/pages.tsx` (`CustomersPage`, `CustomerNewPage`, `CustomerProfilePage`).
- `src/domain/reception-service.ts`.
- `src/domain/customer.ts`.
- `LocalCustomerRepository` em `local-repositories.ts`.

## Recent Structural Changes

- Textos da interface foram simplificados; arquitetura não mudou.

## Be Careful With

- Customer é consumido também por attendance e sales.
- Mudança de campos pode exigir nova versão Dexie.

## Next Likely Task

Corrigir o fluxo de cadastro para pré-selecionar o cliente no atendimento.
