# Inventory

## Purpose

Representar itens por loja, saldo mínimo e movimentos de entrada, saída ou ajuste com histórico auditável; catálogo por categoria (armação/lente/acesso) com ficha de produto ligada ao mesmo item que guarda o saldo.

## Directory

Página em `src/app/InventoryWorkspace.tsx` (re-exportada em `src/app/pages.tsx`); domínio em `inventory.ts` e `inventory-service.ts`; repository local em storage.

## Routes

- `/estoque`.

## Main Pages

`InventoryPage`: cadastro/edição de produtos com **código obrigatório** (barras/interno, único por loja), preço padrão/custo opcionais e ficha de catálogo (categoria obrigatória, marca, material, descrição), filtro por categoria em abas com contagem, form de movimentação (IN/OUT/ADJUSTMENT), alertas de mínimo e histórico de movimentações; custo e margem (`marginCents`) aparecem só com `inventory.manage`.

## Components

Classes de lista, Badge (`badge`, `is-low`, `is-out`) e formulário `inventory-form`.

## Services

`InventoryService.list`, `history`, `create`, `update`, `adjust`. `create`/`update` **exigem** `category` válida (`ProductCategory`), **código obrigatório** único por loja (trim; comparação sem distinção de maiúsculas; na edição o próprio item é excluído da comparação — F2-14) e normalizam `brand`/`material`/`description` (trim; vazio vira `undefined`); saldo continua imutável na edição.

## Repositories

`InventoryRepository` / `LocalInventoryRepository` (`listByStore`, `listMovements`, `createItem`, `updateItem`, `applyMovement`), todos transacionais.

## Stores / Hooks

Sem store/hook; usa estado local e `currentStoreId`.

## Models

`InventoryItem` (`code` obrigatório em produtos novos — F2-14; `defaultPrice?`, `cost?` em reais — F1-06; `category?`, `brand?`, `material?`, `description?` — F2-11), `InventoryMovement`, `InventoryMovementType`, `stockState`, `movementDelta`, `marginCents` (margem em centavos `preço - custo`, sem drift de arredondamento — F2-14), `productCategories`/`ProductCategory` (`FRAME`/`LENS`/`ACCESSORY`), `productCategoryLabels`, `isProductCategory`, `filterByCategory` (filtro `ALL` ou categoria; itens legados sem categoria só aparecem em `ALL`).

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
- Backup: campos `code`/`author`/`defaultPrice`/`cost` validados em `backup.ts`; `category` por `isProductCategory` e `brand`/`material`/`description` como strings opcionais (item legado sem categoria continua importável).

## Avoid Modifying

Não ajustar quantidade diretamente pela página/repository sem criar movimento. Não permitir saldo negativo. A edição de produto nunca altera o saldo persistido.

## Common Tasks

### Alterar listagem

→ InventoryWorkspace + LocalInventoryRepository.listByStore (+ `filterByCategory` para filtro de catálogo).

### Filtrar por categoria

→ `filterByCategory`/`productCategoryLabels` em `inventory.ts` + abas no InventoryWorkspace; seletor de produto no caixa (`pages.tsx`) mostra a categoria do produto e pré-preenche o preço unitário com `defaultPrice` (F2-14).

### Alterar movimento

→ InventoryService.adjust + movementDelta + LocalInventoryRepository.applyMovement.

### Alterar persistência

→ contrato + repository + nova versão Dexie quando necessário (novos campos opcionais sem índice não exigem bump).

## Related Modules

Administration/stores; sales baixa o estoque na confirmação de vendas com itens, usando o helper `applyStockMovement` do mesmo arquivo de repositórios — o item vendido é o mesmo do catálogo (categoria e ficha permanecem após a baixa).
