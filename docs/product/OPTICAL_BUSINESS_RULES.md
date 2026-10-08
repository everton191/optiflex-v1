# OPTICAL BUSINESS RULES — regras de negócio ópticas

**Status:** documento de requisitos **a validar pelo responsável da operação**. Nenhuma regra aqui pode ser implementada como decisão automática (auditoria: "nenhum diagnóstico ou preenchimento decisório automático").
Regras fiscais tributárias **não** estão aqui (ver `FISCAL_REQUIREMENTS.md`).

Atualizado em: 07/10/2026.

## 1. Prescrição e medidas (a validar)

- Campos por olho (OD/OE): esférico, cilíndrico, eixo (0–180°), adição, prisma/base opcionais (card F3-07).
- Medidas: DP/DNP total, de perto (convergência) quando aplicável, altura de montagem por olho, com unidade e origem (medido/informado) (F3-08).
- Prescrição é documento **versionado e imutável**; correções por retificação com autor/data/motivo preservando o original (F3-06).
- Quem prescreve é profissional habilitado; o sistema **não** interpreta graus nem recomenda tratamento.

## 2. Venda e orçamento

- Orçamento pode expirar; ao reabrir, itens/preços/prescrição vinculada devem permanecer (Fluxo 3).
- Desconto exige limite por função e aprovação registrada quando acima do limite (F3-12) — **limites a definir pelo negócio**.
- Venda confirmada baixa estoque dos itens e pode gerar **uma única** OS (regra já implementada e testada — não alterar sem regressão).

## 3. Estoque

- Saldo nunca negativo (regra transacional já implementada).
- Estoque mínimo gera alerta de reposição (LOW/OUT) — valor configurado por produto.
- Transferência entre filiais altera saldos uma única vez, com histórico nos dois lados (F4-06).
- Reserva por orçamento: pendência de produto (F4-05) — definir tempo de validade da reserva.

## 4. Caixa e pagamentos

- Uma sessão de caixa aberta por loja por vez; fechamento confere esperado × contado com diferença e autor.
- Sangria/suprimento exigem motivo e entram no saldo esperado (F4-16).
- Pagamento pode ser parcial; saldo pendente calculado em centavos.
- **Juros, multas, prazos e regras de atraso: NÃO DEFINIDOS** — bloqueio P4 em `DECISIONS.md` antes de F4-13.

## 5. Ordem de serviço e produção

Estados previstos pela auditoria (F3-14/F3-16): `OPEN → AGUARDANDO PRODUÇÃO → ENVIADO LABORATÓRIO → PRODUÇÃO → RETORNADO → CONFERÊNCIA → PRONTO → AVISADO → ENTREGUE` (+ cancelamento controlado). O enum atual é mais simples — ampliação com transições testadas.
- Prazo por OS com alerta de atraso (F3-17).
- Entrega registra responsável/data; regra "bloquear entrega com pendência financeira?" **a definir pelo negócio**.

## 6. Pós-venda

- Garantia/reparo/troca: política (prazo, cobertura, limite de reparos) **a definir** — bloqueio P7.
- Chamado de garantia liga cliente + venda/OS e entra no histórico (F3-20).

## 7. Limites clínicos de acesso

- Vendedor/recepção: dados ópticos necessários à venda (receita/medidas), **nunca** anamnese/prontuário completo (auditoria; ver `docs/ai/06_PERMISSION_MAP.md`).
- Cargo clínico configurável pela empresa, sem permissão derivada do nome da profissão (decisão D1).

## Como validar

1. Responsável da operação revisa este documento e marca `[VALIDADO]` por seção.
2. Decisões pendentes vão para `DECISIONS.md` (P4, P7, etc.).
3. Só então os cards correspondentes saem de backlog/blocked.
