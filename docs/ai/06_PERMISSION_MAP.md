# Permission Map

Fonte canônica: `src/domain/access.ts`. Guards: `src/app/permissions.tsx`. Rotas: `src/app/router.tsx`. Menu por função: `src/shell/AppShell.tsx`.

## Permissões

| Permissão | Módulo | Ação | Escopo efetivo | Rotas/uso |
|---|---|---|---|---|
| `dashboard.view` | dashboard | visualizar painel | definido pela role | `/` (não guardada hoje) |
| `stores.read` | administration | consultar lojas | role | provider/topbar |
| `stores.manage` | administration | administrar lojas | role | sem UI própria |
| `stores.select` | administration | trocar loja | role | topbar |
| `users.read` | administration | listar usuários | role | `/admin/usuarios` |
| `users.manage` | administration | administrar usuários | role | sem formulário atual |
| `settings.manage` | administration | editar configuração | role | `/admin/configuracoes` |
| `roles.read` | access | listar perfis | role | `/admin/perfis` |
| `roles.manage` | access | administrar perfis | role | sem UI de edição |
| `customers.read` | customers | buscar/ver clientes | role | `/clientes`, `/clientes/:customerId` |
| `customers.manage` | customers | cadastrar cliente | role | `/clientes/novo` |
| `attendance.read` | attendance | acessar atendimentos | role | `/atendimentos` |
| `attendance.create` | attendance | criar atendimento | role | ação existente, sem guard interno separado |
| `attendance.queue.read` | attendance | consultar fila | role | service; rota usa `attendance.read` |
| `clinical.workspace.access` | clinical | abrir área clínica | role | `/clinico`, `/clinico/atendimento/:attendanceId` |
| `sales.read` | sales | consultar vendas | role | aba no `/caixa` |
| `sales.manage` | sales | criar/confirmar venda | role | ações no `/caixa` |
| `cash.read` | cash | acessar caixa | role | `/caixa` |
| `cash.manage` | cash | abrir/receber | role | ações no `/caixa` |
| `inventory.read` | inventory | consultar estoque | role | `/estoque` |
| `inventory.manage` | inventory | movimentar estoque | role | service; sem ação na UI |

O escopo (`SELF`, `STORE`, `ORGANIZATION`, `NETWORK`) pertence à definição da role/usuário. Os repositories filtram principalmente por `storeId`; não existe enforcement completo de escopo dentro de cada repository.

## Roles

- `OWNER`: todas as permissões.
- `NETWORK_ADMINISTRATOR`: administração, atendimento, comercial, caixa e estoque; sem área clínica.
- `STORE_MANAGER`: operação completa da loja; sem área clínica e sem gestão global de roles/settings.
- `RECEPTIONIST`: clientes e atendimento.
- `CLINICAL_PROFESSIONAL`: consulta de clientes/fila e área clínica.
- `SELLER`: clientes, vendas e entrada na tela Caixa; não recebe nem abre caixa.
- `CASHIER`: consulta vendas, recebimentos e abertura do caixa.
- `STOCK_MANAGER`: estoque.
- `FINANCE`: leitura de vendas e caixa.
- `AUDITOR`: leitura de dashboard, vendas, caixa e estoque.

## Guards

- `RequirePermission`: guard de rota; aguarda `isReady` e redireciona para `/sem-acesso`.
- `Can`: componente condicional disponível, atualmente sem uso fora da própria definição.
- `hasPermission`: usado pelo shell, dashboard e `CashDeskPage`.

## Lógica por role direta

Não foi encontrado `user.role === "admin"`. `CashDeskPage` usa combinações de permissions, não comparações de role. Labels e descrições usam chaves de role somente para lookup.

## Riscos

- `/` não usa `RequirePermission` apesar de existir `dashboard.view`.
- Algumas permissões de ação não têm guard interno dedicado (`attendance.create`, `stores.select`).
- O frontend é a única barreira; não há backend para revalidar autorização.
