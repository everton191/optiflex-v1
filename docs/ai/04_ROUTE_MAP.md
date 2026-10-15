# Route Map

Todas as rotas usam `AppShell` (exceto `/login` e `/bloqueado`). A configuração canônica está em `src/app/router.tsx` com guards em `src/app/route-guards.ts`.

| Rota | Página/ação | Módulo | Permissão | Layout |
|---|---|---|---|---|
| `/login` | `LoginPage` | access | nenhuma (pública) | sem AppShell |
| `/bloqueado` | `BlockedPage` | access | nenhuma (sessão bloqueada) | sem AppShell |
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
| `/ordens-servico/:orderId` | `WorkOrderDetailPage` | work-orders | `sales.read` | AppShell |
| `/vendas` | redirect para `/caixa` | sales | guard aplicado no destino | AppShell |
| `/pagamentos` | redirect para `/caixa` | cash | guard aplicado no destino | AppShell |
| `/admin/lojas` | `StoresPage` | administration | `stores.manage` | AppShell |
| `/admin/usuarios` | `UsersPage` | administration | `users.read` | AppShell |
| `/admin/perfis` | `ProfilesPage` | access/admin | `roles.read` | AppShell |
| `/admin/configuracoes` | `SettingsPage` | administration | `settings.manage` | AppShell |
| `/trocar-senha` | `ChangePasswordPage` | access | nenhuma (sessão ativa) | AppShell |
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

## Navegação mobile (F7-05)

- Em telas ≤ 720px (e tablet retrato 721–1024px) a sidebar some e vale a barra inferior `.mobile-nav`.
- A barra mostra **no máximo 4 atalhos** (`shortLabel` dos 4 primeiros links visíveis) + botão **Mais** (aparece só quando existem links fora dos atalhos).
- **Mais** abre o `Drawer` do design system ("Mais áreas") com o restante do menu principal e a seção **Administração** (lojas/usuários/perfis/ajustes) — que antes era inacessível no mobile. Fecha ao clicar num link, no backdrop ou com Escape.
- Mesma filtragem de permissões do desktop (`mainLinks`/`administrationLinks`); perfil com ≤ 4 áreas e sem administração fica sem o botão Mais.
- Ex.: 390×844 — 4 atalhos + Mais cabem sem transbordamento; conteúdo do drawer rola verticalmente (`overlay-body`). Teste manual em 390×844 pendente de conferência pós-merge.
