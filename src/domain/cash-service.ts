import type { CashRepository } from "./repositories";
import type { CashSession } from "./cash";

export class CashService {
  constructor(private readonly repository: CashRepository) {}
  async open(storeId: string, openingBalance: number): Promise<CashSession> {
    if (await this.repository.current(storeId)) throw new Error("Já existe um caixa aberto nesta loja.");
    const session = { id: `cash-${crypto.randomUUID()}`, storeId, openingBalance, openedAt: new Date().toISOString() };
    await this.repository.saveSession(session); return session;
  }
  async receive(storeId: string, saleId: string, amount: number): Promise<void> {
    const session = await this.repository.current(storeId);
    if (!session) throw new Error("Abra o caixa antes de registrar recebimentos.");
    if (amount <= 0) throw new Error("Valor inválido.");
    await this.repository.addEntry({ id: `cash-entry-${crypto.randomUUID()}`, sessionId: session.id, storeId, saleId, type: "RECEIPT", amount, createdAt: new Date().toISOString() });
  }
}
