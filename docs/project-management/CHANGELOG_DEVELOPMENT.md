# CHANGELOG — desenvolvimento do Opticore

Registro de entregas relevantes. Formato: data · commit · escopo · evidência.

**Versões publicadas:** `v0.1.0` (08/10/2026, tag em `2a58572` + docs `44d1258`) — primeiro checkpoint versionado; cobre todas as entregas de 08/10/2026 listadas abaixo (F8-17 até F3-03). Convenção semver em `RELEASE_CHECKLIST.md`.

## 08/10/2026

### `b7f3e0a` + docs — Cadastro inicial assistido (F2-18)

- `src/domain/onboarding.ts`: `onboardingSteps` (Organização/Loja/Usuário/Produtos/Revisão, opcionais marcados), navegação `nextOnboardingStep`/`previousOnboardingStep` pulando etapas puláveis, `buildOnboardingSummary` (resumo com placeholders) e `OnboardingService` (`completeOrganization` normaliza/valida/grava settings; `createStore`/`createOwner` via AdministrationService, OWNER obrigatório).
- Rota `/admin/assistente` (`OnboardingPage`, guarda `settings.manage`, link "Assistente inicial" no menu Administração): 5 etapas com progresso `aria-current`; cada passo persiste imediatamente (saveSettings/createStore/createUser/InventoryService.create) — fechar no meio não perde dados; produtos iniciais admitem vários itens; revisão final com etapas puladas e "Concluir" → dashboard; seed demo preservada (fora de escopo).
- Guard matrix 22→23 rotas (`permission-routes.test.ts`); +9 testes em `onboarding.test.ts`; 414/414, build 0, tsc 0. Libera F7-15; fila esvaziada (só resta F8-04 IN PROGRESS).

### `fbb2989` + docs — Modais e diálogos acessíveis (F7-09)

- Hook `useOverlayFocus` em `components.tsx`: `Dialog`/`Drawer` com foco inicial no primeiro elemento focável, trap de Tab (cicla dentro do overlay; Shift+Tab volta; foco fora é puxado para dentro), Escape fecha e o foco retorna ao gatilho ao fechar.
- Novo `ConfirmDialog` (título, mensagem, `confirmLabel`/`cancelLabel`, `destructive` → botão `button-danger`); `Button` passa a aceitar `className` sem perder a classe base.
- CSS `.button-danger` (#a12525) em `styles.css`.
- `window.confirm` do excluir anexo clínico migrado para `ConfirmDialog` destrutivo; botões "Confirmar cancelamento" do Caixa e das transferências marcados como destrutivos.
- **405/405**, tsc 0, build 0. Teste manual de teclado (Tab/Shift+Tab/Escape/retorno do foco) pendente.

### `e44d5cb` + docs — Tabelas e filtros acessíveis (F7-08)

- Helpers puros em `src/design-system/data-table.ts`: `toggleSort` (asc→desc→asc por coluna), `sortRows` (`localeCompare` pt-BR com `sensitivity: base` para texto, numérico direto), `filterRows` + `normalizeForSearch` (NFD sem diacríticos, caixa ignorada) e `paginateRows`/`pageCount`.
- Componente `DataTable<T>` em `components.tsx`: headers `th scope="col"` com `aria-sort` e botão ordenável (teclado nativo), filtro opcional via prop `match` (usa `Search`), paginação Anterior/Próxima com `aria-live="polite"` e botões desabilitados nas bordas, `emptyMessage`, `renderRow` para células ricas e coluna `sortable: false` para ações; CSS `.table-sort`/`.table-filter`/`.table-pagination` em `styles.css`.
- Listas de clientes (`CustomersWorkspace`) e produtos do Estoque (`InventoryWorkspace`) convertidas para o padrão (ordenar por teclado, 10 por página; badge de saldo e ações Movimentar/Editar preservados no render do estoque).
- +9 testes em `data-table.test.ts` (toggle, ordenação pt-BR com acentos, filtro, paginação, pageCount); **405/405**, tsc 0, build 0. Libera F7-18 (desempenho).

### `8be2750` + docs — Catálogo de serviços (F2-12)

- `ServiceCatalogItem` (nome, preço padrão, descrição opcional, por loja) + `assertValidServiceInput` (nome obrigatório ≤ 120, preço ≥ 0) e `ServiceCatalogService` (nome único case-insensitive por loja; criar/editar/remover com `assertStoreAccess`).
- `LocalServiceCatalogRepository` (Dexie **v17** tabela `services`); seção "Serviços" no `InventoryWorkspace` (CRUD com `inventory.manage`).
- No Caixa, seletor "Serviço do catálogo" no form de tratamentos preenche nome e preço padrão; o serviço entra como `SaleTreatment` (linha já existente — total e OS sem baixa de estoque; caminho de confirmação intacto).
- Backup **schema 17** (snapshots 16 padronizam `services=[]`, FK de loja, validação de nome/preço); +4 testes de catálogo (CRUD por loja, validação/duplicidade, reabertura, venda só de serviço sem movimento de estoque) +1 de backup; **396/396**, tsc 0, build 0.

### `1c8c9a6` + docs — Transferência entre filiais (F4-06)

- Modelo `Transfer` com ciclo REQUESTED→SEPARATED→IN_TRANSIT→RECEIVED (+CANCELLED), `transferTransitions`/`transferStatusLabels` e `assertValidTransferItems`; `TransferService` valida lojas diferentes, autor e itens, e audita com a nova entity `transfer`.
- `LocalTransferRepository` transacional: separar baixa o saldo da origem checando `availableQuantity` (reservas F4-05 respeitadas), receber credita no destino (match por `code`, senão por nome sem code, senão cria item copiando atributos da origem) e cancelar SEPARATED devolve IN à origem (IN_TRANSIT não cancela); histórico IN/OUT nos dois lados com reason do transfer-id.
- UI em `InventoryWorkspace`: seção "Transferências entre filiais" com solicitação multi-produto (checagem de saldo em tempo real), ações por status (Separar/Em trânsito/Receber) e cancelamento com motivo, permissão `inventory.manage` e `assertStoreAccess` nas duas lojas.
- Dexie **v16** com tabela `transfers`; backup **schema 16** (snapshots 14/15 padronizam `transfers=[]`, validação de status/itens/lojas); +11 testes de transferência +1 de backup; **391/391**, tsc 0, build 0.

### `d807590` + docs — Reserva de itens por venda (F4-05)

- `InventoryItem.reservedQuantity?` + `availableQuantity` (saldo − reservado; sem bump de schema); `quoteReservationDeltas` puro (líquido por produto entre rascunho anterior e novo).
- `InventoryRepository.applyReservation` transacional: aumento só passa se houver saldo disponível; baixa respeita reservas legadas (clamp em 0).
- `SalesService` ganha repositório de estoque: `createQuote`/`updateQuote` reservam, `cancel`/`transitionQuote` (EXPIRED/REJECTED) liberam, `confirm` converte a reserva em baixa na mesma transação do repositório; orçamentos legados sem reserva gravada cancelam/expiram sem quebrar.
- `InventoryService.adjust` não deixa movimento manual comer estoque reservado; UI do caixa exibe "disponível" no seletor de produtos e valida o saldo já incluindo os itens do rascunho.
- Backup valida `reservedQuantity` (não-negativa, numérica); +12 testes (domínio + IndexedDB: concorrência, cancelar/expirar/recusar, confirmar, editar rascunho, legado, ajuste, reabertura); **380/380**, tsc 0, build 0.

### `75df1c0` + docs — Identificação fiscal da empresa (F2-03)

- `TaxRegime` (SIMPLES_NACIONAL, SIMPLES_EXCESSO_SUBRECEITA, REGIME_NORMAL, MEI) com `taxRegimeLabels`/`isTaxRegime`; IE (`stateRegistration`), IM (`municipalRegistration`) e CNAE (`formatCnae`/`isValidCnae`, 7 dígitos formatados `4773-5/02` enquanto digita) em `OrganizationSettings` — campos opcionais, sem bump de schema.
- Normalização (trim/maiúsculas/formato) e validação (regime por enum, IE/IM `^[A-Z0-9.-]{2,20}$` — aceita ISENTO —, CNAE com 7 dígitos) no `saveSettings`, com erro na UI do `SettingsPage` (campos "Regime tributário", "Inscrição estadual (IE)", "Inscrição municipal (IM)" e "CNAE principal"; endereço confirmado como endereço fiscal).
- `validateBackup` valida o bloco fiscal do `settings` (regime desconhecido, IE não-string e CNAE curto rejeitados; campos em branco aceitos); snapshot importa/exporta os campos.
- +5 testes (`organization.test.ts` +4, backup +1); **368/368**, tsc 0, build 0. Cálculo fiscal continua fora de escopo (F6 bloqueado pela decisão P2).

### `f5b8e0b` + docs — Testes offline, parte automatizada (F8-04, em andamento)

- `src/infrastructure/storage/offline-persistence.test.ts` (novo): evidência automatizada do Fluxo 5 — sessão completa criada sem rede (cliente, atendimento, prescrição, orçamento com desconto de 5%, confirmação com baixa de estoque, recebimento de R$ 285 no caixa e OS) sobrevive a `database.close()` + `database.open()`; integridade conferida por reabertura (venda líquida + desconto com bruto, saldo do estoque, recebimento, OS, prescrição) e por `validateBackup` do snapshot completo. **363/363**, tsc 0, build 0.
- Procedimento de aparelho real documentado em `RELEASE_CHECKLIST.md` §5.1 (instalação PWA por HTTPS, modo avião, dados sintéticos, force stop, reabertura offline, checklist de conferência e tabela de evidência por dispositivo).
- Card **F8-04 permanece IN PROGRESS**: o CA exige evidência executada em aparelho real (DevTools não conta); fecha quando a tabela §5.1 for preenchida.

### `93ebb03` + docs — Descontos e aprovação (F3-12)

- `sales.ts`: `SaleDiscount` (`type` PERCENT/AMOUNT, `value`, `reason?`, `grossTotal`, `appliedBy`/`appliedByRole`/`appliedAt`, `approvedBy?`/`approvedAt?`) em `Sale.discount?` (campo opcional, sem bump Dexie); `Sale.total` passa a ser o líquido; `discountAuthorityByRole` (vendedor/caixa 5% ou R$ 50; gerente 15% ou R$ 300; dono/rede 30% ou R$ 1000 — as duas barreiras valem juntas; acima do topo ninguém aprova); funções puras `assertValidSaleDiscount`, `saleDiscountAmountCents` (clampa ao bruto), `saleTotalWithDiscount`, `discountWithinAuthority`/`discountRequiresApproval`/`canApproveDiscount`, `assertDiscountNotZeroing`, `saleGrossTotal`, `saleDiscountAmount`.
- `sales-service.ts`: `createQuote`/`updateQuote` aceitam `discount` + contexto {appliedBy, role}; `approveDiscount` grava quem aprovou, proíbe autoprovação, valida limite do aprovador e audita (`UPDATE`/`sale`); `confirm` bloqueia desconto acima do limite do aplicante sem aprovação.
- `CashWorkspace`: campos tipo/valor/motivo no formulário de orçamento com prévia "bruto → desconto → final" e aviso de aprovação/limite; linha da venda com status do desconto e botão "Aprovar desconto" para perfis autorizados; `SaleDocumentPage` exibe bruto, desconto (motivo + aprovador) e total.
- Regras documentadas em `OPTICAL_BUSINESS_RULES.md` (seção "Descontos com limite por perfil e aprovação").
- Testes `sales-discount.test.ts` (+8: matemática/clamp, limites por perfil, criação com e sem desconto, bloqueio de confirmação, aprovação/autoprovação/dupla aprovação, update/clear). **362/362**, tsc 0, build 0.

### `f43627c` + docs — Guia clínico do perfil (F3-04)

- `src/domain/customer-clinical-history.ts` (novo): `CustomerClinicalDocumentKind` (PRESCRIPTION/CLINICAL_RECORD/ATTACHMENT), `canViewClinicalHistory(role)` (gate `clinical.workspace.access`) e `buildCustomerClinicalDocuments` puro — prescrições com uso/versão/retificação, prontuários (finalizado/em edição) apenas quando há conteúdo, anexos com categoria; resumo `CustomerClinicalRecordSummary` só com flags booleanas (texto de anamnese/exame nunca sai do repositório — P0 de segurança).
- `CustomerHistoryService.listClinicalDocuments(customerId, { storeId, role })`: gate duplo UI+serviço, `PrescriptionRepository.listByCustomer` (loja) + `ClinicalRepository.load` por atendimento não cancelado com try/catch.
- `CustomerProfilePage`: seção "Guia clínica" com chips por tipo, badges e "Abrir consulta" (`/clinico/atendimento/:id`), visível/executada só para quem tem acesso clínico.
- Testes `customer-clinical-history.test.ts` (+4: ocultação para vendedor, prescrições com retificação, prontuários/anexos com skip de vazio, outra loja + não-vazamento de texto). **354/354**, tsc 0, build 0.

### `4ed148a` + docs — Histórico de clientes (F2-09)

- `src/domain/customer-history.ts` (novo): tipos `CustomerHistoryEvent`/`CustomerHistoryKind` (ATTENDANCE/SALE/WORK_ORDER/PAYMENT), `historyKindsFor(role)` (attendance.read → atendimentos; sales.read → vendas+OS; cash.read → pagamentos) e `buildCustomerHistory` puro — ordena por data desc com tiebreak, links por permissão (`/clinico/atendimento/:id` só para `clinical.workspace.access` na própria loja, senão `/atendimentos/:id`; venda/OS/pagamento → `/vendas/:id` ou `/ordens-servico/:id`), flag `otherStore` para eventos de outra loja.
- `src/domain/customer-history-service.ts` (novo): `CustomerHistoryService` agrega `listByCustomer` de atendimentos + vendas/OS da loja por `customerId` + recebimentos do caixa via `saleId` e delega ao seletor.
- `CustomerProfilePage` (CustomersWorkspace) com seção "Histórico": chips de filtro por tipo com contagem, badges de detalhe, link "Ver registro" e aviso de outra loja.
- `attendanceTypeLabels`/`attendanceStatusLabels` movidos de `ReceptionWorkspace` para `domain/customer.ts` (o domínio não importa app).
- Testes `customer-history.test.ts` (+4: agregação, permissões por role, link clínico por loja, filtro explícito). **350/350**, tsc 0, build 0.

### `v0.1.0` + docs — Preparação de versões (F8-17)

- Nenhum código alterado; entrega de processo.
- Primeira tag semântica anotada `v0.1.0` criada e enviada (`git push origin v0.1.0`) apontando para `2a58572`, com validações obrigatórias executadas antes da tag: tsc 0, **346/346** testes, build 0.
- Convenção de versionamento documentada em `RELEASE_CHECKLIST.md`: semver `vMAJOR.MINOR.PATCH`, faixa 0.x até o lançamento, origem apenas de commits verdes de `feat/operational-flow-v2`, mensagem anotada citando o changelog, imutabilidade de tags publicadas e publicação explícita (sem automação — fora do escopo do card).
- Changelog correspondente: entradas `2a58572` e anteriores deste arquivo (elo por SHA entre tag na branch de código e changelog na branch de docs).

### `2a58572` + docs — Auditoria de alterações (F1-10)

- `src/domain/audit.ts` (novo): `AuditEntry` imutável (`organizationId?`, `id`, `storeId`, `action` CREATE/UPDATE/CANCEL/ADJUSTMENT, `entity` sale/inventoryItem/user/store, `entityId`, `author`, `at`, `reason?`, `summary?`), labels (`auditActionLabels`/`auditEntityLabels`), contrato `AuditRepository` (`create`/`list` com filtros), `isAuditAction`/`isAuditEntity` e `assertValidAuditEntry`.
- `src/domain/audit-service.ts` (novo): `AuditService.log` monta a entrada (`audit-` + uuid, organização, data ISO, autor vazio → "sistema", trim + validação) e `AuditService.list`.
- `src/infrastructure/storage/database.ts`: Dexie **v15** com tabela `auditEntries` (índices `id, storeId, action, entity, entityId, at`); v14 preservada.
- `src/infrastructure/storage/local-repositories.ts`: `LocalAuditRepository` (create + list ordenado por data com filtros).
- Serviços auditam ocorrências críticas com `AuditService` opcional e autor da sessão: `SalesService.cancel` (CANCEL/sale), `InventoryService.adjust` (ADJUSTMENT/inventoryItem) e `AdministrationService` (CREATE/UPDATE em lojas e usuários; `updateUser` resume os campos alterados). Wiring em `providers.tsx`, `CashWorkspace` e `InventoryWorkspace` passando `session.userName`.
- `/admin/auditoria` (`AuditPage` em `AdminWorkspace`): filtros de ação/registro/autor, coluna de loja, guarda `settings.manage` (22 rotas), menu Administração.
- Backup **schema 14** inclui `auditEntries` (schemas legados 10–13 injetam `[]` com offsets -4/-3/-2/-1; validação de ação/entidade/data/reason/summary).
- Testes: `audit-service.test.ts` (4), sales-service +2, inventory-service +1, administration-service +3, backup +1, guards 21→22; **346/346 (33 arquivos)**, build 0, tsc 0.

### `4f78fe6` + docs — Cadastro completo de empresas (F2-01)

- `src/domain/organization.ts` (novo): `onlyDigits`, `formatCnpj` (máscara progressiva XX.XXX.XXX/XXXX-XX), `isValidCnpj` (dígitos verificadores — pesos 5432/98765432 e 6/5432/98765432; rejeita 14 dígitos repetidos), `normalizeOrganizationSettings` (trim; opcionais vazios → `undefined`; UF para maiúsculas) e `assertValidOrganizationSettings` (nome da organização e cargo clínico obrigatórios; CNPJ, e-mail, UF com 2 letras e CEP com 8 dígitos validados quando presentes).
- `src/domain/access.ts`: `OrganizationSettings` estendido com `legalName?` (razão social), `cnpj?`, `phone?`, `email?` e endereço (`addressStreet/Number/District/City/State/Zip?`) — campos opcionais, **sem bump Dexie** (linha única `current`).
- `src/app/providers.tsx`: `saveSettings` normaliza e valida antes de persistir e sincroniza o estado com o valor normalizado.
- `src/app/AdminWorkspace.tsx` (`SettingsPage`): seções "Dados da empresa" (razão social, CNPJ formatado ao digitar, telefone, e-mail) e "Endereço" (rua, número, bairro, cidade, UF, CEP); erro exibido na UI com `errorMessage`; suporte/limpa o aviso de salvo ao editar.
- `src/app/DashboardWorkspace.tsx`: identificação da empresa (razão social · CNPJ · cidade/UF) no cabeçalho quando preenchida (CA "exibidos na identificação da empresa").
- `src/domain/backup.ts`: bloco `settings` valida tipos dos opcionais e CNPJ (string não vazia precisa ser válida) — risco do card coberto.
- Testes novos: `organization.test.ts` (7: dígitos verificadores, formatação progressiva, normalização, payload completo, nomes em branco, CNPJ/e-mail/UF/CEP inválidos) + backup (+1: campos jurídicos aceitos, CNPJ inválido e e-mail não-string rejeitados, CNPJ em branco aceito). Total: **335/335** (32 arquivos), build 0, tsc 0. Card: F2-01/#23 → DONE.

### `7de46e6` + docs — Entrega ao cliente (F3-19)

- `src/domain/work-order.ts`: `WorkOrder.receivedBy?`/`deliveredNote?`; novo tipo de evento `DELIVERY` ("Entrega registrada", label em `workOrderEventLabels` — backup aceita automaticamente via `Object.hasOwn`); `stageEvent` passou a reconhecer eventos `DELIVERY` para marcar a etapa final no card de progresso.
- `src/domain/work-order-service.ts`: **`WorkOrderDeliveryInput`** `{ receivedBy, note?, pendingCents, acknowledgePending? }` e **`deliver(order, input, author)`** — recebedor obrigatório (trim), transição auditada via `canTransition` até `DELIVERED` (READY/AVISO→cliente), evento `DELIVERY` com "Recebido por …" + observação no note, `receivedBy`/`deliveredNote` persistidos; **guarda de saldo**: `pendingCents` > 0 sem `acknowledgePending` → "Entrega com saldo pendente de R$ X: confirme a ciência para continuar." (`pendingCents` é informado pela UI, apurado no caixa — domínio não consulta cash); saldo negativo/inválido rejeitado.
- UI (`WorkOrdersWorkspace.tsx`): botão genérico "Entregar" removido da lista e do detalhe (fluxo auditado); em `READY`/`AWAITING_PICKUP` o detalhe mostra **"Registrar entrega"** com checklist: "Recebido por" (obrigatório), "Assinatura/observação" (opcional, digitação do nome do recebedor — sem captura de imagem), saldo a receber apurado via `CashRepository.listEntries` (total da venda − RECEIPTs) com checkbox de ciência quando > 0 e resumo no help-text; situação exibe "Recebido por X · observação · data"; entrega sai das pendências do dashboard (`openOrders`).
- `src/domain/backup.ts`: valida `receivedBy` (não vazio se presente) e `deliveredNote` (string).
- Testes novos: `work-order-service.test.ts` +4 (entrega com evento/CA das pendências, recebedor obrigatório, saldo pendente bloqueado sem confirmação, status inválidos/saldo negativo), `backup.test.ts` estendido (os-delivered com evento DELIVERY + receivedBy/deliveredNote inválidos). Total: **327/327** (31 arquivos), build 0, tsc 0. Card: F3-19/#56 → DONE.

### `f92ab0a` + docs — Acompanhamento da fabricação (F3-16)

- `src/domain/work-order.ts`: `workOrderStatuses`/`WorkOrderStatus` fino — `OPEN` → `SENT_TO_LAB` ("Enviada ao laboratório") → `IN_PRODUCTION` → `RETURNED` ("Retornada") → `IN_INSPECTION` ("Em conferência") → `READY` → `AWAITING_PICKUP` ("Cliente avisado") → `DELIVERED` (+ `CANCELLED`); rework `RETURNED`/`IN_INSPECTION` → `IN_PRODUCTION`; atalhos antigos (`OPEN`→`IN_PRODUCTION`, `IN_PRODUCTION`→`READY`, `READY`→`DELIVERED`) mantidos — dados persistidos e fluxos de teste/integração continuam válidos; `READY`/`AWAITING_PICKUP` não cancelam (igual ao antigo `READY`).
- Helpers de progresso: `productionPipeline` (ordem canônica sem o exit cancelado), `stageIndexOf` (−1 para `CANCELLED`) e `stageEvent(order, status)` — responsável/data por etapa derivados do histórico embutido (evento `CREATED` para OPEN, último `STATUS` que atingiu a etapa; rework fica com o carimbo mais novo). **Sem schema novo, sem bump Dexie.**
- UI (`WorkOrdersWorkspace.tsx`): card **"Progresso da fabricação"** no detalhe (etapas com estado atual/concluída/pendente + autor/data), filtros da lista com todos os status (`...workOrderStatuses`), botões de transição para as novas etapas, insumos aceitos em qualquer status pré-entrega; CSS `.work-order-progress`/`.progress-stage` (is-current/is-done).
- `src/domain/backup.ts`: enum de `workOrders.status` com os 9 status.
- Testes novos: `work-order-service.test.ts` +4 (fluxo fino completo, pulos bloqueados, matriz de rework, `stageEvent`/`stageIndexOf` com rework), `backup.test.ts` aceitando `IN_INSPECTION`. Total: **323/323** (31 arquivos), build 0, tsc 0. Card: F3-16/#154 → DONE.

### `3dc784c` + docs — PDV guiado: categoria, tratamentos e medidas (F3-11)

- `src/domain/sales.ts`: `SaleItem.category?` (vem do produto, validada por `assertValidSaleItems` → "Categoria do item inválida."); novo **`SaleTreatment`** `{ name, price }` com `assertValidSaleTreatments` ("Tratamento sem nome." / "Preço do tratamento inválido.") e `treatmentsTotalCents` (soma em centavos); `Sale.treatments?`.
- `src/domain/sales-service.ts`: `buildQuote` valida itens + tratamentos e soma os dois no total (descrição vazia junta nomes de itens e tratamentos); total manual só sem linhas; `createQuote`/`updateQuote` persistem `treatments`; `confirm` revalida preços de tratamentos.
- PDV (`CashWorkspace.tsx`): filtro de categoria (FRAME/LENS/ACCESSORY) no seletor de itens; formulário de tratamentos (nome + preço) com lista de remoção; medidas da receita exibidas em modo leitura quando há prescrição vinculada (importadas do snapshot F3-08); itens exibem categoria; documento de venda com tabela de tratamentos.
- OS (`WorkOrdersWorkspace.tsx`): card "Venda" no detalhe (itens com categoria + tratamentos, copiados, sem redigitação).
- Backup (`backup.ts`): valida `sales.treatments` (nome/preço) e `category` dos itens.
- Testes novos: `sales-service.test.ts` +6 (categoria, tratamentos no total/descrição, validação, baixa de estoque só nos itens, edição de rascunho), `backup.test.ts` estendido (+3 casos). Total: **319/319** (31 arquivos), build 0, tsc 0. Card: F3-11/#50 → DONE.

### `ad8f5be` + docs — DP/DNP e altura de montagem (F3-08)

- `src/domain/clinical.ts`: tipo **`PrescriptionMeasures`** — DP total/longe/perto, altura OD/OE (mm) + `origin` (`MEASURED` medido / `INFORMED` informado, rótulos em `measurementOriginLabels`); `assertValidPrescriptionMeasures` (finitas e positivas; origem válida), `normalizeMeasures` (vazio → `undefined`, prescrições antigas continuam válidas) e `formatPrescriptionMeasures` ("DP total 64.00 mm · … · Medido"); `Prescription.measures`/`PrescriptionInput.measures` e `measuresLine` no `prescriptionDocument`.
- `src/domain/clinical-service.ts`: `issuePrescription`/`retifyPrescription` aceitam e repassam `measures`.
- UI clínica (`ClinicalWorkspace.tsx`): bloco DP total/longe/perto, Altura OD/OE e Origem no formulário de refração; retificação pré-preenche as medidas; linha de medidas na lista de versões e no documento imprimível.
- Handoff até a OS: `SalePrescription.measures` (snapshot + validação em `assertValidSalePrescription`); `WorkOrderDetailPage` ganha cartão "Prescrição" com OD/OE e medidas **sem redigitação** (sem medidas → aviso explícito).
- Testes novos: `prescription.test.ts` +3 (medições impressas, validação, normalização/retificação), `sales-service.test.ts` +1 (snapshot com medidas e rejeição). Total: **312/312** (31 arquivos), build 0, tsc 0. Card: F3-08/#47 → DONE.

### `09e816a` + docs — Impressões e PDFs: PrintLayout compartilhado (F7-13)

- `src/design-system/components.tsx`: componente **`PrintLayout`** (`title`, `meta?`, `brand?` padrão `"Opticore"` — nome e paleta preto/branco ajustáveis —, `actions?`, `children`) com toolbar `.no-print` e botão "Imprimir" (`window.print()`), folha `.print-sheet` com cabeçalho da marca, título e meta.
- `src/styles.css`: classes `.print-layout`/`.print-toolbar`/`.print-sheet`/`.print-brand`/`.print-table`/`.print-total` em preto e branco; `@media print` estendido (esconde toolbar, zera paddings, limpa bordas da folha e do `.card` interno; links em preto).
- Receita: `PrescriptionDocumentPage` envolvida no `PrintLayout` (eyebrow de `settings` e `Card` removidos da página do documento).
- Venda/orçamento: nova **`SaleDocumentPage`** na rota `/vendas/:saleId` (guard `sales.read` em `route-guards.ts`; guarda de loja — venda de outra loja retorna erro); botão "Imprimir" do Caixa virou link para QUOTE e CONFIRMED; popup `window.open` + helper `escapeHtml` removidos.
- OS: `WorkOrderDetailPage` envolvida no `PrintLayout`; Ações, Insumos e Histórico com `.no-print` — na impressão sobram cabeçalho + Situação.
- Matriz de rotas: `permission-routes.test.ts` 20→21 rotas (índice de guards).
- Total: **308/308** (31 arquivos), build 0, tsc 0. Card: F7-13/#128 → DONE. **Teste manual de impressão dos 4 documentos pendente** (CA do card).

### `affd182` + docs — Indicadores de carregamento e erros (F7-11)

- Componente `ErrorState` (`role="alert"`, mensagem + botão "Tentar novamente") em `src/design-system/components.tsx` + classe `.error-state` em `styles.css`.
- `Skeleton` aplicado no carregamento de Estoque (lista), Recepção (agenda e fila de atendimento), Ordens (lista) e Caixa (painel inteiro com loading guard); `EmptyState` nos estados vazios de Estoque, Recepção (agenda e fila) e Ordens; Caixa e fila de atendimento mostram erro com retry via refresh.
- CustomerWorkspace, Dashboard e Clinical já usavam o padrão (Skeleton/EmptyState + retry) e ficaram como referência; a substituição foi incremental nas páginas que ainda usavam `<p role="status">Carregando…</p>`.
- Total: **308/308** (31 arquivos), build 0, tsc 0. Card: F7-11/#126 → DONE. **Teste manual de falha simulada pendente** (CA do card).

### `0e8675a` + docs — Receita óptica imprimível por versão (F3-05)

- `src/domain/clinical.ts`: `formatPrescriptionEye(label, eye)` ("OD: esf -1.25 · cil -0.50 · eixo 90°"; sem campos → "sem grau") e função pura `prescriptionDocument(prescription, patient)` → `PrescriptionDocument` (título "Receita óptica", paciente, profissional, `versionLine` "Versão N [· retificação]", data/hora pt-BR, uso opcional, OD/OE, observações, motivo de retificação; **não muta a prescrição** — CA de imutabilidade).
- `src/domain/repositories.ts`/`local-repositories.ts`: `PrescriptionRepository.get(id, storeId)` + `LocalPrescriptionRepository.get` (guarda de loja — loja errada/ausente → `undefined`, `assertRecordAccess`).
- `src/domain/clinical-service.ts`: `getPrescription(prescriptionId, context)` (autoriza por loja, carrega por id).
- UI: `ClinicalWorkspace.tsx` — botão "Imprimir" por linha da lista de prescrições (link para a página do documento); nova `PrescriptionDocumentPage` na rota `/prescricoes/:prescriptionId` (permissão `clinical.workspace.access` em `route-guards.ts`, entrada em `router.tsx`/`pages.tsx`) com versão visível nas reimpressões (risco do card), botão "Imprimir" (`window.print()`) e `@media print` em `styles.css` (esconde sidebar/topbar/nav).
- Testes novos: `prescription.test.ts` +2 (imutabilidade do documento, versões imprimíveis por versão), `clinical.test.ts` +1 (get por id/loja/permissão), `permission-routes.test.ts` 19→20 — **308/308**, build 0, tsc 0. Dexie sem bump; backup schema 13 inalterado. Card: F3-05/#44 → DONE. **Impressão manual pendente** (CA do card).

### `6f2fe74` + docs — Prescrição estruturada: uso, retificação e venda (F3-06)

- `src/domain/clinical.ts`: `PrescriptionUsage` (`DISTANCE`/`NEAR`/`CONTINUOUS`/`MULTIFOCAL`) com `prescriptionUsageLabels`/`prescriptionUsageKeys`/`assertValidPrescriptionUsage` ("Tipo de uso inválido."); `usage?` opcional em `Prescription`/`PrescriptionInput` (prescrições antigas sem uso continuam válidas); `assertValidPrescriptionEye` exportado.
- `src/domain/clinical-service.ts`: `issuePrescription` aceita `usage`; novo `retifyPrescription(current, input, reason, context)` — autoriza pela loja do atendimento, valida motivo ("Informe o motivo da retificação."), delega ao domínio e grava a próxima versão com `retifies`/`retificationReason` preservando autor/data da original (CA1).
- `src/domain/sales.ts`/`sales-service.ts`: `SalePrescription` (`prescriptionId`, `customerId`, `version`, `usage?`, OD/OE, `notes?`) + `salePrescriptionSnapshot`/`assertValidSalePrescription`; `createQuote` valida snapshot (cliente/versão/uso/eixo) e grava em `Sale.prescription` (CA2 — sem redigitação); `updateQuote` mantém o snapshot se o cliente não mudar, limpa se trocar e substitui se novo; ctor aceita `PrescriptionRepository` opcional e `listCustomerPrescriptions(customerId, storeId)` ("Consulta de prescrições indisponível." sem repositório).
- `src/domain/repositories.ts`/`local-repositories.ts`: `PrescriptionRepository.listByCustomer` (+ `LocalPrescriptionRepository.listByCustomer` com guarda de loja).
- `src/domain/backup.ts`: validação estrutural de `sales.prescription` (versão, uso, graus com eixo 0–180) + FK (prescrição existe, customerId/storeId batem).
- UI: workspace clínica com seletor "Tipo de uso", botão "Retificar" na prescrição ativa (pré-preenche graus, motivo obrigatório, lista mostra uso/motivo/autor/data); caixa com seletor de prescrição do cliente no orçamento e badge "RX v{version} · uso" na linha da venda.
- Testes novos: `prescription.test.ts` +1 (uso), `sales-service.test.ts` +4 (snapshot/validação/update/list), `clinical.test.ts` +2 (retify via serviço + `listByCustomer`), `backup.test.ts` +1 (FK/corrupção) — **305/305**, build 0, tsc 0. Dexie sem bump (campo aditivo); backup schema 13 inalterado. Card: F3-06/#45 → DONE.

### `a30f165` + docs — Tratamento global de erros (F1-12)

- `src/domain/errors.ts`: helper `errorMessage(reason, fallback)` — fonte única para traduzir um erro desconhecido em mensagem exibível (Error com message não-vazia → message; caso contrário → fallback; nunca string vazia); contrato fixado por 4 testes em `errors.test.ts`.
- `src/app/RouteErrorBoundary.tsx`: boundary de rota com Card "Não foi possível exibir esta tela" + "Tentar novamente" (reset) e "Recarregar página", `console.error` no `componentDidCatch`; aplicado no `router.tsx` sobre `AppShell` e as rotas `/login` e `/bloqueado`.
- 24 ternários `X instanceof Error ? X.message : …` unificados em `errorMessage` (11 workspaces + shell); 14 catches de carregamento (caixa, dashboard, estoque, ordens, recepção e clientes) passaram a capturar o motivo (`catch (reason)`) e expor a mensagem real; `failureMessage` local do caixa removido.
- CA: serviços/infraestrutura sem `catch` vazio — `backup.ts`/`backup-codec.ts` rejeitam com mensagem própria, `local-repositories.ts` preserva `reason`; catches deliberados com estado visível documentados (`clinical-draft.ts`, bloqueio de saída clínica, lista de duplicados best-effort, fallback de loja em `providers.tsx`).
- `docs/ai/07_DATA_FLOW.md`: seção "Tratamento de erros" (helper, boundary, padrão loading/error/empty, evidência de CA2 e catches deliberados).
- Validações: build 0, `tsc -b` 0, **297/297**. **Pendência**: teste manual de falha de armazenamento (CA do card: falha simulada de IndexedDB mostra erro recuperável). Card: F1-12/#20 → DONE.

### `e6bae24` + docs — Navegação mobile (F7-05)

- `src/shell/AppShell.tsx`: barra inferior `.mobile-nav` reorganizada — **4 atalhos** (primeiros links visíveis por permissão) + botão **Mais** (só quando há áreas fora dos atalhos); **Mais** abre o `Drawer` do design system ("Mais áreas") com o restante do menu principal e a seção **Administração** (lojas/usuários/perfis/ajustes), que antes sumia no mobile; fecha ao clicar num link, no backdrop ou com Escape.
- `src/styles.css`: `.mobile-more` (aparência de link + destaque `aria-expanded`), `.area-links` (lista do drawer com `active`) e `space-around` na barra nos breakpoints mobile/tablet retrato.
- Perfis com ≤ 4 áreas e sem administração não ganham o botão Mais; filtragem é a mesma do desktop.
- `docs/ai/04_ROUTE_MAP.md`: tabela completa (+ `/login`, `/bloqueado`, `/ordens-servico/:orderId`, `/trocar-senha`) + seção "Navegação mobile".
- Validações: build 0, `tsc -b` 0, **293/293**. **Pendência**: teste manual em 390×844 (testes obrigatórios do card: build + manual mobile). Card: F7-05/#120 → DONE.

### `8c20023` + docs — Prevenção de duplicidades (F2-08)

- `src/domain/customer.ts`: `normalizeSearchText` (remove acentos, caixa e pontuação, colapsa espaços) e `findDuplicateCustomer(customers, input, excludeId?)` — considera duplicidade **CPF idêntico** (dígitos normalizados, com ou sem máscara) **OU** nome+telefone iguais normalizados; campos vazios nunca casam (evita falso positivo em massa); `excludeId` pronto para a edição.
- `CustomerNewPage` (`CustomersWorkspace.tsx`): carrega a base de clientes no mount; no envio, se houver duplicata, **não salva** — mostra aviso (`.notice`, `role="alert"`) com o cadastro encontrado (nome/telefone/CPF) e dois caminhos: "Revisar cadastro" (limpa o aviso) ou "Cadastrar mesmo assim", que abre campo **Motivo** obrigatório antes do envio; editar os campos limpa o aviso e reavalia na próxima tentativa. Sem bloqueio absoluto (escopo).
- 5 testes novos em `customer.test.ts` (normalização, CPF com máscara diferente, nome+telefone, casos sem duplicata, `excludeId`) — **293/293**, build 0, tsc 0. Fora de escopo: mesclagem automática, auditoria (F1-10). Card: F2-08/#30 → DONE.

### `66dc070` + docs — Dashboard por função e estados de painel (F7-03)

- `src/domain/dashboard.ts`: seletores puros novos — `dashboardProfile` (CLINICAL/SALES/CASH/MANAGEMENT por papel), `dashboardMetricKeys` (ordem de métricas por perfil, filtrada por permissão, teto de 4) e `returnsToday` (retornos criados hoje).
- `DashboardWorkspace.tsx`: métricas montadas a partir do seletor (perfil clínico vê **apenas fila/retornos — nenhum valor comercial**; vendedor vendas/OS; caixa sessão primeiro; gestão mantém as 4 atuais); **gráfico de vendas condicionado a `sales.read`** (fecha vazamento de número comercial para o perfil clínico) com `empty-state` quando o período zera; grade sem métricas vira `EmptyState` (estado denied); loading continua em `Skeleton` e erro com retry.
- Atendimento de `retornos` carregado quando `attendance.queue.read` **ou** `clinical.workspace.access`.
- 4 testes novos em `dashboard.test.ts` (mapeamento de perfis, perfil clínico sem métricas comerciais, ordem/teto por papel, retornos de hoje) — **288/288**, build 0, tsc 0. Escopo: "seletores + composição condicional por permissão"; metas/comissões fora de escopo. Card: F7-03/#118 → DONE.

### `c72849f`…`af42ea7` + docs — Separação de páginas por módulo (F1-03, 5 commits)

- Extração incremental de `pages.tsx` (752 → 12 linhas) em um commit por módulo, com `npm.cmd test` + `npm.cmd run build` + `tsc -b` verdes **após cada extração**:
  - `c72849f` `AdminWorkspace.tsx` — `SettingsPage`, `UsersPage`, `StoresPage`, `ProfilesPage` (+ `PermissionsMatrix`, `scopeLabels`, `roleDescriptions`).
  - `fe1bb51` `ReceptionWorkspace.tsx` — `AttendancePage`, `AgendaPage`, `AttendanceNewPage`, `AttendanceDetailPage`, `ClinicalQueuePage` (+ fila `AttendanceQueue` e rótulos de atendimento **exportados** para outros módulos).
  - `df2dcd7` `CustomersWorkspace.tsx` — `CustomersPage`, `CustomerProfilePage`, `CustomerNewPage`, `CustomerEditPage`.
  - `6af6fd8` `CashWorkspace.tsx` — `CashDeskPage` + `CashDeskView`, `escapeHtml`, `cashEntryLabels`/`saleStatusLabels`.
  - `af42ea7` `AuthWorkspace.tsx` — `LoginPage`, `BlockedPage`, `ChangePasswordPage`.
- `pages.tsx` virou barrel: re-exports + `ForbiddenPage` apenas; rotas (`router.tsx`) e permissões inalteradas; cada workspace instancia seus próprios services (padrão já usado por `Clinical/Dashboard/Inventory/WorkOrdersWorkspace`).
- Docs: `09_CHANGE_IMPACT_MAP.md` (tabela página→workspace), `01_PROJECT_MAP`, `02_ARCHITECTURE`, `07_DATA_FLOW`, `10_AI_WORKFLOW` e 8 módulos em `docs/ai/modules/` realocados. Total: **284/284**, build 0, tsc 0. Card: F1-03/#11 → DONE.

### `887b64b` + docs — Identificadores de organização (F1-05)

- `src/domain/access.ts`: tipo `Organization` + constante `defaultOrganization` (`org-local` / "Opticore Demo"); `organizationId?` adicionado a `Store` e `User`.
- `organizationId?` também em `Customer`, `Attendance`, `AgendaEvent`, `Sale`, `WorkOrder`, `InventoryItem`, `InventoryMovement`, `CashSession`, `CashEntry`, `ClinicalRecord` (e `ClinicalVersion` por extensão) e `Prescription`.
- Carimbo nos criadores: administração (loja/usuário), recepção (cliente/atendimento), agenda, vendas (orçamento), caixa (sessão/entrada/movimento), estoque (item/movimentos), OS (criação e insumos), prescrição (`issuePrescription`), movimentos de venda/estorno e seeds (lojas/usuários) + `LocalClinicalRepository.write` para registros montados na UI.
- `database.ts`: **Dexie v14** com `upgrade` que preenche `organizationId` em 14 tabelas via `toCollection().modify` (sem perda, registros antigos preservados).
- `backup.ts`: `validateBackup` rejeita `organizationId` presente e não-string/não-vazio; arquivos legados sem o campo seguem válidos; snapshot/restore preservam o campo por serem `toArray()` completos.
- Testes: `database.test.ts` +1 (backfill v14 com dados legados) e `backup.test.ts` +1 (roundtrip do campo + rejeições), asserções de semente/novos registros. Total: **284/284** (30 arquivos), build 0, tsc 0. Card: F1-05/#13 → DONE.

### `2d5a655` + docs — Design system consolidado (F7-01)

- `src/design-system/components.tsx`: 12 primitivas novas além de `Button`/`Input`/`Card` — `Select` (label+select), `Badge` (tons neutral/success/warning/danger), `Tabs` (tablist acessível), `Table` (wrapper semântico), `Dialog` e `Drawer` (modais `aria-modal` com Escape/clique-fora/×), `Toast` (flutuante dispensável, `role=status|alert`), `Tooltip` (hover+foco com `aria-describedby`), `Search` (`input type="search"`), `EmptyState`, `Skeleton` (aria-busy, `prefers-reduced-motion`), `PageHeader` (eyebrow/title/intro/actions).
- `src/styles.css`: seção global nova (`.select`, `.tabs`, `.data-table`, `.dialog*`, `.drawer*`, `.toast`, `.tooltip`, `.search-field`, `.skeleton` + shimmer, `.badge.is-success`, estados de foco/erro `aria-invalid`).
- Uso real em ≥1 tela por componente: clientes (PageHeader/Search/EmptyState/Skeleton), usuários (PageHeader/Table/Badge/Select), lojas (Badge), caixa (Tabs/Toast/Tooltip/Dialog), estoque (Select/Drawer), dashboard (Skeleton).
- Documentação: `05_DESIGN_SYSTEM_MAP.md` (seções por componente + "Estados documentados"), `08_SHARED_COMPONENTS.md`, `01_PROJECT_MAP.md`.
- Total: **282/282** (30 arquivos), build 0, tsc 0. Card: F7-01/#116 → DONE.

### `de67cc3` + docs — Testes de integração ponta a ponta (F8-02)

- `src/infrastructure/storage/integration-flows.test.ts` (novo): 4 fluxos multi-entidade sobre IndexedDB em memória — **venda→pagamento→caixa→fechamento→OS→entrega** (PIX com referência, `PAID`, laboratório, trilha de eventos e fechamento conciliado), **cancelamento de venda paga→estoque+estorno** (IN no estoque, `REFUND`, saldo esperado), **insumos de OS→estoque→entrega** (movimentos `OUT` com autor e guarda de transição) e **pagamento fracionado** (PARTIAL→PAID, rejeição de excesso/já recebida).
- Suíte completa em < 10 s (arquivo ~0,1 s); `database.delete()` em `afterEach`; sem duplicação dos testes unitários de cada serviço.
- Estratégia de camadas de teste (unit × storage × fluxos integrados × backup × segurança) documentada em `docs/ai/10_AI_WORKFLOW.md`.
- Total: **282/282** (30 arquivos), build 0, tsc 0. Card: F8-02/#136 → DONE (≥3 fluxos integrados cobertos).

### `c8dec75` + docs — Recuperação de dados: motivos de recusa e restauração protegida (F8-10)

- `src/domain/backup.ts`: `validateBackup` explica o motivo de cada recusa (`invalidReason`): formato que não é backup do Opticore, versão de arquivo, schema não suportado, data de criação, estrutura de tabelas e tabelas ausentes — todos com "Nenhum dado foi substituído"; checagens de schema 10–13 ganham mensagens próprias.
- `src/domain/backup.ts` (`BackupService.inspect`): conteúdo decifrado que não for JSON válido vira "Backup inválido: o conteúdo decifrado não é um arquivo válido" em vez de `SyntaxError` cru; erros de senha/integridade do codec continuam passando com a mensagem original.
- `src/app/BackupPanel.tsx`: texto corrigido (anexos e prescrições agora incluídos no backup), prévia com contagem de prescrições/anexos e aviso explícito de que falha no meio da importação não altera a base (rollback em transação única).
- Testes (`backup.test.ts` +2): arquivo inválido rejeitado com motivo sem tocar na base (senha, formato, JSON corrompido, schema 999, tabela faltante) e restauração falhada preserva os dados originais (eixo 181 e registro não serializável rejeitados); **278/278** (29 arquivos), build 0, tsc 0.
- Card: F8-10/#144 → DONE (fluxo exportar → conferir → prévia → restaurar com rollback; arquivo inválido rejeitado com motivo).

### `c2f0c27` + docs — Refração estruturada OD/OE com persistência e backup (F3-07)

- `src/domain/clinical-service.ts`: `ClinicalService` ganha `PrescriptionRepository` no construtor + `issuePrescription` (monta `PrescriptionInput` com `attendanceId`/`storeId` do contexto, autora = `session.userName`, domínio valida eixo 0–180/graus) e `listPrescriptions` (guarda de `clinical.workspace.access`).
- `src/infrastructure/storage/local-repositories.ts`: `LocalPrescriptionRepository` (`listByAttendance` com guarda de loja pelo atendimento; `save` append-only com `assertStoreAccess`/`assertRecordAccess`).
- `src/infrastructure/storage/database.ts`: Dexie **v13** com tabela `prescriptions` (`id, attendanceId, customerId, storeId, issuedAt`).
- `src/domain/backup.ts` + `local-backup.ts`: `prescriptions` em `backupTables`, `schema: 13` (schemas 10–12 importam com a tabela vazia), validação de `od`/`oe` (objetos, graus finitos, eixo 0–180), `version` ≥ 1 e links para atendimento/cliente/loja.
- `src/app/ClinicalWorkspace.tsx`: seção "Refração (OD/OE)" com inputs esf/cil/eixo/ad por olho + observações, erros do domínio exibidos, lista de prescrições com marcação da ativa (`activePrescription`) e autora/data.
- Testes: `clinical.test.ts` +3 (emissão/persistência após reopen, eixo inválido/NaN/vazio rejeitados sem gravar, isolamento por loja), `backup.test.ts` +1 (schema 13, eixo/versão/autor/link inválidos, retificação aceita, `od` ausente rejeitado) e ajuste de `database.test.ts` (verno 13); **276/276** (29 arquivos), build 0, tsc 0.
- Card: F3-07/#46 → DONE (critérios: eixo inválido rejeitado; OD/OE preenchidos e persistem; testes de faixa; cálculo automático e decisões de tratamento fora do escopo; regras em `OPTICAL_BUSINESS_RULES.md`).

### `1f17aeb` + docs — Códigos únicos, margem e preço padrão no caixa (F2-14)

- `src/domain/inventory.ts`: helper puro `marginCents(defaultPrice, cost)` → margem em centavos (`toCents`, sem drift; `undefined` se algum valor não for finito).
- `src/domain/inventory-service.ts`: `create`/`update` exigem `code` não vazio ("Informe o código do produto.") e únicos por loja via `listByStore` ("Código já cadastrado nesta loja."; trim + comparação sem distinção de maiúsculas; na edição o próprio `id` é excluído). Itens legados sem código continuam válidos até serem editados.
- `src/app/InventoryWorkspace.tsx`: campo Código obrigatório (placeholder "Barras ou interno"); custo e margem na lista só com `inventory.manage` (vendedor/AUDITOR não veem — risco do card).
- `src/app/pages.tsx` (`CashDeskPage`): selecionar produto no seletor de itens pré-preenche o preço unitário com `defaultPrice` (continua editável).
- Testes: `inventory-service.test.ts` +5 (código obrigatório/branco, duplicidade sem distinção de maiúsculas em create/update, próprio código na edição, margem com roundings `0.1+0.2`/negativa/NaN), storage `inventory.test.ts` e `sale-stock.test.ts` com códigos nos seeds; **272/272** (29 arquivos), build 0, tsc 0.
- Card: F2-14/#35 → DONE (critérios: código duplicado rejeitado; preço padrão pré-preenche item da venda; custo exibido só com permissão; tabelas múltiplas e histórico de preço fora do escopo).

### `a536bb0` + docs — Troco em dinheiro e referência PIX no caixa (F4-11)

- `src/domain/cash.ts`: helper puro `receiptPlan(received, pending)` → `{ appliedCents, changeCents }` (centavos via `toCents`, `applied = min(recebido, pendente)`, troco `max(0, excedente)` sem drift de arredondamento).
- `src/domain/cash-service.ts`: `CashService.receive` ganha `reference?: string` opcional — trim vazio vira `undefined`; preenchido fora de PIX rejeita com "Referência de pagamento é válida apenas para PIX."; valor aceito é gravado em `CashEntry.reason` (exibido em "Movimentos registrados").
- `src/app/pages.tsx` (`CashDeskPage`): em dinheiro, preview de troco em tempo real ao digitar o valor e mensagem "Recebimento registrado. Troco: R$ X."; em PIX, input "Referência PIX (opcional)" por venda; a UI envia sempre o valor **aplicado** (`receiptPlan`) — `recordReceipt` continua autoridade contra `paid + amount > total`; totais por forma seguem em `.method-totals`.
- Testes: `cash-service.test.ts` +2 (`receiptPlan` com roundings `100.10-80.05`, `0.1+0.2`, `0.3/0.1` e casos de igual/menor; reference PIX grava `reason` trimmado, `CASH` sem reference não grava, `CASH`/`DEBIT` com reference rejeitam); **268/268** (29 arquivos), build 0, tsc 0.
- Card: F4-11/#68 → DONE (critérios: troco correto com precisão de centavos e mensagem exibida; referência PIX opcional exibida nos movimentos; regras documentadas em `docs/product/OPTICAL_BUSINESS_RULES.md`; PIX automático/parcelamento fora do escopo).

### `3820338` + docs — Ciclo de vida completo do orçamento: estados, edição, filtro e impressão (F3-10)

- `src/domain/sales.ts`: `QuoteStatus` (`DRAFT`/`SENT`/`ACCEPTED`/`REJECTED`/`EXPIRED`) em `Sale.quoteStatus?` (ausente = rascunho, compatível com dados legados), `quoteStatusLabels`, `quoteTransitions` (rascunho → enviado → aceito/recusado/expirado; aceito/recusado/expirado terminais) e `quoteStatusOf`; `Sale.status` permanece `QUOTE` — confirmação/cancelamento/backup validados da Fase E intactos.
- `src/domain/sales-service.ts`: `buildQuote` compartilhado entre `createQuote` e o novo `updateQuote` (edita só rascunho, revalida itens/total/descrição e preserva `id`/`createdAt`), `transitionQuote` (guarda por `quoteTransitions` com mensagem clara) e `confirm` agora bloqueia recusado/expirado ("Orçamento recusado ou expirado não pode ser confirmado.") sem mudar o fluxo de rascunho/enviado/aceito.
- `src/domain/backup.ts`: valida `quoteStatus` conhecido em `sales` (ausente continua válido para backups legados).
- `src/app/pages.tsx` (`CashDeskPage`): filtros `.status-filters` Todos/Orçamentos/Vendas/Canceladas com contagem; badge de estado do orçamento na linha; ações por estado (Enviar/Editar em rascunho, Aceitar/Recusar/Expirar em enviado) condicionadas a `sales.manage`; "Editar" carrega o formulário do topo (botão vira "Salvar rascunho" com "Cancelar edição"); "Imprimir" abre janela nova com cabeçalho, cliente, itens e total — todos os campos com escape HTML.
- Testes: `sales-service.test.ts` +6 (transições, guardas, confirmação bloqueada, edição de rascunho), `backup.test.ts` +1 (`quoteStatus` aceito/rejeitado/legado), novo `quote-recovery.test.ts` (orçamento de 3 dias reaberto conserva itens/preços/estado); **266/266** (29 arquivos), build 0, tsc 0.
- Card: F3-10/#49 → DONE (critérios: recuperação de orçamento após dias com itens/preços; estados com transições testadas; impressão e edição entregues; envio WhatsApp/e-mail segue fora do escopo).

### `5868e80` + docs — Validação de CPF/CNPJ com dígitos verificadores (F2-07)

- `src/domain/customer.ts`: helpers puros `normalizeDocument` (remove máscara `.`/`-`/`/` e espaços), `isValidCPF`/`isValidCNPJ` (dígitos verificadores oficiais, rejeita sequências repetidas como `111.111.111-11` e letras) e `isValidDocument` (roteia por contagem: 11 dígitos → CPF, 14 → CNPJ).
- `src/domain/reception-service.ts`: `createCustomer` e `updateCustomer` validam `cpf` opcional após o trim e rejeitam com "CPF ou CNPJ inválido." antes de salvar; documento continua opcional (fora do escopo bloquear cadastro sem documento).
- `src/app/pages.tsx`: `CustomerNewPage` exibe a mensagem vinda do domínio no catch (antes genérica), rótulo do campo vira "CPF/CNPJ" na criação e na edição.
- Testes: `customer.test.ts` +3 (válidos com/sem máscara — `111.444.777-35`, `529.982.247-25`, CNPJs `11.222.333/0001-81` e `00.000.000/0001-91`; inválidos — repetidos, dígito errado, tamanho errado, letra; roteamento por dígitos), `reception-service.test.ts` +2 (rejeição em create/update sem save, aceitação com máscara preservando o valor digitado), fixture de `clinical.test.ts` corrigido para CPF válido; **258/258** (28 arquivos), build 0, tsc 0.
- Card: F2-07/#29 → DONE (critérios: conhecidos inválidos rejeitados/válidos aceitos; testes unitários dos helpers; aceita com/sem máscara).

### `c45a6bf` + docs — Fila de atendimento completa com filtros, espera e transições (F3-03)

- `src/domain/customer.ts`: `AttendanceStatus` + `NO_SHOW` ("Faltou", só nasce de `WAITING` e é estado fechado); `attendanceTransitions.WAITING` = `IN_PROGRESS`/`CANCELLED`/`NO_SHOW`; novos `activeQueueStatuses`/`isActiveQueueStatus` (fila ativa = `WAITING`+`IN_PROGRESS`) e `waitingMinutes(atendimento, now)` (minutos inteiros de espera apenas para `WAITING`; inválida/futura → 0).
- `src/domain/dashboard.ts`: `waitingQueue` passa a usar `isActiveQueueStatus` — fonte única da fila ativa (comportamento idêntico; agora `NO_SHOW`/`CANCELLED` garantidos fora).
- `src/app/pages.tsx` (`AttendanceQueue`): chips `.status-filters` Todos/Aguardando/Em atendimento com contagem; linha exibe tipo, status, responsável (profissional ou "Sem responsável"), espera formatada ("menos de 1 min"/"12 min"/"1h 5min") com relógio de 30s e badge "Urgente"; ações por permissão (`attendance.create`): Iniciar, Faltou, Finalizar, Cancelar + link "Ver detalhe" — estado final sai da fila na hora; perfil clínico continua linkando o prontuário.
- `src/domain/backup.ts`: enum de status de attendance aceita `NO_SHOW`.
- Testes: novo `src/domain/customer.test.ts` (4 casos: membros da fila, cálculo de espera, timestamps inválidos, guarda de transições), `reception-service.test.ts` +1 (falta fecha o atendimento e o estado é imutável), `dashboard.test.ts` estendido (CANCELLED/NO_SHOW fora da fila), `backup.test.ts` (+NO_SHOW válido, status desconhecido inválido); **252/252** (28 arquivos), build 0, tsc 0.
- Card: F3-03/#42 → DONE (critérios: transições testadas e estado final sai da fila; tempo de espera calculado por registro).

### `8daab89` + docs — Cadastro completo de atendimento com detalhe e transições (F3-02)

- `src/domain/customer.ts`: `Attendance` + `professionalId?`/`priority?` (`NORMAL`/`URGENT`, padrão `NORMAL` em novo registro), `AttendancePriority`, `isAttendancePriority` e `attendanceTransitions` (DRAFT→WAITING/CANCELLED, WAITING→IN_PROGRESS/CANCELLED, IN_PROGRESS→FINISHED/CANCELLED; fechados não reabrem).
- `src/domain/reception-service.ts`: `startAttendance` ganhou `options { professionalId, priority }` (trim + defaults), novos `getAttendance` e `transitionAttendance` (erro "Atendimento não encontrado." / "Status atual não permite esta transição.").
- `src/domain/repositories.ts` + `local-repositories.ts`: `AttendanceRepository.get(id)` com escopo de loja (`canAccessRecordSafe` → indefinido fora do acesso).
- `src/app/router.tsx` + `route-guards.ts`: rotas `/atendimentos/novo` (`attendance.create`) e `/atendimentos/:attendanceId` (`attendance.read`) na fonte única — matriz de guards 17→19.
- `src/app/pages.tsx`: `AttendanceNewPage` (cliente/tipo/profissional/prioridade/observações → navega para o detalhe; aceita `?customer=`), `AttendanceDetailPage` (dados completos + botões Iniciar/Finalizar/Cancelar condicionados a `attendance.create`), fila com botão "Novo atendimento", linhas da fila linkam ao detalhe (não clínicos) com badge "Urgente", histórico do cliente com link "Ver detalhe".
- `src/domain/agenda-service.ts`: conversão de evento agenda→atendimento herda `professionalId` do evento.
- `src/domain/backup.ts`: validação de `priority` (`NORMAL`/`URGENT` quando presente; legado sem o campo continua válido).
- Testes: `reception-service.test.ts` +5 (registro completo, lookup, transições válidas/inválidas), `permission-routes.test.ts` 19 rotas + `attendance.create` na matriz dos 4 perfis criadores, `database.test.ts` persiste tipo/notas/profissional/prioridade após reopen, `backup.test.ts` +1 (prioridade válida/inválida/legada), `agenda-service.test.ts` espera o profissional na conversão; **247/247** (27 arquivos), build 0, tsc 0.
- Card: F3-02/#41 → DONE (critérios: detalhe acessível por URL direta; tipo/nota persistem após reload).

### `c4e4e31` + docs — CRUD de lojas com inativação não destrutiva (F2-02)

- `src/domain/administration-service.ts`: `StoreInput` + `createStore`/`updateStore`/`setStoreActive` — nome obrigatório e único (case-insensitive), inativação exige ao menos uma loja ativa, **bloqueia a loja atual** (troque antes) e só altera `active` (nada é apagado); status igual é no-op.
- `src/app/providers.tsx`: contexto ganha `createStore`/`updateStore`/`setStoreActive` + `refreshStores` (seletor do topo atualiza na hora); fallback do provider também exige loja atual `active` (defesa do seletor).
- `src/app/pages.tsx`: `StoresPage` — listagem com badge Ativa/Inativa, criar/renomear (form `settings-form`), botão Inativar/Reativar desabilitado na loja atual.
- `src/app/router.tsx` + `route-guards.ts` + `AppShell.tsx`: rota `/admin/lojas` na single source com `stores.manage` (OWNER/NETWORK_ADMINISTRATOR) e entrada "Lojas" no menu de administração.
- Testes: `administration-service.test.ts` +7 (criação/edição/inativação/no-op e regras), novo `storage/administration.test.ts` (3 casos: filial persiste após reopen, inativação preserva o registro + `selectStore` recusa, renomear mantém o mesmo registro), `permission-routes.test.ts` 16→17 rotas + matriz atualizada; **241/241** (27 arquivos), build 0, tsc 0.
- Card: F2-02/#24 → DONE (critérios: filial nova aparece no seletor após reload; inativa some do seletor sem apagar dados).

### `e3bd607` + docs — Catálogo de produtos por categoria (F2-11)

- `src/domain/inventory.ts`: `productCategories`/`ProductCategory` (`FRAME`/`LENS`/`ACCESSORY`), `productCategoryLabels`, `isProductCategory`, `filterByCategory` e campos de ficha em `InventoryItem` (`category?`, `brand?`, `material?`, `description?`).
- `src/domain/inventory-service.ts`: `create`/`update` **exigem** categoria válida e normalizam marca/material/descrição (trim; vazio → `undefined`); saldo continua intocado na edição.
- `src/app/InventoryWorkspace.tsx`: select de categoria no formulário, ficha (marca/material/descrição), filtro em abas com contagem por categoria (reusa `status-filters`), badge da categoria e ficha na linha do produto.
- `src/app/pages.tsx`: seletor de produto do caixa mostra a categoria (`Lente · saldo 5`); baixa de estoque continua sobre o mesmo item do catálogo.
- `src/domain/backup.ts`: `category` validada por `isProductCategory`; `brand`/`material`/`description` aceitas como strings opcionais (item legado sem categoria segue importável — sem bump de schema, campos sem índice).
- Testes: `inventory-service.test.ts` +5 (categoria obrigatória, ficha normalizada, filtro por categoria, cópia em `ALL`), `inventory.test.ts` +1 (ficha persiste no reopen), `backup.test.ts` estendido (categoria/marca inválidas rejeitadas, legado sem categoria aceito), `sale-stock.test.ts` reforçado (produto do catálogo vendido mantém categoria/marca após a baixa); **231/231** (26 arquivos), build 0, tsc 0.
- Card: F2-11/#32 → DONE (cadeia F2-14/F2-15/F6-04 liberada).

### `e6e525d` + docs — Prazos e alertas de OS (F3-17)

- `src/domain/dashboard.ts`: novo `isOverdueOrder(order, now)` (prazo no passado + status aberto, datas inválidas ignoradas) como fonte única; `overdueOrders` passa a delegar para ele.
- `src/app/WorkOrdersWorkspace.tsx`: filtro `ATRASADAS` na barra de status (contagem com o mesmo seletor do dashboard), badge "Atrasada" (`.badge.is-out`) nas linhas e na página de detalhe; lógica local `isOverdue` removida (lista, detalhe e dashboard agora compartilham o seletor → contagem coerente).
- Testes: `dashboard.test.ts` +1 caso (`isOverdueOrder`: vencida, futuro, igual ao agora, sem prazo, data inválida, entregue/cancelada); **225/225** (26 arquivos), build 0, tsc 0.
- Card: F3-17/#55 → DONE (destaque + filtro + contagem; notificação push fica em F7 notificações).

### `41f0bfd` + docs — Modelos de prescrição e laboratório da OS (F1-07)

- `src/domain/clinical.ts`: modelo `Prescription` (append-only) + `PrescriptionEye` (`sphere`/`cylinder`/`axis`/`add`); `issuePrescription` valida autor, ids, data, eixo 0–180 e exige ao menos um grau ou observação; `retifyPrescription(current, input, reason, author)` cria a próxima versão (`version + 1`, `retifies`, `retificationReason`) **sem reescrever o original**; `activePrescription(list)` resolve a vigente.
- `src/domain/repositories.ts`: contrato `PrescriptionRepository` (`listByAttendance`, `save`) — implementação local/persistência vêm com F3-06.
- `src/domain/work-order.ts`: campo `laboratory?` em `WorkOrder` e novo evento `LABORATORY` ("Laboratório informado"); `WorkOrderService.setLaboratory` (valida autor, bloqueia entregue/cancelada, registra evento auditado).
- Testes: `prescription.test.ts` (5 casos: emissão/validação, retificação imutável, cadeia de versões) e `work-order-service.test.ts` +1 describe (2 casos de laboratório); **224/224** (26 arquivos), build 0, tsc 0.
- Card: F1-07/#15 → DONE; desbloqueia F3-07/F3-06 (cadeia de prescrição estruturada).

### `277fdde` + docs — Auditoria de segurança (F8-07)

- `docs/architecture/SECURITY_PLAN.md`: threat model curto (login, TTL, backup AES-GCM/PBKDF2, escopo de loja/registro, erros globais, XSS, PWA), varredura de segredos, tabela de testes negativos existentes e achados P0–P3 (único P0 aberto: F1-12/#20 tratamento global de erros; P2: rate-limit de login e IndexedDB sem criptografia própria — aceitos no modelo offline-first; P3: autorização só no frontend, sessão sem binding de dispositivo, sem auto-lock por inatividade). Preserva as seções F1-11/F7-02 e regras permanentes.
- Novo `src/domain/security-scan.test.ts`: varredura automatizada de padrões de credenciais (chaves privadas, AWS, Stripe, GitHub, Slack, GitLab, Google, URLs com senhas) em todo o `src/` via `import.meta.glob`; roda a cada `npm.cmd test`.
- Evidência: `npm.cmd test` **217/217** (25 arquivos), build 0, tsc 0; varredura manual complementar sem achados.
- Card: F8-07/#141 → DONE (relatório com achados e status publicado; libera fila para F1-07/F3-17/F2-11).

### `94b9d50` — feat: route guard matrix tests and shared route permission map (F8-06 testes de permissões)

- Novo `src/app/route-guards.ts`: mapa único rota→permissão (16 rotas guardadas, incluindo `/agenda`); `router.tsx` agora gera as rotas protegidas a partir desse mapa (elimina divergência entre router e testes).
- Novo `src/domain/permission-routes.test.ts` (7 casos): matriz rota×perfil para os dez perfis (OWNER completo, NET_ADMIN sem clínico, RECEPÇÃO sem caixa/estoque/admin, CLÍNICO sem caixa/vendas/admin, VENDEDOR sem caixa/gerenciamento/clínico, CAIXA sem vendas/gerenciamento/clínico, ESTOQUE isolado, FINANCEIRO/AUDITOR leitura); negativos de ação de vendedor/clínico/caixa; escopo de loja/registro para os dez perfis via `buildAccessContext`.
- Documentação: `docs/ai/06_PERMISSION_MAP.md` com a seção de testes e a referência ao mapa único.
- Evidência: `npm.cmd test` **215/215** (24 arquivos), build 0, tsc 0.
- Card: F8-06/#140 → DONE (rota, ação e registro cobertos para os dez perfis; negativos automatizados; libera F8-07).

### `679951f` — feat: agenda day/week views with event to attendance conversion (F3-01 agenda e recepção)

- Novo domínio `src/domain/agenda.ts`: `AgendaEvent` (loja, cliente, profissional opcional, tipo consulta/retorno/entrega/ajuste/cobrança, status, `startsAt` ISO, observações, vínculo `attendanceId`), labels e helpers `dayRange`/`weekRange` em hora local (semana começa na segunda).
- `AgendaService`: `createEvent` (valida loja/cliente/data, normaliza opcionais), `listDay`/`listWeek`, `convertToAttendance` (só `SCHEDULED`; tipos consulta/retorno/ajuste reutilizam o `customerId` e criam atendimento `WAITING` na fila via `ReceptionService` sem redigitar cliente; entrega/cobrança não convertem) e `cancel`.
- Persistência: `AgendaRepository`/`LocalAgendaRepository` com filtro por loja+range, guards de acesso; Dexie **v12** (`agendaEvents: id, storeId, professionalId, status, startsAt`).
- Backup: schema **12** com `agendaEvents` (validação de status/tipo, vínculos cliente/loja/attendance); schemas 10 e 11 continuam importáveis (tabela defaulta a `[]`).
- UI: rota `/agenda` (`attendance.read`) com `AgendaPage` — navegação dia/semana (anterior/próximo/hoje), formulário de novo evento (`attendance.create`), conversão (navega para `/atendimentos?customer=<id>`) e cancelamento; link "Agenda" no menu lateral.
- Evidência: `npm.cmd test` **208/208** (23 arquivos; `agenda-service.test.ts` 7 casos, `agenda.test.ts` 3 casos, ajustes em `database.test.ts`/`backup.test.ts`), build 0, tsc 0.
- Card: F3-01/#40 → DONE (evento no dia correto após reload, conversão sem redigitar cliente, rotas documentadas; libera fila de agenda).

### `00d0d9e` — feat: customer edit page with contact fields and durable update (F2-06 edição de clientes)

- `ReceptionService.updateCustomer(customerId, input)`: carrega o cliente existente ("Cliente não encontrado."), valida nome (trim), normaliza telefone/CPF/e-mail/nascimento (string vazia vira `undefined`) e persiste via `save` preservando `id`/`createdAt`.
- Nova rota `/clientes/:customerId/editar` (`customers.manage`) com `CustomerEditPage`: formulário pré-preenchido (nome, telefone, CPF, e-mail, nascimento), validação de nome, navegação de volta ao perfil, botão Cancelar.
- Perfil do cliente ganha botão "Editar cadastro" (secondary) para `customers.manage` e exibe e-mail/nascimento no resumo (quando presentes).
- Criação também normaliza e-mail/nascimento quando enviados; campos opcionais sem índice → sem bump de schema.
- CSS: `.page-title-actions` e `.button.secondary`.
- Evidência: `npm.cmd test` **198/198** (21 arquivos; `reception-service.test.ts` +2 validação/normalização, `clinical.test.ts` +1 durabilidade após reload), build 0, tsc 0.
- Card: F2-06/#28 → DONE (editar nome/contatos, reload preserva, perfil reflete, rota documentada no route map; libera F2-07 validação de CPF).

### `60e2ca4` — feat: partial payments with PARTIAL status and amount input (F4-12 pagamentos parciais)

- `SalePaymentStatus` ganha `PARTIAL` (`PENDING`/`PARTIAL`/`PAID`); `LocalSaleRepository.recordReceipt` grava `PARTIAL` quando a soma dos RECEIPTs ainda não cobre o total e `PAID` quando cobre (validação `paid + amount > total` já existente na transação permanece a autoridade).
- UI `/caixa` aba Recebimentos: input de valor por venda pendente (placeholder = saldo pendente; vazio = recebe o total); mensagem "Recebimento parcial registrado." quando o valor é menor que o pendente; badge "Pagamento parcial registrado" na linha da venda e "Parcial" na lista de vendas; venda cancelada parcialmente paga agora também informa estorno no caixa.
- Backup aceita `PARTIAL` em `paymentStatus` (valores desconhecidos continuam rejeitados).
- Sem bump de schema (`paymentStatus` é campo existente).
- Evidência: `npm.cmd test` **195/195** (21 arquivos; `cash.test.ts` +1 durabilidade/reload + expectativas PENDING→PARTIAL, backup aceita PARTIAL), build 0, tsc 0.
- Card: F4-12/#69 → DONE (saldo pendente correto após reload; status `PARTIAL`; juros/atraso fora de escopo — F4-13 BLOCKED por decisão P4).

### `9f0fdfc` — feat: sale cancellation with stock and cash refund (F4-18 estornos e cancelamentos)

- `Sale` ganha `cancelReason?`/`cancelledAt?`/`cancelledBy?` (opcionais, sem bump de schema); `CashEntryType` inclui `REFUND` (excluído de `CashMovementType`); `CashTotals` ganha `refunds` (reduz o saldo esperado).
- `SalesService.cancel(sale, reason, author?)`: motivo obrigatório (trim), venda já cancelada rejeitada; cotação cancela via `save` (sem estoque/caixa); confirmada cancela via `SaleRepository.cancel(sale, movements)` com movimentos `IN` (`refundStockMovementsFor`, reason `Estorno: <descrição>`).
- `LocalSaleRepository.cancel`: transação `rw [sales, inventoryItems, inventoryMovements, cashEntries, cashSessions]` — recheca status dentro da transação (concorrência: 1 ok / 1 rejeitado), aplica `IN` via `applyStockMovement`, grava venda CANCELLED com auditoria; se houve recebimento exige caixa aberto ("Abra o caixa antes de registrar o estorno.") e cria `CashEntry.REFUND` (valor = soma dos RECEIPTs, motivo/autor da venda, método copiado apenas quando há um único método).
- UI `/caixa` aba Vendas: botão "Cancelar" + form `.cancel-sale-form` com motivo (`sales.manage`); exibe motivo em vendas canceladas; aba Sessão mostra "Estornos" quando maior que zero; `cashEntryLabels.REFUND = "Estorno"`.
- Backup: valida `REFUND` no enum de `cashEntries` e campos de cancelamento de `sale` (motivo não vazio, data válida, autor string).
- Evidência: `npm.cmd test` **194/194** (21 arquivos; `sales-service.test.ts` +4, `sale-stock.test.ts` +5, `cash.test.ts` +1, `backup.test.ts` +1), build 0, tsc 0.
- Card: F4-18/#75 → DONE (devolve estoque/dinheiro com rastro; fecha risco P1 da auditoria; libera F6-15).

### `7f1d6e4` — feat: require payment method on receipts and sum totals by method (F4-10 formas de pagamento)

- `PaymentMethod` ganha `DEBIT`/`CREDIT` (rótulos Débito/Crédito); `CARD` permanece válido apenas como legado — novos recebimentos só oferecem `paymentMethodOptions` (`CASH`/`PIX`/`DEBIT`/`CREDIT`).
- `CashService.receive` exige a forma ("Informe a forma de pagamento." sem método; inválidos continuam rejeitados por `assertValidPaymentMethod`); UI do select por venda pendente já enviava o método (padrão Dinheiro).
- `cashTotals` expõe `byMethod: Record<PaymentMethod, number>` (recebimentos somados por forma em centavos; entradas legadas sem método contadas como Dinheiro); aba Sessão exibe o detalhamento por forma ao lado dos totais gerais.
- Sem bump de schema (`paymentMethod` continua opcional no storage e no backup — "registro antigo aceito (default)"); carnê (F4-13) e misto (F4-12) permanecem com seus cards.
- Evidência: `npm.cmd test` **183/183** (21 arquivos; `cash-service.test.ts` +2 de totais/exigência, chamadas do storage ajustadas com forma), build 0, tsc 0.
- Card: F4-10/#67 → DONE (fechamento soma por forma; libera F4-12 parciais sobre formas já registradas).

### `1b3f757` — feat: enforce store-scoped permissions with live role sync and profile matrix (F2-05 permissões por loja)

- `allPermissions` (lista canônica das 21 permissions) e `syncSessionRole` em `access.ts`: a sessão espelha a role mais recente do usuário sem reload.
- `AppProviders`: `refreshUsers` reconcilia e persiste `LocalSession.role` (`sessionRepository.save`); efeito de fallback move a loja atual para a primeira loja ativa acessível quando `user.storeIds` deixa de cobri-la (persistido via `selectStore`).
- `/admin/perfis` ganha matriz permissão × perfil (`PermissionsMatrix`, leitura) com escopo por role; roles customizáveis continuam fora de escopo.
- Testes negativos por perfil: `access.test.ts` (integridade da matriz — OWNER com todas, toda role ⊆ `allPermissions`, FINANCE/AUDITOR read-only — e `syncSessionRole`) + `storage/access-scope.test.ts` (caixa e estoque negados fora das lojas do perfil via `assertStoreAccess`).
- Evidência: `npm.cmd test` **182/182** (21 arquivos; `access.test.ts` +6, `storage/access-scope.test.ts` +1), build 0, tsc 0.
- Card: F2-05/#27 → DONE (critérios: usuário da loja A não opera na loja B; mudança de permissão reflete em menu/rota sem reload; libera F8-06/F8-07).

### `6a59f2b` — feat: add cash deposit and withdrawal with reason in the session screen (F4-16 suprimento e sangria)

- `CashMovementType` (`WITHDRAWAL`/`DEPOSIT`) e `CashEntry.reason?`/`author?` (opcionais, sem bump de schema); `CashService.recordMovement(storeId, type, amount, reason, author?)` valida tipo, valor e motivo obrigatório (trim).
- `CashRepository.recordMovement` + `LocalCashRepository`: transação `rw [cashSessions, cashEntries]` que exige sessão aberta e rejeita sangria acima do saldo esperado (`cashTotals`) — regra atomicamente garantida no IndexedDB.
- UI `/caixa` aba Sessão: form de Suprimento/Sangria (tipo, valor, motivo) para `cash.manage`, visível com sessão aberta; extrato exibe motivo e autor; totais do fechamento (Suprimentos/Sangrias/Esperado) refletem automaticamente via `cashTotals`.
- Backup valida `reason` (string não vazia quando presente) e `author` (string quando presente) em `cashEntries`.
- Evidência: `npm.cmd test` **177/177** (21 arquivos; `cash-service.test.ts` +2, `cash.test.ts` +1, `backup.test.ts` estendido), build 0, tsc 0.
- Card: F4-16/#73 → DONE (fecha a ressalva da dependência opcional de F4-17; sangria/suprimento alimentam o fechamento pela UI).

### `b0f72d1` — feat: add product price, cost and payment method to inventory and cash models (F1-06 modelos de produtos e pagamentos)

- `InventoryItem` ganha `defaultPrice?`/`cost?` (reais, validados com `isMoney` no `InventoryService.create/update`); produto pode ter preço/custo padrão sem quebrar a venda manual (fluxo de venda intocado, testes de regressão verdes).
- UI de estoque: campos "Preço padrão (R$)" e "Custo (R$)" no form de cadastro/edição e exibição na lista de produtos.
- `PaymentMethod` (`CASH`/`PIX`/`CARD`) + `paymentMethodLabels` + `assertValidPaymentMethod`; `CashEntry.paymentMethod?` opcional (entradas legadas continuam válidas).
- `CashService.receive(storeId, saleId, amount, paymentMethod?)` valida e persiste a forma; UI do `/caixa` ganha select "Forma de pagamento" por venda pendente (padrão Dinheiro) e exibe o método no extrato de movimentos.
- Backup valida `paymentMethod` (deve estar em `paymentMethodLabels`) e `defaultPrice`/`cost` (números finitos ≥ 0); campos opcionais sem índice → schema permanece v11 (sem bump).
- Evidência: `npm.cmd test` **175/175** (21 arquivos; `inventory-service.test.ts` +3, `cash-service.test.ts` +2, `cash.test.ts` +1, `inventory.test.ts` +1, `backup.test.ts` +1), build 0, tsc 0.
- Card: F1-06/#14 → DONE (libera F2-11 catálogo; forma de pagamento pronta para F4-10/F4-18).

### `8fc64b0` — feat: cover organization settings contract with storage tests (F1-02 entidades e contratos)

- Auditoria completa dos 10 contratos de `src/domain/repositories.ts`: todos têm implementação local (`Local*Repository`) e cobertura de teste; a UI (`src/app`) não acessa Dexie diretamente (0 usos de `db.`/`indexedDB`).
- Última lacuna fechada: `SettingsRepository` ganhou `src/infrastructure/storage/settings.test.ts` (+3 casos — padrões padrão, persistência após reabrir o banco, sobrescrita única em `current`).
- Entidades ainda sem modelo (catálogo de produtos, agenda, garantias, fiscal, SaaS) permanecem com seus próprios cards, conforme o escopo "conforme as fases avançarem".
- Regra documentada: `docs/ai/02_ARCHITECTURE.md` → "Regra F1-02" com mapeamento entidade → contrato → teste; `DATA_MODEL_PLAN.md` atualizado (base `8fc64b0`); correção de "nove versões" para "onze versões" (verno 11).
- Evidência: `npm.cmd test` **167/167** (21 arquivos; novo `settings.test.ts` com 3 casos), build 0, tsc 0.
- Card: F1-02/#10 → DONE (libera F1-10; fecha a revisão de contratos da Fase 1).

### `e56939e` — feat: add work order detail route, event history, audited cancellation and stock inputs (F3-14 OS)

- Rota `/ordens-servico/:orderId` (guard `sales.read`) com `WorkOrderDetailPage`: situação completa, ações de transição/cancelamento/prazo, registro de insumos e histórico de eventos.
- Eventos auditados embutidos em `WorkOrder.events` (`WorkOrderEvent`: CREATED/STATUS/SCHEDULE/CANCELLED/INPUTS, autor + `at`) — sem tabela nova e sem bump de versão Dexie; `backup.ts` valida `events` e `cancelReason` no bloco `workOrders`.
- Cancelamento auditado: `WorkOrderService.cancel(order, reason, author)` exige motivo (persistido em `cancelReason`) e grava evento `CANCELLED`; `transition(..., "CANCELLED")` agora lança "Cancelamento auditado" de propósito.
- Insumos: `LocalWorkOrderRepository.recordInputs` baixa estoque numa única transação Dexie (`workOrders` + `inventoryItems` + `inventoryMovements`, rollback se saldo insuficiente), com movimentos `OUT` (`Insumos OS <id>`) e evento `INPUTS`.
- `createFromConfirmedSale(sale, author)` grava evento `CREATED` com autor; `schedule` grava evento `SCHEDULE` com prazo/notas; lista ganhou botão "Detalhes" e form de cancelamento com motivo.
- Evidência: `npm.cmd test` **164/164** (20 arquivos; `work-order-service.test.ts` +4 e `work-orders.test.ts` +2), build 0, tsc 0.
- Card: F3-14/#53 → DONE (libera F3-15/F3-16/F3-17 no lado de OS; devolução de estoque ao cancelar a venda fica no F4-18/#75).

### `6ce9c9a` — feat: store real clinical attachment content with upload, preview and backup (F3-09 anexos clínicos)

- Nova tabela `attachments` no IndexedDB (schema `opticore-v1` **v11**, `database.ts`): conteúdo em base64 por id (`ClinicalAttachmentContent`), separado dos metadados.
- Domínio (`clinical.ts`): `ClinicalAttachment.category` opcional (EXAM/IMAGE/DOCUMENT + rótulos), `ATTACHMENT_MAX_BYTES` (5 MB), `ATTACHMENT_ALLOWED_MIME_TYPES` (PDF/JPG/PNG) e `assertValidAttachment`/`assertValidAttachmentCategory` com mensagens claras.
- `ClinicalService`: `storeAttachment` (valida, gera id e grava conteúdo), `readAttachmentContent` e `dropAttachmentContent`; `ClinicalDraft.attach`/`detach` integram anexos ao autosave (bloqueados em documento finalizado).
- UI (`ClinicalWorkspace`): seção de anexos com upload (arquivo + categoria), lista com tamanho/data, prévia em nova aba (object URL revogada) e exclusão com `confirm()`; conteúdo só é apagado quando nenhuma versão finalizada ainda referencia o anexo.
- Backup: tabela `attachments` entra em `backupTables`; snapshots novos com `schema: 11` e arquivos legados `schema: 10` (sem a tabela) continuam importáveis; conteúdo validado como base64.
- Evidência: `npm.cmd test` **158/158** (20 arquivos; novos `domain/clinical-attachments.test.ts` com 3 casos, `clinical.test.ts` +5, `backup.test.ts` +1 e `database.test.ts` ajustado para verno 11), build 0, tsc 0.
- Card: F3-09/#48 → DONE (fecha o P0 de perda de dado clínico; libera F5-11, F8-04, F8-08 e F8-10).

### `a2c1369` — feat: enforce record and store scope from the active session (F1-11 escopo por registro)

- `src/domain/access-context.ts`: `AccessContext` (escopo da role + lojas do usuário), `buildAccessContext`, `canAccessStore`, `canAccessRecord`, contexto ativo global (`setAccessContext`) e guards `assertStoreAccess`/`assertRecordAccess`.
- Enforcement nos repositories (`local-repositories.ts`): `assertStoreAccess` nas listagens por loja; `assertRecordAccess` nas escritas de atendimento, venda/confirm, OS, estoque/movimentos, caixa e prontuário; histórico do cliente (`listByCustomer`) filtrado pela loja acessível. Sem contexto ativo (testes/backup) não há restrição.
- `AppProviders`: monta/desmonta o contexto junto com sessão/usuários/loja; `selectStore` valida o destino e o carregamento migra para a primeira loja acessível; `AppShell` lista no seletor só as lojas acessíveis (mensagem real de erro na troca).
- Escopo `SELF` (somente registros do próprio usuário) implementado e testado, sem role em uso ainda; registros sem `storeId` (clientes/configurações) permanecem compartilhados.
- Evidência: `npm.cmd test` **149/149** (19 arquivos; novos `domain/access-scope.test.ts` com 8 casos e `storage/access-scope.test.ts` com 4), build 0, tsc 0.
- Card: F1-11/#19 → DONE (fecha o par identidade→autorização; libera F2-05 e F8-06).

### `bae739b` — feat: add local login, session guard and password change (F7-02 tela de login)

- `src/domain/password.ts`: hash SHA-256 com salt por usuário (`generateSalt`, `hashPassword`, `verifyPassword`, `assertPasswordStrength` ≥ 8).
- `AuthenticationService` (`authentication-service.ts`): `login` (mensagem única anti-enumeração; ativo verificado após a senha), `loginDemo` (`demo: true`), `logout` (limpa sessão), `changePassword` (confirma a atual quando já existe credencial; primeira senha sem atual).
- `LocalSession.issuedAt` + TTL 12 h (`SESSION_TTL_HOURS`/`isSessionExpired`): expirada limpa no carregamento; `SessionRepository.get()` agora retorna `null` (fim do `defaultSession`/OWNER automático) e ganhou `clear()`.
- Rotas `/login`, `/bloqueado`, `/trocar-senha`; `RequireSession` envolve todo o app; consumidores de sessão migraram para `useSession()`.
- `UsersPage`: campo opcional de senha (criar/editar) + indicador "Senha definida/Sem senha local"; `User.passwordHash/passwordSalt` via `AdministrationService`.
- AppShell: botão **Sair**, selo **Demonstração**, link **Trocar senha**; página de login com seção demo explícito.
- Evidência: `npm.cmd test` **137/137** (17 arquivos; novos `authentication-service.test.ts` com 7 casos, `access.test.ts` +2, `administration-service.test.ts` +2), build 0, tsc 0.
- Card: F7-02/#117 → DONE (libera F1-11/#19 na fila).

### `715e6e9` — feat: add user CRUD with roles, stores and active status (F2-04 usuários e funções)

- `AdministrationService.createUser/updateUser/setUserActive`: validação de nome/e-mail/duplicidade (case-insensitive), escopo derivado do papel, lojas obrigatórias só para escopo de loja, proteção da sessão atual contra auto-inativação.
- `sessionUserState` (`access.ts`): usuário inativo não entra — `providers.tsx` bloqueia a sessão com tela própria.
- `UsersPage` com formulário criar/editar (nome, e-mail, função, lojas em checkboxes), botões Editar/Inativar/Reativar e selo Ativo/Inativo; ações atrás de `users.manage`.
- Evidência: `npm.cmd test` **126/126** (16 arquivos; novos `administration-service.test.ts` com 9 casos, `access.test.ts` +2), build 0, tsc 0.
- Card: F2-04/#26 → DONE (libera F7-02 na fila).

### `7dc1d7b` — feat: enforce single money rounding rule (F1-09 precisão monetária)

- Novo `src/domain/money.ts`: regra única (`isMoney`, `requireMoney`, `toCents`, `fromCents`, `roundMoney`) — fronteira em reais finitos, cálculo em centavos inteiros.
- `itemsTotalCents` + `itemsTotal` via centavos (0.1 + 0.2 = 0.3 exato); helpers locais `cents`/`money` removidos de `cash.ts`/`cash-service.ts` em favor do compartilhado.
- Correções de fuga: `createQuote` rejeitava `NaN`/`Infinity` (`NaN <= 0` é falso); `confirm` agora valida total e itens; `stockState` trata saldo não finito como `OUT`.
- Evidência: `npm.cmd test` **115/115** (15 arquivos; novos `money.test.ts` com 10 casos), build 0, tsc 0.
- Card: F1-09/#17 → DONE.

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
