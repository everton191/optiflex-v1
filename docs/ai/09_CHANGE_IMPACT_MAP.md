# Change Impact Map

## Alterar todos os botões

Primeiro verificar: `src/design-system/components.tsx` e `.button` em `src/styles.css`.

Não alterar cada página separadamente. Conferir ações do Caixa e `.form-actions` no mobile.

## Alterar inputs ou campos

Verificar `Input` em `components.tsx`, `.input`, selects e textarea em `styles.css`. Select/textarea ainda são nativos e não possuem primitive global.

## Alterar cores, espaços, raios ou sombra

Verificar primeiro `src/design-system/tokens.css`. Depois localizar valores diretos legados em `src/styles.css`. Não trocar tokens por página.

## Alterar sidebar, topbar ou menu móvel

Verificar:

- `src/shell/AppShell.tsx` (`mainLinks`, `administrationLinks`, filtro);
- `src/domain/access.ts` (permissions das roles);
- `src/styles.css` (breakpoints e navegação);
- `src/app/router.tsx` (destinos e guards).

## Alterar perfil do cliente

Verificar `CustomerProfilePage`, `ReceptionService`, `Customer`, `CustomerRepository`, histórico de attendance e links para atendimento.

## Corrigir busca de clientes

Abrir somente:

- `docs/ai/modules/customers/MODULE.md`;
- `docs/ai/modules/customers/AI_CONTEXT.md`;
- `CustomersPage` em `src/app/pages.tsx`;
- `LocalCustomerRepository.list` em `src/infrastructure/storage/local-repositories.ts`;
- `ReceptionService.listCustomers` se o contrato mudar.

## Alterar atendimento ou fila

Verificar `AttendancePage`, `ClinicalQueuePage`, `ReceptionService`, `customer.ts`, attendance repository e índices Dexie. A fila clínica depende de status `WAITING` e `storeId`.

## Alterar prescrição

Verificar `ClinicalWorkspacePage`, `ClinicalService.finalize`, `ClinicalRecord`, repository clínico e schema `clinicalRecords`. Prescrição não é módulo separado. Avaliar impacto futuro em sales/work-orders somente se o dado passar a ser consumido por eles; hoje não é.

## Alterar anexos clínicos

Verificar `ClinicalAttachment`, `ClinicalRecord`, `ClinicalWorkspacePage` e Dexie. Hoje apenas metadados são persistidos; não existe storage de arquivo.

## Alterar vendas ou orçamento

Verificar `CashDeskPage`, `SalesService`, `Sale`/`SaleItem`, `LocalSaleRepository.confirm`, `applyStockMovement`, repositories, permissions `sales.*` e redirects `/vendas`/`/pagamentos`. Confirmar venda com itens baixa estoque na mesma transação.

## Corrigir fechamento de caixa

Verificar `CashService`, `CashRepository`, `CashSession`, `LocalCashRepository`, tabela `cashSessions` e `CashDeskPage`. Atenção: fechamento ainda não existe; será funcionalidade nova, não simples correção de UI.

## Alterar recebimento

Verificar `CashService.receive`, `CashEntry`, cash repository e aba Recebimentos. A venda mantém `paymentStatus` durável (`PENDING`/`PAID`) e o recebimento grava a entrada na mesma transação.

## Alterar ordem de serviço

Verificar `WorkOrderService`, `WorkOrder`, `LocalWorkOrderRepository` e `WorkOrdersWorkspace`. A criação exige venda `CONFIRMED` e é atômica por `saleId`; transições e prazo passam pela mesma transação.

## Alterar estoque

Verificar `InventoryWorkspace`, `InventoryService`, modelos, repository e tabelas `inventoryItems`/`inventoryMovements`. Cadastro e movimentação estão expostos na UI; o saldo nunca é editado diretamente.

## Alterar IndexedDB/schema

Verificar `database.ts`, todos os models afetados, repositories e migração de versão. Nunca editar versão antiga já publicada; adicionar nova versão Dexie em tarefa específica.

## Alterar inicialização ou loja atual

Verificar `AppProviders`, `AdministrationService`, repositories de administração, seeds, estados de carregamento/erro e seletor em `AppShell`. Não conceder acesso com sessão/loja fictícias quando o boot falhar.

## Alterar rota

Atualizar `router.tsx`, menu em `AppShell`, permission correspondente, `04_ROUTE_MAP.md`, módulo `MODULE.md` e seu `AI_CONTEXT.md` quando houver decisão/status relevante.
