# PROJECT STATUS — ponto de retomada de qualquer agente

> Leia este arquivo depois de `AGENTS.md` e antes de consultar o quadro (`KANBAN.md`).
> Ele sobrevive à perda do chat e à troca de agentes.

## Estado atual

- **Data da última atualização:** 08/10/2026 (revisão de publicação, dependências e bloqueios).
- **Branch analisada:** `docs/master-kanban` (documentação/planejamento).
- **Branch de desenvolvimento:** `feat/operational-flow-v2` (6 commits à frente de `v1`; merge-base `3510602`).
- **Último commit (código):** `d6ab1d4` — *feat: deduct stock when confirming sales with items*.
- **Último commit (documentação):** branch publicada de `634eb37` até o commit atual desta branch (`c4192c2` + esta atualização).
- **Remote:** `https://github.com/everton191/optiflex-v1.git`.

### Publicação (executada em 08/10/2026, com autorização do usuário)

- Varredura de sigilos **antes do push** (repo público): chaves/certificados, tokens cloud, segredos em literais, CPF/CNPJ, JWT, `.env`, binários e históricos = **limpo**; caminho pessoal generalizado (`c4192c2`); autor dos commits = e-mail noreply do GitHub.
- Push normal (`-u`, **sem force-push**) das duas branches; **`v1` preservada** (`3510602` local = remoto) e **nenhum merge executado**.
- SHAs no remoto: `feat/operational-flow-v2` = `d6ab1d4` · `docs/master-kanban` = `c4192c2` + commits desta revisão.
- Documentos do Kanban acessíveis via `raw.githubusercontent.com/.../docs/master-kanban/docs/project-management/`.
- PR `docs/master-kanban` → `feat/operational-flow-v2` (somente documentação; ver relatório da sessão).

## Revisão executada em 08/10/2026 (somente planejamento — nenhum código alterado)

1. **Dependências:** 7 ciclos detectados (SCC/Tarjan sobre `KANBAN.md`) → corrigidos em KANBAN + corpos de 8 issues → **0 ciclos** (147 nós, 184 arestas). Antes/depois: `DEPENDENCIES.md`.
2. **Status reclassificado** (decisão já registrada, label desatualizada): F4-13 `#70`, F8-03 `#137`, F3-20 `#57` → BACKLOG→**BLOCKED**.
3. **Status final das 147 tarefas:** DONE=18 · IN PROGRESS=1 · READY=39 · BACKLOG=39 · BLOCKED=50.
4. **18 tarefas DONE revalidadas:** todas com `IMPLEMENTED_AND_TESTED` + commit/teste no corpo (mapeamento no relatório da sessão); ressalvas em "Riscos".
5. **Testes re-executados:** `npm.cmd test` **101/101** · `npm.cmd run build` **exit 0** · `npx.cmd tsc -b` **exit 0** (em `b8d1a84`, 08/10/2026).

## Fase atual (taxonomia do Kanban — 8 fases)

| Fase | Estado resumido |
|---|---|
| 1 — Arquitetura e Fundação | PARCIAL — base Page→Service→Repository sólida, 101 testes; faltam erros globais, auditoria de alterações, precisão decimal única. |
| 2 — Cadastros e Administração | PARCIAL — clientes sem edição, usuários/lojas sem CRUD, sem catálogo completo. |
| 3 — Operação da Ótica | PARCIAL (ativa) — OS em desenvolvimento, prescrição sem estrutura, anexos só metadados. |
| 4 — Estoque e Financeiro | PARCIAL FORTE — estoque+caixa+dashboard entregues e testados; faltam parcelas (F4-13 agora BLOCKED por decisão P4)/sangria-UI/estornos. |
| 5 — SaaS Multiempresa | NÃO INICIADO — **bloqueado** por decisão de backend. |
| 6 — Notas Fiscais | NÃO INICIADO — **bloqueado** por especificação+provedor fiscal. |
| 7 — Interface e Experiência | PARCIAL — design system incompleto; login ausente (P0). |
| 8 — Qualidade e Lançamento | PARCIAL — testes unitários ok; sem e2e/piloto/LGPD. |

## Últimas tarefas concluídas (com evidência)

1. `d6ab1d4` — Venda → estoque atômica (F3-13/F4-7) — `sale-stock.test.ts`/`sales-service.test.ts`.
2. `a1be9b5` — Dashboard com métricas reais (F4-20) — `dashboard.test.ts` 8 casos.
3. `8a68d67` — Fluxo de OS com prazo/estados (F3-14 parcial) — `work-order*.test.ts` 15 casos.
4. `3f2c0c1` — Estoque com cadastro/movimentação/histórico (F4-01..04) — `inventory*.test.ts` 17 casos.
5. `cbcf80f` — Fechamento de caixa, recebimento idempotente e `paymentStatus` (F4-08/09/17) — `cash*.test.ts`.
6. `634eb37`/`b8d1a84` — Kanban mestre + Issues (#1–#155) + árvore de documentação.
7. 08/10/2026 — Revisão: 7 ciclos → 0, 3 reclassificações de status, revalidação dos 18 DONE (só documentação/Issues).

## Próxima execução — cinco tarefas (ordem respeitando dependências reais)

| # | Card | Issue | Prio | Deps reais | Por quê |
|---|---|---|---|---|---|
| 1 | F3-09 anexos clínicos | #48 | **P0** | F1-08 (concluído) | P0 de perda de dado; executável já. |
| 2 | F2-04 usuários e funções | #26 | P1 | nenhuma (ciclo corrigido) | abre a cadeia dos dois P0 seguintes. |
| 3 | F7-02 tela de login | #117 | **P0** | F2-04 | encerra OWNER automático. |
| 4 | F1-11 escopo por registro | #19 | **P0** | F7-02 | fecha o par identidade→autorização. |
| 5 | F1-09 precisão monetária | #17 | P1 | nenhuma | desbloqueia F1-02, F3-10 e F4-11. |

Reservas (se a fila avançar): F4-16 `#73` (F4-08 feito) e F4-10 `#67` (F4-09/F1-08 feitos).

## Bloqueios verdadeiros (aguardam decisão do usuário)

50 tarefas BLOCKED: 19 (Fase 5, raiz = decisão P1 backend) + 19 (Fase 6, raiz = P2 fiscal) + 8 (F8: P5 e2e, P6 LGPD, piloto, etc.) + 2 (F7-19, F2-17) + **3 corrigidos nesta revisão (P4 F4-13, P5 F8-03, P7 F3-20)**. Tabela completa: `KANBAN.md` → "Decisões que bloqueiam"; classificação em 4 categorias: `DEPENDENCIES.md`.

## Riscos de regressão (levantados na revalidação dos 18 DONE)

1. **Concorrência de venda/estoque** (F3-13/F4-07): qualquer toque em `SaleRepository.confirm`/`applyStockMovement` exige `sale-stock.test.ts` verde.
2. **Idempotência de caixa** (F4-08/09/17): `cash-service.test.ts` obrigatório; F4-17 está DONE com F4-16 pendente (dependência opcional — sangria só afina totais).
3. **Migrações** (F1-08/F8-09): `database.test.ts` cobre apenas v8→v9; caminhos anteriores sem cobertura.
4. **F7-04 navegação desktop:** validação apenas manual (auditoria 1440px) — sem teste automatizado; mudanças de menu podem regredir em silêncio.
5. **101 testes verdes ≠ validação operacional:** ainda sem e2e (P5), teste offline em aparelho, validação por perfil completo, multiempresa e fiscal.

## Resultados dos testes disponíveis

- `npm.cmd test` → **101/101** (14 arquivos) em 08/10/2026 sobre `b8d1a84`.
- `npm.cmd run build` → exit 0 (PWA gerada).
- `npx.cmd tsc -b --pretty false` → exit 0.
- Não existe script `lint` (não declarar lint executado).
- Ainda sem: e2e, testes offline em aparelho, testes multiempresa, validação por perfil completa.

## Regras de atualização deste arquivo

- Após cada entrega relevante (commit de feature): data, último commit, tarefa concluída, próxima tarefa, testes e bloqueios.
- Nunca marcar conclusão sem comando de teste executado e registrado.
- Novos requisitos descobertos em sessão → nova Issue em BACKLOG (não inventar escopo no card atual).
- Revisões de planejamento (sem código) → registrar aqui com data e o que mudou.
