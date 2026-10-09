# PROJECT STATUS — ponto de retomada de qualquer agente

> Leia este arquivo depois de `AGENTS.md` e antes de consultar o quadro (`KANBAN.md`).
> Ele sobrevive à perda do chat e à troca de agentes.

## Estado atual

- **Data da última atualização:** 08/10/2026 (F1-09, F2-04, F7-02, F1-11, F3-09 e F3-14 concluídas; revisão de publicação, dependências e bloqueios).
- **Branch analisada:** `docs/master-kanban` (documentação/planejamento).
- **Branch de desenvolvimento:** `feat/operational-flow-v2` (12 commits à frente de `v1`; merge-base `3510602`).
- **Último commit (código):** `e56939e` — *feat: add work order detail route, event history, audited cancellation and stock inputs (refs #53)*.
- **Último commit (documentação):** branch publicada de `634eb37` até o commit atual desta branch (`a4853f4` + esta atualização).
- **Remote:** `https://github.com/everton191/optiflex-v1.git`.

### Publicação (executada em 08/10/2026, com autorização do usuário)

- Varredura de sigilos **antes do push** (repo público): chaves/certificados, tokens cloud, segredos em literais, CPF/CNPJ, JWT, `.env`, binários e históricos = **limpo**; caminho pessoal generalizado (`c4192c2`); autor dos commits = e-mail noreply do GitHub.
- Push normal (`-u`, **sem force-push**) das duas branches; **`v1` preservada** (`3510602` local = remoto) e **nenhum merge executado**.
- SHAs no remoto: `feat/operational-flow-v2` = `e56939e` · `docs/master-kanban` = `a4853f4` + commits desta revisão.
- Documentos do Kanban acessíveis via `raw.githubusercontent.com/.../docs/master-kanban/docs/project-management/`.
- PR `docs/master-kanban` → `feat/operational-flow-v2` (somente documentação; ver relatório da sessão).

## Revisão executada em 08/10/2026 (somente planejamento — nenhum código alterado)

1. **Dependências:** 7 ciclos detectados (SCC/Tarjan sobre `KANBAN.md`) → corrigidos em KANBAN + corpos de 8 issues → **0 ciclos** (147 nós, 184 arestas). Antes/depois: `DEPENDENCIES.md`.
2. **Status reclassificado** (decisão já registrada, label desatualizada): F4-13 `#70`, F8-03 `#137`, F3-20 `#57` → BACKLOG→**BLOCKED**.
3. **Status final das 147 tarefas (revisão):** DONE=18 · IN PROGRESS=1 · READY=39 · BACKLOG=39 · BLOCKED=50. **Após F1-09, F2-04, F7-02, F1-11, F3-09 e F3-14 (mesma data):** DONE=24 · IN PROGRESS=0 · READY=34 (detalhe no `KANBAN.md`).
4. **18 tarefas DONE revalidadas:** todas com `IMPLEMENTED_AND_TESTED` + commit/teste no corpo (mapeamento no relatório da sessão); ressalvas em "Riscos".
5. **Testes re-executados:** `npm.cmd test` **101/101** · `npm.cmd run build` **exit 0** · `npx.cmd tsc -b` **exit 0** (em `b8d1a84`, 08/10/2026).

## Fase atual (taxonomia do Kanban — 8 fases)

| Fase | Estado resumido |
|---|---|
| 1 — Arquitetura e Fundação | PARCIAL — base Page→Service→Repository sólida, 164 testes; precisão decimal (F1-09) e escopo por registro (F1-11) concluídos; faltam erros globais e auditoria de alterações. |
| 2 — Cadastros e Administração | PARCIAL — usuários com CRUD/lojas, ativação e senha local (F2-04/F7-02); clientes sem edição, lojas sem CRUD, sem catálogo completo. |
| 3 — Operação da Ótica | PARCIAL (ativa) — OS concluída (rota de detalhe, histórico, cancelamento auditado, insumos — F3-14), prescrição sem estrutura; anexos com conteúdo real (F3-09). |
| 4 — Estoque e Financeiro | PARCIAL FORTE — estoque+caixa+dashboard entregues e testados; faltam parcelas (F4-13 agora BLOCKED por decisão P4)/sangria-UI/estornos. |
| 5 — SaaS Multiempresa | NÃO INICIADO — **bloqueado** por decisão de backend. |
| 6 — Notas Fiscais | NÃO INICIADO — **bloqueado** por especificação+provedor fiscal. |
| 7 — Interface e Experiência | PARCIAL — design system incompleto; login local entregue (F7-02). |
| 8 — Qualidade e Lançamento | PARCIAL — testes unitários ok; sem e2e/piloto/LGPD. |

## Últimas tarefas concluídas (com evidência)

1. `e56939e` — Rota de detalhe da OS, histórico de eventos, cancelamento auditado e insumos (F3-14/#53) — `work-order-service.test.ts` +4 e `work-orders.test.ts` +2; 164/164.
2. `6ce9c9a` — Conteúdo real de anexos clínicos (F3-09/#48) — `clinical-attachments.test.ts` (3 casos) + `clinical.test.ts` +5 + `backup.test.ts` +1; 158/158.
3. `a2c1369` — Escopo por registro SELF/STORE/ORG/NETWORK (F1-11/#19) — `access-scope.test.ts` (8 casos) + `storage/access-scope.test.ts` (4); 149/149.
4. `bae739b` — Login local, guarda de sessão e troca de senha (F7-02/#117) — `authentication-service.test.ts` (7) + `access.test.ts` (12) + `administration-service.test.ts` (11); 137/137.
5. `715e6e9` — CRUD de usuários com função/lojas/ativação (F2-04/#26) — `administration-service.test.ts` + `access.test.ts`; 126/126.
6. `7dc1d7b` — Precisão monetária única (F1-09/#17) — `money.test.ts` (10 casos) + reforços em `sales-service`/`cash-service`/`inventory`; 115/115.
7. `d6ab1d4` — Venda → estoque atômica (F3-13/F4-7) — `sale-stock.test.ts`/`sales-service.test.ts`.
8. `a1be9b5` — Dashboard com métricas reais (F4-20) — `dashboard.test.ts` 8 casos.
9. `8a68d67` — Fluxo de OS com prazo/estados (F3-14 parcial) — `work-order*.test.ts` 15 casos.
10. `3f2c0c1` — Estoque com cadastro/movimentação/histórico (F4-01..04) — `inventory*.test.ts` 17 casos.
11. `cbcf80f` — Fechamento de caixa, recebimento idempotente e `paymentStatus` (F4-08/09/17) — `cash*.test.ts`.
12. `634eb37`/`b8d1a84` — Kanban mestre + Issues (#1–#155) + árvore de documentação.
13. 08/10/2026 — Revisão: 7 ciclos → 0, 3 reclassificações de status, revalidação dos 18 DONE (só documentação/Issues).

## Próxima execução — cinco tarefas (ordem respeitando dependências reais)

| # | Card | Issue | Prio | Deps reais | Por quê |
|---|---|---|---|---|---|
| 1 | F1-02 entidades e contratos | #10 | P1 | F1-09 (concluído) | desbloqueado pela regra monetária; base citada por F3-10 e F4-11. |
| 2 | F1-06 modelos de produto/venda | #14 | P1 | F4-09 (concluído) | raiz da árvore F2-11 → F3-11 (PDV) em `DEPENDENCIES.md`. |
| 3 | F4-16 suprimento e sangria | #73 | P1 | F4-08 (concluído) | UI de lançamento fecha a conferência de caixa. |
| 4 | F2-05 permissões por loja | #27 | P1 | F1-11 e F2-04 (concluídos) | continuação direta do escopo por registro. |
| 5 | F4-10 formas de pagamento | #67 | P1 | F4-09 e F1-08 (concluídos) | pré-requisito de parciais (F4-12) e conciliação. |

F3-14 `#53` foi concluída nesta data (`e56939e`); nenhum card permanece IN PROGRESS — a fila acima é a retomada natural.

Reservas (se a fila avançar): F3-17 `#55` (prazos e alertas, desbloqueado por F3-14), F3-02 `#41` (cadastro de atendimento; F2-04 feito) e F3-10 `#49` (orçamentos; F1-09 feito).

## Bloqueios verdadeiros (aguardam decisão do usuário)

50 tarefas BLOCKED: 19 (Fase 5, raiz = decisão P1 backend) + 19 (Fase 6, raiz = P2 fiscal) + 8 (F8: P5 e2e, P6 LGPD, piloto, etc.) + 2 (F7-19, F2-17) + **3 corrigidos nesta revisão (P4 F4-13, P5 F8-03, P7 F3-20)**. Tabela completa: `KANBAN.md` → "Decisões que bloqueiam"; classificação em 4 categorias: `DEPENDENCIES.md`.

## Riscos de regressão (levantados na revalidação dos 18 DONE)

1. **Concorrência de venda/estoque** (F3-13/F4-07): qualquer toque em `SaleRepository.confirm`/`applyStockMovement` exige `sale-stock.test.ts` verde.
2. **Idempotência de caixa** (F4-08/09/17): `cash-service.test.ts` obrigatório; F4-17 está DONE com F4-16 pendente (dependência opcional — sangria só afina totais).
3. **Migrações** (F1-08/F8-09): `database.test.ts` cobre v8→v11 (verno atual); caminhos anteriores sem cobertura.
4. **F7-04 navegação desktop:** validação apenas manual (auditoria 1440px) — sem teste automatizado; mudanças de menu podem regredir em silêncio.
5. **164 testes verdes ≠ validação operacional:** ainda sem e2e (P5), teste offline em aparelho, validação por perfil completo, multiempresa e fiscal.

## Resultados dos testes disponíveis

- `npm.cmd test` → **164/164** (20 arquivos) em 08/10/2026 sobre `e56939e`.
- `npm.cmd run build` → exit 0 (PWA gerada).
- `npx.cmd tsc -b --pretty false` → exit 0.
- Não existe script `lint` (não declarar lint executado).
- Ainda sem: e2e, testes offline em aparelho, testes multiempresa, validação por perfil completa.

## Regras de atualização deste arquivo

- Após cada entrega relevante (commit de feature): data, último commit, tarefa concluída, próxima tarefa, testes e bloqueios.
- Nunca marcar conclusão sem comando de teste executado e registrado.
- Novos requisitos descobertos em sessão → nova Issue em BACKLOG (não inventar escopo no card atual).
- Revisões de planejamento (sem código) → registrar aqui com data e o que mudou.
