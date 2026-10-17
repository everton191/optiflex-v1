# FISCAL REQUIREMENTS — requisitos fiscais (Fase 6)

**Status: NÃO INICIADO — bloqueado pela decisão P2 (especificação tributária + provedor fiscal) em `docs/project-management/DECISIONS.md`.**
Épica #6 · cards F6-01..F6-19 + F2-15/F2-17. **Proibido implementar cálculo tributário presumido sem especificação validada** (auditoria).

Atualizado em: 07/10/2026 · grep em `src/` não encontrou nenhum código fiscal (NF-e/NFC-e/NCM/CFOP/certificado).

## Responsabilidades separadas (SaaS × cliente)

| Assunto | Responsabilidade |
|---|---|
| Regras fiscais da empresa (regime, NCM/CFOP aplicáveis, obrigações) | **Empresa cliente** (com seu contador) |
| Emissão em nome da empresa (certificado, credenciais, prazos legais) | **Empresa cliente** |
| Modelo de documentos, validação, tratamento de rejeição, arquivamento XML | Produto (Opticore) com adapter do provedor |
| Disponibilidade da ferramenta, segurança das credenciais fornecidas, logs | **Fornecedor do SaaS** |
| Cálculo tributário | **Não implementar** sem especificação validada (não é responsabilidade presumida do SaaS) |

## Escopo planejado (resumo dos cards)

1. **Identificação fiscal da empresa** (F6-01..03): CNPJ já existe em dados jurídicos (F2-03), + regime, IE, IM, CNAE.
2. **Classificação de produto** (F2-15 → F6-04): NCM, CFOP, CEST, unidade por item.
3. **Modelo independente de documento** (F6-05): entidade `FiscalDocument` com adapter por provedor (nunca amarrar o domínio a um provedor).
4. **Integração** (F6-06..08): API emissora, NF-e, NFC-e (com QR Code/DANFE), NFS-e quando o município exigir (F6-09).
5. **Operação segura** (F6-10..12): certificado A1 em cofre de segredos, credenciamento, ambientes homologação/produção com indicador visível.
6. **Qualidade do envio** (F6-13..15): validação prévia, tradução de rejeições, cancelamento/eventos com prazo e rastro.
7. **Documentos** (F6-16..17): XML + auxiliares arquivados com busca; histórico por loja/período.
8. **Segurança/governança** (F6-18..19): sem segredo em repo/log; versão da regra carimbada no documento.
9. **Homologação** (F8-11): evidência de aprovação por tipo antes de produção.

## Pré-requisitos fora da Fase 6

- F2-03 dados jurídicos · F2-15 campos fiscais do produto · F4-10 formas de pagamento (NFC-e) · F4-18 estornos (cancelamento de venda × evento fiscal).

## Marco de entrada (gate)

Só iniciar F6-01+ quando existir, em `DECISIONS.md`:

1. Definição de quais documentos a ótica emite (NF-e, NFC-e, NFS-e?).
2. Regime tributário e estado/município (regras variam).
3. Provedor fiscal escolhido + quem faz credenciamento.
4. Confirmação de quem responde pelos dados fiscais (cliente × SaaS).

## Fontes

- Auditoria Fase H/F: `docs/DEVELOPMENT_AUDIT_A_H.md`.
- `docs/project-management/KANBAN.md` (fase 6) · `DEPENDENCIES.md` (cadeia 6) · `DECISIONS.md` (P2).
