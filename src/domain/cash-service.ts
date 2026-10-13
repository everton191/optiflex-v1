import type { CashRepository, SaleRepository } from "./repositories";
import type { CashEntry, CashMovementType, CashSession, PaymentMethod } from "./cash";
import { assertValidPaymentMethod } from "./cash";
import { isMoney, toCents } from "./money";

export class CashService {
  constructor(private readonly repository: CashRepository, private readonly sales: SaleRepository) {}

  private store(storeId: string): string {
    if (!storeId?.trim()) throw new Error("Selecione uma loja.");
    return storeId;
  }

  async open(storeId: string, openingBalance: number): Promise<CashSession> {
    this.store(storeId);
    if (!isMoney(openingBalance) || openingBalance < 0) throw new Error("Informe um saldo inicial válido.");
    if (await this.repository.current(storeId)) throw new Error("Já existe um caixa aberto nesta loja.");
    return this.repository.openSession({ id: `cash-${crypto.randomUUID()}`, storeId, openingBalance, openedAt: new Date().toISOString() });
  }

  async receive(storeId: string, saleId: string, amount: number, paymentMethod: PaymentMethod, reference?: string): Promise<CashEntry> {
    this.store(storeId);
    if (paymentMethod === undefined) throw new Error("Informe a forma de pagamento.");
    assertValidPaymentMethod(paymentMethod);
    if (!isMoney(amount) || toCents(amount) <= 0) throw new Error("Informe um valor válido.");
    const method = assertValidPaymentMethod(paymentMethod);
    const motive = reference?.trim() || undefined;
    if (motive && method !== "PIX") throw new Error("Referência de pagamento é válida apenas para PIX.");
    const session = await this.repository.current(storeId);
    if (!session) throw new Error("Abra o caixa antes de registrar recebimentos.");
    const sale = await this.sales.get(saleId);
    if (!sale || sale.storeId !== storeId) throw new Error("Venda não encontrada nesta loja.");
    if (sale.status !== "CONFIRMED") throw new Error("Somente vendas confirmadas podem ser recebidas.");
    return this.repository.recordReceipt({ id: `cash-entry-${crypto.randomUUID()}`, sessionId: session.id, storeId, saleId, type: "RECEIPT", amount, paymentMethod: method, reason: motive, createdAt: new Date().toISOString() });
  }

  async recordMovement(storeId: string, type: CashMovementType, amount: number, reason: string, author?: string): Promise<CashEntry> {
    this.store(storeId);
    if (type !== "WITHDRAWAL" && type !== "DEPOSIT") throw new Error("Tipo de movimentação inválido.");
    if (!isMoney(amount) || toCents(amount) <= 0) throw new Error("Informe um valor válido.");
    const motive = reason?.trim();
    if (!motive) throw new Error("Informe o motivo da movimentação.");
    const session = await this.repository.current(storeId);
    if (!session) throw new Error("Abra o caixa antes de registrar movimentações.");
    return this.repository.recordMovement({ id: `cash-entry-${crypto.randomUUID()}`, sessionId: session.id, storeId, type, amount, reason: motive, author: author?.trim() || undefined, createdAt: new Date().toISOString() });
  }

  async close(storeId: string, closingBalance: number, closedBy?: string, note?: string): Promise<CashSession> {
    this.store(storeId);
    if (!isMoney(closingBalance) || closingBalance < 0) throw new Error("Informe o valor contado no fechamento.");
    if (!await this.repository.current(storeId)) throw new Error("Abra o caixa antes de fechar.");
    return this.repository.closeSession(storeId, { closingBalance, closedBy, note });
  }
}
