# AI CONTEXT — Inventory

## Current Status

- Models, repository e service implementados e testados (unit + storage).
- Página completa em `InventoryWorkspace.tsx`: cadastro/edição, movimentação, histórico e alertas.
- Service cria movimento inicial junto com o produto e valida saldo antes de gravar.

## Current Decisions

- Saída não pode produzir saldo negativo (validação no service e na transação do repository).
- Ajuste aceita quantidade com sinal e exige motivo; IN/OUT exigem quantidade > 0.
- Saldo não é editável: a edição do produto preserva o `quantity` persistido.
- `stockState`: OUT se `quantity <= 0`; LOW se `minimumQuantity > 0 && quantity <= minimumQuantity`.
- Estoque é isolado por `storeId`; autor gravado em `InventoryMovement.author`.
- Campos novos `code`/`author` são opcionais e sem índice → sem bump de versão Dexie.

## Known Problems

- Sales não reduz estoque.
- Nenhum seed de produto.

## Pending Work

- Integração transacional venda → movimento de saída.
- Ordens de serviço consumindo estoque (Fase C).

## Important Files Right Now

- `src/app/InventoryWorkspace.tsx`.
- `src/domain/inventory-service.ts`.
- `src/domain/inventory.ts`.
- `LocalInventoryRepository` e tabelas inventory.

## Recent Structural Changes

- `InventoryPage` extraída de `pages.tsx` para `InventoryWorkspace.tsx`.
- Contrato `InventoryRepository` trocado por `createItem`/`updateItem`/`applyMovement` transacionais.
- Backup valida os novos campos `code` e `author`.

## Be Careful With

- Manter atualização do item e criação do movimento na mesma transação.
- Mudanças de schema exigem nova versão Dexie.

## Next Likely Task

Fase C — vincular ordens de serviço a movimentos de estoque.
