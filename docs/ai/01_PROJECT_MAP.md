# Project Map

## Visão rápida

```text
opticore/
├── AGENTS.md
├── docs/ai/                 mapas para agentes e contexto por módulo
├── public/icons/            ícone estático da PWA
├── src/
│   ├── app/                 composição, providers, rotas, guards e páginas
│   ├── design-system/       componentes visuais globais e tokens
│   ├── domain/              modelos, regras, services e contratos
│   ├── infrastructure/      persistência local
│   ├── shell/               layout e navegação globais
│   ├── main.tsx             entrada do frontend e registro da PWA
│   └── styles.css           estilos globais, responsivos e de páginas
├── index.html
├── package.json
├── tsconfig*.json
└── vite.config.ts
```

## `src/app/`

Responsabilidade: compor a aplicação React, fornecer estado global, declarar rotas, aplicar guards e renderizar as páginas atuais.

Arquivos: `App.tsx`, `providers.tsx`, `router.tsx`, `permissions.tsx`, `pages.tsx`.

Pode depender de: `domain`, `infrastructure`, `design-system` e `shell`. Atenção: `pages.tsx` concentra páginas de vários módulos e instancia services/repositories.

## `src/design-system/`

Responsabilidade: fonte global de tokens e primitives visuais existentes.

Arquivos: `components.tsx` (`Button`, `Card`, `Input`) e `tokens.css` (cores, espaços, raios e sombra).

Pode depender somente de React e tipos web. Páginas e shell podem depender desta pasta.

## `src/domain/`

Responsabilidade: modelos, enums, contratos de repository e services com regras de negócio.

Grupos reais: acesso/administração, clientes/atendimentos, clínica, vendas, ordens de serviço, estoque e caixa.

Pode depender de outros tipos/contratos do próprio domínio. Não deve depender de React, Dexie ou CSS.

## `src/infrastructure/storage/`

Responsabilidade: schema Dexie, versões do banco `opticore-v1` e implementações locais dos repositories.

Arquivos: `database.ts`, `local-repositories.ts`.

Depende dos contratos e modelos de `domain`. É consumida atualmente pelos providers e pelas páginas.

## `src/shell/`

Responsabilidade: `AppShell`, sidebar, topbar, seletor de loja e navegação móvel por permissão.

Depende de React Router, provider global e regras de acesso do domínio.

## Estruturas ainda inexistentes

- Não há `src/modules/`; módulos são conceituais e documentados em `docs/ai/modules/`.
- Não há stores Zustand/Redux, hooks compartilhados ou API externa.
- Não há componentes globais de Select, Table, Modal, Drawer, Tabs, Badge, Toast, Search ou PageHeader.
- Não há backend ou sincronização cloud; a persistência real é IndexedDB local.

## Evitar por padrão

Não ler `node_modules`, `dist`, lockfiles, ícones ou configurações TypeScript em tarefas de regra de negócio. Consulte esses itens somente quando a tarefa for dependências, build, PWA ou toolchain.
