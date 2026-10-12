# Attendance

## Purpose

Criar atendimentos para clientes e manter a fila da loja usada pela recepção e pela área clínica; a agenda (dia/semana) alimenta a fila com eventos convertidos em atendimento.

## Directory

UI em `src/app/pages.tsx`; tipos em `src/domain/customer.ts` e `src/domain/agenda.ts`; services em `reception-service.ts` e `agenda-service.ts`; repositories locais em storage.

## Routes

- `/atendimentos`.
- `/agenda` (dia/semana).
- Origem comum: `/clientes/:customerId` e `/clientes/novo`.

## Main Pages

`AttendancePage`, `AgendaPage`. `ClinicalQueuePage` é consumidora relacionada.

## Components

Select HTML, `Button` e classes de lista.

## Services

`ReceptionService.startAttendance`, `listQueue`, `listCustomerAttendances`; `AgendaService.createEvent`, `listDay`, `listWeek`, `convertToAttendance`, `cancel`.

## Repositories

`AttendanceRepository` / `LocalAttendanceRepository`; `AgendaRepository` / `LocalAgendaRepository`.

## Stores / Hooks

Sem store/hook dedicado. Usa `currentStoreId` do App Context e estado React local.

## Models

`Attendance`, `AttendanceStatus`, `AttendanceType`; `AgendaEvent`, `AgendaEventType`, `AgendaEventStatus`.

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

→ AttendancePage + listByStore + status.

### Alterar agenda ou conversão em atendimento

→ AgendaPage + `agenda-service.ts` + `agenda.ts` (ranges locais dia/semana).

### Alterar tipo de atendimento

→ AttendanceType, labels da UI e startAttendance.

### Alterar histórico

→ listByCustomer + CustomerProfilePage.

## Related Modules

Customers, clinical e administration/stores.
