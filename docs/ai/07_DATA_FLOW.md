# Data Flow

## Persistência comum

```text
Page
  ↓ chama
Domain Service
  ↓ depende de
Repository Interface
  ↓ implementada por
Local Repository
  ↓
Dexie / IndexedDB (`opticore-v1`)
```

As páginas nunca chamam métodos Dexie diretamente. Porém, os `src/app/*Workspace.tsx` instanciam implementações locais, portanto conhecem a infraestrutura concreta.

## Inicialização

```text
main.tsx
→ AppProviders
→ AdministrationService.initialize
→ LocalAdministrationRepository
→ seed de lojas/usuários/currentStore
→ leitura paralela de settings, session, stores, users e loja atual
```

Se o armazenamento falhar, `AppProviders` bloqueia a montagem das páginas e oferece nova tentativa, sem substituir sessão ou loja por dados fictícios. A migração 9 corrige os índices ausentes usados na ordenação de lojas/usuários por nome.

## Cliente

```text
CustomersPage / CustomerNewPage / CustomerProfilePage
→ ReceptionService
→ CustomerRepository
→ LocalCustomerRepository
→ database.customers
```

A busca de clientes carrega a lista uma única vez e filtra em memória: `CustomersPage` usa `customerSearchTerms` (F7-18, `8082ad2`) para pré-computar termos normalizados (caixa/acentos) por cliente no carregamento e repassa `match` ao `DataTable`, que aplica `includes` barato a cada tecla — **nenhuma releitura do IndexedDB durante a digitação** (antes: uma leitura completa por tecla).

## Atendimento

```text
Cliente
→ ReceptionService.startAttendance
→ Attendance(status WAITING, storeId)
→ LocalAttendanceRepository
→ fila da loja
→ ClinicalQueuePage
```

O histórico do cliente também lê `attendances` por `customerId`. A fila consome `?customer=<id>`, verifica a existência do cliente e limpa o parâmetro após criar o atendimento. A criação exige `attendance.create` na interface; links clínicos exigem `clinical.workspace.access`. O service rejeita cliente inexistente e loja vazia. Isso não substitui autenticação e enforcement de escopo.

## Clínica

```text
Fila clínica
→ /clinico/atendimento/:attendanceId
→ ClinicalService.load
→ rascunho em estado React
→ salvar/finalizar
→ ClinicalRepository
→ database.clinicalRecords
```

Finalização exige prescrição não vazia. Anamnese, exame, solicitações e prescrição são campos de um único `ClinicalRecord`, salvos automaticamente (`ClinicalDraft`). Anexos guardam metadados e o conteúdo real em base64 na tabela `attachments` (F3-09).

## Venda e ordem de serviço

```text
CashDeskPage / aba Vendas
→ SalesService.createQuote
→ Sale(status QUOTE)
→ confirmar
→ Sale(status CONFIRMED)
→ WorkOrderService.createFromConfirmedSale
→ WorkOrder(status OPEN)
```

`WorkOrderService` retorna uma ordem existente para a mesma venda e evita duplicação.

## Caixa e recebimento

```text
CashDeskPage / aba Abertura
→ CashService.open
→ CashSession sem closedAt

CashDeskPage / aba Recebimentos
→ CashService.receive
→ exige sessão aberta
→ CashEntry(type RECEIPT)
```

Não existe fechamento de caixa. Receber cria uma entrada, mas não persiste status de pagamento na venda; a prevenção visual de clique repetido dura somente durante a montagem atual da página.

## Estoque

```text
InventoryPage
→ InventoryService.list
→ InventoryRepository
→ database.inventoryItems

InventoryService.adjust
→ valida quantidade/motivo/saldo
→ atualiza item
→ cria InventoryMovement
```

A UI atual lista itens, mas não expõe `adjust`.

## Tratamento de erros

```text
catch (reason)
→ errorMessage(reason, fallback)   (src/domain/errors.ts)
→ Error com message não-vazia → message; caso contrário → fallback
→ setError / estado visível na página
```

- `errorMessage` é a fonte única para traduzir um erro desconhecido em mensagem exibível: nunca retorna string vazia e nunca lança. 4 testes em `errors.test.ts` fixam o contrato.
- Padrão das workspaces: todo `catch` captura o motivo (`catch (reason)`/`catch (failure)`) e usa `errorMessage(reason, "…")` — 24 ternários `X instanceof Error ? X.message : …` unificados e os `catch` de carregamento (caixa, dashboard, estoque, OS, recepção, clientes) agora expõem o motivo real em vez de uma frase fixa.
- `RouteErrorBoundary` (`src/app/RouteErrorBoundary.tsx`) envolve `AppShell`, `/login` e `/bloqueado` no `router.tsx`: erro de renderização mostra "Não foi possível exibir esta tela" com "Tentar novamente" e "Recarregar página", registrando o erro no console.
- Falha de armazenamento na inicialização segue fluxo próprio: `AppProviders` bloqueia a montagem e oferece nova tentativa (seção "Inicialização").
- Serviços e infraestrutura não têm `catch` vazio (critério de aceite do card): `backup.ts`/`backup-codec.ts` rejeitam com mensagem própria e `local-repositories.ts` preserva o `reason`.
- Catches deliberados, todos com estado visível ou finalidade registrada: `clinical-draft.ts` (falha fica em `draft.error`, rascunho nunca descartado), `ClinicalWorkspace` (bloqueio de saída com alerta na tela), `CustomersWorkspace` (lista de duplicados best-effort) e `providers.tsx` (fallback de loja reavaliado quando sessão/usuários mudam).

## Estado, cache, offline e sync

- Temporário: `useState` dentro das páginas.
- Global: React Context em `AppProviders`.
- Persistente: IndexedDB via Dexie.
- PWA/cache: service worker gerado por Vite PWA.
- Autosave: inexistente.
- Sincronização cloud: inexistente.
- API/backend: inexistente.

## Desempenho (F7-18, `8082ad2`)

### Medição (volume sintético de 5k clientes)

Procedimento reexecutável: `.git/perf-check.mjs` (Chrome headless + `playwright-core` contra `npm run preview`). O script faz login demo, semeia **5.000 clientes** via IndexedDB bruta (bulk `put`, sem tocar a UI), mede e exige thresholds (PERF OK):

| Métrica | Baseline (`0c770f0`) | Após (`8082ad2`) |
|---|---|---|
| Carga inicial (reload → dashboard pronto) | 5.096–5.116 ms | 5.106 ms |
| Abrir lista de clientes (5k) | 131–147 ms | 137–144 ms |
| Busca digitando "perf 4999" (9 teclas, 40 ms) | 604–628 ms | 601–631 ms |
| **Busca em evento único (processamento puro)** | **73 ms** | **22 ms** |
| **Leituras do IndexedDB durante a busca** | **9 (1 por tecla)** | **0 (1 no carregamento)** |
| Troca de loja (em /caixa, relê tudo) | 269–286 ms | 270–278 ms |

- CA do card ("lista de 5k clientes navega sem travamento; métrica registrada") atendido nos dois lados: lista renderiza só 10 linhas/página (paginação do `DataTable`, F7-08), busca e troca de loja < 1 s, nenhum cenário estourou os limites.
- A busca digitada medida depara com o delay de digitação (~40 ms/tecla) — a diferença real aparece na coluna "evento único" (3,3×) e no corte de 9→0 leituras por busca (escala: em 50k clientes a releitura por tecla cresce linearmente; o filtro em memória não).
- Screenshots: `.git/shots/perf-list-5k.png` (5.000 registros, página 1 de 500) e `perf-search-after-fill.png` (busca "perf 4999" → 1 resultado).
- O `PerformanceObserver` de `longtask` não emite entradas no Chrome headless usado; o proxy de travamento é o tempo total de cada cenário dentro dos limites.

### Decisões orientadas por métrica

- **Novo índice Dexie: não.** `customers` já tem índice `name` (usado pelo `orderBy("name")` da carga única); busca `contains` não aproveita índice de IndexedDB (só ranges de prefixo); com a métrica, leitura única + filtro em memória pré-computado é rápido a 5k (22 ms). Bump de schema (padrão F1-08) sem necessidade medida seria otimização prematura — explicitamente fora de escopo do card.
- **Paginação: já existente e suficiente.** `DataTable` renderiza 10 linhas por página com `paginateRows`; confirmado com 5k registros (500 páginas) sem travamento de render.
- **Busca de clientes: carga única + índice em memória.** `customerSearchTerms`/`customerSearchTermsMatch` puros e testados (`customer.test.ts`, inclui paridade termos×match); `CustomersPage` memoiza `Map<id, terms>` com `useMemo` no carregamento; `match` do `DataTable` consulta o mapa. Preserva semântica por campo (nome/CPF/telefone separados) e melhora com acentos/caixa.
- **Troca de loja: sem mudança.** 278 ms medidos relendo tudo (inclui 5k clientes no caixa) — dentro do limite; caches por loja seriam otimização prematura sem reclamação/métrica de dor.

### Repetir a medição

1. `npm.cmd run build` e `npm.cmd run preview -- --port 4173 --strictPort`.
2. `node .git/perf-check.mjs <label>` — imprime JSON com todas as métricas e `PERF OK` (ou falha com o motivo).
3. Registrar números novos nesta seção ao mudar caminhos quentes (listas, busca, troca de loja).
