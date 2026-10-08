# DATA MODEL PLAN — plano do modelo de dados

**Não duplica:** o estado real dos modelos vive em `src/domain/*.ts` e nos mapas `docs/ai/01–09` (especialmente `02_ARCHITECTURE.md` e `07_DATA_FLOW.md`). Este documento planeja a **evolução** e aponta os cards responsáveis.

Atualizado em: 07/10/2026 · Base: `d6ab1d4` (schema IndexedDB `opticore-v1` v9).

## Estado atual (resumo)

| Grupo | Entidades existentes | Lacuna planejada | Card |
|---|---|---|---|
| Acesso/admin | `User`, `Store`, `OrganizationSettings`, `LocalSession` | `Organization` com `organizationId` em registros; CRUD de lojas/usuários | F1-05, F2-02, F2-04 |
| Clientes/atendimento | `Customer`, `Attendance` | histórico de alterações, agenda | F2-06, F2-09, F3-01 |
| Clínico | `ClinicalRecord`, `ClinicalAttachment` (metadados) | `Prescription` versionada, refração estruturada, blob de anexos | F1-07, F3-06, F3-07, F3-09 |
| Comercial | `Sale`, `SaleItem`, `SalePaymentStatus` | estados de orçamento, `paymentMethod`, desconto/aprovação | F3-10, F4-10, F3-12 |
| Caixa | `CashSession`, `CashEntry`, `paidCents/cashTotals` | parcelas/carnê (`InstallmentPlan`), estorno | F4-13, F4-18 |
| Estoque | `InventoryItem`, `InventoryMovement` | catálogo/variantes, reserva, transferência | F2-11, F4-05, F4-06 |
| OS | `WorkOrder` (`dueAt/notes/updatedAt/updatedBy`) | histórico de eventos, laboratório, insumos | F1-07, F3-14, F3-15 |
| Dashboard | seletores puros (`dashboard.ts`) | métricas por perfil | F7-03 |
| Fiscal/SaaS | — (nada) | `FiscalDocument`, tenant/outbox | F6-05, F5-07 |

## Regras de evolução do modelo

1. **Todo modelo novo** nasce com: tipo em `src/domain/`, contrato em `repositories.ts`, teste de domínio, entrada em backup (`src/infrastructure/storage/backup.ts`) quando persistido.
2. **Migração Dexie:** campo opcional **sem índice** → sem bump de versão (regra adotada nas fases A–E). Índice novo ou mudança de tipo → bump + teste de upgrade com registros (`database.test.ts`).
3. **Nunca recriar o banco** `opticore-v1`; migração incremental sempre.
4. **Precisão monetária:** cálculos em centavos inteiros (`paidCents`/`pendingCents` já são o padrão); validar finitude e não-negatividade no domínio (F1-09).
5. **`organizationId` opcional** nos novos registros até a Fase 5 (F1-05), para não travar o multiempresa depois.
6. **Cancelamento não destrutivo:** status + motivo + autor; nunca apagar registro financeiro/clínico.

## Entidades planejadas (resumo por prioridade)

- **P0:** `AuditEntry` (F1-10), blob de `ClinicalAttachment` (F3-09), `Prescription` versionada (F1-07/F3-06).
- **P1:** `PaymentMethod` em `CashEntry` (F4-10), `InstallmentPlan/Installment` (F4-13), `Product` catálogo (F2-11/F1-06), histórico de OS (F1-07), `AgendaEvent` (F3-01).
- **P2:** transferência/ reserva de estoque (F4-06/F4-05), garantia/reparo (F3-20), notificações (F7-12).
- **Fase 5/6 (bloqueadas):** tenant/outbox/sync (F5), `FiscalDocument` (F6-05).

## Fontes de verdade

- Contratos: `src/domain/repositories.ts`.
- Persistência: `src/infrastructure/storage/database.ts` e `local-repositories.ts`.
- Visão estrutural: `docs/ai/01_PROJECT_MAP.md`, `docs/ai/07_DATA_FLOW.md`.
- Fluxo de atualização de documentação: `docs/ai/10_AI_WORKFLOW.md`.
