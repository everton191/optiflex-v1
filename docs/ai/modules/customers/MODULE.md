# Customers

## Purpose

Buscar, cadastrar, editar e exibir clientes, seus dados básicos e histórico de atendimentos.

## Directory

Páginas em `src/app/CustomersWorkspace.tsx` (re-exportadas por `pages.tsx`); domínio em `customer.ts` e `reception-service.ts`; persistência em `local-repositories.ts`.

## Routes

- `/clientes`
- `/clientes/novo`
- `/clientes/:customerId`
- `/clientes/:customerId/editar`

## Main Pages

`CustomersPage`, `CustomerNewPage`, `CustomerProfilePage`, `CustomerEditPage`.

## Components

`Input`, `Button`, classes de lista, page header e `.page-title-actions`/`.form-actions`.

## Services

`ReceptionService`: list/get/create/update customer e operações de attendance; valida CPF/CNPJ (`isValidDocument`) antes de gravar.

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

`isValidDocument` (e `isValidCPF`/`isValidCNPJ`/`normalizeDocument`) em `customer.ts` valida documento com ou sem máscara.

`ReceptionService.listCustomers`, `getCustomer`, `createCustomer`, `updateCustomer`; contrato `CustomerRepository`.

## Files Normally Modified

- Listagem/busca/form/perfil: símbolos correspondentes em `CustomersWorkspace.tsx`.
- Regra/orquestração: `reception-service.ts`.
- Busca/persistência: `LocalCustomerRepository`.
- Modelo: `customer.ts`.

## Avoid Modifying

Não alterar attendance inteiro para correção restrita à busca. Não acessar Dexie na página.

## Common Tasks

### Alterar listagem

→ `CustomersPage` + classes de lista.

### Alterar formulário

→ `CustomerNewPage` (criação: nome/telefone/CPF) e `CustomerEditPage` (edição: nome/telefone/CPF/e-mail/nascimento) + `Customer` + createCustomer/updateCustomer.

### Alterar busca

→ `CustomersPage` e `LocalCustomerRepository.list`.

### Alterar validação de documento

→ `isValidCPF`/`isValidCNPJ`/`isValidDocument` em `customer.ts` + `createCustomer`/`updateCustomer`.

### Alterar regra de negócio

→ `ReceptionService`.

### Alterar persistência

→ contrato + `LocalCustomerRepository` + schema se necessário.

## Related Modules

Attendance, clinical e sales/cash.
