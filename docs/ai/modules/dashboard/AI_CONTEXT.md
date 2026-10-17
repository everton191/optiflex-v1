# AI CONTEXT — Dashboard

## Current Status

- Página extraída para `DashboardWorkspace.tsx` com dados reais da loja atual.
- Métricas, gráfico de 7 dias e pendências derivados de `src/domain/dashboard.ts` (testados: 13 testes).
- F7-03 (08/10/2026): métricas compostas por perfil (`dashboardProfile`/`dashboardMetricKeys`), retornos clínicos (`returnsToday`) e estados por bloco (loading/empty/denied).
- Rota `/` agora guardada por `dashboard.view`.

## Current Decisions

- Métricas por perfil (`dashboardMetricKeys`, máximo de 4, sempre filtradas por permissão): clínico = fila/retornos **sem valores comerciais**; vendedor = vendas/OS; caixa = sessão primeiro; gestão = tudo.
- Pendências viram links para a área responsável e só aparecem quando há item e permissão; sem itens mostra `empty-state`.
- Gráfico usa apenas vendas `CONFIRMED` dos últimos 7 dias, só aparece com `sales.read` e mostra `empty-state` quando o período está zerado.
- Sem métricas disponíveis para o perfil, a grade é substituída por `EmptyState` (estado denied).
- Fluxo ganhou o passo "Ordens" (`sales.read`); `.flow-steps` usa `auto-fit` para acomodar 8 passos.
- Consultas não permitidas são puladas com `Promise.resolve(...)` para não carregar dados sem permissão.

## Known Problems

- Sem comparação com períodos anteriores (sem "+12% vs. ontem").
- Fila usa todas as atendimentos da loja; não separa por profissional.
- Sem indicadores de metas/carnês/parcelas.

## Pending Work

- Guardar estado entre trocas de loja sem recarregar tudo.
- Comparação com períodos anteriores (metas/comissões fora de escopo até definir regra).

## Important Files Right Now

- `src/app/DashboardWorkspace.tsx`.
- `src/domain/dashboard.ts` e `dashboard.test.ts`.
- `src/styles.css` (`dashboard`, `flow-*`, `metric-*`, `chart-placeholder`, `pending-list`).

## Recent Structural Changes

- Removidas métricas e pendências mockadas.
- `RequirePermission` aplicado à rota index.
- Menu/fluxo incluem Ordens de serviço.
- F7-03: composição por perfil + gráfico condicionado a `sales.read`.

## Be Careful With

- Manter cálculos puros em `dashboard.ts` para testabilidade.
- Datas calculadas em horário local; testes usam construtores locais para não depender de fuso.

## Next Likely Task

Comparação com períodos anteriores (quando houver regra) ou guard da página entre trocas de loja.
