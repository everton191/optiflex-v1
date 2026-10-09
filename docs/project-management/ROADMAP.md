# ROADMAP — 8 fases do Opticore

Atualizado em: 07/10/2026. Épicas = Issues `#1`–`#8`; tarefas = `#9`–`#155`.

> Os números de fase aqui são os do **Kanban mestre** (Etapa 3 da especificação de planejamento). A auditoria técnica `docs/DEVELOPMENT_AUDIT_A_H.md` usa outra taxonomia (fases A–H da especificação canônica do frontend). A correspondência prática está ao final.

## Fases e marcos

| Fase | Épica | Tarefas | Estado | Marco de entrega |
|---|---|---|---|---|
| 1 — Arquitetura e Fundação | #1 | 14 | em progresso | Base auditada: contratos, migração, centavos, erros globais, auditoria de alterações. |
| 2 — Cadastros e Administração | #2 | 18 | ready | Empresa/lojas/usuários/clientes/produtos completos e validados. |
| 3 — Operação da Ótica | #3 | 20 | em progresso | 5 fluxos canônicos da auditoria executáveis de ponta a ponta. |
| 4 — Estoque e Financeiro | #4 | 20 | em progresso | Caixa+estoque+parcelas+estornos conciliados sem dupla baixa. |
| 5 — SaaS Multiempresa | #5 | 19 | **bloqueado** | Isolamento de tenant + sync + planos operando em homologação. |
| 6 — Notas Fiscais e Conformidade | #6 | 19 | **bloqueado** | NF-e/NFC-e homologadas com rejeições/cancelamento tratados. |
| 7 — Interface e Experiência | #7 | 19 | ready | Design system completo, login, acessibilidade e impressões. |
| 8 — Qualidade e Lançamento | #8 | 18 | backlog | E2e+LGPD+piloto real+release versionada. |

## Ordem segura de conclusão (herdada da auditoria + cadeias de dependência)

1. **Fechar P0s de fundação:** F7-02 login → F1-11 escopo por registro → F3-09 anexos → F1-12 erros globais (F1).
2. **Concluir Fase 2 mínima operável:** edição de cliente, usuários/lojas CRUD, catálogo de produtos (F2).
3. **Concluir Fase 3 clínica:** prescrição estruturada, autosave, anexos, finalização imutável, impressão de receita (F3). Homologação do responsável clínico.
4. **Concluir Fase 3 comercial:** orçamento recuperável, PDV com catálogo, descontos (F3) — integrando à Fase 4.
5. **Concluir Fase 4:** formas de pagamento, parciais, parcelas/carnê, sangria/suprimento, estornos, relatórios (F4).
6. **Fases 5 e 6:** só após as decisões registradas em `DECISIONS.md` (backend; provedor fiscal).
7. **Fase 7 e 8 juntas:** UX restante, e2e, segurança/LGPD, piloto e release (F7/F8).

## Marcos de entrega sugeridos

- **Marco 1 — "Operação local confiável" (F1+F2+F3+F4 parcial fechados, sem F5/F6):** ótica opera offline com cliente→atendimento→receita→venda→OS→estoque→caixa; backup local validado. Requer: top-10 do `KANBAN.md` + F3 clínica estruturada.
- **Marco 2 — "Financeiro completo":** parcelas, carnê, contas a receber, estornos, relatórios (fecha Fluxo 4).
- **Marco 3 — "SaaS":** após decisão de backend (F5).
- **Marco 4 — "Fiscal":** após provedor+espec (F6).
- **Marco 5 — "Lançamento":** e2e, LGPD, piloto, versão 1.0 (F8).

## Correspondência com a auditoria A–H

| Auditoria (A–H) | Fases do Kanban |
|---|---|
| A Fundação | 1 + 7 (design system, rotas, estados) |
| B Usuários e contexto | 2 (usuários/perfis) + 5 (auth real) + 7 (login) |
| C Cliente e recepção | 2 (clientes) + 3 (agenda/fila) |
| D Clínico | 3 |
| E Comercial | 2 (catálogo) + 3 (orçamento/PDV/descontos) + 4 (pagamento) |
| F Operacional | 3 (OS/lab) + 4 (estoque) |
| G Financeiro | 4 |
| H Pós-venda e gestão | 3 (garantias) + 4 (relatórios) + 7 (notificações) + 8 |

Critérios de aceite finais (os 5 fluxos + checklist da seção "Checklist final de aceite") permanecem válidos: `docs/DEVELOPMENT_AUDIT_A_H.md` → `docs/project-management/RELEASE_CHECKLIST.md`.
