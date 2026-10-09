# DEPENDENCIES — mapa de dependências do Opticore

Atualizado em: 08/10/2026 · IDs locais (`F3-14`) resolvem para Issues na tabela de `KANBAN.md`.

Legenda: **OBR** = dependência obrigatória (não iniciar sem ela) · **OPC** = melhoria opcional/paralela possível.

## Correções de 08/10/2026 — ciclos eliminados (7 → 0)

Detecção por SCC (Tarjan) sobre as colunas Deps do `KANBAN.md` (147 nós, 184 arestas).

| # | Ciclo antes | Correção aplicada | Issues atualizadas |
|---|---|---|---|
| 1 | F1-06 ↔ F2-11 | modelo **antes** do catálogo: F2-11 depende de F1-06 | #14 |
| 2 | F1-07 ↔ F3-06 ↔ F3-07 | modelos antes do uso clínico: F3-06/F3-07 dependem de F1-07 | #15 |
| 3 | F1-11 ↔ F2-04 ↔ F7-02 | fila correta: **F2-04 → F7-02 → F1-11** (CRUD → login → escopo por registro) — os três feitos em 08/10 | #26, #117, #19 |
| 4 | F1-12 ↔ F7-11 | infraestrutura de erros antes dos indicadores: F7-11 depende de F1-12 | #20 |
| 5 | F2-01 ↔ F2-03 | cadastro da empresa antes dos dados jurídicos: F2-03 depende de F2-01 | #23 |
| 6 | F3-14 ↔ F3-15 | OS antes de laboratórios: F3-15 depende de F3-14 | #53 |
| 7 | F4-14 ↔ F7-13 | framework de impressão antes do carnê: F4-14 depende de F7-13 | #128 |

Corpos das issues e colunas do `KANBAN.md` sincronizados; verificação final: **0 ciclos**.

### Status corrigidos (decisão já registrada, label desatualizada)

| Card | Issue | De → Para | Motivo |
|---|---|---|---|
| F4-13 parcelamentos | #70 | BACKLOG → **BLOCKED** | decisão P4 (juros/multas/prazo) já listada como bloqueante |
| F8-03 testes e2e | #137 | BACKLOG → **BLOCKED** | decisão P5 (ferramenta) |
| F3-20 garantias | #57 | BACKLOG → **BLOCKED** | decisão P7 (política de garantia) |

Anomalia inversa encontrada e mantida com ressalva: **F4-17 (DONE) depende de F4-16 (não concluído)** — a dependência é opcional (sangria/suprimento *afina* os totais; o fechamento foi implementado e testado em `cbcf80f`). Registrar em F4-16 que ela alimenta o F4-17.

## Classificação dos bloqueios (08/10/2026)

| Categoria | O que é | Cards |
|---|---|---|
| **Decisão externa pendente** | aguarda o usuário/jurídico/contador — não é código | F4-13, F8-03, F3-20 (corrigidos acima); F8-08, F8-16, F5-12..15, F2-17, F5-01, F6-01 (raiz das Fases 5 e 6) |
| **Bloqueio técnico real** | dependência de código ainda não concluído | F3-17←F3-14; F8-06←F2-05; F4-14/15←F4-13; F7-19←F5-07 |
| **Fase futura (escopo já planejado)** | bloqueada por estrutura do roadmap, raiz = decisão das fases 5/6 | F5-02..19 (após F5-01), F6-02..19 (após F6-01), F8-05/11/12/13/18 |
| **Dependência concluída, status desatualizado** | verificação automática: **nenhuma** (0 BACKLOG/BLOCKED com deps todas DONE) | — |

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
F1-09 precisão decimal (FEITO 08/10 — OBR p/ F4-13 parcelas)
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
F1-07 modelos de prescrição/OS (OBR — parte de OS já testada em 8a68d67)
  └─ F3-14 OS (IN PROGRESS)
       ├─ F3-15 laboratórios (OBR p/ produção; pré-req: F2-10 fornecedores)
       ├─ F3-16 acompanhamento de fabricação (OBR p/ prazo fino)
       ├─ F3-17 prazos e alertas (parcial — dashboard pronto)
       ├─ F3-18 produtos prontos (OPC, usa F4-5 reserva)
       ├─ F3-19 entrega ao cliente (OBR p/ fechar ciclo)
       └─ F3-20 garantias/ajustes (BLOCKED: decisão P7 política)
F3-13 confirmação de venda (FEITO) alimenta F3-14
```

### 4. Organização → usuários → permissões → isolamento SaaS

```text
F2-04 usuários CRUD (FEITO 08/10 — sem dependências; perfis pré-definidos)
  └─ F7-02 login local (P0, FEITO 08/10 — `bae739b`, 137 testes)
       └─ F1-11 permissões/escopo por registro (P0, FEITO 08/10 — `a2c1369`, 149 testes)
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
F2-01 cadastro da empresa → F2-03 dados jurídicos (OBR)
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
F3-09 conteúdo real de anexos (P0, DONE — `6ce9c9a`)
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

1. Primeiro tarefas que **desbloqueiam várias outras** (F1-11 escopo feito → F2-05 permissões por loja / F8-06 testes de permissão).
2. Depois P0 de integridade/perda de dado (F4-18 estornos; F3-09 anexos concluído).
3. Nunca iniciar card com status `blocked` — resolver ou registrar a decisão em `DECISIONS.md` antes.
4. Fases 5 e 6 só começam quando a decisão correspondente estiver registrada.
