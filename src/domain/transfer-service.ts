import { assertStoreAccess } from "./access-context";
import { availableQuantity } from "./inventory";
import type { InventoryRepository, TransferRepository } from "./repositories";
import { assertValidTransferItems, defaultTransfer, type Transfer, type TransferItem } from "./transfer";
import type { AuditService } from "./audit-service";

export class TransferService {
  constructor(private readonly repository: TransferRepository, private readonly inventoryRepository: InventoryRepository, private readonly audit?: AuditService) {}

  list(storeId: string): Promise<Transfer[]> { return this.repository.listByStore(storeId); }

  async request(fromStoreId: string, toStoreId: string, items: readonly TransferItem[], createdBy: string, note?: string): Promise<Transfer> {
    if (!fromStoreId?.trim() || !toStoreId?.trim()) throw new Error("Selecione as lojas de origem e destino.");
    if (fromStoreId === toStoreId) throw new Error("A transferência precisa sair de uma loja e chegar em outra.");
    assertStoreAccess(fromStoreId);
    assertStoreAccess(toStoreId);
    assertValidTransferItems(items);
    const author = createdBy.trim();
    if (!author) throw new Error("Informe quem está solicitando a transferência.");
    const stock = await this.inventoryRepository.listByStore(fromStoreId);
    for (const line of items) {
      const item = stock.find((entry) => entry.id === line.inventoryItemId);
      if (!item) throw new Error("Produto da transferência não encontrado na loja de origem.");
      if (availableQuantity(item) < line.quantity) throw new Error(`Saldo disponível insuficiente de "${item.name}" (disponível: ${availableQuantity(item)}).`);
    }
    const created = await this.repository.create(defaultTransfer(fromStoreId, toStoreId, items, author, note));
    await this.audit?.log({ storeId: fromStoreId, action: "CREATE", entity: "transfer", entityId: created.id, author, reason: note, summary: `Transferência solicitada para ${toStoreId}: ${items.length} produto(s)` });
    return created;
  }

  async separate(id: string, actor: string): Promise<Transfer> {
    const name = actor.trim();
    if (!name) throw new Error("Informe quem está separando a transferência.");
    const updated = await this.repository.separate(id, name, new Date().toISOString());
    await this.audit?.log({ storeId: updated.fromStoreId, action: "ADJUSTMENT", entity: "transfer", entityId: id, author: name, reason: "Separação de transferência", summary: `Transferência ${id} separada` });
    return updated;
  }

  async markInTransit(id: string, actor: string): Promise<Transfer> {
    const name = actor.trim();
    if (!name) throw new Error("Informe quem está despachando a transferência.");
    return this.repository.markInTransit(id, name, new Date().toISOString());
  }

  async receive(id: string, actor: string): Promise<Transfer> {
    const name = actor.trim();
    if (!name) throw new Error("Informe quem está recebendo a transferência.");
    const updated = await this.repository.receive(id, name, new Date().toISOString());
    await this.audit?.log({ storeId: updated.toStoreId, action: "ADJUSTMENT", entity: "transfer", entityId: id, author: name, reason: "Recebimento de transferência", summary: `Transferência ${id} recebida` });
    return updated;
  }

  async cancel(id: string, actor: string, reason: string): Promise<Transfer> {
    const motive = reason?.trim();
    if (!motive) throw new Error("Informe o motivo do cancelamento.");
    const name = actor.trim();
    if (!name) throw new Error("Informe quem está cancelando a transferência.");
    const updated = await this.repository.cancel(id, name, new Date().toISOString(), motive);
    await this.audit?.log({ storeId: updated.fromStoreId, action: "CANCEL", entity: "transfer", entityId: id, author: name, reason: motive, summary: `Transferência ${id} cancelada` });
    return updated;
  }
}
