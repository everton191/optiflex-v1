# Route Map

Todas as rotas usam `AppShell`. A configuração canônica está em `src/app/router.tsx`.

| Rota | Página/ação | Módulo | Permissão | Layout |
|---|---|---|---|---|
| `/` | `DashboardPage` | dashboard | sem guard explícito | AppShell |
| `/clientes` | `CustomersPage` | customers | `customers.read` | AppShell |
| `/clientes/novo` | `CustomerNewPage` | customers | `customers.manage` | AppShell |
| `/clientes/:customerId` | `CustomerProfilePage` | customers | `customers.read` | AppShell |
| `/atendimentos` | `AttendancePage` | attendance | `attendance.read` | AppShell |
| `/clinico` | `ClinicalQueuePage` | clinical | `clinical.workspace.access` | AppShell |
| `/clinico/atendimento/:attendanceId` | `ClinicalWorkspacePage` | clinical | `clinical.workspace.access` | AppShell |
| `/caixa` | `CashDeskPage` | cash/sales | `cash.read` | AppShell |
| `/estoque` | `InventoryPage` | inventory | `inventory.read` | AppShell |
| `/vendas` | redirect para `/caixa` | sales | guard aplicado no destino | AppShell |
| `/pagamentos` | redirect para `/caixa` | cash | guard aplicado no destino | AppShell |
| `/admin/usuarios` | `UsersPage` | administration | `users.read` | AppShell |
| `/admin/perfis` | `ProfilesPage` | access/admin | `roles.read` | AppShell |
| `/admin/configuracoes` | `SettingsPage` | administration | `settings.manage` | AppShell |
| `/sem-acesso` | `ForbiddenPage` | access | nenhuma | AppShell |

## Parâmetros e query strings

- `customerId`: identifica o cliente carregado por `ReceptionService.getCustomer`.
- `attendanceId`: chave do `ClinicalRecord` e vínculo com atendimento.
- O perfil do cliente cria link `/atendimentos?customer=<id>`, porém `AttendancePage` ainda não lê esse query parameter.

## Guards e navegação

- `RequirePermission` bloqueia rotas e redireciona para `/sem-acesso`.
- `AppShell` filtra links desktop/mobile com a mesma permissão da área.
- `CashDeskPage` faz controle adicional de ações e abas com `hasPermission`.
- Não há catch-all `*`; URL desconhecida depende do comportamento padrão do router.
