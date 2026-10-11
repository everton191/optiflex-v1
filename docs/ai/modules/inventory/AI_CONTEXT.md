# AI CONTEXT — Inventory

## Current Status

- Models, repository e service implementados e testados (unit + storage).
- Página completa em `InventoryWorkspace.tsx`: cadastro/edição, movimentação, histórico e alertas.
- Service cria movimento inicial junto com o produto e valida saldo antes de gravar.
- Preço padrão (`defaultPrice`) e custo (`cost`) opcionais em reais, validados com `isMoney` (F1-06, `b0f72d1`).

## Current Decisions

- Saída não pode produzir saldo negativo (validação no service e na transação do repository).
- Ajuste aceita quantidade com sinal e exige motivo; IN/OUT exigem quantidade > 0.
- Saldo não é editável: a edição do produto preserva o `quantity` persistido.
- `stockState`: OUT se `quantity <= 0`; LOW se `minimumQuantity > 0 && quantity <= minimumQuantity`.
- Estoque é isolado por `storeId`; autor gravado em `InventoryMovement.author`.
- Campos novos `code`/`author`/`defaultPrice`/`cost` são opcionais e sem índice → sem bump de versão Dexie.
- Venda manual continua livre: `defaultPrice`/`cost` são referência de catálogo, não obrigam preço na venda.

## Known Problems

- Nenhum seed de produto.
- Vendas sem itens (serviços) não geram movimento.
- Catálogo completo (categoria/variantes) ainda não existe — F2-11.

## Pending Work

- Cancelamento de venda devolvendo saldo (F4-18).
- Catálogo de produtos com categoria/variantes (F2-11).

## Important Files Right Now

- `src/app/InventoryWorkspace.tsx`.
- `src/domain/inventory-service.ts`.
- `src/domain/inventory.ts`.
- `LocalInventoryRepository` e tabelas inventory.

## Recent Structural Changes

- F1-06 (`b0f72d1`): `defaultPrice`/`cost` em `InventoryItem`, formulário e backup.
- F3-14 (`e56939e`): OS consome insumos via `WorkOrderRepository.recordInputs` (movimentos OUT).
- Fase E: baixa de estoque na confirmação de venda (`LocalSaleRepository.confirm` reutiliza `applyStockMovement`).
- `InventoryPage` extraída de `pages.tsx` para `InventoryWorkspace.tsx`.
- Contrato `InventoryRepository` trocado por `createItem`/`updateItem`/`applyMovement` transacionais.
- Backup valida os novos campos `code`, `author` e os itens de venda vinculados.

## Be Careful With

- Manter atualização do item e criação do movimento na mesma transação.
- Mudanças de schema exigem nova versão Dexie.

## Next Likely Task

Catálogo de produtos (F2-11) sobre `InventoryItem` com `defaultPrice`/`cost`, ou estornos/cancelamentos (F4-18) devolvendo saldo.
