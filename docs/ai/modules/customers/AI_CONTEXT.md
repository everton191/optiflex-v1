# AI CONTEXT — Customers

## Current Status

- Busca por nome, CPF ou telefone.
- Cadastro de nome, telefone e CPF.
- Perfil com histórico de atendimentos.
- Dados persistidos no IndexedDB.

## Current Decisions

- Uma única `ReceptionService` atende customers e attendance.
- Busca normaliza para minúsculas pt-BR e filtra em memória.
- Após cadastrar, navega para `/atendimentos?customer=<id>` quando permitido; caso contrário, abre o perfil.

## Known Problems

- Não há edição/exclusão de cliente.
- Busca lê toda a tabela antes de filtrar.
- Não há validação de CPF ou duplicidade.

## Pending Work

- Completar campos/validadores de formulário (telefone obrigatório no plano, CPF e duplicidade).
- Testes específicos de busca e componentes.

## Important Files Right Now

- `src/app/pages.tsx` (`CustomersPage`, `CustomerNewPage`, `CustomerProfilePage`).
- `src/domain/reception-service.ts`.
- `src/domain/customer.ts`.
- `LocalCustomerRepository` em `local-repositories.ts`.

## Recent Structural Changes

- Nome vazio após trim é rejeitado; contatos são normalizados.
- Cadastro impede envio repetido durante gravação e exibe erro sem limpar campos.
- Listagem/perfil têm loading, erro, retry e descarte de consultas antigas.
- Pré-seleção do cliente na fila corrigida; testes de service e persistência adicionados.

- Textos da interface foram simplificados; arquitetura não mudou.

## Be Careful With

- Customer é consumido também por attendance e sales.
- Mudança de campos pode exigir nova versão Dexie.

## Next Likely Task

Completar cadastro/perfil e histórico integrado conforme `docs/DEVELOPMENT_AUDIT_A_H.md`.
