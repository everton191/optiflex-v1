# AI CONTEXT — Inventory

## Current Status

- Models, repository e service implementados e testados (unit + storage).
- Página completa em `InventoryWorkspace.tsx`: cadastro/edição, movimentação, histórico e alertas.
- Service cria movimento inicial junto com o produto e valida saldo antes de gravar.
- Preço padrão (`defaultPrice`) e custo (`cost`) opcionais em reais, validados com `isMoney` (F1-06, `b0f72d1`).
- Catálogo por categoria (F2-11, `e3bd607`): `category` obrigatória (`FRAME`/`LENS`/`ACCESSORY`) + ficha `brand`/`material`/`description`, filtro em abas com contagem (`filterByCategory`) e categoria visível no seletor de produto do caixa.
- Códigos/preços/custos (F2-14, `1f17aeb`): código obrigatório e único por loja, margem calculada (`marginCents`), custo/margem só com `inventory.manage` e preço padrão pré-preenchido no caixa.

## Current Decisions

- Saída não pode produzir saldo negativo (validação no service e na transação do repository).
- Ajuste aceita quantidade com sinal e exige motivo; IN/OUT exigem quantidade > 0.
- Saldo não é editável: a edição do produto preserva o `quantity` persistido.
- `stockState`: OUT se `quantity <= 0`; LOW se `minimumQuantity > 0 && quantity <= minimumQuantity`.
- Estoque é isolado por `storeId`; autor gravado em `InventoryMovement.author`.
- Campos novos `code`/`author`/`defaultPrice`/`cost`/`category`/`brand`/`material`/`description` são opcionais e sem índice → sem bump de versão Dexie.
- Venda manual continua livre: `defaultPrice`/`cost` são referência de catálogo, não obrigam preço na venda.
- `create`/`update` exigem `category` válida (item novo nunca fica sem categoria); itens legados sem categoria seguem válidos e aparecem só no filtro `Todas`.
- Venda consome o próprio item do catálogo (baixa de estoque via `applyStockMovement`); categoria e ficha permanecem após a baixa.
- `create`/`update` exigem `code` não vazio (trim); duplicado na mesma loja rejeita "Código já cadastrado nesta loja." (comparação sem distinção de maiúsculas; na edição o próprio `id` é excluído). Itens legados sem código continuam válidos até serem editados.
- Custo (`cost`) e margem (`marginCents` = `defaultPrice - cost` em centavos) aparecem na lista só com `inventory.manage` (vendedor/AUDITOR não veem); o caixa nunca exibe custo.
- No caixa, selecionar produto no seletor de itens pré-preenche o preço unitário com `defaultPrice` (continua editável — venda manual livre).
- Histórico de preço e tabelas múltiplas seguem fora do escopo (F2-14).

## Known Problems

- Nenhum seed de produto.
- Vendas sem itens (serviços) não geram movimento.
- Variantes avançadas (F2-13) e campos fiscais (F2-15) ainda não existem.

## Pending Work

- Campos fiscais dos produtos (F2-15), variantes (F2-13).

## Important Files Right Now

- `src/app/InventoryWorkspace.tsx`.
- `src/domain/inventory-service.ts`.
- `src/domain/inventory.ts`.
- `LocalInventoryRepository` e tabelas inventory.

## Recent Structural Changes

- F2-14 (`1f17aeb`): `code` obrigatório + único por loja no service, `marginCents` em `inventory.ts`, custo/margem gated por `inventory.manage`, pré-preenchimento de `defaultPrice` no seletor do caixa e testes de duplicidade/rounding (272/272).
- F2-11 (`e3bd607`): catálogo com categoria obrigatória, ficha (`brand`/`material`/`description`), filtro por categoria, categoria no seletor do caixa e validação de backup.
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

Fila do KANBAN: F3-07 campos de grau (`#46`) ou F8-10 recuperação de dados (`#144`).
