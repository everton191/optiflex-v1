# AI CONTEXT — Sales

## Current Status

- Venda integrada à tela `/caixa`.
- Criação começa como orçamento (`QUOTE`).
- Confirmação muda para `CONFIRMED`.
- Venda confirmada pode gerar ordem de serviço.

## Current Decisions

- Não há item de menu separado para Vendas/Pagamentos.
- Seller vê apenas a área Vendas; owner/manager veem todas as abas.
- `/vendas` é mantida apenas como redirect compatível.

## Known Problems

- Venda é uma descrição + total, sem itens/produtos.
- Não há cancelamento na UI.
- Status de pagamento não pertence a Sale.
- Rota usa `cash.read`, exigindo essa permission para seller.

## Pending Work

- Itens de venda e catálogo.
- Estados de pagamento duráveis.
- Regras de desconto/cancelamento.
- Testes do SalesService.

## Important Files Right Now

- `CashDeskPage` em `src/app/pages.tsx`.
- `src/domain/sales-service.ts`.
- `src/domain/sales.ts`.
- `LocalSaleRepository`.

## Recent Structural Changes

- Vendas, recebimentos e abertura foram consolidados no Caixa.

## Be Careful With

- CashDeskPage também serve cash e work-orders.
- Não alterar actions sem revisar role permissions.

## Next Likely Task

Modelar itens de venda e ligação real com inventory.
