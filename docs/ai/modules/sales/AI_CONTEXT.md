# AI CONTEXT — Sales

## Current Status

- Venda integrada à tela `/caixa` com seletor opcional de itens de estoque.
- `Sale.items?` guarda `{ inventoryItemId, name, quantity, unitPrice }`.
- Confirmação transacional (`LocalSaleRepository.confirm`) muda para `CONFIRMED` **e** baixa o saldo gerando movimentos `OUT` na mesma transação.
- Cancelamento auditado (F4-18, `9f0fdfc`): `SalesService.cancel` exige motivo; cotação cancela via `save`; venda confirmada cancela via `SaleRepository.cancel` devolvendo estoque (`IN`) e criando estorno `REFUND` no caixa se houver pagamento.
- Venda confirmada pode gerar ordem de serviço.
- Ciclo de vida de orçamento (F3-10, `3820338`): `Sale.quoteStatus?` (Rascunho/Enviado/Aceito/Recusado/Expirado; ausente = rascunho), edição de rascunho, filtros da lista, ações por estado e impressão em janela nova.

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
- Estados do orçamento ficam em `quoteStatus` e não alteram `Sale.status` (`QUOTE` segue válido para `confirm`/`cancel` e para o backup); transições em `quoteTransitions` (rascunho → enviado → aceito/recusado/expirado; aceito/recusado/expirado são terminais da negociação).
- `updateQuote` valida como o `createQuote` (função `buildQuote` compartilhada) e só edita rascunho; identidade (`id`/`createdAt`) preservada.
- `confirm` aceita rascunho/enviado/aceito (compatível com o fluxo validado da Fase E) e bloqueia recusado/expirado.
- Filtros da lista usam os chips `.status-filters` (Todos/Orçamentos/Vendas/Canceladas com contagem) e ação de estado é liberada apenas por `sales.manage`; impressão é `window.open` + `document.write` com escape HTML de todos os campos digitados.

## Known Problems

- Não há catálogo/preços no estoque (preço unitário é digitado a cada venda).
- Venda sem itens não mexe no estoque (serviços permanecem fora do controle de saldo).
- Rota usa `cash.read`, exigindo essa permission para seller.
- Cancelamento não recria OS nem devolve insumos de OS já criada (pendência natural de F3-15).
- Impressão depende da liberação de janela nova (popup) pelo navegador.

## Pending Work

- Catálogo com preço padrão por produto.
- OS consumindo estoque (insumos).

## Important Files Right Now

- `CashDeskPage` em `src/app/pages.tsx` (form + `.sale-items-*` + form `.cancel-sale-form` na lista de vendas).
- `src/domain/sales-service.ts` (`createQuote`, `updateQuote`, `transitionQuote`, `confirm`, `cancel`; `buildQuote` compartilhada).
- `src/domain/sales.ts` (`SaleItem`, estados do orçamento, `itemsTotalCents`/`itemsTotal`, `stockMovementsFor`, `refundStockMovementsFor`, campos de cancelamento de `Sale`).
- `src/domain/money.ts` (regra única de centavos — F1-09; compartilhada com cash).
- `LocalSaleRepository.confirm`/`cancel` + `applyStockMovement` em `local-repositories.ts`.

## Recent Structural Changes

- F3-10 (`3820338`): ciclo de vida do orçamento — `QuoteStatus`/`quoteTransitions`/`quoteStatusOf`, `updateQuote` (rascunho), filtros e ações por estado na lista, impressão com escape HTML, `confirm` bloqueando recusado/expirado e backup validando `quoteStatus`; teste de recuperação de orçamento antigo (`quote-recovery.test.ts`).
- F4-18 (`9f0fdfc`): cancelamento auditado — `Sale.cancelReason/cancelledAt/cancelledBy`, `refundStockMovementsFor`, `SaleRepository.cancel`, transação com devolução de estoque e `REFUND` de caixa, UI de cancelamento com motivo.
- Fase E: venda → estoque atômica (confirmação + movimento `OUT` na mesma transação).
- F1-09: precisão monetária — `createQuote`/`confirm` rejeitam NaN/Infinity; total dos itens somado em centavos (`money.test.ts`).
- Testes: `src/domain/sales-service.test.ts` (20), `src/infrastructure/storage/sale-stock.test.ts` (9, inclui concorrência) e `src/infrastructure/storage/quote-recovery.test.ts` (1).

## Be Careful With

- CashDeskPage também serve cash e work-orders.
- Não chamar `repository.save` para mudar status de QUOTE para CONFIRMED nem para cancelar venda confirmada; usar `confirm`/`cancel`.
- O seletor de itens carrega produtos para quem tem `sales.manage`, mesmo sem `inventory.read` (leitura pontual; a tela de estoque continua protegida).

## Next Likely Task

PDV (F3-11), descontos e aprovação (F3-12) ou reservas de itens (F4-05) — dependências liberadas com F3-10.
