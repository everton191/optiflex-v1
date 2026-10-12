# AI CONTEXT — Work Orders

## Current Status

- Página `/ordens-servico` com filtros por status **e por atraso** (`ATRASADAS`), transições, prazo, observações, cancelamento auditado e badge "Atrasada" (`.badge.is-out`) nas linhas atrasadas.
- Rota de detalhe `/ordens-servico/:orderId` (`WorkOrderDetailPage`): situação (com badge de atraso), ações, insumos e histórico de eventos.
- Criação atômica por `saleId` (mesma transação) e ação rápida no `/caixa`.
- Baixa de insumos com atomicidade (order + estoque + movimento numa transação só).
- Laboratório: campo `laboratory?` + evento `LABORATORY` via `setLaboratory` (F1-07 `41f0bfd`).
- Prazos/alertas (F3-17 `e6e525d`): seletor compartilhado `isOverdueOrder`/`overdueOrders` em `dashboard.ts` (fonte única usada pela lista, pelo detalhe e pelo dashboard); contagem no dashboard (métrica "OS em andamento" + pendência "N ordens com prazo vencido").
- Testes do service (19), do storage (8) e seletores do dashboard passando; total do projeto 225/225.

## Current Decisions

- Ordem é criada manualmente a partir de venda `CONFIRMED`; `createFromConfirmedSale(sale, author)` grava o evento `CREATED`.
- Fluxo de status: OPEN → IN_PRODUCTION → READY → DELIVERED; OPEN/IN_PRODUCTION podem ir para CANCELLED **somente** via `cancel(order, reason, author)` — `transition` para `CANCELLED` lança "Cancelamento auditado".
- Cancelamento exige motivo (`cancelReason` persistido) e autor; gera evento `CANCELLED`.
- Histórico embutido em `WorkOrder.events` (`WorkOrderEvent[]`) — sem tabela nova, sem bump de versão Dexie; validado no backup (bloco `workOrders`).
- Eventos: `CREATED`, `STATUS`, `SCHEDULE`, `CANCELLED`, `INPUTS`, `LABORATORY` (com autor e `at`).
- `transition`, `schedule`, `setLaboratory`, `cancel` e `recordInputs` gravam `updatedAt`/`updatedBy` e validam `expectedStatus` para evitar atualização com dados obsoletos.
- Insumos: `recordInputs` cria movimentos `OUT` (`reason: "Insumos OS <id>"`) e só persiste se estoque cobrir todas as quantidades (rollback completo).
- Atraso: `isOverdueOrder(order, now)` em `src/domain/dashboard.ts` (prazo no passado + status aberto; datas inválidas ignoradas) — **não** reimplementar a lógica na UI; a lista usa o mesmo seletor do dashboard para a contagem ficar coerente. Filtro `ATRASADAS` é filtro de lista, não status.
- Sem permission própria: rotas usam `sales.read`, ações usam `sales.manage`.

## Known Problems

- Sem itens/laboratório de terceiros próprios (F3-15 fica para o card dele; `laboratory?` é texto livre).
- Aviso de atraso é proativo só na lista/dashboard (notificação push fica em F7 notificações).

## Pending Work

- Laboratório parceiro (F3-15), acompanhamento de fabricação (F3-16).
- Alertas de prazo mais finos (vencimento hoje/próximos) se F3-17 evoluir.

## Important Files Right Now

- `src/app/WorkOrdersWorkspace.tsx` (`WorkOrdersPage` + `WorkOrderDetailPage`).
- `src/domain/dashboard.ts` (`isOverdueOrder`/`overdueOrders` — seletores de atraso).
- `src/domain/work-order-service.ts`.
- `src/domain/work-order.ts`.
- `LocalWorkOrderRepository.recordInputs`.
- `src/app/router.tsx` (rota `ordens-servico/:orderId`).

## Recent Structural Changes

- Filtro `ATRASADAS` + badge de atraso e seletor compartilhado (F3-17 `e6e525d`).
- Laboratório da ordem (`laboratory?` + evento `LABORATORY`) em F1-07 `41f0bfd`.
- Rota de detalhe da OS com histórico de eventos.
- Cancelamento auditado (motivo + autor + evento) bloqueando `transition(CANCELLED)`.
- Registro de insumos com baixa atômica de estoque.
- Backup valida `cancelReason`, `laboratory` e `events` das ordens.

## Be Careful With

- Unicidade por `saleId` deve permanecer dentro da transação.
- Guarda de status obsoleto (`expectedStatus`) protege contra corrida entre abas.
- `recordInputs` deve continuar numa única transação Dexie (rollback do teste "Saldo insuficiente").
- Testes de atraso usam datas **locais** (`new Date(2026, 2, 10, 15)`) — fuso é risco documentado; não misturar `Date.parse` de ISO com horário local sem `now` explícito.

## Next Likely Task

Fila do KANBAN: F2-11 catálogo de produtos (`#32`) ou F2-02 matriz/filiais (`#24`). (F3-17 concluída em `e6e525d`.)
