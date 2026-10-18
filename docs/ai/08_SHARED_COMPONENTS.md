# Shared Components

## Button

- Local: `src/design-system/components.tsx`.
- Usado por: customers, attendance, clinical, sales/cash, settings.
- Responsabilidade: padronizar botão HTML com classe `.button`.
- Impacto: qualquer mudança afeta todas as ações; estilos em `src/styles.css`.

## Input

- Local: `src/design-system/components.tsx`.
- Usado por: busca de clientes, cadastro, settings, venda, caixa.
- Responsabilidade: input nativo com classe `.input`.
- Impacto: tamanho, foco e tipografia de formulários.

## Card

- Local: `src/design-system/components.tsx`.
- Usado por: dashboard e caixa.
- Responsabilidade: container visual `section.card`.
- Impacto: métricas, painéis e estado da sessão de caixa.

## Componentes entregues em F7-01 (#116)

Todos em `src/design-system/components.tsx`, com estilos globais em `src/styles.css`:

- **Select** — label + `select.select`; estoque (categoria, movimentação) e usuários (função).
- **Badge** — `span.badge` com tons `neutral|success|warning|danger`; usuários e lojas.
- **Tabs** — tablist acessível (`items/value/onChange/label`); áreas do caixa com `className="cash-tabs"`.
- **Table** — wrapper `.table-wrap > table.data-table`; lista de usuários.
- **Dialog** — modal `aria-modal` (Escape/clique fora/×); confirmação de cancelamento de venda.
- **Drawer** — painel lateral direito; formulário de movimentação de estoque.
- **Toast** — aviso flutuante dispensável (`role=status|alert`); confirmações do caixa.
- **Tooltip** — hover + foco de teclado com `aria-describedby`; "Saldo esperado" do caixa.
- **Search** — `input type="search"`; busca de clientes.
- **EmptyState** — estado vazio padronizado; lista de clientes.
- **Skeleton** — linhas animadas com `aria-busy`; carregamentos de clientes e dashboard.
- **PageHeader** — `eyebrow/title/intro/actions`; cabeçalhos de Clientes e Usuários.

Estados de foco/erro/desabilitado documentados em `05_DESIGN_SYSTEM_MAP.md` → "Estados documentados".

## DataTable (entregue em F7-08/#123)

- Local: componente em `src/design-system/components.tsx`; helpers puros em `src/design-system/data-table.ts` (testados em `data-table.test.ts`).
- Usado por: lista de clientes (`CustomersWorkspace`), lista de produtos do Estoque (`InventoryWorkspace`).
- Responsabilidade: tabela acessível com ordenação (headers `th aria-sort` + botão ordenável por teclado), filtro opcional (prop `match` + `Search`, normalização pt-BR sem acentos) e paginação (Anterior/Próxima com `aria-live`, botões desabilitados nas bordas); `pageSize` padrão 10.
- API: `label`, `rows`, `columns` (`key/label/value/align?/sortable?`), `rowKey`, `renderRow?` (células ricas), `pageSize?`, `searchPlaceholder?`/`searchLabel?`/`match?`, `emptyMessage?`.
- Impacto: qualquer mudança afeta clientes e estoque; preferir `DataTable` para novas listas com ordenação/paginação em vez de `.list-card` manual.

## AppProviders / useAppContext

- Local: `src/app/providers.tsx`.
- Usado por: shell, permissions e quase todas as páginas.
- Responsabilidade: sessão, organização, lojas, usuários, loja atual e readiness.
- Impacto: inicialização e contexto de toda a aplicação.

## RequirePermission

- Local: `src/app/permissions.tsx`.
- Usado por: rotas protegidas em `router.tsx`.
- Responsabilidade: aguardar contexto e bloquear rota sem permissão.
- Impacto: autorização e redirects globais.

## Can

- Local: `src/app/permissions.tsx`.
- Usado por: nenhum consumidor atual.
- Responsabilidade: ocultar subtree por permissão.
- Impacto: futuro uso condicional; não confundir com guard de rota.

## AppShell

- Local: `src/shell/AppShell.tsx`.
- Usado por: todas as rotas.
- Responsabilidade: sidebar, topbar, seletor de loja, usuário e menu móvel.
- Impacto: navegação e layout global desktop/mobile/tablet.

## Classes compartilhadas sem componente

- `.page`, `.page-intro`: containers/cabeçalhos (o `.page-title` é encapsulado por `PageHeader`).
- `.list-card`, `.list-row`, `.list-link`: listas de vários módulos.
- `.settings-form`, `.form-actions`: formulários.
- `.success`, `.error-text`, `.notice`: feedback persistente (confirmações flutuantes usam `Toast`).

Local: `src/styles.css`. Alterações nessas classes podem afetar vários módulos mesmo sem componente React dedicado.

## Não existentes

Não documentar como implementados: CustomerHeader. Caixa ainda usa `<select>` nativo em alguns formulários (substituição gradual pendente); as tabs do caixa passaram a usar o componente `Tabs`.
