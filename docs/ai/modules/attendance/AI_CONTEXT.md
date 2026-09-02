# AI CONTEXT — Attendance

## Current Status

- Criação de consulta e fila por loja.
- Listagem exibe apenas status `WAITING`.
- Itens da fila abrem prontuário clínico.
- Histórico por cliente está funcional.

## Current Decisions

- Novo atendimento criado pela UI usa sempre `CONSULTATION`.
- Status inicial é `WAITING`.
- Identificador usa `crypto.randomUUID()`.

## Known Problems

- Query parameter `customer` não é lido.
- Não há ações para cancelar, iniciar ou concluir attendance.
- Não há formulário para tipo/notas de recepção.
- `attendance.create` não é verificada separadamente no botão.

## Pending Work

- Pré-seleção do cliente.
- Transições explícitas de status.
- Testes do service e da fila.

## Important Files Right Now

- `src/app/pages.tsx` (`AttendancePage`, `ClinicalQueuePage`).
- `src/domain/reception-service.ts`.
- `src/domain/customer.ts`.
- `LocalAttendanceRepository`.

## Recent Structural Changes

- Menu de atendimento foi reduzido conforme role; fluxo de dados permaneceu igual.

## Be Careful With

- Clinical depende de `attendanceId` e status `WAITING`.
- Todas as consultas usam `currentStoreId`.

## Next Likely Task

Completar transições da fila e consumir o cliente informado pela rota.
