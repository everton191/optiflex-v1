# AI CONTEXT — Cash

## Current Status

- Tela unificada `/caixa` com abas Vendas, Recebimentos e Sessão.
- Owner/manager veem as três abas; cashier vê Recebimentos/Sessão; seller vê Vendas.
- Abertura, recebimento e fechamento persistem no IndexedDB com transação.
- Fechamento grava `expectedBalance`, `closingBalance`, `difference`, `closedBy` e `closingNote`.
- Recebimento atualiza `Sale.paymentStatus` (`PENDING`/`PAID`) na mesma transação da entrada.
- Extrato "Movimentos registrados" lista `CashEntry` por loja, sem estado em memória.

## Current Decisions

- Rotas antigas redirecionam para `/caixa`.
- Aba antiga "Abertura" passou a se chamar "Sessão".
- Receber exige sessão aberta, venda `CONFIRMED` da mesma loja e valor positivo.
- Prevenção contra pagamento duplicado usa a soma durável de entradas em centavos, não `Set` de memória.
- Abertura é atômica: a segunda abertura na mesma loja é rejeitada mesmo em concorrência.
- Abas e cards aparecem por permission, não por label de role.
- `paymentStatus` é projeção atualizada em transação; a soma das entradas segue sendo a fonte de conferência.

## Known Problems

- Sangria (`WITHDRAWAL`) e suprimento (`DEPOSIT`) têm modelo e cálculo prontos, mas não têm UI.
- Não há formas de pagamento (dinheiro/PIX/cartão) nem estorno.
- Não há parcelas/carnê; pagamento parcial na tela recebe o saldo restante da venda.
- Cancelamento de venda já recebida não é tratado.
- `receivedSaleIds` foi removido; qualquer regressão deve ser verificada em `cash.test.ts`.

## Pending Work

- UI de sangria/suprimento com motivo e autor.
- Forma de pagamento por entrada e estorno controlado.
- Relatório/impressão do fechamento.

## Important Files Right Now

- `CashDeskPage` em `src/app/pages.tsx`.
- `src/domain/cash-service.ts`, `src/domain/cash.ts` (`cashTotals`).
- `LocalCashRepository` (transações de abertura, recebimento e fechamento).
- `Sale.paymentStatus` em `src/domain/sales.ts`.
- `src/domain/access.ts`.

## Recent Structural Changes

- Fechamento de caixa com conferência contado/esperado/diferença.
- Extrato durável de movimentos por loja.
- Testes: `src/domain/cash-service.test.ts` (10) e `src/infrastructure/storage/cash.test.ts` (7).

## Be Careful With

- CashDeskPage também altera sales e work-orders.
- Novos campos de `cashSessions`/`sales` são opcionais e não mudam índices; não exigem nova versão Dexie e o backup valida seus tipos.
- Fechamento precisa preservar histórico e impedir novos lançamentos.

## Next Likely Task

Expor sangria/suprimento e formas de pagamento na aba Sessão.
