# Permission Map

Fonte canônica: `src/domain/access.ts`. Escopo por registro: `src/domain/access-context.ts`. Guards: `src/app/permissions.tsx`. Rotas: `src/app/router.tsx`. Menu por função: `src/shell/AppShell.tsx`.

## Permissões

| Permissão | Módulo | Ação | Escopo efetivo | Rotas/uso |
|---|---|---|---|---|
| `dashboard.view` | dashboard | visualizar painel | definido pela role | `/` |
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
| `sales.read` | sales | consultar vendas | role | aba no `/caixa`; rota `/ordens-servico` |
| `sales.manage` | sales | criar/confirmar venda | role | ações no `/caixa`; transições e prazo em `/ordens-servico` |
| `cash.read` | cash | acessar caixa | role | `/caixa` |
| `cash.manage` | cash | abrir/receber | role | ações no `/caixa` |
| `inventory.read` | inventory | consultar estoque | role | `/estoque` |
| `inventory.manage` | inventory | movimentar estoque | role | ações no `/estoque` |

## Escopo por registro (F1-11)

O escopo (`SELF`, `STORE`, `ORGANIZATION`, `NETWORK`) pertence à definição da role/usuário (`roleDefinitions`) e vira `AccessContext` da sessão ativa (`buildAccessContext` em `src/domain/access-context.ts`; contexto global montado/desmontado por `AppProviders` junto com sessão/usuários/loja atual).

- `NETWORK`/`ORGANIZATION` (OWNER, NETWORK_ADMINISTRATOR, AUDITOR, FINANCE): qualquer loja.
- `STORE` (gerente, recepção, clínico, vendedor, caixa, estoque): apenas as lojas em `user.storeIds`. O seletor de loja do topo lista só essas lojas, `selectStore` valida antes de trocar e o carregamento cai para a primeira loja acessível quando a atual não é permitida.
- `SELF`: somente registros com `userId` do próprio usuário (nenhuma role usa hoje; função pronta e testada).
- Registros sem `storeId` (clientes, configurações) permanecem compartilhados.
- Enforcement nos repositories (`local-repositories.ts`): `assertStoreAccess` nas listagens por loja, `assertRecordAccess` nas escritas (atendimento, venda/confirm, OS, estoque/movimentos, caixa, prontuário) e filtro por loja em `listByCustomer`. Sem contexto ativo (testes, backup) não há restrição.

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

- `RequireSession`: exige sessão ativa (e não inativa) em todo o app; sem sessão → `/login`, inativa → `/bloqueado`.
- `RequirePermission`: guard de rota; aguarda `isReady` e redireciona para `/sem-acesso`.
- `Can`: componente condicional null-safe sem sessão.
- `hasPermission`: usado pelo shell, dashboard e `CashDeskPage`.
- Escopo de registro: `assertStoreAccess`/`assertRecordAccess` (repositories) + validação de troca de loja em `selectStore`.

## Lógica por role direta

Não foi encontrado `user.role === "admin"`. `CashDeskPage` usa combinações de permissions, não comparações de role. Labels e descrições usam chaves de role somente para lookup.

## Riscos

- `attendance.create` não tem guard interno de permissão (o escopo de loja sim, via repository).
- O form de venda carrega a lista de produtos para quem tem `sales.manage`, mesmo sem `inventory.read`; a tela `/estoque` continua protegida.
- O frontend é a única barreira; não há backend para revalidar autorização.
