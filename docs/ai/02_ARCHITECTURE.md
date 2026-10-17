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

- `src/app/pages.tsx`: barrel de re-exports das páginas (F1-03); cada página vive em seu `src/app/*Workspace.tsx`, que detém o estado temporário de formulários.
- `src/shell/AppShell.tsx`: layout persistente e navegação responsiva.
- `src/design-system/`: primitives e tokens globais.
- `src/styles.css`: estilos do shell, páginas e breakpoints.

### Aplicação e estado

`AppProviders` carrega organização, sessão, lojas, usuários e loja atual. O estado é React Context + `useState`; não há store externa. As páginas só montam após o carregamento. Falhas exibem uma mensagem com nova tentativa, sem conceder OWNER ou criar loja fictícia em memória.

### Domínio

Os arquivos `*-service.ts` aplicam validações e orquestram repositories. `repositories.ts` reúne todos os contratos. Modelos ficam em arquivos por assunto (`customer.ts`, `clinical.ts`, `sales.ts`, etc.).

**Regra F1-02 (auditoria de 08/10/2026):** toda entidade nova nasce com (1) tipo em `src/domain/<assunto>.ts`, (2) contrato em `repositories.ts` quando houver persistência e (3) teste de domínio/serviço **antes** da UI. A UI não acessa Dexie diretamente (verificado em `src/app`: 0 usos de `db.`/`indexedDB`). Mapeamento entidade → contrato → teste (estado em `8fc64b0`):

| Modelos | Contratos | Testes |
|---|---|---|
| `access.ts` (User, Store, OrganizationSettings, LocalSession, CurrentStoreContext) | Settings, Session, Administration | `access.test.ts`, `access-scope.test.ts`, `administration-service.test.ts`, `authentication-service.test.ts`, `storage/settings.test.ts` |
| `customer.ts` (Customer, Attendance) | Customer, Attendance | `reception-service.test.ts` |
| `clinical.ts` (ClinicalRecord, ClinicalVersion, ClinicalAttachment/Content) | Clinical | `storage/clinical.test.ts`, `clinical-attachments.test.ts` |
| `sales.ts` (Sale) | Sale | `sales-service.test.ts`, `storage/sale-stock.test.ts` |
| `work-order.ts` (WorkOrder, WorkOrderEvent) | WorkOrder | `work-order-service.test.ts`, `storage/work-orders.test.ts` |
| `inventory.ts` (InventoryItem, InventoryMovement) | Inventory | `inventory-service.test.ts`, `storage/inventory.test.ts` |
| `cash.ts` (CashSession, CashEntry) | Cash | `cash-service.test.ts`, `storage/cash.test.ts` |
| `money.ts`, `dashboard.ts`, `password.ts`, `access-context.ts` | — (helpers/guards/métricas) | `money.test.ts`, `dashboard.test.ts`, testes de acesso acima |

Entidades ainda sem modelo (produtos/catálogo, agenda, garantias, fiscal, SaaS) entram com seus próprios cards, conforme as fases avançarem.

### Infraestrutura

`database.ts` declara onze versões do schema Dexie (verno atual 11: a v11 acrescenta a tabela `attachments` de anexos clínicos; a v9 adicionou índices de nome em lojas e usuários). `local-repositories.ts` implementa todos os contratos locais e contém seeds de configurações, lojas e usuários. `database.test.ts` verifica inicialização, migração e persistência com IndexedDB em memória exclusivo para testes.

## Direção das dependências

- Domínio não importa apresentação ou infraestrutura.
- Infraestrutura importa contratos e modelos do domínio.
- Apresentação importa domínio e infraestrutura.
- Shell importa provider da aplicação e acesso do domínio.

Desvio conhecido: os `*Workspace.tsx` instanciam repositories locais diretamente. A página não chama Dexie, mas conhece a implementação concreta (padrão repetido em cada workspace). Documentar/refatorar injeção futura é válido; não mover agora sem tarefa específica.

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

- ~~Separar `pages.tsx` por módulo quando o volume justificar.~~ Concluído em F1-03 (08/10/2026): extraído para `Admin/Customers/Reception/Cash/AuthWorkspace.tsx`; restam no barrel apenas re-exports e `ForbiddenPage`.
- Criar composition root para instanciar repositories/services fora das páginas.
- Criar entrypoints somente após módulos físicos existirem.
- Adicionar tratamento uniforme de erros assíncronos e mais testes por service.
- Não há autosave, sync cloud ou cache além do IndexedDB/PWA.
