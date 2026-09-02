# Opticore

## Projeto

Opticore é uma aplicação interna de gestão óptica, offline-first e instalável como PWA. A stack atual é React 19, TypeScript, Vite, React Router, Dexie/IndexedDB, Vite PWA e Vitest.

Arquitetura resumida: páginas React chamam services do domínio; services dependem de contratos de repository; implementações locais persistem no IndexedDB. O estado global de sessão, organização e loja atual fica em `src/app/providers.tsx`.

## Regra obrigatória de contexto

Antes de procurar arquivos:

1. Leia este `AGENTS.md`.
2. Leia `docs/ai/01_PROJECT_MAP.md`.
3. Consulte `docs/ai/03_MODULE_INDEX.md`.
4. Identifique o módulo responsável.
5. Leia o `MODULE.md` daquele módulo em `docs/ai/modules/`.
6. Leia o `AI_CONTEXT.md` ao lado dele.
7. Abra somente os arquivos necessários.
8. Amplie a leitura somente se houver dependência real.

**NÃO FAÇA LEITURA RECURSIVA DE TODO O PROJETO POR PADRÃO.** Não comece por busca recursiva ampla, arquivos gigantes ou todos os módulos. Prefira índice → módulo → arquivo específico → dependência específica.

Ignore `node_modules`, `dist`, `build`, `coverage`, caches, arquivos gerados e lockfiles grandes, salvo quando a tarefa exigir.

## Regras arquiteturais

- Entrada e providers: `src/main.tsx` e `src/app/`.
- Rotas e guards: `src/app/router.tsx` e `src/app/permissions.tsx`.
- Páginas atuais: `src/app/pages.tsx`.
- Regras de negócio, modelos e contratos: `src/domain/`.
- Dados locais e schema: `src/infrastructure/storage/`.
- Componentes globais: `src/design-system/components.tsx`.
- Tokens visuais: `src/design-system/tokens.css`.
- Shell, sidebar, topbar e navegação móvel: `src/shell/AppShell.tsx`.
- Estilos de layout e páginas: `src/styles.css`.

Páginas não devem acessar Dexie diretamente. O fluxo desejado é Page → Service → Repository → infraestrutura. O código atual instancia repositories em `pages.tsx`; preserve o padrão existente até uma refatoração planejada.

## Alterações visuais

Antes de alterar botão, input, card, modal, tabela, tipografia, cores, espaçamento, menu ou topbar, localize o componente ou estilo global correspondente. Se um componente global existe, não o reimplemente em cada página.

Consulte `docs/ai/05_DESIGN_SYSTEM_MAP.md` e `docs/ai/09_CHANGE_IMPACT_MAP.md`.

## Comandos

```powershell
npm.cmd install
npm.cmd run dev
npm.cmd run build
npm.cmd test
npx.cmd tsc -b --pretty false
```

Não existe script `lint` no `package.json`. Não declare lint executado sem adicionar/configurar uma ferramenta em tarefa própria.

## Controle da documentação

Atualize `MODULE.md` quando responsabilidade, rota, estrutura, dependência, arquivo principal ou API pública mudar. Atualize `AI_CONTEXT.md` quando status, decisão, problema, pendência ou próxima etapa mudar. Mudança puramente cosmética não exige atualizar os mapas globais.
