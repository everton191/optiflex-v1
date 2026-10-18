# Inventory

## Purpose

Representar itens por loja, saldo mínimo e movimentos de entrada, saída ou ajuste com histórico auditável; catálogo por categoria (armação/lente/acesso) com ficha de produto ligada ao mesmo item que guarda o saldo; transferência entre filiais (F4-06) baixando o saldo na separação e creditando no destino no recebimento.

## Directory

Página em `src/app/InventoryWorkspace.tsx` (re-exportada em `src/app/pages.tsx`); domínio em `inventory.ts` e `inventory-service.ts`; repository local em storage.

## Routes

- `/estoque`.

## Main Pages

`InventoryPage`: cadastro/edição de produtos com **código obrigatório** (barras/interno, único por loja), preço padrão/custo opcionais e ficha de catálogo (categoria obrigatória, marca, material, descrição), filtro por categoria em abas com contagem, form de movimentação (IN/OUT/ADJUSTMENT), alertas de mínimo e histórico de movimentações; custo e margem (`marginCents`) aparecem só com `inventory.manage`. Seção "Transferências entre filiais" (F4-06): solicitação multi-produto com saldo disponível em tempo real, ações por status (Separar → Em trânsito → Receber) e cancelamento com motivo (devolve saldo à origem quando já separado); tudo exige `inventory.manage` e `assertStoreAccess` nas duas lojas. Seção "Serviços" (F2-12): catálogo por loja (`ServiceCatalogItem` — nome único case-insensitive, preço padrão, descrição opcional) com CRUD em `inventory.manage`; selecionável no Caixa como tratamento sem estoque.

## Components

Classes de lista, Badge (`badge`, `is-low`, `is-out`) e formulário `inventory-form`.

## Services

`InventoryService.list`, `history`, `create`, `update`, `adjust`. `create`/`update` **exigem** `category` válida (`ProductCategory`), **código obrigatório** único por loja (trim; comparação sem distinção de maiúsculas; na edição o próprio item é excluído da comparação — F2-14) e normalizam `brand`/`material`/`description` (trim; vazio vira `undefined`); saldo continua imutável na edição. `TransferService.request/separate/markInTransit/receive/cancel` (F4-06) orquestram o ciclo da transferência, validam saldo disponível na separação e audita com entity `transfer`.

## Repositories

`InventoryRepository` / `LocalInventoryRepository` (`listByStore`, `listMovements`, `createItem`, `updateItem`, `applyMovement`, `applyReservation`), todos transacionais. `TransferRepository` / `LocalTransferRepository` (`listByStore`, `create`, `separate`, `markInTransit`, `receive`, `cancel`) — `separate`/`receive`/`cancel` transacionais sobre `transfers` + `inventoryItems` + `inventoryMovements` (Dexie v16). `ServiceCatalogRepository` / `LocalServiceCatalogRepository` (`listByStore`, `create`, `update`, `remove`; Dexie v17 `services`).

## Stores / Hooks

Sem store/hook; usa estado local e `currentStoreId`.

## Models

`InventoryItem` (`code` obrigatório em produtos novos — F2-14; `defaultPrice?`, `cost?` em reais — F1-06; `category?`, `brand?`, `material?`, `description?` — F2-11; `reservedQuantity?` — F4-05), `availableQuantity` (saldo − reservado), `InventoryMovement`, `InventoryMovementType`, `stockState`, `movementDelta`, `marginCents` (margem em centavos `preço - custo`, sem drift de arredondamento — F2-14), `productCategories`/`ProductCategory` (`FRAME`/`LENS`/`ACCESSORY`), `productCategoryLabels`, `isProductCategory`, `filterByCategory` (filtro `ALL` ou categoria; itens legados sem categoria só aparecem em `ALL`); `Transfer`/`TransferItem`/`TransferStatus` (F4-06), `transferStatusLabels`, `isTransferStatus`, `transferTransitions`, `assertValidTransferItems`.

## Permissions

`inventory.read`, `inventory.manage`.

## Dependencies

Contexto de loja, sessão (`session.userName` como autor) e Dexie.

## Public API

`InventoryService`, `InventoryRepository`, `TransferService`, `TransferRepository`, `ServiceCatalogService`, `ServiceCatalogRepository`.

## Files Normally Modified

- Página: `src/app/InventoryWorkspace.tsx` + estilos `inventory-form`/`.badge.is-*`.
- Regras de saldo: `inventory-service.ts`; transferências: `transfer-service.ts`.
- Modelos: `inventory.ts`, `transfer.ts`.
- Persistência: `LocalInventoryRepository`, `LocalTransferRepository`, `LocalServiceCatalogRepository` e tabelas inventory/transfers/services (Dexie v16/v17).
- Backup: campos `code`/`author`/`defaultPrice`/`cost` validados em `backup.ts`; `category` por `isProductCategory` e `brand`/`material`/`description` como strings opcionais (item legado sem categoria continua importável); schema 16 valida `transfers` (status enum, itens e FKs das duas lojas); schema 17 valida `services` (nome/preço/FK de loja).

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

→ contrato + repository + nova versão Dexie quando necessário (novos campos opcionais sem índice não exigem bump; novas tabelas exigem — v16 adicionou `transfers`).

### Adicionar estado de transferência

→ `transfer.ts` (transições/labels) + `LocalTransferRepository` (guarda de status na transação) + UI das ações no InventoryWorkspace; backup precisa conhecer o novo status (`isTransferStatus`).

## Related Modules

Administration/stores; sales baixa o estoque na confirmação de vendas com itens, usando o helper `applyStockMovement` do mesmo arquivo de repositórios — o item vendido é o mesmo do catálogo (categoria e ficha permanecem após a baixa).
