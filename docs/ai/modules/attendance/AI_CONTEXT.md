# AI CONTEXT — Attendance

## Current Status

- Criação de consulta e fila por loja.
- Agenda dia/semana em `/agenda` (F3-01, `679951f`): eventos consulta/retorno/entrega/ajuste/cobrança com loja, cliente, profissional opcional e observações; consulta/retorno/ajuste viram atendimento na fila sem redigitar cliente; persiste no IndexedDB (`agendaEvents`, schema v12).
- Listagem da fila exibe apenas status `WAITING`.
- Itens da fila abrem prontuário somente para perfis com acesso clínico; recepção vê itens sem link.
- Histórico por cliente está funcional.

## Current Decisions

- Novo atendimento criado pela UI usa sempre `CONSULTATION`.
- Status inicial é `WAITING`.
- Identificador usa `crypto.randomUUID()`.
- Agenda usa permissões de attendance (`attendance.read` para ver, `attendance.create` para criar/converter/cancelar).
- Conversão de evento: tipos CONSULTATION/RETURN/ADJUSTMENT mapeiam para o mesmo `AttendanceType`; DELIVERY e BILLING não viram atendimento.
- Ranges de dia/semana são calculados em hora local (`dayRange`/`weekRange` em `agenda.ts`); armazenamento em ISO UTC.
- Semana começa na segunda-feira.

## Known Problems

- Não há ações para cancelar, iniciar ou concluir attendance direto na fila.
- Não há formulário para tipo/notas de recepção na fila (a agenda cobre agendamento com tipo/notas).
- Eventos da agenda não têm edição (apenas cancelar e reagendar manualmente).

## Pending Work

- Transições explícitas de status na fila.
- Editar evento de agenda; alertas de conflito de horário.

## Important Files Right Now

- `src/app/pages.tsx` (`AttendancePage`, `AgendaPage`, `ClinicalQueuePage`).
- `src/domain/reception-service.ts`.
- `src/domain/agenda-service.ts` e `src/domain/agenda.ts`.
- `src/domain/customer.ts`.
- `LocalAttendanceRepository` e `LocalAgendaRepository`.

## Recent Structural Changes

- F3-01 (`679951f`): `AgendaEvent` + `AgendaService` (criar/listar dia/semana/converter/cancelar), rota `/agenda`, link no menu, Dexie v12 (`agendaEvents`), backup schema 12 (schema 10/11 continuam importáveis).
- Pré-seleção por query validada; parâmetro removido após envio.
- Criação protegida por `attendance.create`, seleção válida e bloqueio de envio pendente.
- Estado vazio usa apenas WAITING, inclusive quando há atendimentos finalizados.
- Loading/erro/retry e estado isolado por montagem da loja evitam reaproveitar fila antiga.

## Be Careful With

- Clinical depende de `attendanceId` e status `WAITING`.
- Todas as consultas usam `currentStoreId`.
- Conversão de evento reutiliza o `customerId` do evento; não redigitar cliente.

## Next Likely Task

Transições da fila, atribuição de profissional, testes de permissões (F8-06) e auditoria de segurança (F8-07).
