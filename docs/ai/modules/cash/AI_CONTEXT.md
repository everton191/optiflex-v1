# AI CONTEXT — Cash

## Current Status

- Tela unificada `/caixa` com abas Vendas, Recebimentos e Sessão.
- Owner/manager veem as três abas; cashier vê Recebimentos/Sessão; seller vê Vendas.
- Abertura, recebimento e fechamento persistem no IndexedDB com transação.
- Fechamento grava `expectedBalance`, `closingBalance`, `difference`, `closedBy` e `closingNote`.
- Recebimento atualiza `Sale.paymentStatus` (`PENDING`/`PAID`) na mesma transação da entrada.
- Extrato "Movimentos registrados" lista `CashEntry` por loja, sem estado em memória.
- Forma de pagamento por recebimento (Dinheiro/PIX/Cartão) com select na aba Recebimentos (F1-06, `b0f72d1`).
- Suprimento e sangria com motivo obrigatório e autor na aba Sessão (F4-16, `6a59f2b`).
- Aba Vendas inclui seletor opcional de itens de estoque; a confirmação baixa o saldo em transação (Fase E).

## Current Decisions

- Rotas antigas redirecionam para `/caixa`.
- Aba antiga "Abertura" passou a se chamar "Sessão".
- Receber exige sessão aberta, venda `CONFIRMED` da mesma loja e valor positivo.
- Prevenção contra pagamento duplicado usa a soma durável de entradas em centavos, não `Set` de memória.
- Abertura é atômica: a segunda abertura na mesma loja é rejeitada mesmo em concorrência.
- Abas e cards aparecem por permission, não por label de role.
- `paymentStatus` é projeção atualizada em transação; a soma das entradas segue sendo a fonte de conferência.
- `paymentMethod` é opcional (entradas legadas sem forma continuam válidas); valores fora de `paymentMethodLabels` são rejeitados por `assertValidPaymentMethod` e pelo backup.
- Sangria/suprimento usam `CashMovementType` (`RECEIPT` é rejeitado em `recordMovement`); motivo é obrigatório (trim); sangria maior que o saldo esperado é rejeitada na transação de `LocalCashRepository.recordMovement`.
- `CashEntry.reason?`/`author?` são opcionais (sem bump de schema); backup valida `reason` (string não vazia quando presente) e `author` (string quando presente).

## Known Problems

- Estorno/cancelamento ainda não existem (F4-18).
- Não há parcelas/carnê; pagamento parcial na tela recebe o saldo restante da venda.
- Cancelamento de venda já recebida não é tratado.
- `receivedSaleIds` foi removido; qualquer regressão deve ser verificada em `cash.test.ts`.

## Pending Work

- Estorno controlado devolvendo estoque/dinheiro (F4-18).
- Formas de pagamento por operação/regras por canal (F4-10).
- Relatório/impressão do fechamento.

## Important Files Right Now

- `CashDeskPage` em `src/app/pages.tsx`.
- `src/domain/cash-service.ts`, `src/domain/cash.ts` (`cashTotals`) — centavos via `src/domain/money.ts` (F1-09).
- `LocalCashRepository` (transações de abertura, recebimento e fechamento).
- `Sale.paymentStatus` em `src/domain/sales.ts`.
- `src/domain/access.ts`.

## Recent Structural Changes

- F4-16 (`6a59f2b`): `CashMovementType` + `CashEntry.reason?`/`author?`, `CashService.recordMovement`, `CashRepository.recordMovement` (transação com guarda de saldo), form na aba Sessão.
- F1-06 (`b0f72d1`): `PaymentMethod` + `CashEntry.paymentMethod`, select na aba Recebimentos, backup valida valores.
- Fechamento de caixa com conferência contado/esperado/diferença.
- Extrato durável de movimentos por loja.
- Testes: `src/domain/cash-service.test.ts` (14) e `src/infrastructure/storage/cash.test.ts` (9).

## Be Careful With

- CashDeskPage também altera sales, work-orders e baixa estoque ao confirmar venda com itens.
- Novos campos de `cashSessions`/`sales` são opcionais e não mudam índices; não exigem nova versão Dexie e o backup valida seus tipos.
- Fechamento precisa preservar histórico e impedir novos lançamentos.

## Next Likely Task

Formas de pagamento avançadas (F4-10) ou estornos/cancelamentos (F4-18).
