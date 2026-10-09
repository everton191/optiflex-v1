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

As páginas nunca chamam métodos Dexie diretamente. Porém, `pages.tsx` instancia implementações locais, portanto conhece a infraestrutura concreta.

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

A busca normaliza o texto e filtra nome/CPF/telefone em memória após carregar os clientes ordenados.

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

## Estado, cache, offline e sync

- Temporário: `useState` dentro das páginas.
- Global: React Context em `AppProviders`.
- Persistente: IndexedDB via Dexie.
- PWA/cache: service worker gerado por Vite PWA.
- Autosave: inexistente.
- Sincronização cloud: inexistente.
- API/backend: inexistente.
