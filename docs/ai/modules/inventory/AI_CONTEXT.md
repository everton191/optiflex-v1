# AI CONTEXT — Inventory

## Current Status

- Models, repository e service implementados.
- Página lista itens e quantidades por loja.
- Service registra movimento junto com novo saldo.

## Current Decisions

- Saída não pode produzir saldo negativo.
- Ajuste exige quantidade positiva e motivo.
- Estoque é isolado por `storeId`.

## Known Problems

- UI não cadastra item nem chama `adjust`.
- Nenhum seed de produto.
- Não há histórico de movimentos visível.
- Sales não reduz estoque.

## Pending Work

- Cadastro de produtos.
- Entrada/saída/ajuste na UI.
- Alertas de mínimo e histórico.
- Integração transacional com venda.

## Important Files Right Now

- `InventoryPage` em `src/app/pages.tsx`.
- `src/domain/inventory-service.ts`.
- `src/domain/inventory.ts`.
- `LocalInventoryRepository` e tabelas inventory.

## Recent Structural Changes

- Menu de Estoque passou a aparecer apenas para roles autorizadas.

## Be Careful With

- Manter atualização do item e criação do movimento consistentes.
- Mudanças de schema exigem nova versão Dexie.

## Next Likely Task

Expor movimentação na interface com validação e histórico.
