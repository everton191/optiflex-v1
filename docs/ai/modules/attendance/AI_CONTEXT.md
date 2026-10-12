# AI CONTEXT — Attendance

## Current Status

- Criação de consulta e fila por loja.
- Atendimento completo em `/atendimentos/novo` (F3-02, `8daab89`): cliente, tipo, profissional opcional, prioridade (`NORMAL`/`URGENT`) e observações; envia para a fila e navega para o detalhe.
- Detalhe por URL direta em `/atendimentos/:attendanceId` (F3-02): dados completos + transições básicas (`WAITING`→`IN_PROGRESS`→`FINISHED`, qualquer uma ativa→`CANCELLED`).
- Fila (`/atendimentos`) mantém o add rápido (cliente → `CONSULTATION`); linhas da fila abrem o detalhe para quem não tem acesso clínico e o prontuário para quem tem.
- Agenda dia/semana em `/agenda` (F3-01, `679951f`): eventos consulta/retorno/entrega/ajuste/cobrança com loja, cliente, profissional opcional e observações; consulta/retorno/ajuste viram atendimento na fila sem redigitar cliente, carregando o profissional do evento; persiste no IndexedDB (`agendaEvents`, schema v12).
- Listagem da fila exibe apenas status `WAITING` (badge "Urgente" quando prioridade `URGENT`).
- Histórico por cliente está funcional; itens não clínicos ganham link "Ver detalhe".

## Current Decisions

- Add rápido da fila cria sempre `CONSULTATION`; o formulário completo (tipo/notas/profissional/prioridade) é `/atendimentos/novo`.
- Status inicial é `WAITING`; prioridade padrão é `NORMAL` (campo opcional no modelo para compatibilidade com backups legados).
- Transições ficam em `attendanceTransitions` (`customer.ts`) e são aplicadas só por `ReceptionService.transitionAttendance`; status fechados (`FINISHED`/`CANCELLED`) não reabrem.
- Detalhe é leitura + transições; não há edição de campos já criados.
- Permissões: `/atendimentos/novo` exige `attendance.create`; detalhe exige `attendance.read`; transições são condicionadas a `attendance.create` na UI.
- Identificador usa `crypto.randomUUID()`.
- Agenda usa permissões de attendance (`attendance.read` para ver, `attendance.create` para criar/converter/cancelar).
- Conversão de evento: tipos CONSULTATION/RETURN/ADJUSTMENT mapeiam para o mesmo `AttendanceType`; DELIVERY e BILLING não viram atendimento; o profissional do evento é levado para o atendimento.
- Ranges de dia/semana são calculados em hora local (`dayRange`/`weekRange` em `agenda.ts`); armazenamento em ISO UTC.
- Semana começa na segunda-feira.

## Known Problems

- Eventos da agenda não têm edição (apenas cancelar e reagendar manualmente).
- Add rápido da fila não oferece tipo/notas/prioridade (usar `/atendimentos/novo`).

## Pending Work

- Editar evento de agenda; alertas de conflito de horário.

## Important Files Right Now

- `src/app/pages.tsx` (`AttendancePage`, `AgendaPage`, `ClinicalQueuePage`).
- `src/domain/reception-service.ts`.
- `src/domain/agenda-service.ts` e `src/domain/agenda.ts`.
- `src/domain/customer.ts`.
- `LocalAttendanceRepository` e `LocalAgendaRepository`.

## Recent Structural Changes

- F3-02 (`8daab89`): `Attendance` + `professionalId`/`priority`, `AttendanceRepository.get`, `ReceptionService.getAttendance`/`transitionAttendance`, rotas `/atendimentos/novo` e `/atendimentos/:attendanceId` (19 rotas na matriz de guards), prioridade validada no backup, conversão de agenda carrega o profissional; testes `permission-routes` 17→19 e persistência pós-reload em `database.test`.
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

Editar evento de agenda com alerta de conflito, testes de permissões restantes (F8-02 integração) e demais cards da fila de atendimento (F3-03 triagem).
