# AI CONTEXT — Attendance

## Current Status

- Criação de consulta e fila por loja.
- Listagem exibe apenas status `WAITING`.
- Itens da fila abrem prontuário somente para perfis com acesso clínico; recepção vê itens sem link.
- Histórico por cliente está funcional.

## Current Decisions

- Novo atendimento criado pela UI usa sempre `CONSULTATION`.
- Status inicial é `WAITING`.
- Identificador usa `crypto.randomUUID()`.

## Known Problems

- Não há ações para cancelar, iniciar ou concluir attendance.
- Não há formulário para tipo/notas de recepção.

## Pending Work

- Transições explícitas de status.
- Automatização de testes da interface da fila; service/persistência já têm regressões básicas.

## Important Files Right Now

- `src/app/pages.tsx` (`AttendancePage`, `ClinicalQueuePage`).
- `src/domain/reception-service.ts`.
- `src/domain/customer.ts`.
- `LocalAttendanceRepository`.

## Recent Structural Changes

- Pré-seleção por query validada; parâmetro removido após envio.
- Criação protegida por `attendance.create`, seleção válida e bloqueio de envio pendente.
- Estado vazio usa apenas WAITING, inclusive quando há atendimentos finalizados.
- Loading/erro/retry e estado isolado por montagem da loja evitam reaproveitar fila antiga.

- Menu de atendimento foi reduzido conforme role; fluxo de dados permaneceu igual.

## Be Careful With

- Clinical depende de `attendanceId` e status `WAITING`.
- Todas as consultas usam `currentStoreId`.

## Next Likely Task

Completar transições da fila, atribuição de profissional, tipos e prioridade.
