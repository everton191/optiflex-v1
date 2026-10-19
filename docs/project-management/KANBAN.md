# OPTICORE — MASTER DEVELOPMENT BOARD (quadro local)

Quadro permanente de planejamento e acompanhamento do desenvolvimento do Opticore.
Data de geração: 07/10/2026 · Branch: `docs/master-kanban` · Base: `d6ab1d4`.

## Limitação registrada (Etapa 1)

O GitHub Projects V2 **não está acessível** com as credenciais atuais: o token `gh` (conta `everton191`) não possui o escopo `read:project` e a criação de project exige `project`. Nenhum ID ou URL de projeto foi inventado.

Como o quadro é obrigatório, vale o fallback autorizado pela especificação desta execução:

1. **Issues do GitHub** representam as tarefas (155 issues reais: 8 épicas + 147 tarefas).
2. **Este arquivo** é o quadro visual (colunas, status, dependências e prioridades).
3. Ao final há o **procedimento de migração** para GitHub Projects quando o escopo estiver disponível.

Para liberar o Projects (execução manual pelo usuário):

```powershell
gh auth refresh -s read:project,project
```

Depois: `gh project create --owner everton191 --title "OPTICORE — MASTER DEVELOPMENT BOARD"` e importar as issues existentes (ver seção de migração).

## Como qualquer agente usa este quadro

1. Leia `AGENTS.md` → `docs/project-management/PROJECT_STATUS.md` (ponto de retomada).
2. Consulte a coluna **READY** abaixo para a próxima tarefa sem bloqueio.
3. Cada linha liga a **Issue real** (`#n`) com o corpo completo do card (contexto, escopo, critérios, testes, riscos, DoD).
4. Dependências citam **IDs locais** (ex.: `F4-7`); resolva pelo número da issue na própria tabela.
5. Ao iniciar uma tarefa: mova a issue para `status/in-progress`, trabalhe só no escopo do card e atualize `PROJECT_STATUS.md`.

## Colunas (labels de status)

| Label | Coluna | Significado |
|---|---|---|
| `status/backlog` | BACKLOG | Registrada, ainda não priorizada. |
| `status/ready` | READY | Pronta para iniciar, sem bloqueios. |
| `status/in-progress` | IN PROGRESS | Desenvolvimento ativo. |
| `status/code-review` | CODE REVIEW | Implementação aguardando revisão. |
| `status/testing` | TESTING | Implementada, aguardando validação com evidência. |
| `status/done` | DONE | Concluída, testada e documentada (evidência no card). |
| `status/blocked` | BLOCKED | Aguardando dependência ou decisão. |

Classificação de inventário (Etapa 4) no corpo de cada card:
`IMPLEMENTED_AND_TESTED` → DONE · `IMPLEMENTED_NOT_VALIDATED` → TESTING · `PARTIAL` → READY/BACKLOG · `NOT_STARTED` → BACKLOG · `BLOCKED` → BLOCKED.

## Demais labels

- **Fase:** `fase/01-arquitetura` … `fase/08-qualidade` (8).
- **Módulo:** `modulo/access`, `administration`, `attendance`, `cash`, `clinical`, `customers`, `dashboard`, `inventory`, `sales`, `work-orders`, `saas`, `fiscal`, `ux`, `infraestrutura` (14).
- **Prioridade:** `prioridade/p0` (bloqueador/segurança/integridade) · `p1` (essencial ao marco) · `p2` (melhoria importante) · `p3` (futura).
- **Tipo:** `tipo/feature`, `bug`, `refactor`, `security`, `infrastructure`, `ui-ux`, `test`, `documentation`, `compliance`.
- **Épica:** `epic` (as 8 issues de fase).

## Contagens (08/10/2026)

- Issues totais: **155** (8 épicas + 147 tarefas).
- Tarefas por fase: F1=14 · F2=18 · F3=20 · F4=20 · F5=19 · F6=19 · F7=19 · F8=18.
- Tarefas por status (revisado em 08/10/2026; F1-09, F2-04, F7-02, F1-11, F3-09, F3-14, F1-02, F1-06, F4-16, F2-05, F4-10, F4-18, F4-12, F2-06, F3-01, F8-06, F8-07, F1-07, F3-17, F2-11, F2-02, F3-02, F3-03, F2-07, F3-10, F4-11, F2-14, F3-07, F8-10, F8-02, F7-01, F1-05, F1-03, F7-03, F2-08, F7-05, F1-12, F3-06, F3-05, F7-11, F7-13, F3-08, F3-11, F3-16, F3-19, F2-01, F1-10, F8-17, F2-09, F3-04, F3-12, F2-03, F4-05, F4-06, F2-12, F7-08, F7-09, F2-18, F2-13, F2-15, F2-16 e F7-06 concluídas; F8-04 em andamento — teste automatizado entregue, evidência de aparelho pendente): DONE=80 · IN PROGRESS=1 · READY=0 · TESTING=0 · CODE REVIEW=0 · BACKLOG=15 · BLOCKED=50.
- Bloqueios: **50 tarefas** bloqueadas — 47 por dependência de fase futura/externa + **3 reclassificadas em 08/10** (F4-13 #70, F8-03 #137, F3-20 #57: status desatualizado, decisão externa já registrada).
- **Revisão de dependências 08/10/2026:** 7 ciclos detectados (SCC/Tarjan sobre este arquivo) e corrigidos em KANBAN + corpos das issues; **0 ciclos remanescentes**. Detalhe antes/depois em `DEPENDENCIES.md`.

## Padrão do card

Todo card (Issue) segue o padrão da Etapa 5 da especificação:
Título `[MÓDULO] Descrição` · Contexto · Estado atual (com classificação e evidência) · Objetivo · Escopo · Fora do escopo · Dependências · Arquivos · Critérios de aceitação (checklist) · Testes obrigatórios · Riscos · Documentação · Definição de Concluído.

Regra de ouro: **nunca mover para DONE sem evidência verificável** (comando de teste executado + resultado registrado).

---
## Quadro por fase

### FASE 1 — ARQUITETURA E FUNDAÇÃO — épica #1

| ID | Card | Módulo | Status | Prio | Deps |
|---|---|---|---|---|---|
| E1 | [ÉPICA FASE 1 — ARQUITETURA E FUNDAÇÃO](https://github.com/everton191/optiflex-v1/issues/1) | fase 1 | IN PROGRESS | p1 | — |
| F1-01 | [Auditoria da arquitetura existente](https://github.com/everton191/optiflex-v1/issues/9) | Infraestrutura | DONE | p1 | nenhuma. |
| F1-02 | [Definição de entidades e contratos](https://github.com/everton191/optiflex-v1/issues/10) | Infraestrutura | DONE | p1 | F1-09 (regra monetária ao definir valores; concluída em `8fc64b0` — auditoria dos 10 contratos, `SettingsRepository` coberto, regra documentada em `02_ARCHITECTURE.md`). |
| F1-03 | [Separação gradual de páginas por módulo](https://github.com/everton191/optiflex-v1/issues/11) | Infraestrutura | DONE | p2 | nenhuma. |
| F1-04 | [Organização de serviços e repositories](https://github.com/everton191/optiflex-v1/issues/12) | Infraestrutura | DONE | p1 | nenhuma. |
| F1-05 | [Identificadores de organizações e filiais](https://github.com/everton191/optiflex-v1/issues/13) | Infraestrutura | DONE | p1 | F1-08 (migração de schema). |
| F1-06 | [Modelos de produtos, itens de venda e pagamentos](https://github.com/everton191/optiflex-v1/issues/14) | Infraestrutura | DONE | p1 | F4-09 (recebimentos, concluído; entregue em `b0f72d1` — `defaultPrice`/`cost` em `InventoryItem` + `PaymentMethod` em `CashEntry`). Ciclo corrigido 08/10: F2-11 depende de F1-06 (feito). |
| F1-07 | [Modelos de prescrições e ordens de serviço](https://github.com/everton191/optiflex-v1/issues/15) | Infraestrutura | DONE | p1 | nenhuma. Ciclo corrigido 08/10: F3-06/F3-07 dependem de F1-07 (entregue em `41f0bfd` — `Prescription` versionada + retificação append-only + contrato `PrescriptionRepository`; `WorkOrder.laboratory?` + evento `LABORATORY`). |
| F1-08 | [Estratégia de migração do IndexedDB](https://github.com/everton191/optiflex-v1/issues/16) | Infraestrutura | DONE | p1 | nenhuma. |
| F1-09 | [Valores monetários e precisão decimal](https://github.com/everton191/optiflex-v1/issues/17) | Infraestrutura | DONE | p1 | nenhuma. Concluído 08/10/2026 (`7dc1d7b`, 115 testes). |
| F1-10 | [Auditoria de alterações](https://github.com/everton191/optiflex-v1/issues/18) | Infraestrutura | DONE | p1 | F1-02 (feito), F2-05 (feito; entregue em `2a58572` — trilha imutável de ações críticas: cancelamento de venda, ajuste de estoque e cadastros administrativos com `AuditService`, página `/admin/auditoria` sob `settings.manage` e backup schema 14). |
| F1-11 | [Permissões e autorização](https://github.com/everton191/optiflex-v1/issues/19) | Access | DONE | p0 | F7-02 (login local identidade). Concluído 08/10/2026 (`a2c1369`, 149 testes). |
| F1-12 | [Tratamento global de erros](https://github.com/everton191/optiflex-v1/issues/20) | Infraestrutura | DONE | p1 | nenhuma. Ciclo corrigido 08/10: F7-11 depende de F1-12. Entregue em `a30f165` — helper `errorMessage` + `RouteErrorBoundary` envolvendo AppShell/login/bloqueado, 24 ternários unificados, serviços sem `catch` vazio; 297/297; teste manual de falha de storage pendente. |
| F1-13 | [Testes de domínio](https://github.com/everton191/optiflex-v1/issues/21) | Infraestrutura | DONE | p1 | nenhuma. |
| F1-14 | [Documentação arquitetural](https://github.com/everton191/optiflex-v1/issues/22) | Infraestrutura | DONE | p1 | nenhuma. |

### FASE 2 — CADASTROS E ADMINISTRAÇÃO — épica #2

| ID | Card | Módulo | Status | Prio | Deps |
|---|---|---|---|---|---|
| E2 | [ÉPICA FASE 2 — CADASTROS E ADMINISTRAÇÃO](https://github.com/everton191/optiflex-v1/issues/2) | fase 2 | READY | p1 | — |
| F2-01 | [Cadastro completo de empresas](https://github.com/everton191/optiflex-v1/issues/23) | Administration | DONE | p1 | nenhuma. Ciclo corrigido 08/10: F2-03 depende de F2-01. Entregue em `4f78fe6` — `src/domain/organization.ts` (CNPJ com dígitos verificadores, `normalizeOrganizationSettings`/`assertValidOrganizationSettings`); `OrganizationSettings` estendido com razão social, CNPJ, telefone, e-mail e endereço (opcionais, sem bump Dexie); `saveSettings` valida+normaliza antes de persistir; `SettingsPage` com seções "Dados da empresa"/"Endereço" e erro na UI; identificação exibida no dashboard (CA); backup valida bloco `settings` (CNPJ inválido rejeitado); `organization.test.ts` (7) + backup (+1); 335/335, build 0, tsc 0. |
| F2-02 | [Matriz e filiais](https://github.com/everton191/optiflex-v1/issues/24) | Administration | DONE | p1 | F1-11 (escopo; entregue em `c4e4e31` — `/admin/lojas`, CRUD com nome único e inativação não destrutiva protegendo loja atual e última ativa). |
| F2-03 | [Dados jurídicos e tributários da empresa](https://github.com/everton191/optiflex-v1/issues/25) | Administration | DONE | p2 | F2-01 (feito); bloqueia F6-01/F6-02/F6-03. Entregue em `75df1c0` — `TaxRegime` (SIMPLES_NACIONAL/SIMPLES_EXCESSO_SUBRECEITA/REGIME_NORMAL/MEI) + `taxRegimeLabels`/`isTaxRegime`, IE (`stateRegistration`), IM (`municipalRegistration`) e CNAE (`formatCnae`/`isValidCnae`) em `OrganizationSettings` (opcionais, sem bump Dexie); normalização (upper/trim/format) e validação (regime enum, IE/IM alfanumérico, CNAE 7 dígitos) no `saveSettings`; `SettingsPage` com "Regime tributário", IE, IM e CNAE formatado enquanto digita (endereço confirmado como endereço fiscal); backup valida o bloco fiscal de `settings`; +5 testes; 368/368, build 0, tsc 0. |
| F2-04 | [Usuários e funções](https://github.com/everton191/optiflex-v1/issues/26) | Administration | DONE | p1 | nenhuma (perfis pré-definidos). Ciclo corrigido 08/10: F7-02 depende de F2-04. Concluído 08/10/2026 (`715e6e9`, 126 testes). |
| F2-05 | [Permissões por loja](https://github.com/everton191/optiflex-v1/issues/27) | Access | DONE | p1 | F1-11, F2-04 (feitos; entregue em `1b3f757` — matriz em `/admin/perfis`, `syncSessionRole`, fallback de loja, testes negativos). |
| F2-06 | [Clientes e contatos](https://github.com/everton191/optiflex-v1/issues/28) | Customers | DONE | p1 | F1-03 (extração possível; entregue em `00d0d9e` — rota editar, `updateCustomer`, complementação e-mail/nascimento, perfil reflete). |
| F2-07 | [Validação de CPF/CNPJ](https://github.com/everton191/optiflex-v1/issues/29) | Customers | DONE | p2 | F2-06. |
| F2-08 | [Prevenção de duplicidades](https://github.com/everton191/optiflex-v1/issues/30) | Customers | DONE | p2 | F2-07. |
| F2-09 | [Histórico de clientes](https://github.com/everton191/optiflex-v1/issues/153) | Customers | DONE | p1 | F3/F4 (feito), F1-11 (feito; entregue em `4ed148a` — `customer-history.ts` com `buildCustomerHistory` puro e `historyKindsFor(role)`, `CustomerHistoryService` agregando atendimentos/vendas/OS/pagamentos da loja, timeline unificada no perfil com filtros por tipo, links por permissão (consulta clínica só na própria loja) e vendedor sem acesso a anamnese; 350/350). |
| F2-10 | [Fornecedores e laboratórios](https://github.com/everton191/optiflex-v1/issues/31) | Administration | BACKLOG | p2 | F2-03 (CNPJ), F2-07 (validação). |
| F2-11 | [Produtos: armações, lentes e acessórios](https://github.com/everton191/optiflex-v1/issues/32) | Inventory | DONE | p1 | F1-06 (feito; entregue em `e3bd607` — catálogo com categoria obrigatória, ficha de produto, filtro por categoria e venda consumindo o item do catálogo). |
| F2-12 | [Serviços](https://github.com/everton191/optiflex-v1/issues/33) | Inventory | DONE | p2 | F2-11 (feito; entregue em `8be2750` — `ServiceCatalogItem` (nome, preço padrão, descrição, por loja) + `ServiceCatalogService` com nome único case-insensitive; seção "Serviços" no InventoryWorkspace (CRUD, `inventory.manage`); no Caixa, seletor "Serviço do catálogo" preenche o tratamento `SaleTreatment` (entra no total e na OS, sem baixa de estoque); Dexie v17 tabela `services` e backup schema 17 (16 pad `services=[]`, FK de loja); +4 testes +1 backup; 396/396, build 0, tsc 0. |
| F2-13 | [Variantes e características dos produtos](https://github.com/everton191/optiflex-v1/issues/34) | Inventory | DONE | p3 | F2-11 (feito; entregue em `0353eb6` — `ProductVariantAttributes` (cor/tamanho/material/índice/tratamento) com `variantFieldsByCategory` (FRAME: cor/tamanho/material; LENS: índice/tratamento; ACCESSORY: cor/material), `normalizeVariantAttributes`/`buildVariantName`/`variantCodeSuffix`/`filterByVariantField`/`variantFieldOptions`; `InventoryService.createVariant` gera item irmão com saldo, código e movimento próprios (colisão de código com sufixo numérico); UI: campos de atributo por categoria no cadastro, botão "Variante" por linha com Drawer (saldo inicial + código), coluna Atributos e filtros por valor de atributo; backup valida `variantAttributes`; +8 testes; 422/422, build 0, tsc 0. |
| F2-14 | [Códigos, preços e custos](https://github.com/everton191/optiflex-v1/issues/35) | Inventory | DONE | p1 | F2-11, F1-06 (feito). |
| F2-15 | [Campos fiscais dos produtos](https://github.com/everton191/optiflex-v1/issues/36) | Inventory | DONE | p2 | F2-11 (feito; entregue em `c124ede` — `ProductFiscalFields` (NCM/CFOP/CEST/unidade) opcional em `InventoryItem.fiscal` sem bump Dexie; `normalizeProductFiscal` (dígitos, NCM 8/CFOP 4/CEST 7, unidade enum `fiscalUnits`) + `formatNcm`/`formatCest`/`fiscalSummary`; create/update persistem e limpam, `createVariant` herda da base; UI: fieldset "Dados fiscais (opcional)" com formatação ao digitar e resumo na linha do produto; backup valida `fiscal` (strings + enum); +4 testes +3 no backup; 426/426, build 0, tsc 0). Desbloqueia F6-04 (fila de specs da Fase 6). |
| F2-16 | [Importação por planilha](https://github.com/everton191/optiflex-v1/issues/37) | Inventory | DONE | p3 | F2-11 (feito), F2-08 (feito; entregue em `db1ade9` — `src/domain/inventory-import.ts`: `parseCsv` RFC4180 (aspas, vírgulas, CRLF, BOM, linhas vazias) com `InvalidImportError`, `mapImportColumns` com aliases acentuados/inglêses (`nome`/`product`, `código`/`sku`…), `parseImportNumber` pt-BR (`1.234,56`, `R$`), `parseImportCategory` (rótulos ou códigos), `previewInventoryImport` (statuses READY/ERROR/DUPLICATE_IN_FILE/EXISTS com motivos por linha, colunas obrigatórias listadas na rejeição) e `applyInventoryImport` (pré-valida códigos, cria tudo em **`createMany` transacional único** com movimento "Importação de planilha", atualização opcional por código que preserva saldo e campos com célula vazia); `InventoryRepository.createMany` + impl Dexie em transação rw (rollback real, risco do card); UI no Estoque: "Importar CSV" → prévia em Dialog (contagens, erros motivados, 30 primeiras linhas, checkbox "atualizar existentes"), importação em lote com contagem criados/atualizados/ignorados; +13 testes de parser/mapeamento/preview/aplicação (inclui falha de transação sem updates); 439/439, build 0, tsc 0. |
| F2-17 | [Importação por XML fiscal, quando aplicável](https://github.com/everton191/optiflex-v1/issues/38) | Fiscal | BLOCKED | p3 | F6-07/F6-15 (modelo fiscal), F2-11. |
| F2-18 | [Cadastro inicial assistido](https://github.com/everton191/optiflex-v1/issues/39) | Administration | DONE | p3 | F2-01 (feito), F2-02 (feito), F2-04 (feito). Entregue em `b7f3e0a` — `src/domain/onboarding.ts` (`OnboardingService` + steps `organization`/`store`/`user`/`products`/`review` com `nextOnboardingStep`/`previousOnboardingStep` pulando opcionais e `buildOnboardingSummary`) + 9 testes; rota `/admin/assistente` (`OnboardingPage`, guarda `settings.manage`, guard matrix 22→23, link "Assistente inicial" no menu Administração) com passos Organização (normaliza e salva settings), Loja (`createStore`), Usuário (OWNER com loja criada/ativas), Produtos iniciais (InventoryService, múltiplos, pulável) e Revisão (resumo + etapas puladas; "Concluir" → dashboard); cada etapa persiste imediatamente; seed demo preservada (fora de escopo); 414/414, build 0, tsc 0. Libera F7-15. |

### FASE 3 — OPERAÇÃO DA ÓTICA — épica #3

| ID | Card | Módulo | Status | Prio | Deps |
|---|---|---|---|---|---|
| E3 | [ÉPICA FASE 3 — OPERAÇÃO DA ÓTICA](https://github.com/everton191/optiflex-v1/issues/3) | fase 3 | IN PROGRESS | p1 | — |
| F3-01 | [Agenda e recepção](https://github.com/everton191/optiflex-v1/issues/40) | Attendance | DONE | p1 | F2-04 (usuários/profissionais; entregue em `679951f` — agenda dia/semana, conversão em atendimento sem redigitar cliente, Dexie v12). |
| F3-02 | [Cadastro de atendimento](https://github.com/everton191/optiflex-v1/issues/41) | Attendance | DONE | p1 | F2-04 (profissionais; entregue em `8daab89` — `/atendimentos/novo` com tipo/profissional/prioridade/notas, detalhe `/atendimentos/:attendanceId` por URL direta e transições básicas). |
| F3-03 | [Fila de atendimento](https://github.com/everton191/optiflex-v1/issues/42) | Attendance | DONE | p1 | F3-02 (feito em `8daab89`; fila entregue em `c45a6bf` — status `NO_SHOW`, filtros Todos/Aguardando/Em atendimento, tempo de espera por registro e ações Iniciar/Finalizar/Faltou/Cancelar por permissão; estados finais saem da fila). |
| F3-04 | [Histórico clínico do cliente](https://github.com/everton191/optiflex-v1/issues/43) | Customers | DONE | p1 | F2-09, F3-06, F1-11 (feitos; entregue em `f43627c` — `customer-clinical-history.ts` com `canViewClinicalHistory` (gate `clinical.workspace.access`) e `buildCustomerClinicalDocuments` puro (prescrições com uso/versão/retificação, prontuários com conteúdo, anexos com categoria; texto de anamnese/exame nunca sai do resumo), `CustomerHistoryService.listClinicalDocuments` com gate duplo UI+serviço, seção "Guia clínica" no perfil com filtros por tipo, visível só para acesso clínico; 354/354). |
| F3-05 | [Receitas ópticas (documento e impressão)](https://github.com/everton191/optiflex-v1/issues/44) | Clinical | DONE | p1 | F3-06 (feito). Entregue em `0e8675a` — `prescriptionDocument`/`formatPrescriptionEye` (documento puro por versão, não muta a prescrição), `PrescriptionRepository.get` + `ClinicalService.getPrescription`, rota `/prescricoes/:prescriptionId` com `PrescriptionDocumentPage`, botão "Imprimir" na lista e na página (`window.print()` + `@media print`), versão sempre visível nas reimpressões; 308/308. Impressão manual pendente (CA do card). |
| F3-06 | [Prescrição estruturada](https://github.com/everton191/optiflex-v1/issues/45) | Clinical | DONE | p1 | nenhuma. Entregue em `6f2fe74` — `Prescription.usage` (DISTANCE/NEAR/CONTINUOUS/MULTIFOCAL), retificação na workspace clínica com motivo obrigatório e histórico (CA1), snapshot `SalePrescription` na criação do orçamento sem redigitação (CA2), `listCustomerPrescriptions`, backup com FK de `sales.prescription`; 305/305. |
| F3-07 | [Campos de grau OD/OE, cilindro, eixo e adição](https://github.com/everton191/optiflex-v1/issues/46) | Clinical | DONE | p1 | F1-07. |
| F3-08 | [DP/DNP e altura de montagem](https://github.com/everton191/optiflex-v1/issues/47) | Clinical | DONE | p1 | F3-07 (feito). Entregue em `ad8f5be` — `PrescriptionMeasures` (DP total/longe/perto, altura OD/OE em mm + origem medido/informado) em `clinical.ts` com `assertValidPrescriptionMeasures`/`formatPrescriptionMeasures`; bloco de medidas no formulário clínico (retificação pré-preenche); snapshot `SalePrescription.measures` no handoff da venda; cartão "Prescrição" com medidas no detalhe da OS (sem redigitação); linha "Medidas de montagem" no documento imprimível; 312/312, build 0, tsc 0. Captura por equipamento fora de escopo. |
| F3-09 | [Anexos e documentos](https://github.com/everton191/optiflex-v1/issues/48) | Clinical | DONE | p0 | F1-08 (migração de store de anexos). |
| F3-10 | [Orçamentos detalhados](https://github.com/everton191/optiflex-v1/issues/49) | Sales | DONE | p1 | F1-09 (monetário). |
| F3-11 | [PDV de armações e lentes](https://github.com/everton191/optiflex-v1/issues/50) | Sales | DONE | p1 | F2-11, F3-08, F3-10 (feitos). Entregue em `3dc784c` — `SaleItem.category` (vem do produto, validada) + filtro de categoria (FRAME/LENS/ACCESSORY) no seletor do PDV; `Sale.treatments?` (`{ name, price }`, serviços sem estoque) somados no total/descrição via `treatmentsTotalCents`; medidas da receita importadas no formulário (snapshot F3-08, modo leitura); card "Venda" (itens+categoria+tratamentos) no detalhe da OS; documento de venda com tabela de tratamentos; backup valida `category`/`treatments`; 319/319, build 0, tsc 0. |
| F3-12 | [Descontos e aprovação](https://github.com/everton191/optiflex-v1/issues/51) | Sales | DONE | p1 | F1-10 (feito), F3-10 (feito; entregue em `93ebb03` — `SaleDiscount` com bruto/aplicante/aprovador, limites por perfil em `discountAuthorityByRole` (vendedor/caixa 5% ou R$ 50; gerente 15% ou R$ 300; dono/rede 30% ou R$ 1000), `approveDiscount` sem autoprovação com auditoria, `confirm` bloqueado sem aprovação, UI no caixa com prévia e botão "Aprovar desconto"; 362/362). |
| F3-13 | [Confirmação de vendas](https://github.com/everton191/optiflex-v1/issues/52) | Sales | DONE | p1 | F4-7. |
| F3-14 | [Ordens de serviço](https://github.com/everton191/optiflex-v1/issues/53) | Work-orders | DONE | p1 | F1-07 (parte de OS já testada em 8a68d67; concluída em `e56939e` — rota de detalhe, histórico, cancelamento auditado, insumos). Ciclo corrigido 08/10: F3-15 depende de F3-14 (feito). |
| F3-15 | [Laboratórios parceiros](https://github.com/everton191/optiflex-v1/issues/54) | Work-orders | BACKLOG | p2 | F2-10, F3-14 (feito). |
| F3-16 | [Acompanhamento da fabricação](https://github.com/everton191/optiflex-v1/issues/154) | Work-orders | DONE | p2 | F3-14 (feito). Entregue em `f92ab0a` — `WorkOrderStatus` fino (`OPEN`→`SENT_TO_LAB`→`IN_PRODUCTION`→`RETURNED`→`IN_INSPECTION`→`READY`→`AWAITING_PICKUP`→`DELIVERED` + `CANCELLED`, com rework p/ produção e atalhos antigos preservados para compat); `productionPipeline`/`stageEvent`/`stageIndexOf` derivam responsável/data por etapa do histórico (sem schema novo); card "Progresso da fabricação" no detalhe da OS; filtros por todos os status; backup com os 9 status; testes de transições inválidas (+4); 323/323, build 0, tsc 0. |
| F3-17 | [Prazos e alertas](https://github.com/everton191/optiflex-v1/issues/55) | Work-orders | DONE | p1 | F3-14 (feito; entregue em `e6e525d` — filtro `ATRASADAS`, badge de atraso e seletor compartilhado `isOverdueOrder`/`overdueOrders` com contagem coerente no dashboard). |
| F3-18 | [Produtos prontos](https://github.com/everton191/optiflex-v1/issues/155) | Work-orders | BACKLOG | p2 | F3-16, F4-5 (reserva). |
| F3-19 | [Entrega ao cliente](https://github.com/everton191/optiflex-v1/issues/56) | Work-orders | DONE | p1 | F3-16, F4-12 (saldo). Entregue em `7de46e6` — `deliver(order, { receivedBy, note?, pendingCents, acknowledgePending? }, author)` com recebedor obrigatório, evento `DELIVERY`, `receivedBy`/`deliveredNote` persistidos; guarda de saldo pendente (saldo apurado no caixa exige confirmação explícita na UI com checkbox de ciência); card "Progresso da fabricação" reconhece `DELIVERY` via `stageEvent`; botão genérico "Entregar" removido (fluxo é o checklist no detalhe); entrega sai das filas do dashboard (CA); backup valida campos; 327/327, build 0, tsc 0. |
| F3-20 | [Garantias, ajustes e trocas](https://github.com/everton191/optiflex-v1/issues/57) | Work-orders | BLOCKED | p2 | F2-09 (histórico), F3-14 (OS) + decisão P7 (política de garantia). |

### FASE 4 — ESTOQUE E FINANCEIRO — épica #4

| ID | Card | Módulo | Status | Prio | Deps |
|---|---|---|---|---|---|
| E4 | [ÉPICA FASE 4 — ESTOQUE E FINANCEIRO](https://github.com/everton191/optiflex-v1/issues/4) | fase 4 | IN PROGRESS | p0 | — |
| F4-01 | [Cadastro e movimentação de estoque](https://github.com/everton191/optiflex-v1/issues/58) | Inventory | DONE | p1 | — |
| F4-02 | [Entrada, saída e ajuste](https://github.com/everton191/optiflex-v1/issues/59) | Inventory | DONE | p1 | — |
| F4-03 | [Histórico de movimentações](https://github.com/everton191/optiflex-v1/issues/60) | Inventory | DONE | p1 | — |
| F4-04 | [Estoque mínimo](https://github.com/everton191/optiflex-v1/issues/61) | Inventory | DONE | p2 | — |
| F4-05 | [Reserva de itens por venda](https://github.com/everton191/optiflex-v1/issues/62) | Inventory | DONE | p2 | F3-10 (feito), F4-07 (feito). Entregue em `d807590` — `InventoryItem.reservedQuantity?` + `availableQuantity` (sem bump Dexie); `quoteReservationDeltas` (líquido por produto ao criar/editar/remover); `InventoryRepository.applyReservation` transacional (aumento valida saldo disponível; baixa respeita reserva legada com clamp); `SalesService` com repositório de estoque — reserva em `createQuote`/`updateQuote`, liberação em cancelar/expirar/recusar e conversão em baixa na confirmação (transação do repositório); `adjust` manual não come estoque reservado; UI do caixa com "disponível" no seletor; backup valida `reservedQuantity`; +12 testes (criação/concorrência/cancelar/expirar/confirmar/editar/legado/ajuste/reabertura); 380/380, build 0, tsc 0. |
| F4-06 | [Transferência entre filiais](https://github.com/everton191/optiflex-v1/issues/63) | Inventory | DONE | p2 | F4-2, F2-02 (feitos; entregue em `1c8c9a6` — ciclo REQUESTED→SEPARATED→IN_TRANSIT→RECEIVED (+CANCELLED); saldo de origem baixa na separação (checando `availableQuantity` vs reservas F4-05) e creditado no destino no recebimento (match por code, senão por nome, senão cria item copiando atributos); cancelar SEPARATED devolve IN à origem e IN_TRANSIT não cancela; histórico IN/OUT nos dois lados; seção Transferências no InventoryWorkspace com permissão `inventory.manage` e `assertStoreAccess` nas duas lojas; Dexie v16 tabela `transfers` e backup schema 16 (14/15 pad `transfers=[]`); entity `transfer` na auditoria; +11 testes +1 backup; 391/391, build 0, tsc 0. |
| F4-07 | [Baixa transacional](https://github.com/everton191/optiflex-v1/issues/64) | Inventory | DONE | p0 | — |
| F4-08 | [Abertura de caixa](https://github.com/everton191/optiflex-v1/issues/65) | Cash | DONE | p1 | — |
| F4-09 | [Recebimentos](https://github.com/everton191/optiflex-v1/issues/66) | Cash | DONE | p0 | — |
| F4-10 | [Formas de pagamento](https://github.com/everton191/optiflex-v1/issues/67) | Cash | DONE | p1 | F4-9, F1-08 (feitos; entregue em `7f1d6e4` — forma obrigatória, `DEBIT`/`CREDIT`, `byMethod` no fechamento). |
| F4-11 | [PIX, dinheiro e cartão](https://github.com/everton191/optiflex-v1/issues/68) | Cash | DONE | p1 | F4-10, F1-09. |
| F4-12 | [Pagamentos parciais](https://github.com/everton191/optiflex-v1/issues/69) | Cash | DONE | p1 | F4-9, F4-10 (feitos; entregue em `60e2ca4` — status `PARTIAL`, input de valor na aba Recebimentos, saldo durável). |
| F4-13 | [Parcelamentos](https://github.com/everton191/optiflex-v1/issues/70) | Cash | BLOCKED | p1 | F4-12, F1-09, F1-10 (feitos) + decisão P4 (juros/multas/prazo). |
| F4-14 | [Crediário e carnês](https://github.com/everton191/optiflex-v1/issues/71) | Cash | BACKLOG | p2 | F4-13, F7-13. |
| F4-15 | [Contas a receber](https://github.com/everton191/optiflex-v1/issues/72) | Cash | BACKLOG | p2 | F4-13. |
| F4-16 | [Suprimento e sangria](https://github.com/everton191/optiflex-v1/issues/73) | Cash | DONE | p1 | F4-8 (feito; entregue em `6a59f2b` — form na aba Sessão, motivo obrigatório, guarda de saldo na transação). |
| F4-17 | [Conferência e fechamento de caixa](https://github.com/everton191/optiflex-v1/issues/74) | Cash | DONE | p1 | F4-16 (para totais completos). |
| F4-18 | [Estornos e cancelamentos](https://github.com/everton191/optiflex-v1/issues/75) | Cash | DONE | p1 | F4-7, F4-9, F1-10 (feitos; entregue em `9f0fdfc` — cancelamento auditado com devolução de estoque, `REFUND` no caixa e UI com motivo). |
| F4-19 | [Relatórios financeiros](https://github.com/everton191/optiflex-v1/issues/76) | Cash | BACKLOG | p2 | F4-10, F4-13, F7-13. |
| F4-20 | [Dashboard com dados reais](https://github.com/everton191/optiflex-v1/issues/77) | Dashboard | DONE | p1 | — |

### FASE 5 — SaaS MULTIEMPRESA — épica #5

| ID | Card | Módulo | Status | Prio | Deps |
|---|---|---|---|---|---|
| E5 | [ÉPICA FASE 5 — SaaS MULTIEMPRESA](https://github.com/everton191/optiflex-v1/issues/5) | fase 5 | BLOCKED | p1 | — |
| F5-01 | [Backend em nuvem](https://github.com/everton191/optiflex-v1/issues/78) | Saas | BLOCKED | p0 | decisão do usuário (bloqueante); F1-05 (organizationId). |
| F5-02 | [Autenticação real](https://github.com/everton191/optiflex-v1/issues/79) | Saas | BLOCKED | p0 | F5-01, F2-04, F7-02 (enquanto houver login local). |
| F5-03 | [Organizações e filiais na nuvem](https://github.com/everton191/optiflex-v1/issues/80) | Saas | BLOCKED | p0 | F5-01, F1-05. |
| F5-04 | [Isolamento de empresas](https://github.com/everton191/optiflex-v1/issues/81) | Saas | BLOCKED | p0 | F5-03. |
| F5-05 | [Políticas de segurança por tenant](https://github.com/everton191/optiflex-v1/issues/82) | Saas | BLOCKED | p0 | F5-04, F1-11. |
| F5-06 | [RLS, quando aplicável à infraestrutura](https://github.com/everton191/optiflex-v1/issues/83) | Saas | BLOCKED | p1 | F5-01, F5-03. |
| F5-07 | [Sincronização offline/online](https://github.com/everton191/optiflex-v1/issues/84) | Saas | BLOCKED | p1 | F5-01, F5-02. |
| F5-08 | [Fila de operações pendentes](https://github.com/everton191/optiflex-v1/issues/85) | Saas | BLOCKED | p1 | F5-07. |
| F5-09 | [Resolução de conflitos](https://github.com/everton191/optiflex-v1/issues/86) | Saas | BLOCKED | p1 | F5-08. |
| F5-10 | [Backups e restauração na nuvem](https://github.com/everton191/optiflex-v1/issues/87) | Saas | BLOCKED | p1 | F5-01, F5-03. |
| F5-11 | [Armazenamento seguro de anexos](https://github.com/everton191/optiflex-v1/issues/88) | Saas | BLOCKED | p2 | F5-01, F3-09. |
| F5-12 | [Gestão de planos](https://github.com/everton191/optiflex-v1/issues/89) | Saas | BLOCKED | p2 | decisão comercial; F5-01. |
| F5-13 | [Assinaturas e pagamentos do SaaS](https://github.com/everton191/optiflex-v1/issues/90) | Saas | BLOCKED | p2 | F5-12, decisão comercial. |
| F5-14 | [Período de teste](https://github.com/everton191/optiflex-v1/issues/91) | Saas | BLOCKED | p3 | F5-12. |
| F5-15 | [Limites por plano](https://github.com/everton191/optiflex-v1/issues/92) | Saas | BLOCKED | p2 | F5-12. |
| F5-16 | [Painel de administração do SaaS](https://github.com/everton191/optiflex-v1/issues/93) | Saas | BLOCKED | p3 | F5-01, F5-12. |
| F5-17 | [Monitoramento de incidentes](https://github.com/everton191/optiflex-v1/issues/94) | Saas | BLOCKED | p2 | F5-01. |
| F5-18 | [Logs de auditoria na nuvem](https://github.com/everton191/optiflex-v1/issues/95) | Saas | BLOCKED | p1 | F5-01, F1-10 (feito). |
| F5-19 | [Recuperação de conta](https://github.com/everton191/optiflex-v1/issues/96) | Saas | BLOCKED | p2 | F5-02. |

### FASE 6 — NOTAS FISCAIS E CONFORMIDADE — épica #6

| ID | Card | Módulo | Status | Prio | Deps |
|---|---|---|---|---|---|
| E6 | [ÉPICA FASE 6 — NOTAS FISCAIS E CONFORMIDADE](https://github.com/everton191/optiflex-v1/issues/6) | fase 6 | BLOCKED | p2 | — |
| F6-01 | [Cadastro fiscal da ótica](https://github.com/everton191/optiflex-v1/issues/97) | Fiscal | BLOCKED | p2 | F2-03; especificação fiscal (bloqueio externo). |
| F6-02 | [Regime tributário](https://github.com/everton191/optiflex-v1/issues/98) | Fiscal | BLOCKED | p2 | F6-01, decisão contábil do cliente. |
| F6-03 | [Inscrição estadual e municipal](https://github.com/everton191/optiflex-v1/issues/99) | Fiscal | BLOCKED | p2 | F6-01. |
| F6-04 | [NCM, CFOP e demais classificações](https://github.com/everton191/optiflex-v1/issues/100) | Fiscal | BLOCKED | p2 | F2-15 (feito em `c124ede`); especificação fiscal (bloqueio externo, raiz Fase 6). |
| F6-05 | [Modelo independente de documentos fiscais](https://github.com/everton191/optiflex-v1/issues/101) | Fiscal | BLOCKED | p1 | F6-01. |
| F6-06 | [Integração com API emissora](https://github.com/everton191/optiflex-v1/issues/102) | Fiscal | BLOCKED | p1 | F6-05, decisão de provedor. |
| F6-07 | [NF-e](https://github.com/everton191/optiflex-v1/issues/103) | Fiscal | BLOCKED | p1 | F6-06, F4-9. |
| F6-08 | [NFC-e](https://github.com/everton191/optiflex-v1/issues/104) | Fiscal | BLOCKED | p1 | F6-06, F4-10. |
| F6-09 | [NFS-e, quando aplicável](https://github.com/everton191/optiflex-v1/issues/105) | Fiscal | BLOCKED | p3 | F6-06, F2-12. |
| F6-10 | [Certificados digitais](https://github.com/everton191/optiflex-v1/issues/106) | Fiscal | BLOCKED | p2 | F6-06. |
| F6-11 | [Credenciamento no ambiente emissor](https://github.com/everton191/optiflex-v1/issues/107) | Fiscal | BLOCKED | p2 | F6-10. |
| F6-12 | [Ambientes de homologação e produção](https://github.com/everton191/optiflex-v1/issues/108) | Fiscal | BLOCKED | p1 | F6-06. |
| F6-13 | [Validação antes do envio](https://github.com/everton191/optiflex-v1/issues/109) | Fiscal | BLOCKED | p1 | F6-05. |
| F6-14 | [Tratamento de rejeições](https://github.com/everton191/optiflex-v1/issues/110) | Fiscal | BLOCKED | p1 | F6-13. |
| F6-15 | [Cancelamento e eventos](https://github.com/everton191/optiflex-v1/issues/111) | Fiscal | BLOCKED | p1 | F6-07, F4-18. |
| F6-16 | [XML e documentos auxiliares](https://github.com/everton191/optiflex-v1/issues/112) | Fiscal | BLOCKED | p1 | F6-07, F5-11 (nuvem). |
| F6-17 | [Histórico de emissões](https://github.com/everton191/optiflex-v1/issues/113) | Fiscal | BLOCKED | p2 | F6-05. |
| F6-18 | [Segurança das credenciais](https://github.com/everton191/optiflex-v1/issues/114) | Fiscal | BLOCKED | p1 | F6-06, F5-18. |
| F6-19 | [Versionamento de regras fiscais](https://github.com/everton191/optiflex-v1/issues/115) | Fiscal | BLOCKED | p2 | F6-05. |

### FASE 7 — INTERFACE E EXPERIÊNCIA — épica #7

| ID | Card | Módulo | Status | Prio | Deps |
|---|---|---|---|---|---|
| E7 | [ÉPICA FASE 7 — INTERFACE E EXPERIÊNCIA](https://github.com/everton191/optiflex-v1/issues/7) | fase 7 | READY | p2 | — |
| F7-01 | [Design system consolidado](https://github.com/everton191/optiflex-v1/issues/116) | Ux | DONE | p1 | — |
| F7-02 | [Tela de login](https://github.com/everton191/optiflex-v1/issues/117) | Access | DONE | p0 | F2-04 (usuários). Ciclo corrigido 08/10: F1-11 depende de F7-02. Concluído 08/10/2026 (`bae739b`, 137 testes). |
| F7-03 | [Dashboard por função e estados de painel](https://github.com/everton191/optiflex-v1/issues/118) | Dashboard | DONE | p2 | F4-20, F1-11. |
| F7-04 | [Navegação desktop](https://github.com/everton191/optiflex-v1/issues/119) | Ux | DONE | p2 | — |
| F7-05 | [Navegação mobile](https://github.com/everton191/optiflex-v1/issues/120) | Ux | DONE | p1 | F7-04. |
| F7-06 | [Tablets nas duas orientações](https://github.com/everton191/optiflex-v1/issues/121) | Ux | DONE | p3 | F7-01 (feito; entregue em `13ca34b` — media queries de retrato (721–1024px, experiência móvel com navegação inferior) e paisagem (721–1100px, menu lateral reduzido) já em `styles.css`; correção do `.topbar`: `height: 3.5rem` fixo cortava em 3px o bloco do usuário (resumo de 61px no bar de 56px, visível também no desktop 1440) → `min-height + height: auto` com badge de usuário compacto (`.user-summary .badge`), mantendo 56px; **validação automatizada em Chrome headless** nos dois tamanhos exigidos (768×1024 e 1024×768) nas 12 telas principais (dashboard, estoque, caixa, clientes, atendimentos, agenda, clínica, OS e admin) — `documentElement.scrollWidth == clientWidth` em 24/24 + estoque populado (produto+serviço) nas duas orientações — 439/439, build 0, tsc 0; screenshots inspecionados; teste manual em aparelho opcional). |
| F7-07 | [Formulários reutilizáveis](https://github.com/everton191/optiflex-v1/issues/122) | Ux | BACKLOG | p2 | F7-01, F2-07. |
| F7-08 | [Tabelas e filtros](https://github.com/everton191/optiflex-v1/issues/123) | Ux | DONE | p2 | F7-01. Entregue em `e44d5cb` — helpers puros `data-table.ts` (`toggleSort`/`sortRows` pt-BR com acentos, `filterRows` com `normalizeForSearch`, `paginateRows`/`pageCount`) + componente `DataTable` acessível em `components.tsx` (headers `<th aria-sort>` com botão ordenável, filtro opcional via prop `match`, paginação com botões Anterior/Próxima + `aria-live`, `emptyMessage`, `renderRow` para células ricas); listas de clientes e produtos do Estoque convertidas (ordenar por teclado, 10 por página); +9 testes unitários; 405/405, build 0, tsc 0. Libera F7-18. |
| F7-09 | [Modais e diálogos](https://github.com/everton191/optiflex-v1/issues/124) | Ux | DONE | p2 | F7-01. Entregue em `fbb2989` — `Dialog`/`Drawer` com foco inicial no primeiro elemento, trap de Tab (cicla dentro do overlay, Shift+Tab volta), Escape e retorno do foco ao gatilho no fechamento (`useOverlayFocus`); novo `ConfirmDialog` (mensagem + confirmar/voltar, botão destrutivo `button-danger` #a12525) no design system; `window.confirm` do excluir anexo clínico migrado para `ConfirmDialog` destructivo; botões "Confirmar cancelamento" do Caixa e das transferências marcados como destrutivos; 405/405, build 0, tsc 0. |
| F7-10 | [Busca global](https://github.com/everton191/optiflex-v1/issues/125) | Ux | BACKLOG | p2 | F1-11, F7-01. |
| F7-11 | [Indicadores de carregamento e erros](https://github.com/everton191/optiflex-v1/issues/126) | Ux | DONE | p1 | F1-12 (feito). Entregue em `affd182` — componente `ErrorState` (`role="alert"` + botão "Tentar novamente") em `components.tsx` com `.error-state` em `styles.css`; `Skeleton` aplicado no carregamento de Estoque, Recepção (agenda e fila), Ordens e Caixa; `EmptyState` nos vazios de Estoque, Recepção e Ordens; erro com retry no Caixa e na fila; 308/308, build 0, tsc 0. Teste manual de falha simulada pendente (CA do card). |
| F7-12 | [Notificações](https://github.com/everton191/optiflex-v1/issues/127) | Ux | BACKLOG | p2 | F4-13, F3-17, F4-04. |
| F7-13 | [Impressões e PDFs](https://github.com/everton191/optiflex-v1/issues/128) | Ux | DONE | p1 | F3-05, F3-10. Ciclo corrigido 08/10: F4-14 depende de F7-13. Entregue em `09e816a` — componente `PrintLayout` (`title`/`meta`/`brand`/`actions`; marca "Opticore" e paleta preto/branco ajustáveis) em `components.tsx` + classes `.print-*` em `styles.css` (`@media print` estendido); receita envolvida no layout; nova rota `/vendas/:saleId` (`SaleDocumentPage`, guard `sales.read`) com botão "Imprimir" no Caixa (popup `window.open` removido); detalhe da OS em `PrintLayout` com Ações/Insumos/Histórico em `.no-print`; matriz de guards = 21 rotas; 308/308, build 0, tsc 0. Teste manual de impressão dos 4 documentos pendente (CA do card). |
| F7-14 | [Etiquetas e comprovantes](https://github.com/everton191/optiflex-v1/issues/129) | Ux | BACKLOG | p3 | F7-13, F2-14. |
| F7-15 | [Assistente de configuração inicial](https://github.com/everton191/optiflex-v1/issues/130) | Ux | BACKLOG | p3 | F2-18 (feito em `b7f3e0a` — assistente funcional em `/admin/assistente`; F7-15 cobre refinamento de UX). |
| F7-16 | [Ajuda contextual](https://github.com/everton191/optiflex-v1/issues/131) | Ux | BACKLOG | p3 | F7-01. |
| F7-17 | [Acessibilidade](https://github.com/everton191/optiflex-v1/issues/132) | Ux | BACKLOG | p2 | F7-01, F7-11. |
| F7-18 | [Desempenho](https://github.com/everton191/optiflex-v1/issues/133) | Ux | BACKLOG | p2 | F7-08. |
| F7-19 | [Estados de sincronização na UI](https://github.com/everton191/optiflex-v1/issues/134) | Saas | BLOCKED | p2 | F5-07. |

### FASE 8 — QUALIDADE E LANÇAMENTO — épica #8

| ID | Card | Módulo | Status | Prio | Deps |
|---|---|---|---|---|---|
| E8 | [ÉPICA FASE 8 — QUALIDADE E LANÇAMENTO](https://github.com/everton191/optiflex-v1/issues/8) | fase 8 | BACKLOG | p1 | — |
| F8-01 | [Testes unitários](https://github.com/everton191/optiflex-v1/issues/135) | Infraestrutura | DONE | p1 | — |
| F8-02 | [Testes de integração](https://github.com/everton191/optiflex-v1/issues/136) | Infraestrutura | DONE | p1 | F8-01. |
| F8-03 | [Testes ponta a ponta](https://github.com/everton191/optiflex-v1/issues/137) | Infraestrutura | BLOCKED | p2 | F8-02 + decisão P5 (ferramenta e2e). |
| F8-04 | [Testes offline](https://github.com/everton191/optiflex-v1/issues/138) | Infraestrutura | IN PROGRESS | p1 | F3-09 (feito), F8-01 (feito; parcialmente entregue em `f5b8e0b` — teste automatizado de reabertura offline com sessão completa e backup íntegro, 363/363; procedimento de aparelho real no RELEASE_CHECKLIST §5.1; **falta executar e registrar evidência por dispositivo** para DONE). |
| F8-05 | [Testes multiempresa](https://github.com/everton191/optiflex-v1/issues/139) | Saas | BLOCKED | p1 | F5-04. |
| F8-06 | [Testes de permissões](https://github.com/everton191/optiflex-v1/issues/140) | Access | DONE | p1 | F1-11, F2-05 (entregue em `94b9d50` — matriz rota×perfil em `route-guards.ts`, negativos de vendedor/clínico/caixa, escopo por perfil). |
| F8-07 | [Auditoria de segurança](https://github.com/everton191/optiflex-v1/issues/141) | Access | DONE | p1 | F7-02, F1-11 (entregue em `277fdde` — `SECURITY_PLAN.md` com threat model, varredura automatizada de segredos e achados P0–P3; único P0 aberto = F1-12 erros globais, já em BACKLOG). |
| F8-08 | [Verificação de LGPD](https://github.com/everton191/optiflex-v1/issues/142) | Compliance | BLOCKED | p2 | orientação jurídica; F3-09 (anexos), F1-10 (feito). |
| F8-09 | [Testes de migração](https://github.com/everton191/optiflex-v1/issues/143) | Infraestrutura | DONE | p1 | F1-08. |
| F8-10 | [Recuperação de dados](https://github.com/everton191/optiflex-v1/issues/144) | Infraestrutura | DONE | p1 | F3-09. |
| F8-11 | [Homologação fiscal](https://github.com/everton191/optiflex-v1/issues/145) | Fiscal | BLOCKED | p2 | F6-08. |
| F8-12 | [Piloto com ótica real](https://github.com/everton191/optiflex-v1/issues/146) | Infraestrutura | BLOCKED | p1 | Conclusão da F3; F3/F4 parciais, F8-10 e F7-02 (feitos); piloto externo. |
| F8-13 | [Correções do piloto](https://github.com/everton191/optiflex-v1/issues/147) | Infraestrutura | BLOCKED | p1 | F8-12. |
| F8-14 | [Documentação para usuários](https://github.com/everton191/optiflex-v1/issues/148) | Infraestrutura | BACKLOG | p2 | F7-16. |
| F8-15 | [Suporte](https://github.com/everton191/optiflex-v1/issues/149) | Infraestrutura | BACKLOG | p3 | F8-14. |
| F8-16 | [Políticas comerciais](https://github.com/everton191/optiflex-v1/issues/150) | Infraestrutura | BLOCKED | p2 | decisão comercial. |
| F8-17 | [Preparação de versões](https://github.com/everton191/optiflex-v1/issues/151) | Infraestrutura | DONE | p2 | F8-02 (feito; entregue em `v0.1.0` — primeira tag semântica anotada em `2a58572` com validações pré-tag verdes, convenção semver documentada em `RELEASE_CHECKLIST.md` e changelog correspondente em `CHANGELOG_DEVELOPMENT.md`). |
| F8-18 | [Monitoramento pós-lançamento](https://github.com/everton191/optiflex-v1/issues/152) | Saas | BLOCKED | p2 | F5-17. |

## Dez próximas tarefas prioritárias (com dependências)

Ordem recomendada para a próxima sessão de desenvolvimento (status READY/IN PROGRESS, sem bloqueio externo):

| # | ID | Issue | Tarefa | Prioridade | Dependências | Justificativa |
|---|---|---|---|---|---|---|
| 1 | F8-04 | #138 | [Infraestrutura] Testes offline | P1 | F3-09 (feito), F8-01 (feito) | IN PROGRESS: automatizado entregue (`f5b8e0b`); aguardando execução do procedimento de aparelho real (RELEASE_CHECKLIST §5.1) e registro da evidência para fechar. |

Reservas (mesma ordem): F7-07, F7-10, F7-14, F7-15 (F2-18 concluído), F7-16, F7-17, F7-18 — todas com dependências concluídas. F3-04 e F3-12 foram consumidos em 08/10/2026 (`f43627c`, `93ebb03`); limites de desconto seguiram os defaults propostos (5%/R$ 50, 15%/R$ 300, 30%/R$ 1000) e podem ser ajustados por decisão do usuário. F7-18 (desempenho) foi desbloqueada por F7-08 e entra nas reservas. F2-18 (`b7f3e0a`), F2-13 (`0353eb6`), F2-15 (`c124ede`), F2-16 (`db1ade9`) e F7-06 (`13ca34b`) foram concluídas em 08/10/2026 e saíram da fila.

Os `#?` devem ser resolvidos pela tabela acima (coluna ID → link da issue). Os números já estão fixados nas tabelas das fases; para referência rápida: consulte `DEPENDENCIES.md`.

## Decisões que bloqueiam o andamento (aguardam o usuário)

| Decisão | Bloqueia | Card da épica | Registrar em |
|---|---|---|---|
| Infraestrutura de backend (provedor cloud) | Fase 5 inteira (19 cards) | #5 | `DECISIONS.md` |
| Especificação tributária válida + provedor fiscal | Fase 6 inteira (19 cards) + F2-17 | #6 | `DECISIONS.md` |
| Modelo comercial (planos, trial, preços) | F5-12..15, F8-16 | #5/#8 | `DECISIONS.md` |
| Regras de juros/multas/prazos de parcelamento | F4-13 (carnê) | #4 | `DECISIONS.md` |
| Ferramenta de testes e2e | F8-03 | #8 | `DECISIONS.md` |
| Orientação jurídica LGPD | F8-08 | #8 | `DECISIONS.md` |
| Política de garantia/reparo do negócio | F3-20 | #3 | `DECISIONS.md` |

## Regras de movimentação (Etapa 7)

1. Cada desenvolvimento corresponde a uma Issue; mover para `status/in-progress` ao iniciar.
2. Máximo de 1–2 issues em `in-progress` por sessão (evita mudanças conflitantes).
3. Commit relacionado à Issue no corpo/mensagem (ex.: `feat: ... (refs #12)`).
4. `npm.cmd test`, `npm.cmd run build` e `npx.cmd tsc -b --pretty false` verdes antes de `status/testing`/`done`.
5. `status/done` exige: critérios do card marcados, testes executados, docs do módulo e `PROJECT_STATUS.md` atualizados.
6. Nunca apagar histórico de tarefas concluídas; nunca recriar Issue existente (verificar duplicidade antes de cadastrar).

## Procedimento de retomada (Etapa 8)

Quando um agente iniciar nova sessão:

1. Confirmar a pasta local do projeto, branch e `git status`.
2. Ler `AGENTS.md`.
3. Ler `docs/project-management/PROJECT_STATUS.md`.
4. Consultar este quadro (coluna READY / IN PROGRESS).
5. Consultar `DEPENDENCIES.md` antes de iniciar.
6. Ler `docs/ai/modules/<módulo>/MODULE.md` + `AI_CONTEXT.md`.
7. Trabalhar somente no escopo do card; não inventar requisitos (novos requisitos = nova Issue em BACKLOG para avaliação).
8. Testar, registrar evidência, atualizar status da Issue + `PROJECT_STATUS.md`.

## Migração para GitHub Projects (quando o escopo existir)

1. `gh auth refresh -s read:project,project`.
2. `gh project create --owner everton191 --title "OPTICORE — MASTER DEVELOPMENT BOARD"`.
3. Adicionar o repositório `everton191/optiflex-v1` ao projeto.
4. Criar os campos: `Fase`, `Módulo`, `Prioridade`, `Tipo de trabalho`, `Dependências`, `Risco`, `Versão/Marco` (Single select/Text) — as labels já codificam Fase/Módulo/Prioridade/Tipo/Status.
5. Importar as 155 issues (as labels `status/*` viram as colunas Status do quadro).
6. Criar as views: Backlog (`status/backlog`), Ready (`status/ready`), In Progress, Code Review, Testing, Done, Blocked.
7. Passar a mover cards no Projects e manter este arquivo como espelho (ou gerá-lo via `gh project item-list`).
8. Registrar o link real do projeto em `PROJECT_STATUS.md` — **somente com o URL/ID retornados pelo GitHub**.
