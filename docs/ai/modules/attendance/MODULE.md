# Attendance

## Purpose

Criar atendimentos para clientes e manter a fila da loja usada pela recepção e pela área clínica; a agenda (dia/semana) alimenta a fila com eventos convertidos em atendimento. A fila exibe estados ativos (aguardando/em atendimento) com filtros, tempo de espera por registro, prioridade, responsável e transições por permissão.

## Directory

UI em `src/app/pages.tsx`; tipos em `src/domain/customer.ts` e `src/domain/agenda.ts`; services em `reception-service.ts` e `agenda-service.ts`; repositories locais em storage.

## Routes

- `/atendimentos` (fila).
- `/atendimentos/novo` (`attendance.create`): cliente, tipo, profissional, prioridade e observações.
- `/atendimentos/:attendanceId` (`attendance.read`): detalhe acessível por URL direta + transições básicas.
- `/agenda` (dia/semana).
- Origem comum: `/clientes/:customerId` e `/clientes/novo`.

## Main Pages

`AttendancePage`, `AttendanceNewPage`, `AttendanceDetailPage`, `AgendaPage`. `ClinicalQueuePage` é consumidora relacionada.

## Components

Select HTML, `Button`, classes de lista e filtros `.status-filters` (chips Todos/Aguardando/Em atendimento com contagem).

## Services

`ReceptionService.startAttendance` (tipo/notas/profissional/prioridade), `getAttendance`, `transitionAttendance`, `listQueue`, `listCustomerAttendances`; `AgendaService.createEvent`, `listDay`, `listWeek`, `convertToAttendance`, `cancel`.

## Repositories

`AttendanceRepository` / `LocalAttendanceRepository`; `AgendaRepository` / `LocalAgendaRepository`.

## Stores / Hooks

Sem store/hook dedicado. Usa `currentStoreId` do App Context e estado React local.

## Models

`Attendance`, `AttendanceStatus` (inclui `NO_SHOW`), `AttendanceType`, `AttendancePriority`, `attendanceTransitions`, `activeQueueStatuses`/`isActiveQueueStatus`, `waitingMinutes`; `AgendaEvent`, `AgendaEventType`, `AgendaEventStatus`.

## Permissions

`attendance.read`, `attendance.create`, `attendance.queue.read`.

## Dependencies

Customers, store context e clinical.

## Public API

Métodos de attendance expostos por `ReceptionService` e `AttendanceRepository`; agenda por `AgendaService` e `AgendaRepository`.

## Files Normally Modified

- Fila/form: `AttendancePage` em `pages.tsx`.
- Agenda: `AgendaPage` em `pages.tsx`.
- Regras: `reception-service.ts` e `agenda-service.ts`.
- Tipos: `customer.ts` e `agenda.ts`.
- Persistência: `LocalAttendanceRepository` e `LocalAgendaRepository`.

## Avoid Modifying

Não duplicar cliente/loja na attendance. Não acessar Dexie na página.

## Common Tasks

### Alterar fila

→ `AttendanceQueue` em `AttendancePage` + `isActiveQueueStatus`/`waitingMinutes` em `customer.ts` + `transitionAttendance`. Estados finais saem da fila; ações exigem `attendance.create`.

### Criar atendimento completo (tipo, profissional, prioridade, notas)

→ AttendanceNewPage + `startAttendance`.

### Detalhe e transições de status

→ AttendanceDetailPage + `transitionAttendance` + `attendanceTransitions` em `customer.ts`.

### Alterar agenda ou conversão em atendimento

→ AgendaPage + `agenda-service.ts` + `agenda.ts` (ranges locais dia/semana).

### Alterar tipo de atendimento

→ AttendanceType, labels da UI e startAttendance.

### Alterar histórico

→ listByCustomer + CustomerProfilePage.

## Related Modules

Customers, clinical e administration/stores.
