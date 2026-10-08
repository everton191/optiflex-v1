# USER FLOWS — os 5 fluxos canônicos do Opticore

Fonte: `docs/DEVELOPMENT_AUDIT_A_H.md` (seção "Checklist final de aceite", itens 1–5) + `USER_FLOWS` por módulo.
Status verificado em 07/10/2026 contra `d6ab1d4`. Card IDs resolvem em `docs/project-management/KANBAN.md`.

## Fluxo 1 — Atendimento clínico completo sem venda

`Cadastrar cliente → atender → anamnese/exame → prescrever → imprimir → finalizar sem compra`

- Hoje: cadastro ✓ (sem edição), atendimento ✓ (fila simples), workspace clínico parcial (texto), prescrição exige texto ✓, impressão ✗, anexos ✗ (metadados), autosave ✗.
- **Bloqueia:** F2-06, F3-05/06/07, F3-09, F1-12 (autosave/erros), F7-13 (impressão).

## Fluxo 2 — Da consulta à venda com OS

`Cliente existente → consulta → prescrição → armação/lentes/medidas → pagamento → OS`

- Hoje: venda com itens de estoque ✓ baixa saldo ✓ (Fase E); OS criada a partir da venda ✓; medidas/prescrição estruturada ✗; PDV guiado ✗.
- **Bloqueia:** F3-06/07/08, F3-11, F4-10/12 (pagamento rico).

## Fluxo 3 — Orçamento recuperável

`Atendimento → orçamento → sair → reabrir depois → concluir conservando seleção/preços`

- Hoje: `QUOTE` com itens ✓ e total calculado ✓; estados de orçamento ✗; edição/recuperação guiada ✗; impressão ✗.
- **Bloqueia:** F3-10, F7-13.

## Fluxo 4 — Venda parcelada

`Venda → carnê → parcela → recebimento → saldo/financeiro/caixa corretos`

- Hoje: recebimento idempotente ✓, saldo pendente em centavos ✓, fechamento com conferência ✓; parcelamento/carnê ✗ (bloqueio P4 — juros/multas).
- **Bloqueia:** P4 (decisão) → F4-13, F4-14, F4-15.

## Fluxo 5 — Offline e recuperação

`Desconectar → reiniciar → criar registros/anexos → recarregar → dados intactos`

- Hoje: operação local persistente ✓ (IndexedDB), migrações testadas ✓, backup local parcial ✓; anexos duráveis ✗; validação em aparelho real ✗.
- **Bloqueia:** F3-09, F8-10, F8-04.

## Transversais obrigatórios (também do checklist)

- Todos os perfis em rota/ação/registro → F1-11, F2-05, F8-06.
- Desktop/mobile/tablet usáveis → F7-05, F7-06, F7-17.
- Sem tela branca em erro/rota desconhecida → F1-12.
- Auditoria local (autor/loja/motivo), cancelamento não destrutivo → F1-10, F4-18.
- Dados demo ≠ operação real → DECISIONS P8.

## Regra de leitura deste documento

- "✓" = implementado **e** com teste/evidência registrada no card.
- "✗" = não existe ou não tem validação — nunca afirmar pronto sem rodar o teste do card.
