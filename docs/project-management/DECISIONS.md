# DECISIONS — registro de decisões do Opticore

Toda decisão relevante (técnica, comercial ou de produto) é registrada aqui **antes** de virar código.
Decisões pendentes bloqueiam os cards indicados no `KANBAN.md`.

## Decisões já tomadas

| # | Data | Decisão | Justificativa / consequência |
|---|---|---|---|
| D1 | até 04/09/2026 | Manter `CLINICAL_PROFESSIONAL`; cargo configurável sem permissão por nome de profissão. | Decisão do usuário sobre a especificação. |
| D2 | até 04/09/2026 | Manter a paleta/identidade visual existente; mockup é referência de organização. | Proibido copiar visual do Simplifica 3D. |
| D3 | até 04/09/2026 | Vendas, recebimentos e abertura/fechamento agrupados no **Caixa** com abas/permissões. | Não recriar menus Vendas/Pagamentos redundantes. |
| D4 | até 04/09/2026 | Desktop e mobile compactos; tablet escolhe layout pela orientação. | Responsividade por CSS, sem app separado. |
| D5 | 04/09/2026 | Stack: React 19 + Vite + Dexie/IndexedDB + Vitest; **sem** Tailwind/Radix/Zustand/RHF/Zod sem necessidade comprovada. | Auditoria A: registrar alternativa equivalente em vez de instalar para marcar checklist. |
| D6 | até 04/09/2026 | Arquitetura Page → Service → Repository; páginas não acessam Dexie diretamente. | `AGENTS.md`. |
| D7 | 07/10/2026 | Branch de entrega contínua `feat/operational-flow-v2` (base `v1`); commits por fase com testes obrigatórios. | Preserva trabalho local; rastreabilidade. |
| D8 | 07/10/2026 | Campos novos opcionais **sem índice Dexie** não fazem bump de versão; índice novo exige bump + teste de migração. | Evita perda de dados e migrações desnecessárias. |
| D9 | 07/10/2026 | Baixa de estoque sempre via helper `applyStockMovement` em transação (venda, futuro cancelamento/OS). | Uma única autoridade anti-saldo-negativo. |
| D10 | 07/10/2026 | Testes de domínio com mocks `vi.fn()`; testes de storage com `fake-indexeddb` + `database.delete()` no `afterEach`. | Sem React Testing Library no projeto (decisão registrada nos mapas). |
| D11 | 07/10/2026 | Kanban mestre implementado como **Issues do GitHub + `KANBAN.md` local**, porque o token não tem escopo de Projects (`read:project`). | Limitação registrada; migração documentada no fim de `KANBAN.md`. |
| D12 | 07/10/2026 | Taxonomia de 8 fases do planejamento convive com a auditoria A–H; correspondência em `ROADMAP.md`. | Evita retrabalho de documentação. |

## Decisões PENDENTES (bloqueiam cards)

| # | Decisão necessária | Bloqueia | Quem decide | Sugestão de opções a avaliar |
|---|---|---|---|---|
| P1 | **Infraestrutura de backend/nuvem** (provedor, banco, RLS?) | Fase 5 inteira (#5), F8-05, F7-19 | Usuário | Definir critérios: custo, RLS, offline-first, portabilidade. |
| P2 | **Especificação tributária válida + provedor fiscal** | Fase 6 inteira (#6), F2-17, F8-11 | Usuário + contador | NF-e/NFC-e/NFS-e necessárias; regime da ótica; homologação. |
| P3 | **Modelo comercial do SaaS** (planos, preços, trial, limites) | F5-12..15, F8-16 | Usuário | — |
| P4 | **Regras de juros/multas/prazo de parcelamento** | F4-13 (#70) → F4-14/15 | Usuário/negócio | Auditoria exige definição antes de implementar. |
| P5 | **Ferramenta de testes e2e** | F8-03 (#137) | Equipe | Candidata: Playwright (não decidido; não instalar antes desta decisão). |
| P6 | **Orientação jurídica LGPD** (base legal, retenção, exclusão) | F8-08 (#142) | Jurídico do cliente | — |
| P7 | **Política de garantia/reparo** do negócio | F3-20 (#57) | Usuário/negócio | Prazos, o que cobre, limite de reparos. |
| P8 | **Escopo do modo demo × operação real** | F7-02, F1-11 (parte) | Usuário | Manter demo isolada para testes sem confundir com dado real. |

## Regras

1. Decisão tomada → linha na tabela "já tomadas" + atualizar cards afetados.
2. Enquanto `P#` estiver pendente, os cards correspondentes permanecem `status/blocked`.
3. Nenhum código fiscal/tributário presumido antes de P2; nenhum código de billing antes de P3.
