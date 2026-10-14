# Regras de negócio — Opticore

Documento de regras operacionais relevantes para a ótica. Este arquivo nasceu com o ciclo de pagamentos (F4-11) e cresce por card.

## Pagamentos por forma (F4-11, 08/10/2026)

- **Dinheiro (CASH):** o operador informa o valor recebido; o sistema calcula o troco em centavos (`receiptPlan` em `src/domain/cash.ts`, sem drift de arredondamento) e grava no caixa **apenas o valor aplicado à venda** — o troco sai do caixa e não vira movimento. O troco aparece em tempo real ao digitar o valor e na mensagem de confirmação ("Recebimento registrado. Troco: R$ X.").
- **PIX:** referência opcional digitada por venda (input só aparece com PIX selecionado); guardada em `CashEntry.reason` e exibida em "Movimentos registrados". Referência preenchida com outra forma é rejeitada ("Referência de pagamento é válida apenas para PIX.").
- **Cartão (Débito/Crédito):** o valor deve cobrir exatamente o saldo pendente; sem troco e sem referência.
- **Parcial:** qualquer forma pode receber parcial; o saldo pendente permanece até a soma dos RECEIPTs cobrir o total (`SalePaymentStatus` `PENDING`/`PARTIAL`/`PAID`).
- **Fechamento:** a aba Sessão resume recebimentos por forma (`.method-totals`); todos os cálculos monetários usam precisão de centavos (`toCents`).
- **Fora do escopo:** gateway/QR PIX automático, parcelamento, juros e carnê (F4-13 bloqueado por decisão P4).

## Refração estruturada (F3-07, 08/10/2026)

- **Documento próprio:** a prescrição estruturada (`Prescription`) é append-only e independe do campo texto do prontuário; versões emitidas nunca são reescritas e a vigente é resolvida por `activePrescription`.
- **Campos por olho (OD/OE):** esférico (`sphere`), cilíndrico (`cylinder`), eixo (`axis`, graus) e adição (`add`), todos em dioptrias e opcionais — mas ao menos um grau ou uma observação é obrigatório.
- **Validação de faixa:** eixo aceita apenas 0–180 ("O eixo deve estar entre 0° e 180°."); graus não finitos (NaN/Infinity) são rejeitados. O formulário da workspace mostra os limites (0–180) e grava via `issuePrescription` com autora = profissional da sessão.
- **Persistência:** tabela `prescriptions` (Dexie v13) com guarda de loja pelo atendimento; backup `schema: 13` (schemas 10–12 importam com a tabela vazia).
- **Fora do escopo:** cálculo automático de grau, decisões de tratamento e UI de retificação (domínio pronto; UI entra com F3-06). Regras clínicas devem ser homologadas com o responsável da operação.
