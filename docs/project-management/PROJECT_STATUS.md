# PROJECT STATUS — ponto de retomada de qualquer agente

> Leia este arquivo depois de `AGENTS.md` e antes de consultar o quadro (`KANBAN.md`).
> Ele sobrevive à perda do chat e à troca de agentes.

## Estado atual

- **Data da última atualização:** 08/10/2026 (F1-09, F2-04, F7-02, F1-11, F3-09, F3-14, F1-02, F1-06, F4-16, F2-05, F4-10, F4-18, F4-12, F2-06, F3-01 e F8-06 concluídas; revisão de publicação, dependências e bloqueios).
- **Branch analisada:** `docs/master-kanban` (documentação/planejamento).
- **Branch de desenvolvimento:** `feat/operational-flow-v2` (22 commits à frente de `v1`; merge-base `3510602`).
- **Último commit (código):** `94b9d50` — *feat: route guard matrix tests and shared route permission map (refs #140)*.
- **Último commit (documentação):** branch publicada de `634eb37` até o commit atual desta branch (`17b7d59` + esta atualização).
- **Remote:** `https://github.com/everton191/optiflex-v1.git`.

### Publicação (executada em 08/10/2026, com autorização do usuário)

- Varredura de sigilos **antes do push** (repo público): chaves/certificados, tokens cloud, segredos em literais, CPF/CNPJ, JWT, `.env`, binários e históricos = **limpo**; caminho pessoal generalizado (`c4192c2`); autor dos commits = e-mail noreply do GitHub.
- Push normal (`-u`, **sem force-push**) das duas branches; **`v1` preservada** (`3510602` local = remoto) e **nenhum merge executado**.
- SHAs no remoto: `feat/operational-flow-v2` = `94b9d50` · `docs/master-kanban` = `17b7d59` + commits desta revisão.
- Documentos do Kanban acessíveis via `raw.githubusercontent.com/.../docs/master-kanban/docs/project-management/`.
- PR `docs/master-kanban` → `feat/operational-flow-v2` (somente documentação; ver relatório da sessão).

## Revisão executada em 08/10/2026 (somente planejamento — nenhum código alterado)

1. **Dependências:** 7 ciclos detectados (SCC/Tarjan sobre `KANBAN.md`) → corrigidos em KANBAN + corpos de 8 issues → **0 ciclos** (147 nós, 184 arestas). Antes/depois: `DEPENDENCIES.md`.
2. **Status reclassificado** (decisão já registrada, label desatualizada): F4-13 `#70`, F8-03 `#137`, F3-20 `#57` → BACKLOG→**BLOCKED**.
3. **Status final das 147 tarefas (revisão):** DONE=18 · IN PROGRESS=1 · READY=39 · BACKLOG=39 · BLOCKED=50. **Após F1-09, F2-04, F7-02, F1-11, F3-09, F3-14, F1-02, F1-06, F4-16, F2-05, F4-10, F4-18, F4-12, F2-06, F3-01 e F8-06 (mesma data):** DONE=34 · IN PROGRESS=0 · READY=24 (detalhe no `KANBAN.md`).
4. **18 tarefas DONE revalidadas:** todas com `IMPLEMENTED_AND_TESTED` + commit/teste no corpo (mapeamento no relatório da sessão); ressalvas em "Riscos".
5. **Testes re-executados:** `npm.cmd test` **101/101** · `npm.cmd run build` **exit 0** · `npx.cmd tsc -b` **exit 0** (em `b8d1a84`, 08/10/2026).

## Fase atual (taxonomia do Kanban — 8 fases)

| Fase | Estado resumido |
|---|---|
| 1 — Arquitetura e Fundação | PARCIAL — base Page→Service→Repository sólida, 175 testes; precisão decimal (F1-09), escopo por registro (F1-11), auditoria de entidades/contratos (F1-02) e modelos de produto/pagamento (F1-06) concluídos; faltam erros globais e auditoria de alterações. |
| 2 — Cadastros e Administração | PARCIAL — usuários com CRUD/lojas, ativação e senha local (F2-04/F7-02); permissões por loja com matriz e sync de sessão (F2-05); clientes com criação/edição/perfil (F2-06), lojas sem CRUD, sem catálogo completo. |
| 3 — Operação da Ótica | PARCIAL (ativa) — agenda dia/semana com conversão em atendimento (F3-01), OS concluída (rota de detalhe, histórico, cancelamento auditado, insumos — F3-14), prescrição sem estrutura; anexos com conteúdo real (F3-09). |
| 4 — Estoque e Financeiro | PARCIAL FORTE — estoque+caixa+dashboard entregues e testados; sangria/suprimento (F4-16), formas de pagamento com totais por método (F4-10), estornos/cancelamentos (F4-18) e pagamentos parciais (F4-12) entregues; falta parcelas (F4-13 BLOCKED por decisão P4). |
| 5 — SaaS Multiempresa | NÃO INICIADO — **bloqueado** por decisão de backend. |
| 6 — Notas Fiscais | NÃO INICIADO — **bloqueado** por especificação+provedor fiscal. |
| 7 — Interface e Experiência | PARCIAL — design system incompleto; login local entregue (F7-02). |
| 8 — Qualidade e Lançamento | PARCIAL — testes unitários ok **com matriz rota×perfil coberta (F8-06)**; sem e2e/piloto/LGPD. |

## Últimas tarefas concluídas (com evidência)

1. `94b9d50` — Matriz rota×perfil e negativos de vendedor/clínico/caixa (F8-06/#140) — `route-guards.ts` (mapa único rota→permissão usado pelo router), `permission-routes.test.ts` (7 casos: 16 rotas × 10 perfis, ações negativas, escopo loja/registro); 215/215.
2. `679951f` — Agenda dia/semana com eventos e conversão em atendimento (F3-01/#40) — `agenda-service.test.ts` (7 casos: ranges locais, validação, conversão/cancelamento), `agenda.test.ts` (3 casos de persistência/filtro por loja), backup schema 12; 208/208.
3. `00d0d9e` — Edição de clientes: rota editar, `updateCustomer`, complementação e-mail/nascimento (F2-06/#28) — `reception-service.test.ts` +2 (validação/normalização) e `clinical.test.ts` +1 (durabilidade após reload); 198/198.
4. `60e2ca4` — Pagamentos parciais: status `PARTIAL`, input de valor e saldo durável (F4-12/#69) — `cash.test.ts` +1 (durabilidade/reload) e ajustes de expectativa PENDING→PARTIAL, backup aceita PARTIAL; 195/195.
5. `9f0fdfc` — Estornos e cancelamentos: cancelamento auditado com devolução de estoque e `REFUND` no caixa (F4-18/#75) — `sales-service.test.ts` +4, `sale-stock.test.ts` +5 (inclui concorrência), `cash.test.ts` +1, `backup.test.ts` +1; 194/194.
6. `7f1d6e4` — Formas de pagamento: obrigatórias no recebimento, `DEBIT`/`CREDIT` e totais por método (F4-10/#67) — `cash-service.test.ts` +2 (totais/método e exigência), ajuste de chamadas no storage; 183/183.
7. `1b3f757` — Permissões por loja, sync de sessão e matriz de perfis (F2-05/#27) — `access.test.ts` +6 (matriz/sync) e `storage/access-scope.test.ts` +1 (caixa/estoque); 182/182.
8. `6a59f2b` — Suprimento e sangria no caixa (F4-16/#73) — `cash-service.test.ts` +2 e `cash.test.ts` +1 (durabilidade + guarda de saldo); 177/177.
9. `b0f72d1` — Preço/custo de produto e forma de pagamento (F1-06/#14) — `inventory-service.test.ts` +3, `cash-service.test.ts` +2, `cash.test.ts` +1, `inventory.test.ts` +1, `backup.test.ts` +1; 175/175.
10. `8fc64b0` — Auditoria de entidades e contratos (F1-02/#10) — 10 contratos revisados, última lacuna (`SettingsRepository`) coberta em `storage/settings.test.ts` (+3 casos); 167/167.
11. `e56939e` — Rota de detalhe da OS, histórico de eventos, cancelamento auditado e insumos (F3-14/#53) — `work-order-service.test.ts` +4 e `work-orders.test.ts` +2; 164/164.
12. `6ce9c9a` — Conteúdo real de anexos clínicos (F3-09/#48) — `clinical-attachments.test.ts` (3 casos) + `clinical.test.ts` +5 + `backup.test.ts` +1; 158/158.
13. `a2c1369` — Escopo por registro SELF/STORE/ORG/NETWORK (F1-11/#19) — `access-scope.test.ts` (8 casos) + `storage/access-scope.test.ts` (4); 149/149.
14. `bae739b` — Login local, guarda de sessão e troca de senha (F7-02/#117) — `authentication-service.test.ts` (7) + `access.test.ts` (12) + `administration-service.test.ts` (11); 137/137.
15. `715e6e9` — CRUD de usuários com função/lojas/ativação (F2-04/#26) — `administration-service.test.ts` + `access.test.ts`; 126/126.
16. `7dc1d7b` — Precisão monetária única (F1-09/#17) — `money.test.ts` (10 casos) + reforços em `sales-service`/`cash-service`/`inventory`; 115/115.
17. `d6ab1d4` — Venda → estoque atômica (F3-13/F4-7) — `sale-stock.test.ts`/`sales-service.test.ts`.
18. `a1be9b5` — Dashboard com métricas reais (F4-20) — `dashboard.test.ts` 8 casos.
19. `8a68d67` — Fluxo de OS com prazo/estados (F3-14 parcial) — `work-order*.test.ts` 15 casos.
20. `3f2c0c1` — Estoque com cadastro/movimentação/histórico (F4-01..04) — `inventory*.test.ts` 17 casos.
21. `cbcf80f` — Fechamento de caixa, recebimento idempotente e `paymentStatus` (F4-08/09/17) — `cash*.test.ts`.
22. `634eb37`/`b8d1a84` — Kanban mestre + Issues (#1–#155) + árvore de documentação.
23. 08/10/2026 — Revisão: 7 ciclos → 0, 3 reclassificações de status, revalidação dos 18 DONE (só documentação/Issues).

## Próxima execução — cinco tarefas (ordem respeitando dependências reais)

| # | Card | Issue | Prio | Deps reais | Por quê |
|---|---|---|---|---|---|
| 1 | F8-07 auditoria de segurança | #141 | P1 | F7-02 e F1-11 (concluídos) | fecha a lacuna de rastreio antes do piloto. |
| 2 | F1-07 modelos de prescrição/OS | #15 | P1 | nenhuma | desbloqueia a cadeia de prescrição estruturada (F3-07 → F3-06). |
| 3 | F3-17 prazos e alertas de OS | #55 | P1 | F3-14 (concluído) | histórico/detalhe de OS prontos; alertas usam eventos de OS. |
| 4 | F2-11 catálogo de produtos | #32 | P1 | F1-06 (concluído) | libera a cadeia F2-14/F2-15/F6-04; base de preço/custo em `InventoryItem`. |
| 5 | F2-02 matriz e filiais | #24 | P1 | F1-11 (concluído) | estrutura de matriz/filiais apoia usuários e lojas já administráveis. |

F8-06 `#140` foi concluída nesta data (`94b9d50`) junto com F3-01 `#40`, F2-06 `#28`, F4-12 `#69`, F4-18 `#75`, F4-10 `#67`, F2-05 `#27`, F4-16 `#73`, F3-14 `#53`, F1-02 `#10` e F1-06 `#14`; nenhum card permanece IN PROGRESS — a fila acima é a retomada natural.

Reservas (se a fila avançar): F3-02 `#41` (cadastro de atendimento; F2-04 feito), F2-07 `#29` (validação CPF; F2-06 feito), F3-10 `#49` (orçamentos; F1-09 feito) e F4-11 `#68` (PIX/dinheiro/cartão; F4-10+F1-09 feitos).

## Bloqueios verdadeiros (aguardam decisão do usuário)

50 tarefas BLOCKED: 19 (Fase 5, raiz = decisão P1 backend) + 19 (Fase 6, raiz = P2 fiscal) + 8 (F8: P5 e2e, P6 LGPD, piloto, etc.) + 2 (F7-19, F2-17) + **3 corrigidos nesta revisão (P4 F4-13, P5 F8-03, P7 F3-20)**. Tabela completa: `KANBAN.md` → "Decisões que bloqueiam"; classificação em 4 categorias: `DEPENDENCIES.md`.

## Riscos de regressão (levantados na revalidação dos 18 DONE)

1. **Concorrência de venda/estoque** (F3-13/F4-07): qualquer toque em `SaleRepository.confirm`/`cancel`/`applyStockMovement` exige `sale-stock.test.ts` verde (F4-18 entregue em `9f0fdfc` adicionou a porta `cancel` — não reutilizar `confirm` para cancelamento).
2. **Idempotência de caixa** (F4-08/09/12/16/17/18): `cash-service.test.ts` obrigatório; F4-12 entregue (`60e2ca4`) grava `PARTIAL` e valida `paid + amount > total` na transação — saldo em centavos é a fonte de conferência; F4-18 cria `REFUND` apenas dentro da transação de cancelamento e bloqueia duplo cancelamento.
3. **Migrações** (F1-08/F8-09): `database.test.ts` cobre v8→v11 (verno atual); caminhos anteriores sem cobertura.
4. **F7-04 navegação desktop:** validação apenas manual (auditoria 1440px) — sem teste automatizado; mudanças de menu podem regredir em silêncio.
5. **215 testes verdes ≠ validação operacional:** ainda sem e2e (P5), teste offline em aparelho, validação por perfil completo, multiempresa e fiscal.

## Resultados dos testes disponíveis

- `npm.cmd test` → **215/215** (24 arquivos) em 08/10/2026 sobre `94b9d50`.
- `npm.cmd run build` → exit 0 (PWA gerada).
- `npx.cmd tsc -b --pretty false` → exit 0.
- Não existe script `lint` (não declarar lint executado).
- Ainda sem: e2e, testes offline em aparelho, testes multiempresa, validação por perfil completa.

## Regras de atualização deste arquivo

- Após cada entrega relevante (commit de feature): data, último commit, tarefa concluída, próxima tarefa, testes e bloqueios.
- Nunca marcar conclusão sem comando de teste executado e registrado.
- Novos requisitos descobertos em sessão → nova Issue em BACKLOG (não inventar escopo no card atual).
- Revisões de planejamento (sem código) → registrar aqui com data e o que mudou.
