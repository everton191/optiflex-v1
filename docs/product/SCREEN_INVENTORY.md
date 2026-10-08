# SCREEN INVENTORY — inventário de telas e rotas

**Não duplica:** a lista canônica de rotas está em `docs/ai/04_ROUTE_MAP.md`; a situação detalhada na auditoria (`docs/DEVELOPMENT_AUDIT_A_H.md`, seção "Inventário completo de rotas e guias"). Aqui: visão de produto com **status + card responsável**.

Atualizado em: 07/10/2026 (verificação de `router.tsx` no mesmo dia).

## Status atual por grupo de tela

| Grupo | Rotas | Status | Card(s) |
|---|---|---|---|
| Acesso | `/login`, `/bloqueado`, `/trocar-senha`, `/selecionar-loja` | AUSENTE (seletor só no shell) | F7-02 (P0), F1-11 |
| Início | `/` | OK — métricas reais (guard `dashboard.view`) | F4-20 DONE; F7-03 (por perfil) |
| Clientes | `/clientes`, `/clientes/novo`, `/clientes/:id` | PARCIAL | F2-06 (edição/rota editar) |
| Perfil do cliente | abas resumo/clínico/óculos/compras/financeiro/garantias/documentos/histórico | AUSENTE | F2-09, F3-04, F3-20 |
| Atendimento | `/atendimentos` | PARCIAL (fila WAITING) | F3-02, F3-03 |
| Agenda | `/agenda`, `/agenda/dia`, `/agenda/semana` | AUSENTE | F3-01 |
| Clínico | `/clinico`, `/clinico/atendimento/:id` | PARCIAL (sem sub-rotas/guia, sem autosave, anexos só metadados) | F3-06..09, F1-12 |
| Prescrições/Exames | `/prescricoes*`, `/exames*` | AUSENTE | F3-05, F3-06 |
| Comercial | `/caixa` (+ redirects `/vendas`, `/pagamentos`) | OK/parcial — abas Vendas/Recebimentos/Sessão + itens de estoque | F3-10, F3-11, F4-10..16 |
| OS | `/ordens-servico` | PARCIAL — em desenvolvimento; sem detalhe por URL | F3-14 (IN PROGRESS) |
| Estoque | `/estoque` | OK — cadastro/movimentação/histórico/alertas | F4-01..04 DONE; F2-11 (catálogo) |
| Estoque extra | `/estoque/produto/:id`, `/movimentacoes`, `/transferencias` | AUSENTE | F4-06, F2-14 |
| Financeiro | `/financeiro*` (receber, carnê, pagar) | AUSENTE | F4-13..15 |
| Caixa subrotas | `/caixa/abrir`, `/caixa/sessao/:id`, `/caixa/fechar` | Parcial (abas) — subrotas não usadas | F4-16, F4-17 DONE |
| Relatórios | `/relatorios*` | AUSENTE | F4-19, F7-13 |
| Administração | `/admin/usuarios`, `/admin/perfis`, `/admin/configuracoes` | PARCIAL (listas/config básica) | F2-04, F2-05, F2-01 |
| Administração extra | `/admin/lojas`, `/permissoes`, `/integracoes`, `/auditoria`, `/importacao` | AUSENTE | F2-02, F1-10, F2-16 |
| Pós-venda | `/garantias`, `/reparos` | AUSENTE | F3-20 |
| Avisos | `/notificacoes` | AUSENTE | F7-12 |
| Busca global | (atalho Ctrl+K) | AUSENTE | F7-10 |
| Erros | `/sem-acesso` existe; rota `*` (página desconhecida) | AUSENTE p/ `*` | F1-12 |
| Impressão | telas de print/PDF | AUSENTE | F7-13, F7-14 |

## Regras para novas telas

1. Toda tela nova: rota em `router.tsx` + guard de permissão + entrada em `docs/ai/04_ROUTE_MAP.md` + card no KANBAN.
2. Não duplicar menu: Vendas/Recebimentos/Sessão vivem no Caixa (decisão D3).
3. Toda guia listada acima precisa ser localizável, permitida e com URL própria — "existe mas não abre por URL" não é pronto.
4. Identidade visual própria do Opticore; não copiar Simplifica 3D (decisão D2).
