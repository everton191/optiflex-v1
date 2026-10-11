# AI CONTEXT — Cash

## Current Status

- Tela unificada `/caixa` com abas Vendas, Recebimentos e Sessão.
- Owner/manager veem as três abas; cashier vê Recebimentos/Sessão; seller vê Vendas.
- Abertura, recebimento e fechamento persistem no IndexedDB com transação.
- Fechamento grava `expectedBalance`, `closingBalance`, `difference`, `closedBy` e `closingNote`.
- Recebimento atualiza `Sale.paymentStatus` (`PENDING`/`PAID`) na mesma transação da entrada.
- Extrato "Movimentos registrados" lista `CashEntry` por loja, sem estado em memória.
- Forma de pagamento obrigatória por recebimento (Dinheiro/PIX/Débito/Crédito; `CARD` legado) com select na aba Recebimentos (F1-06 + F4-10, `7f1d6e4`).
- `cashTotals` expõe `byMethod` (recebimentos por forma, legados contados como Dinheiro); fechamento exibe o detalhamento por forma na aba Sessão.
- Suprimento e sangria com motivo obrigatório e autor na aba Sessão (F4-16, `6a59f2b`).
- Estorno de venda cancelada via `CashEntryType.REFUND` com motivo/autor da venda; `cashTotals.refunds` reduz o saldo esperado e aparece na aba Sessão quando maior que zero (F4-18, `9f0fdfc`).
- Aba Vendas inclui seletor opcional de itens de estoque; a confirmação baixa o saldo em transação (Fase E).

## Current Decisions

- Rotas antigas redirecionam para `/caixa`.
- Aba antiga "Abertura" passou a se chamar "Sessão".
- Receber exige sessão aberta, venda `CONFIRMED` da mesma loja e valor positivo.
- Prevenção contra pagamento duplicado usa a soma durável de entradas em centavos, não `Set` de memória.
- Abertura é atômica: a segunda abertura na mesma loja é rejeitada mesmo em concorrência.
- Abas e cards aparecem por permission, não por label de role.
- `paymentStatus` é projeção atualizada em transação; a soma das entradas segue sendo a fonte de conferência.
- `paymentMethod` é obrigatório em novos recebimentos (`CashService.receive` lança "Informe a forma de pagamento." sem método); entradas legadas sem forma continuam válidas no storage e são contadas como Dinheiro nos totais; valores fora de `paymentMethodLabels` são rejeitados por `assertValidPaymentMethod` e pelo backup.
- `PaymentMethod` = `CASH`/`PIX`/`CARD`(legado)/`DEBIT`/`CREDIT`; novos recebimentos só oferecem `paymentMethodOptions` (sem `CARD`). Carnê (F4-13) e misto (F4-12) ficam para os cards próprios.
- Sangria/suprimento usam `CashMovementType` (`RECEIPT` e `REFUND` são rejeitados em `recordMovement`); motivo é obrigatório (trim); sangria maior que o saldo esperado é rejeitada na transação de `LocalCashRepository.recordMovement`.
- `CashEntry.reason?`/`author?` são opcionais (sem bump de schema); backup valida `reason` (string não vazia quando presente) e `author` (string quando presente).
- `REFUND` é criado apenas por `LocalSaleRepository.cancel` dentro da transação de cancelamento; exige sessão de caixa aberta quando a venda tem recebimentos; entradas legadas sem forma são reembolsadas sem `paymentMethod` (método só é copiado quando há um único método de recebimento).

## Known Problems

- Não há parcelas/carnê; pagamento parcial na tela recebe o saldo restante da venda.
- `receivedSaleIds` foi removido; qualquer regressão deve ser verificada em `cash.test.ts`.

## Pending Work

- Pagamentos parciais com método por parcela (F4-12).
- Relatório/impressão do fechamento.

## Important Files Right Now

- `CashDeskPage` em `src/app/pages.tsx`.
- `src/domain/cash-service.ts`, `src/domain/cash.ts` (`cashTotals`) — centavos via `src/domain/money.ts` (F1-09).
- `LocalCashRepository` (transações de abertura, recebimento e fechamento).
- `Sale.paymentStatus` em `src/domain/sales.ts`.
- `src/domain/access.ts`.

## Recent Structural Changes

- F4-18 (`9f0fdfc`): `CashEntryType.REFUND`, `CashTotals.refunds`, estorno criado por `LocalSaleRepository.cancel` (transação com venda+estoque+caixa), exibição de Estornos na aba Sessão, backup valida `REFUND`.
- F4-10 (`7f1d6e4`): `DEBIT`/`CREDIT` em `PaymentMethod`, `paymentMethodOptions`, `receive` exige forma, `cashTotals.byMethod`, detalhamento por forma no fechamento.
- F4-16 (`6a59f2b`): `CashMovementType` + `CashEntry.reason?`/`author?`, `CashService.recordMovement`, `CashRepository.recordMovement` (transação com guarda de saldo), form na aba Sessão.
- F1-06 (`b0f72d1`): `PaymentMethod` + `CashEntry.paymentMethod`, select na aba Recebimentos, backup valida valores.
- Fechamento de caixa com conferência contado/esperado/diferença.
- Extrato durável de movimentos por loja.
- Testes: `src/domain/cash-service.test.ts` (15) e `src/infrastructure/storage/cash.test.ts` (9).

## Be Careful With

- CashDeskPage também altera sales, work-orders e baixa estoque ao confirmar venda com itens.
- Novos campos de `cashSessions`/`sales` são opcionais e não mudam índices; não exigem nova versão Dexie e o backup valida seus tipos.
- Fechamento precisa preservar histórico e impedir novos lançamentos.

## Next Likely Task

Pagamentos parciais (F4-12).
