# Inventory

## Purpose

Representar itens por loja, saldo mínimo e movimentos de entrada, saída ou ajuste com histórico auditável.

## Directory

Página em `src/app/InventoryWorkspace.tsx` (re-exportada em `src/app/pages.tsx`); domínio em `inventory.ts` e `inventory-service.ts`; repository local em storage.

## Routes

- `/estoque`.

## Main Pages

`InventoryPage`: cadastro/edição de produtos, form de movimentação (IN/OUT/ADJUSTMENT), alertas de mínimo e histórico de movimentações.

## Components

Classes de lista, Badge (`badge`, `is-low`, `is-out`) e formulário `inventory-form`.

## Services

`InventoryService.list`, `history`, `create`, `update`, `adjust`.

## Repositories

`InventoryRepository` / `LocalInventoryRepository` (`listByStore`, `listMovements`, `createItem`, `updateItem`, `applyMovement`), todos transacionais.

## Stores / Hooks

Sem store/hook; usa estado local e `currentStoreId`.

## Models

`InventoryItem`, `InventoryMovement`, `InventoryMovementType`, `stockState`, `movementDelta`.

## Permissions

`inventory.read`, `inventory.manage`.

## Dependencies

Contexto de loja, sessão (`session.userName` como autor) e Dexie.

## Public API

`InventoryService`, `InventoryRepository`.

## Files Normally Modified

- Página: `src/app/InventoryWorkspace.tsx` + estilos `inventory-form`/`.badge.is-*`.
- Regras de saldo: `inventory-service.ts`.
- Modelos: `inventory.ts`.
- Persistência: `LocalInventoryRepository` e tabelas inventory.
- Backup: campos `code`/`author` validados em `backup.ts`.

## Avoid Modifying

Não ajustar quantidade diretamente pela página/repository sem criar movimento. Não permitir saldo negativo. A edição de produto nunca altera o saldo persistido.

## Common Tasks

### Alterar listagem

→ InventoryWorkspace + LocalInventoryRepository.listByStore.

### Alterar movimento

→ InventoryService.adjust + movementDelta + LocalInventoryRepository.applyMovement.

### Alterar persistência

→ contrato + repository + nova versão Dexie quando necessário (novos campos opcionais sem índice não exigem bump).

## Related Modules

Administration/stores; sales baixa o estoque na confirmação de vendas com itens, usando o helper `applyStockMovement` do mesmo arquivo de repositórios.
