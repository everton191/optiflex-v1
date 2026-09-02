# AI Workflow

## Para qualquer nova tarefa

### Passo 1

Leia `AGENTS.md`.

### Passo 2

Leia `docs/ai/01_PROJECT_MAP.md`.

### Passo 3

Localize a responsabilidade em `docs/ai/03_MODULE_INDEX.md`.

### Passo 4

Leia `docs/ai/modules/<módulo>/MODULE.md`.

### Passo 5

Leia `docs/ai/modules/<módulo>/AI_CONTEXT.md`.

### Passo 6

Consulte mapas extras somente se necessário:

- rota → `04_ROUTE_MAP.md`;
- UI global → `05_DESIGN_SYSTEM_MAP.md`;
- permissões → `06_PERMISSION_MAP.md`;
- persistência/fluxo → `07_DATA_FLOW.md`;
- componente compartilhado → `08_SHARED_COMPONENTS.md`;
- impacto → `09_CHANGE_IMPACT_MAP.md`.

### Passo 7

Abra somente os arquivos diretamente envolvidos indicados pelo módulo.

### Passo 8

Faça busca mais ampla apenas quando imports, erro ou comportamento mostrarem que o problema ultrapassa o módulo.

### Passo 9

Depois de mudança estrutural, atualize a documentação correspondente. Não atualize mapas globais por alteração apenas cosmética.

## Regras de busca

Evite começar por:

- `rg` recursivo sem path/filtro;
- leitura de todos os `.ts/.tsx`;
- `cat`/`Get-Content` de arquivos gigantes;
- `node_modules`, `dist`, coverage, caches e lockfiles.

Prefira:

1. índice;
2. módulo;
3. arquivo específico;
4. símbolo específico com `rg -n "NomeDoSímbolo" caminho`;
5. dependência específica.

Se a tarefa citar tela, rota ou função, localize primeiro nos mapas.

## Limites do mapa atual

- `pages.tsx` é um arquivo concentrado: use busca por nome da Page, não leia tudo por padrão.
- `local-repositories.ts` reúne implementações: busque pela classe concreta.
- `repositories.ts` reúne contratos: busque pela interface.
- Não há entrypoints de módulos porque não há pastas físicas de módulos.

## Controle de documentação

Atualize `MODULE.md` quando mudar responsabilidade, rota, estrutura, dependência, arquivo principal ou API pública.

Atualize `AI_CONTEXT.md` quando mudar status, decisão, bug conhecido, pendência ou próxima etapa. Remova informação vencida; não mantenha changelog infinito.

Atualize mapas globais somente quando a visão transversal mudar.

## Validação mínima após mudanças

1. `npm.cmd test`
2. `npm.cmd run build`
3. confirmar rotas/guards se alterados;
4. validar fluxo no navegador se UI/comportamento mudou;
5. revisar `git diff --check` e `git status`.

## Simulações de localização

- Botão global → Design System Map → `components.tsx` + `.button`.
- Busca de clientes → customers docs → `CustomersPage` + `LocalCustomerRepository.list`.
- Prescrição → clinical docs → `ClinicalWorkspacePage` + `ClinicalService.finalize`.
- Fechamento de caixa → cash docs → confirmar que ainda não existe antes de implementar.
- Menu lateral → Shared/Impact Map → `AppShell.tsx` + access + router + styles.
