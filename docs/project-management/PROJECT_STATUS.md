# PROJECT STATUS — ponto de retomada de qualquer agente

> Leia este arquivo depois de `AGENTS.md` e antes de consultar o quadro (`KANBAN.md`).
> Ele sobrevive à perda do chat e à troca de agentes.

## Estado atual

- **Data da última atualização:** 08/10/2026 (F3-06 concluída; F1-09, F2-04, F7-02, F1-11, F3-09, F3-14, F1-02, F1-06, F4-16, F2-05, F4-10, F4-18, F4-12, F2-06, F3-01, F8-06, F8-07, F1-07, F3-17, F2-11, F2-02, F3-02 e F3-03 concluídas; revisão de publicação, dependências e bloqueios).
- **Branch analisada:** `docs/master-kanban` (documentação/planejamento).
- **Branch de desenvolvimento:** `feat/operational-flow-v2` (39 commits à frente de `v1`; merge-base `3510602`).
- **Último commit (código):** `6f2fe74` — *feat: structured prescription usage, retification ui and sale handoff (refs #45)*.
- **Último commit (documentação):** branch publicada de `634eb37` até o commit atual desta branch (`902f1c1` + esta atualização).
- **Remote:** `https://github.com/everton191/optiflex-v1.git`.

### Publicação (executada em 08/10/2026, com autorização do usuário)

- Varredura de sigilos **antes do push** (repo público): chaves/certificados, tokens cloud, segredos em literais, CPF/CNPJ, JWT, `.env`, binários e históricos = **limpo**; caminho pessoal generalizado (`c4192c2`); autor dos commits = e-mail noreply do GitHub.
- Push normal (`-u`, **sem force-push**) das duas branches; **`v1` preservada** (`3510602` local = remoto) e **nenhum merge executado**.
- SHAs no remoto: `feat/operational-flow-v2` = `6f2fe74` · `docs/master-kanban` = `902f1c1` + commits desta revisão.
- Documentos do Kanban acessíveis via `raw.githubusercontent.com/.../docs/master-kanban/docs/project-management/`.
- PR `docs/master-kanban` → `feat/operational-flow-v2` (somente documentação; ver relatório da sessão).

## Revisão executada em 08/10/2026 (somente planejamento — nenhum código alterado)

1. **Dependências:** 7 ciclos detectados (SCC/Tarjan sobre `KANBAN.md`) → corrigidos em KANBAN + corpos de 8 issues → **0 ciclos** (147 nós, 184 arestas). Antes/depois: `DEPENDENCIES.md`.
2. **Status reclassificado** (decisão já registrada, label desatualizada): F4-13 `#70`, F8-03 `#137`, F3-20 `#57` → BACKLOG→**BLOCKED**.
3. **Status final das 147 tarefas (revisão):** DONE=18 · IN PROGRESS=1 · READY=39 · BACKLOG=39 · BLOCKED=50. **Após F1-09, F2-04, F7-02, F1-11, F3-09, F3-14, F1-02, F1-06, F4-16, F2-05, F4-10, F4-18, F4-12, F2-06, F3-01, F8-06, F8-07, F1-07, F3-17, F2-11, F2-02, F3-02 e F3-03 (mesma data):** DONE=41 · IN PROGRESS=0 · READY=17 (detalhe no `KANBAN.md`).
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
| 8 — Qualidade e Lançamento | PARCIAL — testes unitários ok, matriz rota×perfil coberta (F8-06) e auditoria de segurança publicada (F8-07; único P0 = F1-12 erros globais); sem e2e/piloto/LGPD. |

## Últimas tarefas concluídas (com evidência)

1. `6f2fe74` + docs — Prescrição estruturada (F3-06/#45): `Prescription.usage` opcional (DISTANCE/NEAR/CONTINUOUS/MULTIFOCAL, labels em `prescriptionUsageLabels`), `ClinicalService.retifyPrescription` (autoriza pela loja, motivo obrigatório, grava próxima versão com `retifies`/`retificationReason` preservando autor/data da original), seletor de uso + botão "Retificar" na workspace clínica; caixa: `SalesService` recebe `LocalPrescriptionRepository`, `listCustomerPrescriptions` e snapshot imutável `SalePrescription` (`salePrescriptionSnapshot`) em `Sale.prescription` na criação do orçamento (mantido se cliente igual, limpo se troca, substituído se novo); backup valida estrutura/FK de `sales.prescription`; testes novos: prescription +1, sales-service +4, clinical +2, backup +1; 305/305.
2. `a30f165` + docs — Tratamento global de erros (F1-12/#20): helper `errorMessage(reason, fallback)` em `src/domain/errors.ts` (fonte única: Error com message não-vazia → message, senão fallback; nunca string vazia; 4 testes em `errors.test.ts`); `RouteErrorBoundary` (`src/app/RouteErrorBoundary.tsx`) envolvendo `AppShell`, `/login` e `/bloqueado` no `router.tsx` com "Tentar novamente"/"Recarregar página"; 24 ternários `instanceof Error ? … : …` unificados no helper e 14 catches de carregamento passando a capturar o motivo (caixa, dashboard, estoque, OS, recepção, clientes); serviços/infra sem `catch` vazio (CA2 — rethrows com mensagem em `backup.ts`/`backup-codec.ts`); `07_DATA_FLOW.md` com a seção "Tratamento de erros"; build/tsc/297 verdes; **teste manual de falha de storage pendente** (CA do card).
3. `e6bae24` + docs — Navegação mobile (F7-05/#120): barra inferior com **4 atalhos + botão "Mais"** (`AppShell.tsx`), que abre o `Drawer` do design system com o restante do menu e a seção **Administração** — antes inacessível no mobile; fechamento por link/backdrop/Escape; `styles.css` (`.mobile-more`, `.area-links`, `space-around`); build/tsc/293 verdes; **teste manual em 390×844 pendente** (testes obrigatórios do card: build + manual).
4. `8c20023` + docs — Prevenção de duplicidades (F2-08/#30): `normalizeSearchText` (sem acentos/caixa/pontuação) e `findDuplicateCustomer` em `customer.ts` (CPF idêntico **ou** nome+telefone; `excludeId` pronto para edição); `CustomerNewPage` avisa com o cadastro encontrado e só permite "Cadastrar mesmo assim" com **motivo obrigatório** (sem bloqueio absoluto, conforme escopo); 5 testes novos; 293/293.
5. `66dc070` + docs — Dashboard por função (F7-03/#118): seletores puros `dashboardProfile`/`dashboardMetricKeys`/`returnsToday` em `dashboard.ts` compõem até 4 métricas por perfil (clínico: fila/retornos, **sem valores comerciais**; vendedor: vendas/OS; caixa: sessão; gestão: tudo), gráfico de 7 dias condicionado a `sales.read` (fecha o vazamento de número comercial para o perfil clínico) e estados por bloco — loading (`Skeleton`), empty (gráfico/pendências) e denied (`EmptyState` quando o perfil não tem indicadores); 4 testes novos dos seletores; 288/288.
6. `c72849f`→`fe1bb51`→`df2dcd7`→`6af6fd8`→`af42ea7` + docs — Separação de páginas por módulo, um commit por módulo: `AdminWorkspace.tsx`, `ReceptionWorkspace.tsx`, `CustomersWorkspace.tsx`, `CashWorkspace.tsx` e `AuthWorkspace.tsx` extraídos de `pages.tsx` com re-exports idênticos (rotas/permissões intactas); `pages.tsx` virou barrel de 12 linhas (+ `ForbiddenPage`); build, tsc e testes verdes **em cada extração**; mapa de impacto e docs de módulo realocados (F1-03/#11); 284/284.
7. `887b64b` + docs — Identificadores de organização: tipo `Organization` + `defaultOrganization` (`org-local`) em `access.ts`, `organizationId?` em 14 modelos principais, carimbo nos serviços/seeds (administração, recepção, agenda, vendas, caixa, estoque, OS, clínico), migração Dexie **v14** com backfill sem perda e validação do campo no backup (F1-05/#13); 284/284.
8. `2d5a655` + docs — Design system consolidado: 12 primitivas novas em `components.tsx` (Select, Badge, Tabs, Table, Dialog, Drawer, Toast, Tooltip, Search, EmptyState, Skeleton, PageHeader) cada uma usada em ≥1 tela real (clientes, usuários, lojas, caixa, estoque, dashboard), estados de foco/erro/desabilitado documentados e CSS global novo em `styles.css` (F7-01/#116); 282/282.
9. `de67cc3` + docs — Testes de integração: `integration-flows.test.ts` com 4 fluxos multi-entidade sobre IndexedDB em memória (venda→pagamento→caixa→fechamento→OS→entrega; cancelamento de venda paga→estoque+estorno conciliado; insumos de OS→estoque→entrega; pagamento fracionado PARTIAL→PAID com rejeição de excesso), suíte < 10 s, e estratégia de testes registrada em `10_AI_WORKFLOW.md` (F8-02/#136); 282/282.
10. `c8dec75` + docs — Recuperação de dados: validação de backup com motivos específicos (`invalidReason` para formato, versão, schema, data e tabelas), `BackupService.inspect` traduz conteúdo decifrado ilegível em mensagem clara, painel com prévia ampliada (prescrições/anexos) e aviso de rollback em transação única (F8-10/#144); 278/278.
11. `c2f0c27` + docs — Refração estruturada por olho: `LocalPrescriptionRepository` (append-only, guarda de loja pelo atendimento), `ClinicalService.issuePrescription`/`listPrescriptions` (autora = `session.userName`), Dexie **v13** com tabela `prescriptions`, seção "Refração (OD/OE)" na workspace (esf/cil/eixo/ad por olho, eixo 0–180 validado no domínio, lista com marcação da ativa) e backup `schema: 13` (schemas 10–12 importam com a tabela vazia) (F3-07/#46); 276/276.
12. `1f17aeb` + docs — Códigos/preços/custos do catálogo: `code` obrigatório e único por loja no `InventoryService` (trim, comparação sem distinção de maiúsculas, edição exclui o próprio item), helper `marginCents` (margem em centavos sem drift), custo/margem na lista só com `inventory.manage` (vendedor/AUDITOR não veem; caixa nunca exibe custo) e preço unitário pré-preenchido com `defaultPrice` ao selecionar produto no caixa (F2-14/#35); 272/272.
13. `a536bb0` + docs — Regras por forma de pagamento no caixa: helper `receiptPlan` (aplicado/troco em centavos sem drift), troco exibido em tempo real e na confirmação do recebimento em dinheiro (entra no caixa só o valor aplicado à venda), referência PIX opcional guardada em `CashEntry.reason` (aceita só com PIX, exibida nos movimentos) e totais por forma coerentes no fechamento (F4-11/#68); 268/268.
14. `3820338` + docs — Ciclo de vida de orçamento: `quoteStatus` (Rascunho/Enviado/Aceito/Recusado/Expirado) com `quoteTransitions`, edição de rascunho via `updateQuote` (mesma validação/total do create), filtros da lista (Todos/Orçamentos/Vendas/Canceladas com contagem), ações por estado (Enviar/Editar/Aceitar/Recusar/Expirar/Confirmar), impressão em janela nova com escape HTML, bloqueio de confirmação de recusado/expirado e `quoteStatus` validado no backup (F3-10/#49); 266/266.
15. `5868e80` + docs — Validação de CPF/CNPJ: helpers `normalizeDocument`/`isValidCPF`/`isValidCNPJ`/`isValidDocument` (dígitos verificadores, com/sem máscara, rejeita sequências repetidas e letras), uso em `createCustomer`/`updateCustomer` com mensagem "CPF ou CNPJ inválido.", erro do cadastro novo exibido na UI e rótulo "CPF/CNPJ" (F2-07/#29); 258/258.
16. `c45a6bf` + docs — Fila completa de atendimento: status `NO_SHOW`, filtros Todos/Aguardando/Em atendimento, tempo de espera por registro (`waitingMinutes`), responsável/badge de urgência e ações Iniciar/Finalizar/Faltou/Cancelar por permissão; estados finais saem da fila (F3-03/#42); 252/252.
17. `8daab89` + docs — Atendimento completo: `/atendimentos/novo` (tipo, profissional, prioridade, notas) e detalhe `/atendimentos/:attendanceId` por URL direta com transições básicas (`WAITING`→`IN_PROGRESS`→`FINISHED`, cancelamento), `Attendance.priority`/`professionalId`, conversão da agenda herda o profissional (F3-02/#41); 247/247.
18. `c4e4e31` + docs — CRUD de lojas: `/admin/lojas` (`StoresPage`, guarda `stores.manage`), `createStore`/`updateStore`/`setStoreActive` (nome único, inativação não destrutiva com guarda de loja atual e última ativa), `refreshStores` no contexto (F2-02/#24); 241/241.
19. `e3bd607` + docs — Catálogo de produtos: `InventoryItem` com `category` obrigatória (`FRAME`/`LENS`/`ACCESSORY`) + ficha `brand`/`material`/`description`, `filterByCategory` com abas por categoria, categoria no seletor do caixa e validação de backup (F2-11/#32); 231/231.
20. `e6e525d` + docs — Prazos e alertas de OS: filtro `ATRASADAS` + badge "Atrasada" na lista/detalhe e seletor compartilhado `isOverdueOrder`/`overdueOrders` (fonte única lista↔dashboard) (F3-17/#55); 225/225.
21. `41f0bfd` + docs — Modelos: `Prescription` versionada com retificação append-only (`issuePrescription`/`retifyPrescription`/`activePrescription`, contrato `PrescriptionRepository`) e `WorkOrder.laboratory?` + evento `LABORATORY` (F1-07/#15); persistência da prescrição vem com F3-06; 224/224.
22. `277fdde` + docs — Auditoria de segurança: `SECURITY_PLAN.md` (threat model, varredura, achados P0–P3; único P0 = F1-12) e `security-scan.test.ts` automatizado (F8-07/#141); 217/217.
23. `94b9d50` — Matriz rota×perfil e negativos de vendedor/clínico/caixa (F8-06/#140) — `route-guards.ts` (mapa único rota→permissão usado pelo router), `permission-routes.test.ts` (7 casos: 16 rotas × 10 perfis, ações negativas, escopo loja/registro); 215/215.
24. `679951f` — Agenda dia/semana com eventos e conversão em atendimento (F3-01/#40) — `agenda-service.test.ts` (7 casos: ranges locais, validação, conversão/cancelamento), `agenda.test.ts` (3 casos de persistência/filtro por loja), backup schema 12; 208/208.
25. `00d0d9e` — Edição de clientes: rota editar, `updateCustomer`, complementação e-mail/nascimento (F2-06/#28) — `reception-service.test.ts` +2 (validação/normalização) e `clinical.test.ts` +1 (durabilidade após reload); 198/198.
26. `60e2ca4` — Pagamentos parciais: status `PARTIAL`, input de valor e saldo durável (F4-12/#69) — `cash.test.ts` +1 (durabilidade/reload) e ajustes de expectativa PENDING→PARTIAL, backup aceita PARTIAL; 195/195.
27. `9f0fdfc` — Estornos e cancelamentos: cancelamento auditado com devolução de estoque e `REFUND` no caixa (F4-18/#75) — `sales-service.test.ts` +4, `sale-stock.test.ts` +5 (inclui concorrência), `cash.test.ts` +1, `backup.test.ts` +1; 194/194.
28. `7f1d6e4` — Formas de pagamento: obrigatórias no recebimento, `DEBIT`/`CREDIT` e totais por método (F4-10/#67) — `cash-service.test.ts` +2 (totais/método e exigência), ajuste de chamadas no storage; 183/183.
29. `1b3f757` — Permissões por loja, sync de sessão e matriz de perfis (F2-05/#27) — `access.test.ts` +6 (matriz/sync) e `storage/access-scope.test.ts` +1 (caixa/estoque); 182/182.
30. `6a59f2b` — Suprimento e sangria no caixa (F4-16/#73) — `cash-service.test.ts` +2 e `cash.test.ts` +1 (durabilidade + guarda de saldo); 177/177.
31. `b0f72d1` — Preço/custo de produto e forma de pagamento (F1-06/#14) — `inventory-service.test.ts` +3, `cash-service.test.ts` +2, `cash.test.ts` +1, `inventory.test.ts` +1, `backup.test.ts` +1; 175/175.
32. `8fc64b0` — Auditoria de entidades e contratos (F1-02/#10) — 10 contratos revisados, última lacuna (`SettingsRepository`) coberta em `storage/settings.test.ts` (+3 casos); 167/167.
33. `e56939e` — Rota de detalhe da OS, histórico de eventos, cancelamento auditado e insumos (F3-14/#53) — `work-order-service.test.ts` +4 e `work-orders.test.ts` +2; 164/164.
34. `6ce9c9a` — Conteúdo real de anexos clínicos (F3-09/#48) — `clinical-attachments.test.ts` (3 casos) + `clinical.test.ts` +5 + `backup.test.ts` +1; 158/158.
35. `a2c1369` — Escopo por registro SELF/STORE/ORG/NETWORK (F1-11/#19) — `access-scope.test.ts` (8 casos) + `storage/access-scope.test.ts` (4); 149/149.
36. `bae739b` — Login local, guarda de sessão e troca de senha (F7-02/#117) — `authentication-service.test.ts` (7) + `access.test.ts` (12) + `administration-service.test.ts` (11); 137/137.
37. `715e6e9` — CRUD de usuários com função/lojas/ativação (F2-04/#26) — `administration-service.test.ts` + `access.test.ts`; 126/126.
38. `7dc1d7b` — Precisão monetária única (F1-09/#17) — `money.test.ts` (10 casos) + reforços em `sales-service`/`cash-service`/`inventory`; 115/115.
39. `d6ab1d4` — Venda → estoque atômica (F3-13/F4-7) — `sale-stock.test.ts`/`sales-service.test.ts`.
40. `a1be9b5` — Dashboard com métricas reais (F4-20) — `dashboard.test.ts` 8 casos.
41. `8a68d67` — Fluxo de OS com prazo/estados (F3-14 parcial) — `work-order*.test.ts` 15 casos.
42. `3f2c0c1` — Estoque com cadastro/movimentação/histórico (F4-01..04) — `inventory*.test.ts` 17 casos.
43. `cbcf80f` — Fechamento de caixa, recebimento idempotente e `paymentStatus` (F4-08/09/17) — `cash*.test.ts`.
44. `634eb37`/`b8d1a84` — Kanban mestre + Issues (#1–#155) + árvore de documentação.
45. 08/10/2026 — Revisão: 7 ciclos → 0, 3 reclassificações de status, revalidação dos 18 DONE (só documentação/Issues).

## Próxima execução — cinco tarefas (ordem respeitando dependências reais)

| # | Card | Issue | Prio | Deps reais | Por quê |
|---|---|---|---|---|---|
| 1 | F3-05 receitas ópticas (documento/impressão) | #44 | P1 | F3-06 (feito) | F3-06 entregue; documento/impressão fecha a cadeia clínica antes do PDV. |
| 2 | F7-11 indicadores de carregamento e erros | #126 | P1 | F1-12 (feito) | encadeia atrás de F1-12 (entregue); fecha os estados de loading/erro junto com erros globais. |
| 3 | F7-13 impressões e PDFs | #128 | P1 | F3-05 (#1), F3-10 (feito) | design system e fluxos prontos; fecha impressão de receita, orçamento, venda e OS antes do piloto. |
| 4 | F3-08 DP/DNP e altura de montagem | #47 | P1 | F3-07 (feito) | desbloqueada por F3-07; entra à frente de F3-11, que depende dela. |
| 5 | F3-11 PDV (ponto de venda completo) | #50 | P1 | F3-08 (#4), F3-10 (feito) | depende de F3-08; cadeia de venda/prescrição já suporta handoff por snapshot. |

F3-07 `#46` foi concluída nesta data (`c2f0c27` + docs) junto com F2-14 `#35`, F4-11 `#68`, F3-10 `#49`, F2-07 `#29`, F3-03 `#42`, F3-02 `#41`, F2-02 `#24`, F2-11 `#32`, F3-17 `#55`, F1-07 `#15`, F8-07 `#141`, F8-06 `#140`, F3-01 `#40`, F2-06 `#28`, F4-12 `#69`, F4-18 `#75`, F4-10 `#67`, F2-05 `#27`, F4-16 `#73`, F3-14 `#53`, F1-02 `#10` e F1-06 `#14`; nenhum card permanece IN PROGRESS — a fila acima é a retomada natural. F3-06 `#45` teve as dependências liberadas (F1-07+F3-07) e entrou na fila; F3-08 `#47` (DP/DNP) também é desbloqueada por F3-07 e permanece em BACKLOG como reserva. F8-10 `#144` foi concluída na sequência (`c8dec75` + docs): motivos de recusa específicos na validação do backup, arquivo decifrado ilegível tratado, prévia ampliada (prescrições/anexos) e rollback da restauração reafirmado; F3-05 `#44` subiu para a fila atrás de F3-06. F8-02 `#136` foi concluída logo em seguida (`de67cc3` + docs): 4 fluxos multi-entidade ponta a ponta em `integration-flows.test.ts` (venda→caixa→OS→entrega, cancelamento→estoque+estorno, insumos da OS e pagamento fracionado), suíte < 10 s, estratégia registrada em `10_AI_WORKFLOW.md`; F7-11 `#126` entrou na fila atrás de F1-12. F7-01 `#116` concluiu esta leva (`2d5a655` + docs): 12 primitivas novas do design system (Select, Badge, Tabs, Table, Dialog, Drawer, Toast, Tooltip, Search, EmptyState, Skeleton, PageHeader) cada uma em uso real, estados de foco/erro/desabilitado documentados em `05_DESIGN_SYSTEM_MAP.md`; F7-13 `#128` (impressões/PDFs) entrou na fila (#10) atrás de F3-05. F1-05 `#13` fechou o ciclo logo em seguida (`887b64b` + docs): tipo `Organization` + `organizationId?` em 14 modelos, carimbo nos serviços/seeds, migração Dexie v14 com backfill e validação no backup; F3-11 `#50` (PDV) entrou na fila (#10) como reserva promovida — F3-08 segue pendente e aparece assim na coluna de deps. F1-03 `#11` concluiu esta leva em **5 commits por módulo** (`c72849f`, `fe1bb51`, `df2dcd7`, `6af6fd8`, `af42ea7` + docs): `AdminWorkspace`, `ReceptionWorkspace`, `CustomersWorkspace`, `CashWorkspace` e `AuthWorkspace` extraídos com build/testes/tsc verdes a cada extração e `pages.tsx` reduzido a barrel de 12 linhas; F3-19 `#56` (entrega ao cliente) promoveu à fila (#10) com a dependência F3-16 visível. F7-03 `#118` concluiu a leva seguinte (`66dc070` + docs): seletores de métricas por perfil no dashboard (`dashboardProfile`/`dashboardMetricKeys`/`returnsToday`), perfil clínico sem valores comerciais, gráfico de vendas condicionado a `sales.read` e estados loading/empty/denied por bloco; 288/288. F3-08 `#47` (DP/DNP; deps F3-07 feita) subiu para a fila (#8) imediatamente antes de F3-11, que dela depende. F2-08 `#30` concluiu a leva seguinte (`8c20023` + docs): `normalizeSearchText`/`findDuplicateCustomer` em `customer.ts` (CPF idêntico ou nome+telefone normalizados) com aviso no cadastro novo mostrando o registro encontrado e "Cadastrar mesmo assim" condicionado a motivo obrigatório (sem bloqueio absoluto); 293/293. F3-16 `#154` (acompanhamento da fabricação; F3-14 feita) subiu à fila (#9) imediatamente antes de F3-19, que dela depende. F7-05 `#120` concluiu a leva seguinte (`e6bae24` + docs): barra mobile com 4 atalhos + "Mais" abrindo o `Drawer` com as demais áreas **e Administração** (antes sumia no mobile), `04_ROUTE_MAP.md` completo (9 rotas faltantes + seção mobile); build/tsc/293 verdes, teste manual 390×844 pendente; F2-01 `#23` (cadastro de empresas; sem dependências) promoveu à fila (#10). F1-12 `#20` concluiu a leva seguinte (`a30f165` + docs): helper `errorMessage` em `domain/errors.ts` + `RouteErrorBoundary` no `router.tsx` (AppShell/login/bloqueado), 24 ternários `instanceof Error` unificados e 14 catches de carregamento passando a expor o motivo real; serviços confirmados sem `catch` vazio (CA2); `07_DATA_FLOW.md` ganhou a seção "Tratamento de erros"; build/tsc/297 verdes, **teste manual de falha de storage pendente** (CA do card); fila reorganizada — F3-06 `#45` assumiu #1, F2-01 deslizou para #9 e F1-10 `#18` (auditoria de alterações; F1-02+F2-05 feitas; libera F3-12) promoveu à fila (#10). F3-06 #45 foi concluída em seguida (`6f2fe74` + docs): tipo de uso estruturado, retificação com motivo e histórico visível (CA1), snapshot imutável da prescrição na venda sem redigitação (CA2) e validação/FK no backup; 305/305. Fila reorganizada — F3-05 `#44` assumiu #1, F3-16 deslizou para #6, F2-01 para #8, F1-10 `#18` para #9 e F8-17 `#151` promoveu à fila (#10).

Reservas (se a fila avançar): F8-17 `#151` (preparação de versões; F8-02 feita, sem outras dependências).

## Bloqueios verdadeiros (aguardam decisão do usuário)

50 tarefas BLOCKED: 19 (Fase 5, raiz = decisão P1 backend) + 19 (Fase 6, raiz = P2 fiscal) + 8 (F8: P5 e2e, P6 LGPD, piloto, etc.) + 2 (F7-19, F2-17) + **3 corrigidos nesta revisão (P4 F4-13, P5 F8-03, P7 F3-20)**. Tabela completa: `KANBAN.md` → "Decisões que bloqueiam"; classificação em 4 categorias: `DEPENDENCIES.md`.

## Riscos de regressão (levantados na revalidação dos 18 DONE)

1. **Concorrência de venda/estoque** (F3-13/F4-07): qualquer toque em `SaleRepository.confirm`/`cancel`/`applyStockMovement` exige `sale-stock.test.ts` verde (F4-18 entregue em `9f0fdfc` adicionou a porta `cancel` — não reutilizar `confirm` para cancelamento).
2. **Idempotência de caixa** (F4-08/09/12/16/17/18): `cash-service.test.ts` obrigatório; F4-12 entregue (`60e2ca4`) grava `PARTIAL` e valida `paid + amount > total` na transação — saldo em centavos é a fonte de conferência; F4-18 cria `REFUND` apenas dentro da transação de cancelamento e bloqueia duplo cancelamento.
3. **Migrações** (F1-08/F8-09): `database.test.ts` cobre v8→v12 (verno atual); caminhos anteriores sem cobertura.
4. **F7-04 navegação desktop:** validação apenas manual (auditoria 1440px) — sem teste automatizado; mudanças de menu podem regredir em silêncio.
5. **284 testes verdes ≠ validação operacional:** ainda sem e2e (P5), teste offline em aparelho, validação por perfil completo, multiempresa e fiscal. Fluxos integrados passaram a ser cobertos em `integration-flows.test.ts` (F8-02), mas sem UI.

## Resultados dos testes disponíveis

- `npm.cmd test` → **305/305** (31 arquivos) em 08/10/2026 sobre `6f2fe74`.
- `npm.cmd run build` → exit 0 (PWA gerada).
- `npx.cmd tsc -b --pretty false` → exit 0.
- Não existe script `lint` (não declarar lint executado).
- Ainda sem: e2e, testes offline em aparelho, testes multiempresa, validação por perfil completa.

## Regras de atualização deste arquivo

- Após cada entrega relevante (commit de feature): data, último commit, tarefa concluída, próxima tarefa, testes e bloqueios.
- Nunca marcar conclusão sem comando de teste executado e registrado.
- Novos requisitos descobertos em sessão → nova Issue em BACKLOG (não inventar escopo no card atual).
- Revisões de planejamento (sem código) → registrar aqui com data e o que mudou.
