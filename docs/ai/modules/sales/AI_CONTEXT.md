# AI CONTEXT — Sales

## Current Status

- Venda integrada à tela `/caixa` com seletor opcional de itens de estoque.
- `Sale.items?` guarda `{ inventoryItemId, name, quantity, unitPrice }`.
- Confirmação transacional (`LocalSaleRepository.confirm`) muda para `CONFIRMED` **e** baixa o saldo gerando movimentos `OUT` na mesma transação.
- Venda confirmada pode gerar ordem de serviço.

## Current Decisions

- Sem itens: total e descrição são digitados como antes; a confirmação não toca no estoque.
- Com itens: total e descrição são calculados no `createQuote`; preço é digitado por venda (não existe preço no cadastro de produto).
- Produto esgotado vem desabilitado no seletor e a UI avisa saldo insuficiente antes de adicionar; a autoridade final é a transação de confirmação.
- Movimento de saída usa `reason: "Venda: <descrição>"` e não tem `author`.
- `SaleRepository.confirm(sale, movements)` é a única porta de confirmação; `save` não confirma mais venda.
- Campos novos de `Sale` são opcionais e sem índice → sem bump de versão Dexie; backup valida `items` e o vínculo com `inventoryItems` da mesma loja.

## Known Problems

- Não há catálogo/preços no estoque (preço unitário é digitado a cada venda).
- Não há cancelamento na UI; venda cancelada depois de paga não é tratada.
- Venda sem itens não mexe no estoque (serviços permanecem fora do controle de saldo).
- Rota usa `cash.read`, exigindo essa permission para seller.

## Pending Work

- Cancelamento auditado com devolução de estoque.
- Catálogo com preço padrão por produto.
- OS consumindo estoque (insumos).

## Important Files Right Now

- `CashDeskPage` em `src/app/pages.tsx` (form + `.sale-items-*`).
- `src/domain/sales-service.ts` (validação de itens e `confirm`).
- `src/domain/sales.ts` (`SaleItem`, `itemsTotal`, `stockMovementsFor`).
- `LocalSaleRepository.confirm` + `applyStockMovement` em `local-repositories.ts`.

## Recent Structural Changes

- Fase E: venda → estoque atômica (confirmação + movimento `OUT` na mesma transação).
- Testes: `src/domain/sales-service.test.ts` (7) e `src/infrastructure/storage/sale-stock.test.ts` (4, inclui concorrência).

## Be Careful With

- CashDeskPage também serve cash e work-orders.
- Não chamar `repository.save` para mudar status de QUOTE para CONFIRMED; usar sempre `confirm`.
- O seletor de itens carrega produtos para quem tem `sales.manage`, mesmo sem `inventory.read` (leitura pontual; a tela de estoque continua protegida).

## Next Likely Task

Cancelamento com devolução de estoque ou OS consumindo insumos.
