# FISCAL REQUIREMENTS — requisitos fiscais do Opticore

> Documento de requisitos da Fase 6 (Notas Fiscais), que permanece **BLOCKED** por
> especificação fiscal/decisão de provedor (raiz P2 no `KANBAN.md`).
> Este arquivo consolida o que **já está pronto** na base e o que **depende da especificação**.

## O que já existe (sem cálculo tributário)

### Cadastro da empresa (F2-03 `75df1c0`, F2-01 `4f78fe6`)

- `OrganizationSettings`: `taxRegime` (SIMPLES_NACIONAL, SIMPLES_EXCESSO_SUBRECEITA, REGIME_NORMAL, MEI), IE (`stateRegistration`), IM (`municipalRegistration`), CNAE (`formatCnae`/`isValidCnae`, 7 dígitos), razão social, CNPJ (`isValidCnpj` com dígito verificador), telefone, e-mail e endereço.
- Normalização e validação no `saveSettings`; exibição no dashboard (razão social · CNPJ · cidade/UF).

### Campos fiscais por produto (F2-15 `c124ede`)

- `InventoryItem.fiscal?` (`ProductFiscalFields`) — **opcional**, sem bump Dexie:
  - `ncm` — 8 dígitos (ex.: `9004.10.00`), armazenado só com dígitos, exibido com pontuação (`formatNcm`);
  - `cfop` — 4 dígitos (ex.: `5102`, `6108`);
  - `cest` — 7 dígitos (ex.: `03.007.00`), exibido com pontuação (`formatCest`);
  - `unit` — enum `fiscalUnits`: UN, CX, KG, M, PAR, KIT.
- Validação básica em `normalizeProductFiscal` (criação/edição); `createVariant` herda o fiscal da base.
- Backup valida o objeto `fiscal` (campos string + unidade enum).
- UI: fieldset "Dados fiscais (opcional — preparação para NF-e)" no cadastro de produto.

## O que depende da especificação (Fase 6 — BLOCKED)

- **F6-01** Cadastro fiscal da ótica — depende da especificação fiscal externa (F2-03 pronto).
- **F6-04** NCM, CFOP e demais classificações — dependência F2-15 **concluída**; segue BLOCKED pela especificação (tabelas oficiais, regras por regime/produto).
- Cálculo tributário, emissão/assinatura/envio de NF-e, carta de correção e cancelamento — **fora do escopo até hoje** (F2-15 explicitamente sem cálculo).
- Homologação fiscal (F8-11) e migração de XML (F2-17) permanecem bloqueadas pela mesma raiz.

## Decisões pendentes (aguardam o usuário)

1. **Provedor/modelo de NF-e** (P2): emissor local com SEFAZ, serviço terceirizado ou PSP — define F6-01..F6-06.
2. **Regime tributário real da ótica piloto** (F6-02): SIMPLES/MEI/normal — decisão contábil do cliente.
3. **Tabelas de referência**: NCM/CFOP/CEST oficiais a usar como base de validação (hoje apenas formato é validado, não conteúdo).

## Regras mantidas neste documento

- Nenhum valor tributário é calculado pelo Opticore até a especificação da Fase 6.
- Campos fiscais preenchidos são **dados de entrada** (preparação), não resultado de cálculo.
- Qualquer evolução (validação de conteúdo NCM/CFOP, CFOP por natureza da operação) deve começar aqui e nos cards da Fase 6.
