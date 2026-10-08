import type { CashRepository, SaleRepository } from "./repositories";
import type { CashEntry, CashSession } from "./cash";

const money = (value: number) => Math.round(value * 100);

export class CashService {
  constructor(private readonly repository: CashRepository, private readonly sales: SaleRepository) {}

  private store(storeId: string): string {
    if (!storeId?.trim()) throw new Error("Selecione uma loja.");
    return storeId;
  }

  async open(storeId: string, openingBalance: number): Promise<CashSession> {
    this.store(storeId);
    if (!Number.isFinite(openingBalance) || openingBalance < 0) throw new Error("Informe um saldo inicial válido.");
    if (await this.repository.current(storeId)) throw new Error("Já existe um caixa aberto nesta loja.");
    return this.repository.openSession({ id: `cash-${crypto.randomUUID()}`, storeId, openingBalance, openedAt: new Date().toISOString() });
  }

  async receive(storeId: string, saleId: string, amount: number): Promise<CashEntry> {
    this.store(storeId);
    if (!Number.isFinite(amount) || money(amount) <= 0) throw new Error("Informe um valor válido.");
    const session = await this.repository.current(storeId);
    if (!session) throw new Error("Abra o caixa antes de registrar recebimentos.");
    const sale = await this.sales.get(saleId);
    if (!sale || sale.storeId !== storeId) throw new Error("Venda não encontrada nesta loja.");
    if (sale.status !== "CONFIRMED") throw new Error("Somente vendas confirmadas podem ser recebidas.");
    return this.repository.recordReceipt({ id: `cash-entry-${crypto.randomUUID()}`, sessionId: session.id, storeId, saleId, type: "RECEIPT", amount, createdAt: new Date().toISOString() });
  }

  async close(storeId: string, closingBalance: number, closedBy?: string, note?: string): Promise<CashSession> {
    this.store(storeId);
    if (!Number.isFinite(closingBalance) || closingBalance < 0) throw new Error("Informe o valor contado no fechamento.");
    if (!await this.repository.current(storeId)) throw new Error("Abra o caixa antes de fechar.");
    return this.repository.closeSession(storeId, { closingBalance, closedBy, note });
  }
}
