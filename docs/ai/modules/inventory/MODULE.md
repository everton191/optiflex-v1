# Inventory

## Purpose

Representar itens por loja, saldo mínimo e movimentos de entrada, saída ou ajuste.

## Directory

Página em `src/app/pages.tsx`; domínio em `inventory.ts` e `inventory-service.ts`; repository local em storage.

## Routes

- `/estoque`.

## Main Pages

`InventoryPage` (listagem).

## Components

Classes de lista e Badge visual.

## Services

`InventoryService.list`, `adjust`.

## Repositories

`InventoryRepository` / `LocalInventoryRepository`.

## Stores / Hooks

Sem store/hook; usa estado local e `currentStoreId`.

## Models

`InventoryItem`, `InventoryMovement`, `InventoryMovementType`.

## Permissions

`inventory.read`, `inventory.manage`.

## Dependencies

Contexto de loja e Dexie.

## Public API

`InventoryService`, `InventoryRepository`.

## Files Normally Modified

- Listagem: `InventoryPage`.
- Regras de saldo: `inventory-service.ts`.
- Modelos: `inventory.ts`.
- Persistência: `LocalInventoryRepository` e tabelas inventory.

## Avoid Modifying

Não ajustar quantidade diretamente pela página/repository sem criar movimento. Não permitir saldo negativo.

## Common Tasks

### Alterar listagem

→ InventoryPage + LocalInventoryRepository.listByStore.

### Alterar movimento

→ InventoryService.adjust + InventoryMovement.

### Alterar persistência

→ contrato + repository + nova versão Dexie quando necessário.

## Related Modules

Administration/stores; sales ainda não movimenta inventory.
