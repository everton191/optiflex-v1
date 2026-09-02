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

Se o armazenamento falhar, `AppProviders` usa organização, usuário proprietário e loja temporários em memória para liberar a interface.

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

O histórico do cliente também lê `attendances` por `customerId`.

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

Finalização exige prescrição não vazia. Anamnese, exame, solicitações e prescrição são campos de um único `ClinicalRecord`. Não há autosave; salvar depende do botão. Anexos armazenam somente metadados.

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
