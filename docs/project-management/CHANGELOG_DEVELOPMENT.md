# CHANGELOG — desenvolvimento do Opticore

Registro de entregas relevantes. Formato: data · commit · escopo · evidência.

## 07/10/2026

### `d6ab1d4` — feat: deduct stock when confirming sales with items (Fase E do fluxo operacional)

- `Sale.items` + `stockMovementsFor`; `createQuote` valida itens e calcula total/descrição.
- `SaleRepository.confirm(sale, movements)` transacional: confirma venda + baixa saldo + movimento `OUT` (guarda contra confirmação obsoleta).
- Helper compartilhado `applyStockMovement` (anti-saldo-negativo) reutilizado por venda e estoque.
- UI do Caixa: seletor `.sale-items-form` (produto/quantidade/preço) com saldo insuficiente avisado.
- Backup valida `items` e vínculo produto↔loja.
- Evidência: `npm.cmd test` **101/101**, build 0, tsc 0 (14 arquivos de teste; novos `sales-service.test.ts`, `sale-stock.test.ts`).
- Cards: F3-13 → DONE; F4-7 → DONE; F1-04/F4-01..03 confirmados.

### `a1be9b5` — feat: drive dashboard with real store metrics

- `src/domain/dashboard.ts` com seletores puros + `dashboard.test.ts` (8 casos).
- Pendências do dashboard viram links; passo "Ordens" no fluxo; guard `dashboard.view`.
- Card: F4-20 → DONE.

### `8a68d67` — feat: track work order production flow with due dates

- `WorkOrdersWorkspace` + rota `/ordens-servico`; `dueAt/notes/updatedAt/updatedBy`.
- Transições OPEN→IN_PRODUCTION→READY→DELIVERED (+CANCELLED); criação atômica por `saleId`; guarda de status obsoleto.
- Evidência: `work-order-service.test.ts` (9) + `work-orders.test.ts` (6).
- Card: F3-14 → IN PROGRESS (restam detalhe/histórico/lab/insumos).

### `3f2c0c1` — feat: add stock registration, movements and history

- `InventoryWorkspace` (cadastro/edição, IN/OUT/ADJUSTMENT, histórico, alertas); contrato transacional.
- Evidência: `inventory-service.test.ts` (10) + `inventory.test.ts` (7).
- Cards: F4-01..04 → DONE.

### `cbcf80f` — feat: add cash closing, durable receipts and sale payment status

- Fechamento com conferência (esperado/contado/diferença/autor/observação); recebimento transacional anti-duplicado; `paymentStatus` durável; abas Vendas/Recebimentos/Sessão.
- Evidência: `cash-service.test.ts` + `cash.test.ts`.
- Cards: F4-08/09/17 → DONE.

### `f3dda20` — chore: preserve local clinical workspace, backup and reception work

- Commit-base da branch `feat/operational-flow-v2` (preserva trabalho local pré-existente).

## 04/09/2026

- Auditoria `docs/DEVELOPMENT_AUDIT_A_H.md` publicada (fases A–H, evidências, bloqueios P0/P1, checklist final).
- Correções: boot por índices ausentes, seleção cliente→atendimento, estados assíncronos da recepção; 12 testes + build à época.

## Antes (histórico no `v1`)

- `3510602` docs: add AI structural project map (HEAD do `v1`).
- `78e9860` feat: unify cash workflow and role menus.
