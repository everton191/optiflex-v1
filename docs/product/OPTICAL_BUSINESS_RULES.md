# Regras de negócio — Opticore

Documento de regras operacionais relevantes para a ótica. Este arquivo nasceu com o ciclo de pagamentos (F4-11) e cresce por card.

## Pagamentos por forma (F4-11, 08/10/2026)

- **Dinheiro (CASH):** o operador informa o valor recebido; o sistema calcula o troco em centavos (`receiptPlan` em `src/domain/cash.ts`, sem drift de arredondamento) e grava no caixa **apenas o valor aplicado à venda** — o troco sai do caixa e não vira movimento. O troco aparece em tempo real ao digitar o valor e na mensagem de confirmação ("Recebimento registrado. Troco: R$ X.").
- **PIX:** referência opcional digitada por venda (input só aparece com PIX selecionado); guardada em `CashEntry.reason` e exibida em "Movimentos registrados". Referência preenchida com outra forma é rejeitada ("Referência de pagamento é válida apenas para PIX.").
- **Cartão (Débito/Crédito):** o valor deve cobrir exatamente o saldo pendente; sem troco e sem referência.
- **Parcial:** qualquer forma pode receber parcial; o saldo pendente permanece até a soma dos RECEIPTs cobrir o total (`SalePaymentStatus` `PENDING`/`PARTIAL`/`PAID`).
- **Fechamento:** a aba Sessão resume recebimentos por forma (`.method-totals`); todos os cálculos monetários usam precisão de centavos (`toCents`).
- **Fora do escopo:** gateway/QR PIX automático, parcelamento, juros e carnê (F4-13 bloqueado por decisão P4).
