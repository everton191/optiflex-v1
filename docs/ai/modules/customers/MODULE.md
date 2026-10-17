# Customers

## Purpose

Buscar, cadastrar, editar e exibir clientes, seus dados básicos e a linha do tempo unificada de atendimentos, vendas, ordens de serviço e pagamentos.

## Directory

Páginas em `src/app/CustomersWorkspace.tsx` (re-exportadas por `pages.tsx`); domínio em `customer.ts`, `customer-history.ts`, `customer-history-service.ts` e `reception-service.ts`; persistência em `local-repositories.ts`.

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

`CustomerHistoryService` (`customer-history-service.ts`, F2-09): `list(customerId, { storeId, role })` agrega atendimentos do cliente (global), vendas e OS da loja por `customerId` e recebimentos do caixa via `saleId`; devolve `CustomerHistoryEvent[]` prontos para a timeline.

## Repositories

`CustomerRepository` / `LocalCustomerRepository`.

## Stores / Hooks

Sem store ou hook dedicado; páginas usam `useState`/`useEffect`.

## Models

`Customer`; labels `attendanceTypeLabels`/`attendanceStatusLabels` agora vivem em `customer.ts` (o domínio não importa app). Timeline em `customer-history.ts`: `CustomerHistoryKind` (ATTENDANCE/SALE/WORK_ORDER/PAYMENT), `CustomerHistoryEvent` (id, kind, at, title, detail?, href?, storeId, otherStore), `historyKindsFor(role)` (attendance.read → atendimentos; sales.read → vendas+OS; cash.read → pagamentos) e `buildCustomerHistory` puro (ordena por data desc; consulta clínica como link só para `clinical.workspace.access` na própria loja; nunca expõe conteúdo clínico).

## Permissions

`customers.read`, `customers.manage`; a timeline respeita `attendance.read`, `sales.read`, `cash.read` e `clinical.workspace.access` (vendedor não vê atendimentos/anamnese).

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

### Alterar o histórico/timeline do perfil

→ `customer-history.ts` (seletor puro + labels + permissões), `customer-history-service.ts` (agregação por loja), seção "Histórico" do `CustomerProfilePage` (filtros por tipo) e testes `customer-history.test.ts`. Novas fontes de evento entram no `CustomerHistoryInput` e no `buildCustomerHistory` — nunca com conteúdo clínico.

## Related Modules

Attendance, clinical e sales/cash.
