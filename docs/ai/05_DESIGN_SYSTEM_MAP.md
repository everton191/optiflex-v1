# Design System Map

## Fontes globais

- Componentes: `src/design-system/components.tsx`.
- Tokens: `src/design-system/tokens.css`.
- Layout, responsividade e estilos específicos: `src/styles.css`.
- Shell: `src/shell/AppShell.tsx`.

**SE UM COMPONENTE GLOBAL EXISTE, NÃO REIMPLEMENTÁ-LO DENTRO DE UMA PÁGINA.**

## Componentes existentes

### Button

- Caminho: `src/design-system/components.tsx`.
- Variantes: uma variante visual `.button`; aceita atributos nativos.
- Usado por: formulários, clínica, atendimento, caixa e vendas.
- Alteração impacta: todas as ações e links que usam a classe `.button`.

### Input

- Caminho: `src/design-system/components.tsx`.
- Variantes: uma; aceita atributos nativos de input.
- Usado por: busca, cadastro, configurações, clínica e caixa.
- Alteração impacta: todos os formulários que usam `<Input>`.

### Card

- Caminho: `src/design-system/components.tsx`.
- Variantes: uma section com `.card`.
- Usado por: dashboard e estado do caixa.
- Alteração impacta: métricas e painéis que usam Card.

## Elementos compartilhados via classes

- Badge: classe `.badge` em `src/styles.css`; não há componente React.
- Tabs: `.cash-tabs`, exclusiva da tela Caixa; não há primitive global.
- Page header: `.page-title`, `.cash-heading`; não há componente global.
- Select e Textarea: HTML nativo estilizado em `styles.css`.
- Lists: `.list-card`, `.list-row`, `.list-link`.
- Feedback: `.success`, `.error-text`, `.notice`; sem Toast global.

## Componentes ausentes

Não existem componentes globais de Select, Table, Modal/Dialog, Drawer, Tabs genérica, Badge React, Toast, Search, EmptyState, Skeleton, Tooltip ou PageHeader. Antes de criar um deles, confirme reutilização em mais de uma área.

## Shell e navegação

### AppShell / Sidebar / Topbar / MobileNavigation

- Caminho: `src/shell/AppShell.tsx`.
- Configuração: `mainLinks` e `administrationLinks` no mesmo arquivo.
- Visibilidade: filtrada por `hasPermission`.
- Estilos: `.shell`, `.sidebar`, `.topbar`, `.mobile-nav` em `styles.css`.
- Alteração impacta: todas as rotas.

## Tokens

`tokens.css` contém:

- cores: `--color-brand`, `brand-strong`, `surface`, `text`, `muted`, `border`, `focus`;
- espaçamento: `--space-1`, `2`, `3`, `4`, `6`, `8`;
- raios: `--radius-sm`, `md`, `lg`;
- sombra: `--shadow-card`;
- tipografia base: Inter com fallback system UI.

Não há tokens separados para sizes, z-index ou breakpoints.

## Breakpoints reais

- até 480px: celular compacto;
- até 720px: mobile;
- 721–1024px em retrato: layout mobile/tablet;
- 721–1100px em paisagem: desktop compacto/tablet;
- acima disso: desktop.

## Regra de mudança

- Cor/espaço/raio/sombra global → `tokens.css`.
- Botão/Input/Card → `components.tsx` e classe global em `styles.css`.
- Menu/topbar/responsividade → `AppShell.tsx` + `styles.css`.
- Estilo exclusivo de página → seção correspondente de `styles.css`.
