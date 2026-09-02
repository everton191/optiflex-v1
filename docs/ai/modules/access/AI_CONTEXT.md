# AI CONTEXT — Access

## Current Status

- Dez roles e 21 permissions.
- Guards de rota funcionais.
- Menus desktop/mobile filtrados pela mesma matriz.
- Ações do Caixa variam por permissions.

## Current Decisions

- Perfil clínico técnico: `CLINICAL_PROFESSIONAL`.
- Rótulos de interface são amigáveis e separados das chaves.
- Seller não abre/recebe caixa; cashier não cria venda.

## Known Problems

- Enforcement existe apenas no frontend.
- Scopes não são validados de forma abrangente nos repositories.
- Algumas permissions de ação existem sem guard interno individual.

## Pending Work

- Aplicar `dashboard.view` à rota inicial.
- Definir autenticação real e enforcement no backend futuro.
- Cobrir todas as roles com testes de matriz.

## Important Files Right Now

- `src/domain/access.ts`.
- `src/app/permissions.tsx`.
- `src/app/router.tsx`.
- `src/shell/AppShell.tsx`.
- `src/domain/access.test.ts`.

## Recent Structural Changes

- Permissions de sales, cash e inventory foram adicionadas.
- Menu passou a ser orientado ao tipo de utilização.

## Be Careful With

- Alterar permission exige revisar rota, menu e ação interna.
- Não usar labels de interface como chave de autorização.

## Next Likely Task

Adicionar testes parametrizados para a matriz completa de roles.
