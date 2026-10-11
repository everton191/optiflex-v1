# DATA MODEL PLAN — plano do modelo de dados

**Não duplica:** o estado real dos modelos vive em `src/domain/*.ts` e nos mapas `docs/ai/01–09` (especialmente `02_ARCHITECTURE.md` e `07_DATA_FLOW.md`). Este documento planeja a **evolução** e aponta os cards responsáveis.

Atualizado em: 08/10/2026 · Base: `9f0fdfc` (schema IndexedDB `opticore-v1` v11).

## Estado atual (resumo)

| Grupo | Entidades existentes | Lacuna planejada | Card |
|---|---|---|---|
| Acesso/admin | `User`, `Store`, `OrganizationSettings`, `LocalSession` | `Organization` com `organizationId` em registros; CRUD de lojas/usuários | F1-05, F2-02, F2-04 |
| Clientes/atendimento | `Customer`, `Attendance` | histórico de alterações, agenda | F2-06, F2-09, F3-01 |
| Clínico | `ClinicalRecord`, `ClinicalAttachment` (+`category`), `ClinicalAttachmentContent` (tabela `attachments`, v11) | `Prescription` versionada, refração estruturada | F1-07, F3-06, F3-07 |
| Comercial | `Sale` (`cancelReason?`/`cancelledAt?`/`cancelledBy?`), `SaleItem`, `SalePaymentStatus` | estados de orçamento, `paymentMethod`, desconto/aprovação | F3-10, F3-12 |
| Caixa | `CashSession`, `CashEntry` (`paymentMethod?`, `reason?`, `author?`; tipo `REFUND`), `PaymentMethod` (`CASH`/`PIX`/`CARD` legado/`DEBIT`/`CREDIT`), `CashMovementType`, `paidCents/cashTotals` (+`byMethod`, +`refunds`) | parcelas/carnê (`InstallmentPlan`) | F4-13 |
| Estoque | `InventoryItem` (`defaultPrice?`/`cost?`), `InventoryMovement` | catálogo/variantes, reserva, transferência | F2-11, F4-05, F4-06 |
| OS | `WorkOrder` (`dueAt/notes/updatedAt/updatedBy/cancelReason/events`) | laboratório, acompanhamento de fabricação | F3-15, F3-16 |
| Dashboard | seletores puros (`dashboard.ts`) | métricas por perfil | F7-03 |
| Fiscal/SaaS | — (nada) | `FiscalDocument`, tenant/outbox | F6-05, F5-07 |

## Regras de evolução do modelo

1. **Todo modelo novo** nasce com: tipo em `src/domain/`, contrato em `repositories.ts`, teste de domínio, entrada em backup (`src/infrastructure/storage/backup.ts`) quando persistido. Auditoria F1-02 (08/10/2026, `8fc64b0`): os 10 contratos existentes têm implementação local e cobertura de teste — último lacuna (`SettingsRepository`) fechada em `storage/settings.test.ts`; a UI não acessa Dexie diretamente (0 usos em `src/app`). Mapeamento completo: `docs/ai/02_ARCHITECTURE.md` → "Regra F1-02".
2. **Migração Dexie:** campo opcional **sem índice** → sem bump de versão (regra adotada nas fases A–E). Índice novo ou mudança de tipo → bump + teste de upgrade com registros (`database.test.ts`).
3. **Nunca recriar o banco** `opticore-v1`; migração incremental sempre.
4. **Precisão monetária (F1-09 — concluído em 08/10/2026, `7dc1d7b`):** regra única em `src/domain/money.ts` — fronteira sempre em reais finitos (`requireMoney`/`isMoney`), cálculo em centavos inteiros (`toCents`/`fromCents`, arredondamento `Math.round` aplicado na linha/orçamento), soma apenas de centavos (`itemsTotalCents`, `paidCents`, `cashTotals`); NaN/Infinity rejeitados na fronteira dos serviços (`createQuote`, `confirm`, caixa). **Não usar arredondamento ad-hoc** (`Math.round(x*100)/100`) fora de `money.ts`.
5. **`organizationId` opcional** nos novos registros até a Fase 5 (F1-05), para não travar o multiempresa depois.
6. **Cancelamento não destrutivo:** status + motivo + autor; nunca apagar registro financeiro/clínico.

## Entidades planejadas (resumo por prioridade)

- **P0:** `AuditEntry` (F1-10), `Prescription` versionada (F1-07/F3-06). *Blob de `ClinicalAttachment` entregue em F3-09 (`6ce9c9a`, tabela `attachments` v11, conteúdo base64).*
- **P1:** `InstallmentPlan/Installment` (F4-13), `Product` catálogo (F2-11 — base `defaultPrice`/`cost` em `InventoryItem`), `AgendaEvent` (F3-01). *Histórico de OS entregue em F3-14 (`e56939e`, eventos embutidos em `WorkOrder.events`); `PaymentMethod` entregue em F1-06 (`b0f72d1`) e estendido em F4-10 (`7f1d6e4`, `DEBIT`/`CREDIT` + `byMethod`); sangria/suprimento entregues em F4-16 (`6a59f2b`, `CashMovementType` + `reason?`/`author?`); estorno/cancelamento entregues em F4-18 (`9f0fdfc`, `CashEntryType.REFUND`, `CashTotals.refunds`, campos de cancelamento em `Sale`).*
- **P2:** transferência/ reserva de estoque (F4-06/F4-05), garantia/reparo (F3-20), notificações (F7-12).
- **Fase 5/6 (bloqueadas):** tenant/outbox/sync (F5), `FiscalDocument` (F6-05).

## Fontes de verdade

- Contratos: `src/domain/repositories.ts`.
- Persistência: `src/infrastructure/storage/database.ts` e `local-repositories.ts`.
- Visão estrutural: `docs/ai/01_PROJECT_MAP.md`, `docs/ai/07_DATA_FLOW.md`.
- Fluxo de atualização de documentação: `docs/ai/10_AI_WORKFLOW.md`.
