# AI CONTEXT — Cash

## Current Status

- Tela unificada `/caixa`.
- Owner/manager veem Vendas, Recebimentos e Abertura.
- Seller vê Vendas; cashier vê Recebimentos/Abertura.
- Sessão aberta e entradas persistem no IndexedDB.

## Current Decisions

- Rotas antigas redirecionam para `/caixa`.
- Receber exige sessão aberta e valor positivo.
- Abas e cards aparecem por permission, não por label de role.

## Known Problems

- Fechamento de caixa não existe.
- CashRepository não lista entradas.
- Venda continua confirmada após receber; não há estado pago.
- `receivedSaleIds` evita repetição apenas na montagem atual da página.
- IAB pode indisponibilizar IndexedDB; provider possui fallback somente para boot.

## Pending Work

- Fechamento/conferência.
- Listagem de movimentos e totalização.
- Idempotência durável de recebimento.
- Forma de pagamento e vínculo de status com Sale.
- Testes do CashService e fluxo integrado.

## Important Files Right Now

- `CashDeskPage` em `src/app/pages.tsx`.
- `src/domain/cash-service.ts`.
- `src/domain/cash.ts`.
- `LocalCashRepository` e tabelas cash.
- `src/domain/access.ts`.

## Recent Structural Changes

- Vendas, Recebimentos e Abertura foram consolidados.
- Botões foram reorganizados para desktop/mobile.
- Menu foi reduzido conforme função.

## Be Careful With

- Evitar dupla entrada para a mesma venda.
- Fechamento precisa preservar histórico e impedir novas entradas.
- CashDeskPage também altera sales e work-orders.

## Next Likely Task

Implementar fechamento e recebimento idempotente com histórico consultável.
