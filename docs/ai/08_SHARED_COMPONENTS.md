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

- `.page`, `.page-title`, `.page-intro`: containers/cabeçalhos.
- `.list-card`, `.list-row`, `.list-link`: listas de vários módulos.
- `.badge`: status em listas.
- `.settings-form`, `.form-actions`: formulários.
- `.success`, `.error-text`, `.notice`, `.empty-state`: feedback.

Local: `src/styles.css`. Alterações nessas classes podem afetar vários módulos mesmo sem componente React dedicado.

## Não existentes

Não documentar como implementados: CustomerHeader, Select, Table, Modal, Drawer, Tabs global, Toast, Search global ou PageHeader. Caixa possui tabs próprias (`.cash-tabs`), não um componente compartilhado.
