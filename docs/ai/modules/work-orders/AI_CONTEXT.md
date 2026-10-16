# AI CONTEXT — Work Orders

## Current Status

- Página `/ordens-servico` com filtros por status **e por atraso** (`ATRASADAS`), transições, prazo, observações, cancelamento auditado e badge "Atrasada" (`.badge.is-out`) nas linhas atrasadas.
- Máquina de estados fina (F3-16 `f92ab0a`): `WorkOrderStatus` = `OPEN` → `SENT_TO_LAB` → `IN_PRODUCTION` → `RETURNED` → `IN_INSPECTION` → `READY` → `AWAITING_PICKUP` → `DELIVERED` (+ `CANCELLED` auditado); rework `RETURNED`/`IN_INSPECTION` → `IN_PRODUCTION`; transições pulando etapas são bloqueadas com teste. Status coarse antigos (`IN_PRODUCTION`, `READY`…) seguem válidos (compat com dados persistidos).
- Rota de detalhe `/ordens-servico/:orderId` (`WorkOrderDetailPage`): situação (com badge de atraso), **card "Progresso da fabricação"** (pipeline com etapa atual/concluída/pendente + responsável/data por etapa derivados dos eventos via `stageEvent`), card "Venda" (itens com categoria + tratamentos copiados da venda, F3-11), card "Prescrição" (graus + medidas da montagem, F3-08), **entrega auditada** (F3-19 `7de46e6`: botão "Registrar entrega" em `READY`/`AWAITING_PICKUP` abre checklist com recebido por (obrigatório), observação opcional e saldo a receber apurado no caixa — com saldo > 0 exige confirmação explícita), ações, insumos e histórico de eventos — todos sem redigitação.
- Criação atômica por `saleId` (mesma transação) e ação rápida no `/caixa`.
- Baixa de insumos com atomicidade (order + estoque + movimento numa transação só).
- Laboratório: campo `laboratory?` + evento `LABORATORY` via `setLaboratory` (F1-07 `41f0bfd`).
- Prazos/alertas (F3-17 `e6e525d`): seletor compartilhado `isOverdueOrder`/`overdueOrders` em `dashboard.ts` (fonte única usada pela lista, pelo detalhe e pelo dashboard); contagem no dashboard (métrica "OS em andamento" + pendência "N ordens com prazo vencido").
- Testes do service (23), do storage (8) e seletores do dashboard passando; total do projeto 327/327.

## Current Decisions

- Ordem é criada manualmente a partir de venda `CONFIRMED`; `createFromConfirmedSale(sale, author)` grava o evento `CREATED`.
- Fluxo de status fino (F3-16): OPEN → SENT_TO_LAB → IN_PRODUCTION → RETURNED → IN_INSPECTION → READY → AWAITING_PICKUP → DELIVERED (atalhos `OPEN`→`IN_PRODUCTION`, `IN_PRODUCTION`→`READY` e `READY`→`DELIVERED` mantidos para fluxos simples/lab único); `RETURNED`/`IN_INSPECTION` podem voltar a `IN_PRODUCTION` (rework). Cancelamento somente via `cancel(order, reason, author)` até `IN_INSPECTION` — `transition` para `CANCELLED` lança "Cancelamento auditado"; `READY`/`AWAITING_PICKUP` não cancelam (igual ao antigo `READY`).
- Cancelamento exige motivo (`cancelReason` persistido) e autor; gera evento `CANCELLED`.
- Histórico embutido em `WorkOrder.events` (`WorkOrderEvent[]`) — sem tabela nova, sem bump de versão Dexie; validado no backup (bloco `workOrders`).
- Eventos: `CREATED`, `STATUS`, `SCHEDULE`, `CANCELLED`, `INPUTS`, `LABORATORY`, `DELIVERY` (com autor e `at`).
- `transition`, `schedule`, `setLaboratory`, `cancel`, `deliver` e `recordInputs` gravam `updatedAt`/`updatedBy` e validam `expectedStatus` para evitar atualização com dados obsoletos.
- Entrega (F3-19): `deliver(order, { receivedBy, note?, pendingCents, acknowledgePending? }, author)` exige recebedor não vazio, grava `receivedBy`/`deliveredNote`, evento `DELIVERY` com "Recebido por …" no note e **bloqueia saldo pendente sem confirmação** (`pendingCents` vem da UI: total da venda − RECEIPTs no caixa; `stageEvent` reconhece `DELIVERY` para marcar a etapa final). `transition` → `DELIVERED` continua aceito só por compatibilidade de dados/integrações.
- Insumos: `recordInputs` cria movimentos `OUT` (`reason: "Insumos OS <id>"`) e só persiste se estoque cobrir todas as quantidades (rollback completo).
- Atraso: `isOverdueOrder(order, now)` em `src/domain/dashboard.ts` (prazo no passado + status aberto; datas inválidas ignoradas) — **não** reimplementar a lógica na UI; a lista usa o mesmo seletor do dashboard para a contagem ficar coerente. Filtro `ATRASADAS` é filtro de lista, não status.
- Sem permission própria: rotas usam `sales.read`, ações usam `sales.manage`.

## Known Problems

- Sem itens/laboratório de terceiros próprios (F3-15 fica para o card dele; `laboratory?` é texto livre).
- Aviso de atraso é proativo só na lista/dashboard (notificação push fica em F7 notificações).

## Pending Work

- Laboratório parceiro (F3-15), produtos prontos (F3-18).
- Alertas de prazo mais finos (vencimento hoje/próximos) se F3-17 evoluir.

## Important Files Right Now

- `src/app/WorkOrdersWorkspace.tsx` (`WorkOrdersPage` + `WorkOrderDetailPage`).
- `src/domain/dashboard.ts` (`isOverdueOrder`/`overdueOrders` — seletores de atraso).
- `src/domain/work-order-service.ts`.
- `src/domain/work-order.ts`.
- `LocalWorkOrderRepository.recordInputs`.
- `src/app/router.tsx` (rota `ordens-servico/:orderId`).

## Recent Structural Changes

- F3-19 `7de46e6`: entrega auditada — `WorkOrderDeliveryInput`/`deliver` (recebedor, observação, guarda de saldo), `WorkOrder.receivedBy`/`deliveredNote`, evento `DELIVERY` (reconhecido por `stageEvent`), formulário "Registrar entrega" com saldo do caixa e checkbox de ciência; entrega sai das filas do dashboard; backup valida `receivedBy`/`deliveredNote`; testes do service (+4) e do backup; 327/327.
- F3-16 `f92ab0a`: estados finos de fabricação (`workOrderStatuses`/labels/transições), helpers `productionPipeline`/`stageEvent`/`stageIndexOf` (responsável/data por etapa do histórico, sem schema novo), card "Progresso da fabricação" no detalhe, filtros por todos os status, backup com os 9 status, testes de transições inválidas.
- F3-11 `3dc784c`: card "Venda" no detalhe da OS (itens com categoria + tratamentos vindos do snapshot da venda).
- Filtro `ATRASADAS` + badge de atraso e seletor compartilhado (F3-17 `e6e525d`).
- Laboratório da ordem (`laboratory?` + evento `LABORATORY`) em F1-07 `41f0bfd`.
- Rota de detalhe da OS com histórico de eventos.
- Cancelamento auditado (motivo + autor + evento) bloqueando `transition(CANCELLED)`.
- Registro de insumos com baixa atômica de estoque.
- Backup valida `cancelReason`, `laboratory`, `events`, `receivedBy` e `deliveredNote` das ordens.

## Be Careful With

- Unicidade por `saleId` deve permanecer dentro da transação.
- Guarda de status obsoleto (`expectedStatus`) protege contra corrida entre abas.
- `recordInputs` deve continuar numa única transação Dexie (rollback do teste "Saldo insuficiente").
- Testes de atraso usam datas **locais** (`new Date(2026, 2, 10, 15)`) — fuso é risco documentado; não misturar `Date.parse` de ISO com horário local sem `now` explícito.

## Next Likely Task

Fila do KANBAN: F2-01 cadastro completo de empresas (`#23`).
