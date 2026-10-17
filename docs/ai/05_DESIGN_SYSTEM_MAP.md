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

### Select (F7-01)

- Caminho: `src/design-system/components.tsx`; estilos `.select-field`/`.select` em `styles.css`.
- Uso real: formulários de estoque (categoria do produto e tipo de movimentação) e função do usuário.
- Aceita `label` obrigatório + atributos nativos de `select`.

### Badge (F7-01)

- Caminho: `src/design-system/components.tsx`; tons `.badge`, `.is-success`, `.is-low`, `.is-out`.
- Uso real: lista de usuários (função) e lista de lojas (ativa/inativa).
- Tons: `neutral` | `success` | `warning` | `danger`.

### Tabs (F7-01)

- Caminho: `src/design-system/components.tsx`; estilo base `.tabs` (mesma caixa das `.cash-tabs`).
- Uso real: áreas do caixa (Vendas/Recebimentos/Sessão) via `className="cash-tabs"` para preservar o visual.
- API: `items` (`id`+`label`), `value`, `onChange`, `label` (aria-label do tablist).

### Table (F7-01)

- Caminho: `src/design-system/components.tsx`; estilos `.table-wrap`/`.data-table` em `styles.css`.
- Uso real: lista de usuários (cabeçalho com `th scope="col"`).
- Wrapper semântico: o conteúdo monta `thead`/`tbody`/`tr`.

### Dialog (F7-01)

- Caminho: `src/design-system/components.tsx`; estilos `.dialog-overlay`/`.dialog`.
- Uso real: confirmação de cancelamento de venda no caixa.
- Comportamento: `role="dialog" aria-modal`, fecha no Escape, no clique fora e no botão ×; `autoFocus` no campo do formulário.

### Drawer (F7-01)

- Caminho: `src/design-system/components.tsx`; estilos `.drawer-overlay`/`.drawer`.
- Uso real: formulário de movimentação de produto no estoque (aberto pelo botão "Movimentar").
- Mesmo contrato de foco/fechamento do Dialog, painel alinhado à direita.

### Toast (F7-01)

- Caminho: `src/design-system/components.tsx`; estilos `.toast`.
- Uso real: confirmações de sucesso do caixa (substitui `.notice success` inline) com botão de dispensar.
- `tone="success"` (`role="status"`) ou `tone="error"` (`role="alert"`).

### Tooltip (F7-01)

- Caminho: `src/design-system/components.tsx`; estilos `.tooltip`.
- Uso real: explicação do "Saldo esperado" no fechamento do caixa.
- Abre no hover e no foco de teclado (`tabIndex=0` + `aria-describedby` → `role="tooltip"`).

### Search (F7-01)

- Caminho: `src/design-system/components.tsx`; estilo `.search-field`.
- Uso real: busca de clientes (`input type="search"`).
- Aceita os mesmos atributos de `Input`.

### EmptyState (F7-01)

- Caminho: `src/design-system/components.tsx`; classe `.empty-state`.
- Uso real: lista de clientes sem resultados, lista de estoque, agenda e fila da recepção, lista de ordens de serviço (aplicação incremental concluída em F7-11).

### Skeleton (F7-01)

- Caminho: `src/design-system/components.tsx`; estilos `.skeleton`/`.skeleton-line`.
- Uso real: carregamento das listas de clientes, dashboard, estoque, agenda/fila da recepção, ordens e caixa (`role="status" aria-busy`); shimmer respeita `prefers-reduced-motion`.

### ErrorState (F7-11)

- Caminho: `src/design-system/components.tsx`; classe `.error-state` em `styles.css`.
- Props: `message` (obrigatório), `onRetry?`, `retryLabel?` (padrão "Tentar novamente").
- `role="alert"`, reutiliza `Button` para o retry; cor de erro `#b42318` no texto.
- Uso real: falha de leitura do caixa (com `refresh`), fila de atendimento e demais páginas que capturam `errorMessage`.
- Padrão-CA: falha de leitura mostra erro + retry; sem tela branca.

### PageHeader (F7-01)

- Caminho: `src/design-system/components.tsx`; classes `.eyebrow`/`.page-title`.
- Uso real: cabeçalho das páginas de Clientes e Usuários (`eyebrow`, `title`, `intro`, `actions`).

### PrintLayout (F7-13)

- Caminho: `src/design-system/components.tsx`; classes `.print-layout`/`.print-toolbar`/`.print-sheet`/`.print-brand`/`.print-title`/`.print-meta`/`.print-table`/`.print-total` em `styles.css`.
- Props: `title` (obrigatório), `meta?`, `brand?` (padrão `"Opticore"` — nome e paleta preto/branco ajustáveis depois), `actions?`, `children`.
- Estrutura: toolbar `.no-print` com ações da página + botão "Imprimir" (`window.print()`), folha `.print-sheet` com cabeçalho da marca, título e meta em preto/branco.
- Uso real: receita (`PrescriptionDocumentPage`), documento de orçamento/venda (`SaleDocumentPage` em `/vendas/:saleId`) e detalhe da OS (`WorkOrderDetailPage` — Ações/Insumos/Histórico com `.no-print`).
- `@media print` esconde shell/toolbar, zera paddings e limpa bordas da folha; PDF local = "Salvar como PDF" do diálogo nativo do navegador.

## Elementos compartilhados via classes

- Page header: `.cash-heading` continua exclusiva do caixa; `.page-title` é consumido pelo componente `PageHeader`.
- Select e Textarea: `Select` é o componente; `<select>` nativo só em contexts onde o componente ainda não foi adotado (substituição gradual).
- Lists: `.list-card`, `.list-row`, `.list-link`.
- Feedback: `.success`, `.error-text`, `.notice`; confirmações flutuantes usam `Toast`.

## Estados documentados (foco, erro, desabilitado)

- **Foco:** `.select:focus`, `.input:focus`, `.tooltip-trigger:focus-visible`, `.tabs button:focus-visible`, `.overlay-close:focus-visible` → contorno de 3 px em `--color-focus` (mesmo padrão do `Button`).
- **Erro:** atributo `aria-invalid="true"` em `.input`/`.select` pinta a borda de `#a12525`; mensagens continuam em `role="alert"` (`.error-text`/`.notice.error-text`).
- **Desabilitado:** `.select:disabled` (opacidade .6, `cursor: not-allowed`), `.button:disabled` (opacidade .55); `Select`/`Badge`/`Tabs`/`Search` repassam atributos nativos.
- **Overlay:** Dialog/Drawer fecham por Escape, clique no fundo e botão ×; Toast é dispensável por botão.

## Componentes ausentes

`CustomerHeader` continua sem componente global (cada página monta o próprio cabeçalho de cliente). Demais primitivas da auditoria A (Select, Table, Dialog, Drawer, Tabs, Badge, Toast, Search, EmptyState, Skeleton, Tooltip, PageHeader) foram entregues em F7-01/#116; `ErrorState` em F7-11/#126; ao criar um novo, confirme reutilização em mais de uma área.

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
- Componentes globais (Button, Input, Card, Select, Badge, Tabs, Table, Dialog, Drawer, Toast, Tooltip, Search, EmptyState, Skeleton, ErrorState, PageHeader, PrintLayout) → `components.tsx` e classe global em `styles.css`.
- Menu/topbar/responsividade → `AppShell.tsx` + `styles.css`.
- Estilo exclusivo de página → seção correspondente de `styles.css`.
