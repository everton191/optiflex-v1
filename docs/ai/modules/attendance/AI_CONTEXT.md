# AI CONTEXT — Attendance

## Current Status

- Criação de consulta e fila por loja.
- Atendimento completo em `/atendimentos/novo` (F3-02, `8daab89`): cliente, tipo, profissional opcional, prioridade (`NORMAL`/`URGENT`) e observações; envia para a fila e navega para o detalhe.
- Detalhe por URL direta em `/atendimentos/:attendanceId` (F3-02): dados completos + transições básicas.
- Fila completa em `/atendimentos` (F3-03, `c45a6bf`): estados ativos `WAITING`/`IN_PROGRESS` com chips Todos/Aguardando/Em atendimento (contagem), tempo de espera por registro ("espera X min", relógio de 30s), prioridade "Urgente", responsável (profissional) e ações por permissão: Iniciar, Finalizar, Faltou (`NO_SHOW`), Cancelar — estado final sai da fila na hora. Perfil clínico continua abrindo o prontuário pela linha.
- Add rápido (cliente → `CONSULTATION`) permanece no topo da fila para a seleção pré-carregada da agenda/cadastro.
- Agenda dia/semana em `/agenda` (F3-01, `679951f`): eventos com loja, cliente, profissional opcional e observações; consulta/retorno/ajuste viram atendimento sem redigitar cliente, herdando o profissional; persiste no IndexedDB (`agendaEvents`, schema v12).
- Histórico por cliente está funcional; itens não clínicos ganham link "Ver detalhe".

## Current Decisions

- Add rápido da fila cria sempre `CONSULTATION`; o formulário completo (tipo/notas/profissional/prioridade) é `/atendimentos/novo`.
- Fila ativa = `activeQueueStatuses` (`WAITING`/`IN_PROGRESS`) — fonte única compartilhada com `dashboard.waitingQueue`; `FINISHED`/`CANCELLED`/`NO_SHOW` saem da fila.
- `NO_SHOW` ("Faltou") é status fechado: só nasce de `WAITING`; "agendado" não vira status — continua na agenda (F3-01).
- Tempo de espera: `waitingMinutes(atendimento, now)` em `customer.ts` — minutos inteiros desde `createdAt` apenas para `WAITING` (data inválida/futura → 0); a UI recalcula a cada 30s.
- Transições no service (`attendanceTransitions` + `transitionAttendance`) e na UI da fila condicionadas a `attendance.create`; o detalhe repete as mesmas ações.
- Responsável = `professionalId` escolhido na criação; a fila apenas exibe (sem reatribuição).
- Status inicial é `WAITING`; prioridade padrão é `NORMAL` (campo opcional para compatibilidade com backups legados).
- Detalhe é leitura + transições; não há edição de campos já criados.
- Permissões: `/atendimentos/novo` exige `attendance.create`; detalhe exige `attendance.read`.
- Identificador usa `crypto.randomUUID()`.
- Agenda usa permissões de attendance (`attendance.read` para ver, `attendance.create` para criar/converter/cancelar).
- Conversão de evento: tipos CONSULTATION/RETURN/ADJUSTMENT mapeiam para o mesmo `AttendanceType`; DELIVERY e BILLING não viram atendimento; o profissional do evento é levado para o atendimento.
- Ranges de dia/semana são calculados em hora local (`dayRange`/`weekRange` em `agenda.ts`); armazenamento em ISO UTC.
- Semana começa na segunda-feira.

## Known Problems

- Eventos da agenda não têm edição (apenas cancelar e reagendar manualmente).
- Add rápido da fila não oferece tipo/notas/prioridade (usar `/atendimentos/novo`).
- Espera não é pausada/zerada ao iniciar; duração do atendimento não é exibida (sem `startedAt`).

## Pending Work

- Editar evento de agenda; alertas de conflito de horário.
- Tempo em atendimento (marcar início/fim) se a operação pedir SLA.

## Important Files Right Now

- `src/app/ReceptionWorkspace.tsx` (`AttendancePage`, `AgendaPage`, `ClinicalQueuePage`; re-exportado por `pages.tsx`).
- `src/domain/reception-service.ts`.
- `src/domain/agenda-service.ts` e `src/domain/agenda.ts`.
- `src/domain/customer.ts`.
- `LocalAttendanceRepository` e `LocalAgendaRepository`.

## Recent Structural Changes

- F3-03 (`c45a6bf`): `AttendanceStatus` + `NO_SHOW`, `attendanceTransitions` estendido, `activeQueueStatuses`/`isActiveQueueStatus`/`waitingMinutes` em `customer.ts` (fonte única com `dashboard.waitingQueue`), `AttendanceQueue` com filtros, espera, responsável e ações Iniciar/Finalizar/Faltou/Cancelar; backup aceita `NO_SHOW`; testes novos em `customer.test.ts` (28 arquivos, 252 casos).
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

Editar evento de agenda com alerta de conflito, tempo em atendimento se a operação pedir, testes de integração (F8-02) e demais cards da fila (F3-06/F3-07 clínicos).
