# DEPENDENCIES — mapa de dependências do Opticore

Atualizado em: 07/10/2026 · IDs locais (`F3-14`) resolvem para Issues na tabela de `KANBAN.md`.

Legenda: **OBR** = dependência obrigatória (não iniciar sem ela) · **OPC** = melhoria opcional/paralela possível.

## Cadeias principais (Etapa 6)

### 1. Catálogo → venda → estoque → fiscal

```text
F1-06 modelos produto/pagamento (OBR)
  └─ F2-11 catálogo de produtos (OBR)
       ├─ F2-14 códigos/preços/custos (OBR p/ margem)
       ├─ F3-11 PDV armações/lentes (OBR p/ Fluxo 2)
       └─ F2-15 campos fiscais do produto (OBR p/ F6)
            └─ F6-04 NCM/CFOP (OBR)
                 └─ F6-07 NF-e / F6-08 NFC-e (OBR p/ emissão)
F1-09 precisão decimal (OBR p/ F4-13 parcelas)
```

### 2. Venda confirmada → pagamentos → caixa → relatórios

```text
F4-7 baixa transacional (FEITO)
  └─ F4-9 recebimentos idempotentes (FEITO)
       ├─ F4-10 formas de pagamento (OBR p/ conciliação)
       │    ├─ F4-11 PIX/dinheiro/cartão (OBR p/ troco)
       │    ├─ F4-12 pagamentos parciais (OBR p/ carnê)
       │    │    └─ F4-13 parcelamentos (OBR p/ carnê)
       │    │         ├─ F4-14 crediário/carnê (OPC)
       │    │         └─ F4-15 contas a receber (OBR p/ gestão)
       │    └─ F4-19 relatórios financeiros (OBR p/ gestão)
       ├─ F4-16 suprimento/sangria (independente)
       ├─ F4-18 estornos/cancelamentos (OBR p/ rastreabilidade)
       └─ F4-17 fechamento de caixa (FEITO — consome F4-10/16)
```

### 3. Venda confirmada → ordem de serviço → laboratório → entrega

```text
F3-13 confirmação de venda (FEITO)
  └─ F3-14 OS (IN PROGRESS)
       ├─ F1-07 histórico de eventos da OS (OBR)
       ├─ F3-15 laboratórios (OBR p/ produção)
       │    └─ pré-req: F2-10 cadastro de fornecedores/lab
       ├─ F3-16 acompanhamento de fabricação (OBR p/ prazo fino)
       ├─ F3-17 prazos e alertas (parcial — dashboard pronto)
       ├─ F3-18 produtos prontos (OPC, usa F4-5 reserva)
       ├─ F3-19 entrega ao cliente (OBR p/ fechar ciclo)
       └─ F3-20 garantias/ajustes (OPC pós-ciclo; exige política)
```

### 4. Organização → usuários → permissões → isolamento SaaS

```text
F7-02 login local (P0, READY)
  └─ F1-11 permissões/escopo por registro (P0)
       ├─ F2-04 usuários CRUD (OBR)
       ├─ F2-05 permissões por loja (OBR)
       └─ F8-06 testes de permissões (OBR p/ evidência)
F1-05 organizationId nos registros (OBR p/ SaaS)
  └─ F5-01 backend (BLOQUEIO: decisão)
       ├─ F5-02 autenticação real (OBR)
       ├─ F5-03 organizações/filiais → F5-04 isolamento → F5-05 policies → F5-06 RLS
       ├─ F5-07 sync → F5-08 fila → F5-09 conflitos → F7-19 estados de sync
       └─ F8-05 testes multiempresa (OBR p/ evidência)
```

### 5. Backend → sincronização → operação multi-dispositivo

```text
F5-01 (decisão) → F5-07 sync offline → F5-08 outbox → F5-09 conflitos
  └─ F5-10 backup nuvem (OPC local já existe) → F8-04 testes offline → F8-12 piloto
```

### 6. Cadastro fiscal → provedor → homologação → emissão

```text
F2-03 dados jurídicos (OBR)
  └─ F6-01/02/03 identificação fiscal (BLOQUEIO: especificação)
F2-11 catálogo → F2-15 campos fiscais → F6-04 NCM/CFOP
F6-05 modelo de documento (OBR)
  └─ F6-06 adapter API (BLOQUEIO: provedor) + F6-10 certificados + F6-12 ambientes
       ├─ F6-07 NF-e / F6-08 NFC-e / F6-09 NFS-e
       ├─ F6-13 validação → F6-14 rejeições → F6-15 cancelamento/eventos
       ├─ F6-16 XML/auxiliares → F6-17 histórico
       └─ F8-11 homologação (OBR p/ produção)
```

### 7. Anexos clínicos (linha P0)

```text
F3-09 conteúdo real de anexos (P0, READY)
  ├─ exige F1-08 migração de store (FEITO)
  └─ alimenta F8-10 backup com anexos → F5-11 storage seguro (nuvem)
```

## Dependências que NÃO são obrigatórias (podem seguir em paralelo)

- F4-16 suprimento/sangria (só depende da abertura, feita).
- F2-06 edição de clientes (F1-03 é opcional/estilo).
- F7-05 navegação mobile, F7-11 estados de UI (independentes do domínio).
- F4-05 reserva de itens e F4-06 transferência (esperam prioridade, não bloqueiam o núcleo).

## Decisões externas que bloqueiam (não são código)

| Decisão | Bloqueia |
|---|---|
| Backend/nuvem | F5-01 → toda Fase 5 + F8-05 + F7-19 + F5-18/10/11 |
| Provedor fiscal + especificação | toda Fase 6 + F2-17 + F8-11 |
| Modelo comercial | F5-12..15, F8-16 |
| Juros/multas/prazos | F4-13 → F4-14/15 |
| Ferramenta e2e | F8-03 |
| LGPD (jurídico) | F8-08 |
| Política de garantia | F3-20 |

## Regra de priorização

1. Primeiro tarefas que **desbloqueiam várias outras** (F7-02 login → F1-11 escopo → F2-04/F2-05).
2. Depois P0 de integridade/perda de dado (F3-09 anexos, F4-18 estornos).
3. Nunca iniciar card com status `blocked` — resolver ou registrar a decisão em `DECISIONS.md` antes.
4. Fases 5 e 6 só começam quando a decisão correspondente estiver registrada.
