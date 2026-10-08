# Module Index

Os módulos abaixo são responsabilidades reais encontradas. Como ainda não há `src/modules/`, a documentação detalhada fica em `docs/ai/modules/<módulo>/`.

## Dashboard

- Responsabilidade: visão geral, métricas mockadas e atalhos filtrados por permissão.
- Diretório lógico: `src/app/DashboardWorkspace.tsx` (re-exportada por `pages.tsx`).
- Rota: `/` (guard `dashboard.view`).
- Entrypoint/página: `DashboardPage`.
- Service/repository/store/hooks: nenhum próprio; consulta sales, caixa, fila, ordens e estoque do repositório local da loja.
- Models/permissões: `LocalSession`, `OrganizationSettings`, `hasPermission`; seletores puros em `src/domain/dashboard.ts`.
- Dependências: provider, `Card`, React Router, acesso e módulos operacionais.
- Usado por: entrada após abrir a aplicação.
- Arquivos importantes: `DashboardWorkspace.tsx`, `dashboard.ts`, `AppShell.tsx`, `styles.css`.
- Risco: métricas refletem apenas a loja atual e os dados locais; loading/error tratados por estado.
- Tarefas: layout → `styles.css`; cálculos → `dashboard.ts` + `dashboard.test.ts`; menu → `AppShell.tsx`.
- Docs: `modules/dashboard/MODULE.md` e `AI_CONTEXT.md`.

## Access

- Responsabilidade: roles, permissions, scopes, guards e visibilidade do menu.
- Diretórios: `src/domain`, `src/app`, `src/shell`.
- Rotas: influencia todas; tela `/sem-acesso`.
- Entrypoints: `access.ts`, `permissions.tsx`.
- Componentes: `Can`, `RequirePermission`.
- Teste: `access.test.ts`.
- Dependências: provider para sessão; React Router para redirect.
- Usado por: router, shell, dashboard, caixa e administração.
- Risco: alterar uma role muda menu, rota e ações internas.
- Tarefas: matriz → `access.ts`; guard → `permissions.tsx`; menu → `AppShell.tsx`.
- Docs: `modules/access/MODULE.md` e `AI_CONTEXT.md`.

## Administration

- Responsabilidade: configurações da organização, lojas, loja atual e usuários.
- Rotas: `/admin/usuarios`, `/admin/perfis`, `/admin/configuracoes`.
- Páginas: `UsersPage`, `ProfilesPage`, `SettingsPage`.
- Service: `AdministrationService`.
- Repository: `AdministrationRepository`, implementações de settings/session/administração.
- Estado: `AppProviders`.
- Models: `Store`, `User`, `OrganizationSettings`, `CurrentStoreContext`, `LocalSession`.
- Dependências: access, IndexedDB e shell.
- Risco: sessão OWNER padrão ainda é demo local, sem autenticação; falha de boot agora bloqueia a operação com nova tentativa.
- Tarefas: seletor de loja → provider/service/shell; configuração → SettingsPage + repository.
- Docs: `modules/administration/MODULE.md` e `AI_CONTEXT.md`.

## Customers

- Responsabilidade: busca, cadastro, perfil e histórico do cliente.
- Rotas: `/clientes`, `/clientes/novo`, `/clientes/:customerId`.
- Páginas: `CustomersPage`, `CustomerNewPage`, `CustomerProfilePage`.
- Service: `ReceptionService`.
- Repository: `CustomerRepository` / `LocalCustomerRepository`.
- Model: `Customer`.
- Permissões: `customers.read`, `customers.manage`.
- Dependências: attendance para histórico e início de atendimento.
- Usado por: recepção, clínica e caixa/vendas.
- Risco: busca é filtro em memória após leitura completa do IndexedDB.
- Tarefas: busca → `LocalCustomerRepository.list` + `CustomersPage`; formulário → `CustomerNewPage`.
- Docs: `modules/customers/MODULE.md` e `AI_CONTEXT.md`.

## Attendance

- Responsabilidade: criar atendimento e manter fila por loja.
- Rota: `/atendimentos`.
- Página: `AttendancePage`.
- Service: `ReceptionService`.
- Repository: `AttendanceRepository` / `LocalAttendanceRepository`.
- Models: `Attendance`, `AttendanceType`, `AttendanceStatus`.
- Permissões: `attendance.read`, `attendance.create`, `attendance.queue.read`.
- Dependências: customers, store context e clinical.
- Usado por: histórico do cliente e fila clínica.
- Risco: UI filtra apenas `WAITING`; início sempre usa `CONSULTATION`.
- Docs: `modules/attendance/MODULE.md` e `AI_CONTEXT.md`.

## Clinical

- Responsabilidade: fila clínica, prontuário, anamnese, exame, solicitações, prescrição e finalização.
- Rotas: `/clinico`, `/clinico/atendimento/:attendanceId`.
- Páginas: `ClinicalQueuePage`, `ClinicalWorkspacePage`.
- Service: `ClinicalService`.
- Repository: `ClinicalRepository` / `LocalClinicalRepository`.
- Model: `ClinicalRecord`, `ClinicalAttachment`.
- Permissão: `clinical.workspace.access`.
- Dependências: attendance; prescription é campo interno, não módulo separado.
- Risco: finalizar exige prescrição; anexos guardam apenas metadados.
- Docs: `modules/clinical/MODULE.md` e `AI_CONTEXT.md`.

## Sales

- Responsabilidade: criar orçamento (com itens de estoque opcionais), confirmar venda baixando saldo e listar vendas dentro do Caixa.
- Rota canônica: `/caixa`; redirects `/vendas` e `/pagamentos`.
- Página: `CashDeskPage`, aba Vendas (form + seletor `.sale-items-form`).
- Service: `SalesService` (`createQuote` calcula total/descrição dos itens; `confirm` dispara a baixa).
- Repository: `SaleRepository` / `LocalSaleRepository` (`confirm` transacional venda + estoque).
- Model: `Sale`, `SaleStatus`, `SalePaymentStatus`, `SaleItem`, `stockMovementsFor`.
- Permissões: `sales.read`, `sales.manage` e acesso da rota por `cash.read`.
- Dependências: customers, cash, work-orders e inventory.
- Risco: página comercial é compartilhada; mudanças podem afetar recebimentos e abertura.
- Docs: `modules/sales/MODULE.md` e `AI_CONTEXT.md`.

## Work Orders

- Responsabilidade: criar, produzir e entregar ordens com prazo e observações.
- Rota/página: `/ordens-servico` (`src/app/WorkOrdersWorkspace.tsx`); criação rápida também na aba Vendas de `/caixa`.
- Service: `WorkOrderService` (`list`, `getBySale`, `createFromConfirmedSale`, `transition`, `schedule`).
- Repository: `WorkOrderRepository` / `LocalWorkOrderRepository` (criação atômica por `saleId` e atualização transacional com guarda de status obsoleto).
- Model: `WorkOrder` (`dueAt?`, `notes?`, `updatedAt?`, `updatedBy?`), `WorkOrderStatus`, `workOrderTransitions`.
- Dependências: sales, customers, store context, sessão (autor).
- Usado por: `WorkOrdersPage` e `CashDeskPage`.
- Risco: sem histórico completo de eventos e sem vínculo com itens de estoque/laboratório.
- Docs: `modules/work-orders/MODULE.md` e `AI_CONTEXT.md`.

## Inventory

- Responsabilidade: itens, saldo mínimo e movimentos de entrada/saída/ajuste com histórico.
- Rota: `/estoque`.
- Página: `InventoryPage` (`src/app/InventoryWorkspace.tsx`): cadastro, movimentação, alertas e histórico.
- Service: `InventoryService` (`list`, `history`, `create`, `update`, `adjust`).
- Repository: `InventoryRepository` / `LocalInventoryRepository` (transacional, anti-saldo-negativo).
- Models: `InventoryItem` (com `code?`), `InventoryMovement` (com `author?`), `stockState`, `movementDelta`.
- Permissões: `inventory.read`, `inventory.manage`.
- Dependências: store context, sessão (autor), backup (`code`/`author` validados).
- Risco: baixa ocorre só em vendas com itens; OS e cancelamento ainda não movimentam estoque.
- Docs: `modules/inventory/MODULE.md` e `AI_CONTEXT.md`.

## Cash

- Responsabilidade: tela unificada de vendas, recebimentos, abertura e fechamento do caixa.
- Rota: `/caixa`; redirects `/vendas` e `/pagamentos`.
- Página: `CashDeskPage`.
- Service: `CashService`; também orquestra SalesService e WorkOrderService.
- Repository: `CashRepository` / `LocalCashRepository` (abertura, recebimento e fechamento transacionais).
- Models: `CashSession`, `CashEntry`, `cashTotals`.
- Permissões: `cash.read`, `cash.manage`; abas variam por função.
- Dependências: sales, customers, work-orders, store context.
- Risco: sangria/suprimento e formas de pagamento ainda não têm UI; parcelas/carnê inexistentes.
- Tarefas: abertura/receber/fechar → cash service/repository; interface → `CashDeskPage` e estilos `cash-*`.
- Docs: `modules/cash/MODULE.md` e `AI_CONTEXT.md`.
