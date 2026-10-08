# PROJECT STATUS — ponto de retomada de qualquer agente

> Leia este arquivo depois de `AGENTS.md` e antes de consultar o quadro (`KANBAN.md`).
> Ele sobrevive à perda do chat e à troca de agentes.

## Estado atual

- **Data da última atualização:** 07/10/2026.
- **Branch analisada:** `docs/master-kanban` (documentação/planejamento).
- **Branch de desenvolvimento:** `feat/operational-flow-v2` (6 commits à frente de `v1`; merge-base `3510602`).
- **Último commit analisado (código):** `d6ab1d4` — *feat: deduct stock when confirming sales with items*.
- **Remote:** `https://github.com/everton191/optiflex-v1.git` (branch `v1` no remoto).
- **Working tree:** limpa antes do commit de documentação; nenhum stash.

## Fase atual (taxonomia do Kanban — 8 fases)

| Fase | Estado resumido |
|---|---|
| 1 — Arquitetura e Fundação | PARCIAL — base Page→Service→Repository sólida, 101 testes; faltam erros globais, auditoria de alterações, precisão decimal única. |
| 2 — Cadastros e Administração | PARCIAL — clientes sem edição, usuários/lojas sem CRUD, sem catálogo completo. |
| 3 — Operação da Ótica | PARCIAL (ativa) — OS em desenvolvimento, prescrição sem estrutura, anexos só metadados. |
| 4 — Estoque e Financeiro | PARCIAL FORTE — estoque+caixa+dashboard entregues e testados; faltam parcelas/carnê/sangria-UI/estornos. |
| 5 — SaaS Multiempresa | NÃO INICIADO — **bloqueado** por decisão de backend. |
| 6 — Notas Fiscais | NÃO INICIADO — **bloqueado** por especificação+provedor fiscal. |
| 7 — Interface e Experiência | PARCIAL — design system incompleto; login ausente (P0). |
| 8 — Qualidade e Lançamento | PARCIAL — testes unitários ok; sem e2e/piloto/LGPD. |

## Últimas tarefas concluídas (com evidência)

1. `d6ab1d4` — Venda → estoque atômica (F3-13/F4-7) — `npm.cmd test` 101/101, build 0, tsc 0.
2. `a1be9b5` — Dashboard com métricas reais (F4-20) — `dashboard.test.ts` 8 casos.
3. `8a68d67` — Fluxo de OS com prazo/estados (F3-14 parcial) — `work-order-service.test.ts` + `work-orders.test.ts`.
4. `3f2c0c1` — Estoque com cadastro/movimentação/histórico (F4-01..04) — `inventory-service.test.ts` + `inventory.test.ts`.
5. `cbcf80f` — Fechamento de caixa, recebimento idempotente e `paymentStatus` (F4-08/09/17) — `cash*.test.ts`.
6. Esta execução: Kanban mestre + Issues (#1–#155) + árvore de documentação.

## Próxima tarefa

**F3-14 — [Work-orders] Ordens de serviço (concluir)** · Issue `#53` · status IN PROGRESS · P1.
Contexto imediato: detalhe em rota `/ordens-servico/:id`, histórico de eventos, vínculo com laboratório (F3-15) e insumos de estoque. Depois disso, seguir a fila "Dez próximas tarefas" em `KANBAN.md` (F7-02 login P0, F1-11 escopo P0, F3-09 anexos P0).

## Bloqueios conhecidos (aguardam decisão do usuário)

Ver tabela completa em `KANBAN.md` (seção "Decisões que bloqueiam"). Resumo: backend (Fase 5), provedor/especificação fiscal (Fase 6), modelo comercial, juros/multas de parcelamento, ferramenta e2e, orientação jurídica LGPD, política de garantia.

## Resultados dos testes disponíveis

- `npm.cmd test` → **101/101** (14 arquivos) em 07/10/2026 sobre `d6ab1d4`.
- `npm.cmd run build` → exit 0 (PWA gerada).
- `npx.cmd tsc -b --pretty false` → exit 0.
- Não existe script `lint` (não declarar lint executado).
- Ainda sem: e2e, testes offline em aparelho, testes multiempresa, validação por perfil completa.

## Riscos importantes

1. **P0 — identidade/sessão:** sem login, sessão OWNER automática (`local-repositories.ts`).
2. **P0 — anexos clínicos:** metadados sem conteúdo real → perda de dado.
3. **P0 — integridade:** fluxos já atômicos (venda/estoque/caixa) não podem ser alterados sem teste de concorrência.
4. **Divergência doc×código:** manter `docs/ai` e este quadro atualizados a cada entrega.
5. **Bump de schema Dexie:** só com índice novo; sempre com teste de migração.

## Regras de atualização deste arquivo

- Após cada entrega relevante (commit de feature): data, último commit, tarefa concluída, próxima tarefa, testes e bloqueios.
- Nunca marcar conclusão sem comando de teste executado e registrado.
- Novos requisitos descobertos em sessão → nova Issue em BACKLOG (não inventar escopo no card atual).
