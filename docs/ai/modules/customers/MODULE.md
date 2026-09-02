# Customers

## Purpose

Buscar, cadastrar e exibir clientes, seus dados básicos e histórico de atendimentos.

## Directory

Páginas em `src/app/pages.tsx`; domínio em `customer.ts` e `reception-service.ts`; persistência em `local-repositories.ts`.

## Routes

- `/clientes`
- `/clientes/novo`
- `/clientes/:customerId`

## Main Pages

`CustomersPage`, `CustomerNewPage`, `CustomerProfilePage`.

## Components

`Input`, `Button`, classes de lista e page header.

## Services

`ReceptionService`: list/get/create customer e operações de attendance.

## Repositories

`CustomerRepository` / `LocalCustomerRepository`.

## Stores / Hooks

Sem store ou hook dedicado; páginas usam `useState`/`useEffect`.

## Models

`Customer`. Histórico usa `Attendance`.

## Permissions

`customers.read`, `customers.manage`.

## Dependencies

Attendance, Design System, React Router e IndexedDB local.

## Public API

`ReceptionService.listCustomers`, `getCustomer`, `createCustomer`; contrato `CustomerRepository`.

## Files Normally Modified

- Listagem/busca/form/perfil: símbolos correspondentes em `pages.tsx`.
- Regra/orquestração: `reception-service.ts`.
- Busca/persistência: `LocalCustomerRepository`.
- Modelo: `customer.ts`.

## Avoid Modifying

Não alterar attendance inteiro para correção restrita à busca. Não acessar Dexie na página.

## Common Tasks

### Alterar listagem

→ `CustomersPage` + classes de lista.

### Alterar formulário

→ `CustomerNewPage` + `Customer` + createCustomer.

### Alterar busca

→ `CustomersPage` e `LocalCustomerRepository.list`.

### Alterar regra de negócio

→ `ReceptionService`.

### Alterar persistência

→ contrato + `LocalCustomerRepository` + schema se necessário.

## Related Modules

Attendance, clinical e sales/cash.
