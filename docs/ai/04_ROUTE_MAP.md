# Route Map

Todas as rotas usam `AppShell`. A configuração canônica está em `src/app/router.tsx`.

| Rota | Página/ação | Módulo | Permissão | Layout |
|---|---|---|---|---|
| `/` | `DashboardPage` | dashboard | `dashboard.view` | AppShell |
| `/clientes` | `CustomersPage` | customers | `customers.read` | AppShell |
| `/clientes/novo` | `CustomerNewPage` | customers | `customers.manage` | AppShell |
| `/clientes/:customerId` | `CustomerProfilePage` | customers | `customers.read` | AppShell |
| `/clientes/:customerId/editar` | `CustomerEditPage` | customers | `customers.manage` | AppShell |
| `/atendimentos` | `AttendancePage` | attendance | `attendance.read` | AppShell |
| `/atendimentos/novo` | `AttendanceNewPage` | attendance | `attendance.create` | AppShell |
| `/atendimentos/:attendanceId` | `AttendanceDetailPage` | attendance | `attendance.read` | AppShell |
| `/agenda` | `AgendaPage` | attendance | `attendance.read` | AppShell |
| `/clinico` | `ClinicalQueuePage` | clinical | `clinical.workspace.access` | AppShell |
| `/clinico/atendimento/:attendanceId` | `ClinicalWorkspacePage` | clinical | `clinical.workspace.access` | AppShell |
| `/caixa` | `CashDeskPage` | cash/sales | `cash.read` | AppShell |
| `/estoque` | `InventoryPage` | inventory | `inventory.read` | AppShell |
| `/ordens-servico` | `WorkOrdersPage` | work-orders | `sales.read` | AppShell |
| `/vendas` | redirect para `/caixa` | sales | guard aplicado no destino | AppShell |
| `/pagamentos` | redirect para `/caixa` | cash | guard aplicado no destino | AppShell |
| `/admin/lojas` | `StoresPage` | administration | `stores.manage` | AppShell |
| `/admin/usuarios` | `UsersPage` | administration | `users.read` | AppShell |
| `/admin/perfis` | `ProfilesPage` | access/admin | `roles.read` | AppShell |
| `/admin/configuracoes` | `SettingsPage` | administration | `settings.manage` | AppShell |
| `/sem-acesso` | `ForbiddenPage` | access | nenhuma | AppShell |

## Parâmetros e query strings

- `customerId`: identifica o cliente carregado por `ReceptionService.getCustomer`.
- `attendanceId`: chave do `ClinicalRecord` e vínculo com atendimento; em `/atendimentos/:attendanceId` identifica o detalhe (`ReceptionService.getAttendance`, escopo de loja aplicado).
- Cadastro/perfil encaminham `/atendimentos?customer=<id>` para pré-seleção validada na fila; o parâmetro é removido após o envio. Cadastro sem `attendance.create` retorna ao perfil. `/atendimentos/novo` também aceita `?customer=<id>`.
- Agenda: view dia/semana com navegação anterior/próximo/hoje; converter evento navega para `/atendimentos?customer=<id>` do cliente do evento.

## Guards e navegação

- `RequirePermission` bloqueia rotas e redireciona para `/sem-acesso`.
- `AppShell` filtra links desktop/mobile com a mesma permissão da área.
- `CashDeskPage` faz controle adicional de ações e abas com `hasPermission`.
- Não há catch-all `*`; URL desconhecida depende do comportamento padrão do router.
