import type { QuoteStatus, Sale, SaleItem, SalePrescription, SaleTreatment } from "./sales";
import { assertValidSaleItems, assertValidSalePrescription, assertValidSaleTreatments, itemsTotalCents, quoteStatusOf, quoteTransitions, refundStockMovementsFor, stockMovementsFor, treatmentsTotalCents } from "./sales";
import { defaultOrganization } from "./access";
import type { PrescriptionRepository, SaleRepository } from "./repositories";
import { fromCents, requireMoney, toCents } from "./money";
import type { Prescription } from "./clinical";

export interface QuoteInput { customerId: string; description: string; total: number; items: readonly SaleItem[]; prescription?: SalePrescription; treatments?: readonly SaleTreatment[] }

function buildQuote(input: QuoteInput): { customerId: string; description: string; total: number; items?: SaleItem[]; treatments?: SaleTreatment[]; prescription?: SalePrescription } {
  const { items, treatments = [] } = input;
  assertValidSaleItems(items);
  if (items.length && items.some((item, index) => items.findIndex((other) => other.inventoryItemId === item.inventoryItemId) !== index)) throw new Error("Produto repetido no orçamento.");
  assertValidSaleTreatments(treatments);
  const hasLines = items.length > 0 || treatments.length > 0;
  const finalTotal = hasLines ? fromCents(itemsTotalCents(items) + treatmentsTotalCents(treatments)) : requireMoney(input.total, "Informe descrição e valor válido.");
  const finalDescription = input.description.trim() || (hasLines ? [...items.map((item) => item.name), ...treatments.map((treatment) => treatment.name)].join(", ") : "");
  if (!finalDescription || toCents(finalTotal) <= 0) throw new Error("Informe descrição e valor válido.");
  if (input.prescription) {
    assertValidSalePrescription(input.prescription);
    if (input.prescription.customerId !== input.customerId) throw new Error("A prescrição vinculada pertence a outro cliente.");
  }
  return { customerId: input.customerId, description: finalDescription, total: finalTotal, items: items.length ? [...items] : undefined, treatments: treatments.length ? [...treatments] : undefined, prescription: input.prescription };
}

export class SalesService {
  constructor(private readonly repository: SaleRepository, private readonly prescriptionRepository?: PrescriptionRepository) {}
  list(storeId: string): Promise<Sale[]> { return this.repository.listByStore(storeId); }

  async listCustomerPrescriptions(customerId: string, storeId: string): Promise<Prescription[]> {
    if (!this.prescriptionRepository) throw new Error("Consulta de prescrições indisponível.");
    return this.prescriptionRepository.listByCustomer(customerId, storeId);
  }

  async createQuote(customerId: string, storeId: string, description: string, total: number, items: readonly SaleItem[] = [], prescription?: SalePrescription, treatments: readonly SaleTreatment[] = []): Promise<Sale> {
    const built = buildQuote({ customerId, description, total, items, prescription, treatments });
    const sale: Sale = { id: `sale-${crypto.randomUUID()}`, customerId: built.customerId, storeId, status: "QUOTE", paymentStatus: "PENDING", description: built.description, total: built.total, items: built.items, treatments: built.treatments, prescription: built.prescription, createdAt: new Date().toISOString(), organizationId: defaultOrganization.id };
    await this.repository.save(sale); return sale;
  }

  async updateQuote(sale: Sale, input: QuoteInput): Promise<Sale> {
    if (sale.status !== "QUOTE") throw new Error("Somente orçamentos em negociação podem ser editados.");
    if (quoteStatusOf(sale) !== "DRAFT") throw new Error("Apenas rascunhos de orçamento podem ser editados.");
    const built = buildQuote(input);
    const keptPrescription = sale.prescription?.customerId === built.customerId ? sale.prescription : undefined;
    const updated: Sale = { ...sale, customerId: built.customerId, description: built.description, total: built.total, items: built.items, treatments: built.treatments, prescription: built.prescription ?? keptPrescription };
    await this.repository.save(updated); return updated;
  }

  async transitionQuote(sale: Sale, to: QuoteStatus): Promise<Sale> {
    if (sale.status !== "QUOTE") throw new Error("Somente orçamentos em negociação podem mudar de estado.");
    const from = quoteStatusOf(sale);
    if (!quoteTransitions[from].includes(to)) throw new Error("Este estado do orçamento não permite essa mudança.");
    const updated: Sale = { ...sale, quoteStatus: to };
    await this.repository.save(updated); return updated;
  }

  async confirm(sale: Sale): Promise<Sale> {
    if (sale.status !== "QUOTE") throw new Error("Somente orçamentos pendentes podem ser confirmados.");
    const quoteStatus = quoteStatusOf(sale);
    if (quoteStatus === "REJECTED" || quoteStatus === "EXPIRED") throw new Error("Orçamento recusado ou expirado não pode ser confirmado.");
    requireMoney(sale.total, "Valores da venda inválidos.");
    if (toCents(sale.total) <= 0) throw new Error("Valores da venda inválidos.");
    for (const item of sale.items ?? []) {
      requireMoney(item.quantity, "Valores da venda inválidos.");
      requireMoney(item.unitPrice, "Valores da venda inválidos.");
      if (item.quantity <= 0 || toCents(item.unitPrice) < 0) throw new Error("Valores da venda inválidos.");
    }
    for (const treatment of sale.treatments ?? []) {
      requireMoney(treatment.price, "Valores da venda inválidos.");
      if (toCents(treatment.price) < 0) throw new Error("Valores da venda inválidos.");
    }
    const movements = stockMovementsFor(sale);
    await this.repository.confirm({ ...sale, status: "CONFIRMED" }, movements);
    return { ...sale, status: "CONFIRMED" };
  }

  async cancel(sale: Sale, reason: string, author?: string): Promise<Sale> {
    const motive = reason?.trim();
    if (!motive) throw new Error("Informe o motivo do cancelamento.");
    if (sale.status === "CANCELLED") throw new Error("Esta venda já foi cancelada.");
    const cancelledAt = new Date().toISOString();
    const cancelledBy = author?.trim() || undefined;
    if (sale.status === "QUOTE") {
      const cancelled: Sale = { ...sale, status: "CANCELLED", cancelReason: motive, cancelledAt, cancelledBy };
      await this.repository.save(cancelled);
      return cancelled;
    }
    const movements = refundStockMovementsFor(sale);
    await this.repository.cancel({ ...sale, status: "CANCELLED", cancelReason: motive, cancelledAt, cancelledBy }, movements);
    return { ...sale, status: "CANCELLED", cancelReason: motive, cancelledAt, cancelledBy };
  }
}
