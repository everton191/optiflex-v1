# Architecture

## Estado atual

Opticore é uma SPA React/Vite, offline-first, com persistência Dexie no IndexedDB. Não existe backend, autenticação remota, sincronização, API HTTP ou integração externa no código atual.

## Camadas reais

```text
main.tsx
  ↓
AppProviders + AppRouter
  ↓
AppShell + Pages
  ↓
Domain Services
  ↓
Repository Interfaces
  ↓
Local Repository Implementations
  ↓
Dexie / IndexedDB
```

### Apresentação

- `src/app/pages.tsx`: todas as páginas e parte do estado temporário de formulários.
- `src/shell/AppShell.tsx`: layout persistente e navegação responsiva.
- `src/design-system/`: primitives e tokens globais.
- `src/styles.css`: estilos do shell, páginas e breakpoints.

### Aplicação e estado

`AppProviders` carrega organização, sessão, lojas, usuários e loja atual. O estado é React Context + `useState`; não há store externa. Se o IndexedDB falhar, existe fallback em memória para permitir que a interface carregue.

### Domínio

Os arquivos `*-service.ts` aplicam validações e orquestram repositories. `repositories.ts` reúne todos os contratos. Modelos ficam em arquivos por assunto (`customer.ts`, `clinical.ts`, `sales.ts`, etc.).

### Infraestrutura

`database.ts` declara oito versões do schema Dexie. `local-repositories.ts` implementa todos os contratos locais e contém seeds de configurações, lojas e usuários.

## Direção das dependências

- Domínio não importa apresentação ou infraestrutura.
- Infraestrutura importa contratos e modelos do domínio.
- Apresentação importa domínio e infraestrutura.
- Shell importa provider da aplicação e acesso do domínio.

Desvio conhecido: `pages.tsx` instancia repositories locais diretamente. A página não chama Dexie, mas conhece a implementação concreta. Documentar/refatorar injeção futura é válido; não mover agora sem tarefa específica.

## Rotas e autorização

`router.tsx` usa `createBrowserRouter` com um único `AppShell`. `RequirePermission` aguarda o provider e redireciona acesso negado para `/sem-acesso`. `Can` permite renderização condicional, embora a navegação atual filtre itens diretamente com `hasPermission`.

## PWA

`main.tsx` registra o service worker. `vite.config.ts` usa `VitePWA` com atualização automática, manifest e ícone SVG.

## Dependências circulares

Resultado da inspeção dos imports TypeScript: **0 ciclos relevantes encontrados**.

- Classificação CRITICAL: 0
- Classificação IMPORTANT: 0
- Classificação LOW: 0

Existe acoplamento entre `router.tsx → AppShell.tsx → providers.tsx`, mas não há caminho de retorno que forme ciclo.

## Pontos de melhoria documentados

- Separar `pages.tsx` por módulo quando o volume justificar.
- Criar composition root para instanciar repositories/services fora das páginas.
- Criar entrypoints somente após módulos físicos existirem.
- Adicionar tratamento uniforme de erros assíncronos e mais testes por service.
- Não há autosave, sync cloud ou cache além do IndexedDB/PWA.
