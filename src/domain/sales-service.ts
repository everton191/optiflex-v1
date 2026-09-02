import type { Sale } from "./sales";
import type { SaleRepository } from "./repositories";

export class SalesService {
  constructor(private readonly repository: SaleRepository) {}
  list(storeId: string): Promise<Sale[]> { return this.repository.listByStore(storeId); }
  async createQuote(customerId: string, storeId: string, description: string, total: number): Promise<Sale> {
    if (!description.trim() || total <= 0) throw new Error("Informe descrição e valor válido.");
    const sale: Sale = { id: `sale-${crypto.randomUUID()}`, customerId, storeId, status: "QUOTE", description, total, createdAt: new Date().toISOString() };
    await this.repository.save(sale); return sale;
  }
}
