# AI CONTEXT — Access

## Current Status

- Dez roles e 21 permissions; matriz permissão × perfil exibida em `/admin/perfis` (F2-05, `1b3f757`).
- Guards de rota funcionais; `RequireSession` exige sessão ativa em todo o app.
- Login local com e-mail/senha (hash+salt), sessão TTL 12 h, modo demonstração explícito e troca de senha.
- Menus desktop/mobile filtrados pela mesma matriz; sessão sincroniza a role do usuário sem reload (`syncSessionRole`).
- Loja atual fora de `user.storeIds` cai automaticamente para a primeira loja acessível (provider).
- Ações do Caixa variam por permissions.

## Current Decisions

- Perfil clínico técnico: `CLINICAL_PROFESSIONAL`.
- Rótulos de interface são amigáveis e separados das chaves.
- Seller não abre/recebe caixa; cashier não cria venda.
- Sem senha → acesso só pela demonstração em `/login` (sem credencial padrão).
- Falha de login responde mensagem única (anti-enumeração); sem `issuedAt` a sessão vale como expirada.
- `LocalSession.role` é espelho da role do usuário; `syncSessionRole` reconcilia em `refreshUsers` e persiste via `sessionRepository.save` (menu/rotas reagem sem reload).
- Matriz de perfis é leitura (roles customizáveis continuam fora de escopo).

## Known Problems

- Enforcement existe apenas no frontend.
- `attendance.create` e algumas permissions de ação existem sem guard interno individual.
- Fallback de loja não desloga quando não há nenhuma loja acessível (repositories negam, mas a sessão permanece).

## Pending Work

- Aplicar `dashboard.view` à rota inicial.
- Autenticação real e enforcement no backend futuro (F5-02 mantendo `AuthenticationService`).
- F8-06: suíte dedicada de testes de permissões (matriz e guards de rota).

## Important Files Right Now

- `src/domain/access.ts`.
- `src/domain/password.ts` e `src/domain/authentication-service.ts`.
- `src/app/permissions.tsx`.
- `src/app/router.tsx`.
- `src/shell/AppShell.tsx`.
- `src/domain/access.test.ts` e `src/domain/authentication-service.test.ts`.

## Recent Structural Changes

- F2-05 (`1b3f757`): `allPermissions` + `syncSessionRole` em `access.ts`; matriz em `/admin/perfis`; provider sincroniza role da sessão e cai para loja acessível; testes negativos por perfil (`access.test.ts` +6, `storage/access-scope.test.ts` +1).
- F7-02: rotas `/login`, `/bloqueado`, `/trocar-senha`; `SessionRepository.get()` agora pode retornar `null` (fim do OWNER automático).
- Permissions de sales, cash e inventory foram adicionadas.
- Menu passou a ser orientado ao tipo de utilização.

## Be Careful With

- Alterar permission exige revisar rota, menu e ação interna.
- Não usar labels de interface como chave de autorização.

## Next Likely Task

F8-06 (suíte de testes de permissões) ou F8-07 (auditoria de segurança).
