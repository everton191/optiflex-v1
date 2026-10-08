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

- Ordens de serviço não consomem estoque.
- Nenhum seed de produto.
- Vendas sem itens (serviços) não geram movimento.

## Pending Work

- OS consumindo insumos ao concluir/entregar.
- Cancelamento de venda devolvendo saldo.

## Important Files Right Now

- `src/app/InventoryWorkspace.tsx`.
- `src/domain/inventory-service.ts`.
- `src/domain/inventory.ts`.
- `LocalInventoryRepository` e tabelas inventory.

## Recent Structural Changes

- Fase E: baixa de estoque na confirmação de venda (`LocalSaleRepository.confirm` reutiliza `applyStockMovement`).
- `InventoryPage` extraída de `pages.tsx` para `InventoryWorkspace.tsx`.
- Contrato `InventoryRepository` trocado por `createItem`/`updateItem`/`applyMovement` transacionais.
- Backup valida os novos campos `code`, `author` e os itens de venda vinculados.

## Be Careful With

- Manter atualização do item e criação do movimento na mesma transação.
- Mudanças de schema exigem nova versão Dexie.

## Next Likely Task

Vincular ordens de serviço a movimentos de estoque (insumos) ou devolução no cancelamento de venda.
