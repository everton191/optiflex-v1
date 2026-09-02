# Attendance

## Purpose

Criar atendimentos para clientes e manter a fila da loja usada pela recepção e pela área clínica.

## Directory

UI em `src/app/pages.tsx`; tipos em `src/domain/customer.ts`; service em `reception-service.ts`; repository local em storage.

## Routes

- `/atendimentos`.
- Origem comum: `/clientes/:customerId` e `/clientes/novo`.

## Main Pages

`AttendancePage`. `ClinicalQueuePage` é consumidora relacionada.

## Components

Select HTML, `Button` e classes de lista.

## Services

`ReceptionService.startAttendance`, `listQueue`, `listCustomerAttendances`.

## Repositories

`AttendanceRepository` / `LocalAttendanceRepository`.

## Stores / Hooks

Sem store/hook dedicado. Usa `currentStoreId` do App Context e estado React local.

## Models

`Attendance`, `AttendanceStatus`, `AttendanceType`.

## Permissions

`attendance.read`, `attendance.create`, `attendance.queue.read`.

## Dependencies

Customers, store context e clinical.

## Public API

Métodos de attendance expostos por `ReceptionService` e `AttendanceRepository`.

## Files Normally Modified

- Fila/form: `AttendancePage` em `pages.tsx`.
- Regras: `reception-service.ts`.
- Tipos: `customer.ts`.
- Persistência: `LocalAttendanceRepository`.

## Avoid Modifying

Não duplicar cliente/loja na attendance. Não acessar Dexie na página.

## Common Tasks

### Alterar fila

→ AttendancePage + listByStore + status.

### Alterar tipo de atendimento

→ AttendanceType, labels da UI e startAttendance.

### Alterar histórico

→ listByCustomer + CustomerProfilePage.

## Related Modules

Customers, clinical e administration/stores.
