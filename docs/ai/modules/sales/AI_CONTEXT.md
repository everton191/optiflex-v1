# AI CONTEXT — Sales

## Current Status

- Venda integrada à tela `/caixa` com seletor opcional de itens de estoque.
- `Sale.items?` guarda `{ inventoryItemId, name, quantity, unitPrice }`.
- Confirmação transacional (`LocalSaleRepository.confirm`) muda para `CONFIRMED` **e** baixa o saldo gerando movimentos `OUT` na mesma transação.
- Cancelamento auditado (F4-18, `9f0fdfc`): `SalesService.cancel` exige motivo; cotação cancela via `save`; venda confirmada cancela via `SaleRepository.cancel` devolvendo estoque (`IN`) e criando estorno `REFUND` no caixa se houver pagamento.
- Venda confirmada pode gerar ordem de serviço.

## Current Decisions

- Sem itens: total e descrição são digitados como antes; a confirmação não toca no estoque.
- Com itens: total e descrição são calculados no `createQuote`; preço é digitado por venda (não existe preço no cadastro de produto).
- Produto esgotado vem desabilitado no seletor e a UI avisa saldo insuficiente antes de adicionar; a autoridade final é a transação de confirmação.
- Movimento de saída usa `reason: "Venda: <descrição>"`; movimento de estorno usa `reason: "Estorno: <descrição>"`; nenhum dos dois tem `author`.
- `SaleRepository.confirm(sale, movements)` é a única porta de confirmação; `cancel(sale, movements)` é a única porta de cancelamento; `save` não confirma nem cancela venda confirmada.
- Cancelamento de cotação (sem estoque/caixa) usa `save` com status `CANCELLED`; cancelamento de confirmada exige transação.
- Pagamento já recebido gera entrada `REFUND` no caixa aberto; sem caixa aberto o cancelamento é bloqueado ("Abra o caixa antes de registrar o estorno.").
- Cancelamento é idempotente sob concorrência: a rechecagem de status acontece dentro da transação (`Promise.allSettled` → 1 ok / 1 rejeitado).
- Campos de auditoria `cancelReason?`/`cancelledAt?`/`cancelledBy?` são opcionais e sem índice → sem bump de versão Dexie; backup valida motivo não vazio e data de cancelamento válida.

## Known Problems

- Não há catálogo/preços no estoque (preço unitário é digitado a cada venda).
- Venda sem itens não mexe no estoque (serviços permanecem fora do controle de saldo).
- Rota usa `cash.read`, exigindo essa permission para seller.
- Cancelamento não recria OS nem devolve insumos de OS já criada (pendência natural de F3-15).

## Pending Work

- Catálogo com preço padrão por produto.
- OS consumindo estoque (insumos).
- Pagamentos parciais (F4-12).

## Important Files Right Now

- `CashDeskPage` em `src/app/pages.tsx` (form + `.sale-items-*` + form `.cancel-sale-form` na lista de vendas).
- `src/domain/sales-service.ts` (`createQuote`, `confirm`, `cancel`).
- `src/domain/sales.ts` (`SaleItem`, `itemsTotalCents`/`itemsTotal`, `stockMovementsFor`, `refundStockMovementsFor`, campos de cancelamento de `Sale`).
- `src/domain/money.ts` (regra única de centavos — F1-09; compartilhada com cash).
- `LocalSaleRepository.confirm`/`cancel` + `applyStockMovement` em `local-repositories.ts`.

## Recent Structural Changes

- F4-18 (`9f0fdfc`): cancelamento auditado — `Sale.cancelReason/cancelledAt/cancelledBy`, `refundStockMovementsFor`, `SaleRepository.cancel`, transação com devolução de estoque e `REFUND` de caixa, UI de cancelamento com motivo.
- Fase E: venda → estoque atômica (confirmação + movimento `OUT` na mesma transação).
- F1-09: precisão monetária — `createQuote`/`confirm` rejeitam NaN/Infinity; total dos itens somado em centavos (`money.test.ts`).
- Testes: `src/domain/sales-service.test.ts` (14) e `src/infrastructure/storage/sale-stock.test.ts` (9, inclui concorrência de confirmação e cancelamento).

## Be Careful With

- CashDeskPage também serve cash e work-orders.
- Não chamar `repository.save` para mudar status de QUOTE para CONFIRMED nem para cancelar venda confirmada; usar `confirm`/`cancel`.
- O seletor de itens carrega produtos para quem tem `sales.manage`, mesmo sem `inventory.read` (leitura pontual; a tela de estoque continua protegida).

## Next Likely Task

Pagamentos parciais (F4-12) ou catálogo com preço padrão por produto.
