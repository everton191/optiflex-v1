import type { Sale, SaleItem } from "./sales";
import { itemsTotalCents, stockMovementsFor } from "./sales";
import type { SaleRepository } from "./repositories";
import { fromCents, requireMoney, toCents } from "./money";

const valid = (value: number) => Number.isFinite(value);

export class SalesService {
  constructor(private readonly repository: SaleRepository) {}
  list(storeId: string): Promise<Sale[]> { return this.repository.listByStore(storeId); }

  async createQuote(customerId: string, storeId: string, description: string, total: number, items: readonly SaleItem[] = []): Promise<Sale> {
    for (const item of items) {
      if (!item.name.trim() || !item.inventoryItemId.trim()) throw new Error("Informe o produto do estoque.");
      if (!valid(item.quantity) || item.quantity <= 0) throw new Error("Informe uma quantidade válida para cada item.");
      if (!valid(item.unitPrice) || item.unitPrice < 0) throw new Error("Informe um preço válido para cada item.");
    }
    if (items.length && items.some((item, index) => items.findIndex((other) => other.inventoryItemId === item.inventoryItemId) !== index)) throw new Error("Produto repetido no orçamento.");
    const finalTotal = items.length ? fromCents(itemsTotalCents(items)) : requireMoney(total, "Informe descrição e valor válido.");
    const finalDescription = description.trim() || (items.length ? items.map((item) => item.name).join(", ") : "");
    if (!finalDescription || toCents(finalTotal) <= 0) throw new Error("Informe descrição e valor válido.");
    const sale: Sale = { id: `sale-${crypto.randomUUID()}`, customerId, storeId, status: "QUOTE", paymentStatus: "PENDING", description: finalDescription, total: finalTotal, items: items.length ? [...items] : undefined, createdAt: new Date().toISOString() };
    await this.repository.save(sale); return sale;
  }

  async confirm(sale: Sale): Promise<Sale> {
    if (sale.status !== "QUOTE") throw new Error("Somente orçamentos pendentes podem ser confirmados.");
    requireMoney(sale.total, "Valores da venda inválidos.");
    if (toCents(sale.total) <= 0) throw new Error("Valores da venda inválidos.");
    for (const item of sale.items ?? []) {
      requireMoney(item.quantity, "Valores da venda inválidos.");
      requireMoney(item.unitPrice, "Valores da venda inválidos.");
      if (item.quantity <= 0 || toCents(item.unitPrice) < 0) throw new Error("Valores da venda inválidos.");
    }
    const movements = stockMovementsFor(sale);
    await this.repository.confirm({ ...sale, status: "CONFIRMED" }, movements);
    return { ...sale, status: "CONFIRMED" };
  }
}
