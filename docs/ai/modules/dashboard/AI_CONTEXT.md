# AI CONTEXT — Dashboard

## Current Status

- Rota funcional dentro do AppShell.
- Layout responsivo para desktop, mobile e tablet por orientação.
- Métricas e gráfico são conteúdo visual estático.

## Current Decisions

- Atalhos aparecem conforme permissions da sessão.
- Caixa substitui os antigos atalhos separados de venda/pagamento.
- Cores vêm dos tokens existentes.

## Known Problems

- `dashboard.view` não protege explicitamente a rota `/`.
- Números não são derivados dos repositories.

## Pending Work

- Conectar métricas a consultas reais.
- Definir estados de loading/error para dados reais.

## Important Files Right Now

- `src/app/pages.tsx` (`DashboardPage`).
- `src/styles.css` (`dashboard`, `flow-*`, `metric-*`).
- `src/domain/access.ts`.

## Recent Structural Changes

- Fluxo foi reduzido conforme o tipo de utilização.
- Navegação comercial aponta para `/caixa`.

## Be Careful With

- Não apresentar mock como dado operacional.
- Não duplicar Card ou tokens dentro da página.

## Next Likely Task

Criar selectors/queries de métricas reais após definir requisitos de cálculo.
