# AI CONTEXT — Dashboard

## Current Status

- Página extraída para `DashboardWorkspace.tsx` com dados reais da loja atual.
- Métricas, gráfico de 7 dias e pendências derivados de `src/domain/dashboard.ts` (testados: 8 testes).
- Rota `/` agora guardada por `dashboard.view`.

## Current Decisions

- Cards por permissão: vendas (`sales.read`), recebimentos (`cash.read`), fila (`attendance.queue.read`), OS (`sales.read`), estoque (`inventory.read`); máximo de 4 cards.
- Pendências viram links para a área responsável e só aparecem quando há item e permissão.
- Gráfico usa apenas vendas `CONFIRMED` dos últimos 7 dias, com alturas normalizadas pelo melhor dia.
- Fluxo ganhou o passo "Ordens" (`sales.read`); `.flow-steps` usa `auto-fit` para acomodar 8 passos.
- Consultas não permitidas são puladas com `Promise.resolve(...)` para não carregar dados sem permissão.

## Known Problems

- Sem comparação com períodos anteriores (sem "+12% vs. ontem").
- Fila usa todas as atendimentos da loja; não separa por profissional.
- Sem indicadores de metas/carnês/parcelas.

## Pending Work

- Indicadores por papel mais específicos (ex.: retornos clínicos).
- Guardar estado entre trocas de loja sem recarregar tudo.

## Important Files Right Now

- `src/app/DashboardWorkspace.tsx`.
- `src/domain/dashboard.ts` e `dashboard.test.ts`.
- `src/styles.css` (`dashboard`, `flow-*`, `metric-*`, `chart-placeholder`, `pending-list`).

## Recent Structural Changes

- Removidas métricas e pendências mockadas.
- `RequirePermission` aplicado à rota index.
- Menu/fluxo incluem Ordens de serviço.

## Be Careful With

- Manter cálculos puros em `dashboard.ts` para testabilidade.
- Datas calculadas em horário local; testes usam construtores locais para não depender de fuso.

## Next Likely Task

Integração venda → baixa de estoque e indicadores por papel mais profundos.
