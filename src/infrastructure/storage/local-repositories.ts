import { defaultOrganization, type CurrentStoreContext, type LocalSession, type OrganizationSettings, type Store, type User } from "../../domain/access";
import { assertRecordAccess, assertStoreAccess, canAccessRecord, getActiveAccessContext } from "../../domain/access-context";
import type { AgendaEvent } from "../../domain/agenda";
import type { Attendance, Customer } from "../../domain/customer";
import type { ClinicalRecord, Prescription } from "../../domain/clinical";
import type { Sale } from "../../domain/sales";
import type { Transfer } from "../../domain/transfer";
import type { WorkOrder, WorkOrderStatus } from "../../domain/work-order";
import { availableQuantity, type InventoryItem, type InventoryMovement } from "../../domain/inventory";
import type { CashEntry, CashSession } from "../../domain/cash";
import { cashTotals } from "../../domain/cash";
import type { AdministrationRepository, AgendaRepository, AttendanceRepository, CashCloseInput, CashRepository, ClinicalRepository, CustomerRepository, InventoryRepository, PrescriptionRepository, SaleRepository, SessionRepository, SettingsRepository, TransferRepository, WorkOrderRepository } from "../../domain/repositories";
import type { AuditEntry, AuditListFilter, AuditRepository } from "../../domain/audit";
import { database } from "./database";

const defaultSettings: OrganizationSettings = {
  id: "current",
  organizationName: "Opticore Demo",
  clinicalProfessionalLabel: "Profissional clínico"
};

const seedStores: Store[] = [{ id: "store-centro", name: "Loja Centro", active: true, organizationId: defaultOrganization.id }, { id: "store-shopping", name: "Loja Shopping", active: true, organizationId: defaultOrganization.id }];
const seedUsers: User[] = [
  { id: "user-owner", name: "Administrador local", email: "admin@opticore.local", role: "OWNER", scope: "NETWORK", storeIds: seedStores.map((store) => store.id), active: true, organizationId: defaultOrganization.id },
  { id: "user-clinical", name: "Profissional autorizado", email: "clinico@opticore.local", role: "CLINICAL_PROFESSIONAL", scope: "STORE", storeIds: ["store-centro"], active: true, organizationId: defaultOrganization.id }
];

export class LocalSettingsRepository implements SettingsRepository {
  async get(): Promise<OrganizationSettings> {
    return (await database.settings.get("current")) ?? defaultSettings;
  }
  async save(settings: OrganizationSettings): Promise<void> {
    await database.settings.put(settings);
  }
}

export class LocalSessionRepository implements SessionRepository {
  async get(): Promise<LocalSession | null> {
    return (await database.sessions.get("current")) ?? null;
  }
  async save(session: LocalSession): Promise<void> {
    await database.sessions.put(session);
  }
  async clear(): Promise<void> {
    await database.sessions.delete("current");
  }
}

export class LocalAdministrationRepository implements AdministrationRepository {
  async initialize(): Promise<void> {
    await database.transaction("rw", database.stores, database.users, database.currentStore, async () => {
      if (await database.stores.count() === 0) await database.stores.bulkAdd(seedStores);
      if (await database.users.count() === 0) await database.users.bulkAdd(seedUsers);
      if (!await database.currentStore.get("current")) await database.currentStore.add({ id: "current", storeId: "store-centro" });
    });
  }
  async listStores(): Promise<Store[]> { return database.stores.orderBy("name").toArray(); }
  async saveStore(store: Store): Promise<void> { await database.stores.put(store); }
  async listUsers(): Promise<User[]> { return database.users.orderBy("name").toArray(); }
  async saveUser(user: User): Promise<void> { await database.users.put(user); }
  async getCurrentStore(): Promise<CurrentStoreContext> { return (await database.currentStore.get("current"))!; }
  async saveCurrentStore(context: CurrentStoreContext): Promise<void> { await database.currentStore.put(context); }
}

export class LocalCustomerRepository implements CustomerRepository {
  async list(query = ""): Promise<Customer[]> {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    const customers = await database.customers.orderBy("name").toArray();
    return normalized ? customers.filter((customer) => [customer.name, customer.cpf, customer.phone].filter(Boolean).some((value) => value!.toLocaleLowerCase("pt-BR").includes(normalized))) : customers;
  }
  async get(id: string): Promise<Customer | undefined> { return database.customers.get(id); }
  async save(customer: Customer): Promise<void> { await database.customers.put(customer); }
}

export class LocalAttendanceRepository implements AttendanceRepository {
  async listByStore(storeId: string): Promise<Attendance[]> { assertStoreAccess(storeId); return database.attendances.where("storeId").equals(storeId).reverse().sortBy("createdAt"); }
  async listByCustomer(customerId: string): Promise<Attendance[]> { const rows = await database.attendances.where("customerId").equals(customerId).reverse().sortBy("createdAt"); return rows.filter((attendance) => canAccessRecordSafe(attendance)); }
  async get(id: string): Promise<Attendance | undefined> { const attendance = await database.attendances.get(id); return attendance && canAccessRecordSafe(attendance) ? attendance : undefined; }
  async save(attendance: Attendance): Promise<void> { assertRecordAccess(attendance); await database.attendances.put(attendance); }
}

export class LocalAgendaRepository implements AgendaRepository {
  async listByStoreAndRange(storeId: string, from: string, to: string): Promise<AgendaEvent[]> {
    assertStoreAccess(storeId);
    return database.agendaEvents.where("storeId").equals(storeId).and((event) => event.startsAt >= from && event.startsAt < to).sortBy("startsAt");
  }
  async get(id: string): Promise<AgendaEvent | undefined> { return database.agendaEvents.get(id); }
  async save(event: AgendaEvent): Promise<void> { assertRecordAccess(event); await database.agendaEvents.put(event); }
}

function canAccessRecordSafe(record: { storeId?: string; userId?: string }): boolean {
  const context = getActiveAccessContext();
  return context ? canAccessRecord(context, record) : true;
}

export class LocalClinicalRepository implements ClinicalRepository {
  private async attendance(attendanceId: string, storeId: string) {
    const attendance = await database.attendances.get(attendanceId);
    if (!attendance || attendance.storeId !== storeId) throw new Error("Atendimento não encontrado nesta loja.");
    assertRecordAccess(attendance);
    if (attendance.status === "CANCELLED") throw new Error("Este atendimento foi cancelado.");
    return attendance;
  }
  async load(attendanceId: string, storeId: string) {
    return database.transaction("r", database.attendances, database.customers, database.clinicalRecords, async () => {
      const attendance = await this.attendance(attendanceId, storeId);
      const customer = await database.customers.get(attendance.customerId);
      if (!customer) throw new Error("Cliente do atendimento não encontrado.");
      const record = await database.clinicalRecords.get(attendanceId) ?? { attendanceId, anamnesis: "", examination: "", prescription: "", requests: "", attachments: [], revision: 0, version: 1, updatedAt: "" };
      return { record, customer };
    });
  }
  async write(input: ClinicalRecord, storeId: string, author: string, action: "save" | "finalize" | "amend", reason?: string): Promise<ClinicalRecord> {
    return database.transaction("rw", database.attendances, database.clinicalRecords, database.clinicalVersions, async () => {
      const attendance = await this.attendance(input.attendanceId, storeId);
      const current = await database.clinicalRecords.get(input.attendanceId);
      if ((current?.revision ?? 0) !== (input.revision ?? 0) || (current?.updatedAt ?? "") !== input.updatedAt) throw new Error("Este atendimento mudou em outra aba. Reabra a consulta antes de continuar; seu texto ainda está nesta tela.");
      if (action === "amend") {
        if (!current?.finalizedAt || !reason?.trim()) throw new Error("A correção exige um documento finalizado e um motivo.");
        const version = current.version ?? 1;
        const versionId = `${current.attendanceId}:${version}`;
        if (!await database.clinicalVersions.get(versionId)) await database.clinicalVersions.add({ ...current, version, id: versionId, finalizedAt: current.finalizedAt });
        const amended = { ...current, finalizedAt: undefined, version: version + 1, revision: (current.revision ?? 0) + 1, author, amendmentReason: reason.trim(), updatedAt: new Date().toISOString() };
        await database.clinicalRecords.put(amended);
        return amended;
      }
      if (current?.finalizedAt || input.finalizedAt) throw new Error("Documento finalizado: crie uma correção para preservar o original.");
      if (attendance.status === "FINISHED" && !current?.amendmentReason) throw new Error("Este atendimento já foi concluído.");
      if (action === "finalize" && !input.prescription.trim()) throw new Error("Preencha a prescrição antes de finalizar.");
      const now = new Date().toISOString();
      const saved: ClinicalRecord = { ...input, organizationId: input.organizationId ?? defaultOrganization.id, version: current?.version ?? 1, amendmentReason: current?.amendmentReason, revision: (current?.revision ?? 0) + 1, author, updatedAt: now, finalizedAt: action === "finalize" ? now : undefined };
      await database.clinicalRecords.put(saved);
      if (action === "finalize") {
        await database.clinicalVersions.add({ ...saved, id: `${saved.attendanceId}:${saved.version}`, finalizedAt: now });
        await database.attendances.update(saved.attendanceId, { status: "FINISHED" });
      } else if (attendance.status === "WAITING" || attendance.status === "DRAFT") {
        await database.attendances.update(saved.attendanceId, { status: "IN_PROGRESS" });
      }
      return saved;
    });
  }
  async history(attendanceId: string, storeId: string) {
    return database.transaction("r", database.attendances, database.clinicalVersions, async () => {
      await this.attendance(attendanceId, storeId);
      return database.clinicalVersions.where("attendanceId").equals(attendanceId).reverse().sortBy("version");
    });
  }
  async putAttachmentContent(attachmentId: string, content: string): Promise<void> {
    try {
      await database.attachments.put({ id: attachmentId, content });
    } catch (error) {
      if (error instanceof Error && error.name === "QuotaExceededError") throw new Error("Espaço insuficiente no dispositivo para guardar o anexo. Remova anexos anteriores ou libere armazenamento.");
      throw error;
    }
  }
  async getAttachmentContent(attachmentId: string): Promise<string | undefined> {
    return (await database.attachments.get(attachmentId))?.content;
  }
  async deleteAttachmentContent(attachmentId: string): Promise<void> {
    await database.attachments.delete(attachmentId);
  }
}

export class LocalPrescriptionRepository implements PrescriptionRepository {
  async listByAttendance(attendanceId: string, storeId: string): Promise<Prescription[]> {
    assertStoreAccess(storeId);
    return database.transaction("r", database.attendances, database.prescriptions, async () => {
      const attendance = await database.attendances.get(attendanceId);
      if (!attendance || attendance.storeId !== storeId) throw new Error("Atendimento não encontrado nesta loja.");
      assertRecordAccess(attendance);
      return database.prescriptions.where("attendanceId").equals(attendanceId).reverse().sortBy("issuedAt");
    });
  }
  async save(prescription: Prescription, storeId: string): Promise<Prescription> {
    assertStoreAccess(storeId);
    if (prescription.storeId !== storeId) throw new Error("Prescrição incompatível com a loja.");
    assertRecordAccess(prescription);
    await database.prescriptions.put(prescription);
    return prescription;
  }
  async listByCustomer(customerId: string, storeId: string): Promise<Prescription[]> {
    assertStoreAccess(storeId);
    const rows = await database.prescriptions.where("customerId").equals(customerId).reverse().sortBy("issuedAt");
    return rows.filter((row) => row.storeId === storeId);
  }
  async get(id: string, storeId: string): Promise<Prescription | undefined> {
    assertStoreAccess(storeId);
    const prescription = await database.prescriptions.get(id);
    if (!prescription || prescription.storeId !== storeId) return undefined;
    assertRecordAccess(prescription);
    return prescription;
  }
}

export class LocalSaleRepository implements SaleRepository {
  async listByStore(storeId: string): Promise<Sale[]> { assertStoreAccess(storeId); return database.sales.where("storeId").equals(storeId).reverse().sortBy("createdAt"); }
  async get(id: string): Promise<Sale | undefined> { return database.sales.get(id); }
  async save(sale: Sale): Promise<void> { assertRecordAccess(sale); await database.sales.put(sale); }
  async confirm(sale: Sale, movements: readonly InventoryMovement[]): Promise<void> {
    assertRecordAccess(sale);
    return database.transaction("rw", database.sales, database.inventoryItems, database.inventoryMovements, async () => {
      const current = await database.sales.get(sale.id);
      if (!current || current.storeId !== sale.storeId) throw new Error("Venda não encontrada nesta loja.");
      assertRecordAccess(current);
      if (current.status !== "QUOTE") throw new Error("Somente orçamentos pendentes podem ser confirmados.");
      for (const movement of movements) {
        if (movement.storeId !== sale.storeId) throw new Error("Movimentação incompatível com a venda.");
        await applyStockMovement(movement);
        await releaseReservation(movement.itemId, movement.storeId, movement.quantity);
      }
      await database.sales.put({ ...current, status: "CONFIRMED" });
    });
  }
  async cancel(sale: Sale, movements: readonly InventoryMovement[]): Promise<void> {
    assertRecordAccess(sale);
    return database.transaction("rw", database.sales, database.inventoryItems, database.inventoryMovements, database.cashEntries, database.cashSessions, async () => {
      const current = await database.sales.get(sale.id);
      if (!current || current.storeId !== sale.storeId) throw new Error("Venda não encontrada nesta loja.");
      assertRecordAccess(current);
      if (current.status === "CANCELLED") throw new Error("Esta venda já foi cancelada.");
      if (current.status !== "CONFIRMED") throw new Error("Somente vendas confirmadas podem ser canceladas.");
      const entries = await database.cashEntries.where("saleId").equals(current.id).toArray();
      const paid = entries.reduce((total, entry) => entry.type === "RECEIPT" ? total + Math.round(entry.amount * 100) : total, 0);
      let refund: CashEntry | undefined;
      if (paid > 0) {
        const session = await database.cashSessions.where("storeId").equals(current.storeId).filter((candidate) => !candidate.closedAt).first();
        if (!session) throw new Error("Abra o caixa antes de registrar o estorno.");
        assertRecordAccess(session);
        const receiptMethods = [...new Set(entries.filter((entry) => entry.type === "RECEIPT" && entry.paymentMethod).map((entry) => entry.paymentMethod))];
        refund = { id: `cash-entry-${crypto.randomUUID()}`, sessionId: session.id, storeId: current.storeId, saleId: current.id, type: "REFUND", amount: paid / 100, paymentMethod: receiptMethods.length === 1 ? receiptMethods[0] : undefined, reason: sale.cancelReason, author: sale.cancelledBy, createdAt: new Date().toISOString() };
      }
      for (const movement of movements) {
        if (movement.storeId !== sale.storeId || movement.type !== "IN") throw new Error("Movimentação de estorno incompatível com a venda.");
        await applyStockMovement(movement);
      }
      await database.sales.put({ ...current, status: "CANCELLED", cancelReason: sale.cancelReason, cancelledAt: sale.cancelledAt, cancelledBy: sale.cancelledBy });
      if (refund) await database.cashEntries.add(refund);
    });
  }
}

export class LocalWorkOrderRepository implements WorkOrderRepository {
  async listByStore(storeId: string): Promise<WorkOrder[]> { assertStoreAccess(storeId); return database.workOrders.where("storeId").equals(storeId).reverse().sortBy("createdAt"); }
  async getBySale(saleId: string): Promise<WorkOrder | undefined> { return database.workOrders.where("saleId").equals(saleId).first(); }
  async create(order: WorkOrder): Promise<WorkOrder> {
    assertRecordAccess(order);
    return database.transaction("rw", database.workOrders, async () => {
      const existing = await database.workOrders.where("saleId").equals(order.saleId).first();
      if (existing) return existing;
      await database.workOrders.put(order);
      return order;
    });
  }
  async update(order: WorkOrder, expectedStatus?: WorkOrderStatus): Promise<WorkOrder> {
    assertRecordAccess(order);
    return database.transaction("rw", database.workOrders, async () => {
      const current = await database.workOrders.get(order.id);
      if (!current || current.storeId !== order.storeId) throw new Error("Ordem não encontrada nesta loja.");
      assertRecordAccess(current);
      if (expectedStatus && current.status !== expectedStatus) throw new Error("A ordem foi alterada em outra sessão. Recarregue a lista.");
      const updated: WorkOrder = { ...current, ...order, createdAt: current.createdAt, saleId: current.saleId, customerId: current.customerId, storeId: current.storeId };
      await database.workOrders.put(updated);
      return updated;
    });
  }
  async recordInputs(order: WorkOrder, movements: readonly InventoryMovement[], expectedStatus: WorkOrderStatus): Promise<WorkOrder> {
    assertRecordAccess(order);
    return database.transaction("rw", database.workOrders, database.inventoryItems, database.inventoryMovements, async () => {
      const current = await database.workOrders.get(order.id);
      if (!current || current.storeId !== order.storeId) throw new Error("Ordem não encontrada nesta loja.");
      assertRecordAccess(current);
      if (current.status !== expectedStatus) throw new Error("A ordem foi alterada em outra sessão. Recarregue a lista.");
      if (movements.some((movement) => movement.storeId !== order.storeId || movement.type !== "OUT")) throw new Error("Movimentação de insumo incompatível com a ordem.");
      for (const movement of movements) await applyStockMovement(movement);
      const updated: WorkOrder = { ...current, ...order, createdAt: current.createdAt, saleId: current.saleId, customerId: current.customerId, storeId: current.storeId };
      await database.workOrders.put(updated);
      return updated;
    });
  }
}

async function applyStockMovement(movement: InventoryMovement): Promise<InventoryItem> {
  if (movement.type !== "ADJUSTMENT" && (!Number.isFinite(movement.quantity) || movement.quantity <= 0)) throw new Error("Quantidade inválida para a movimentação.");
  const item = await database.inventoryItems.get(movement.itemId);
  if (!item || item.storeId !== movement.storeId) throw new Error("Produto não encontrado nesta loja.");
  const next = item.quantity + (movement.type === "OUT" ? -movement.quantity : movement.quantity);
  if (next < 0) throw new Error(`Saldo insuficiente de "${item.name}" (disponível: ${item.quantity}).`);
  const updated: InventoryItem = { ...item, quantity: next };
  await database.inventoryItems.put(updated);
  await database.inventoryMovements.put(movement);
  return updated;
}

async function releaseReservation(itemId: string, storeId: string, quantity: number): Promise<void> {
  const item = await database.inventoryItems.get(itemId);
  if (!item || item.storeId !== storeId) return;
  const reserved = item.reservedQuantity ?? 0;
  if (reserved <= 0) return;
  const next = Math.max(0, reserved - quantity);
  const { reservedQuantity: _released, ...rest } = item;
  await database.inventoryItems.put(next > 0 ? { ...rest, reservedQuantity: next } : rest);
}

export class LocalInventoryRepository implements InventoryRepository {
  async listByStore(storeId: string): Promise<InventoryItem[]> { assertStoreAccess(storeId); return database.inventoryItems.where("storeId").equals(storeId).sortBy("name"); }
  async listMovements(storeId: string): Promise<InventoryMovement[]> { assertStoreAccess(storeId); return database.inventoryMovements.where("storeId").equals(storeId).reverse().sortBy("createdAt"); }
  async createItem(item: InventoryItem, initialMovement?: InventoryMovement): Promise<void> {
    assertRecordAccess(item);
    return database.transaction("rw", database.inventoryItems, database.inventoryMovements, async () => {
      if (await database.inventoryItems.get(item.id)) throw new Error("Produto já cadastrado.");
      await database.inventoryItems.put(item);
      if (initialMovement) {
        if (initialMovement.itemId !== item.id || initialMovement.storeId !== item.storeId) throw new Error("Movimentação inicial incompatível com o produto.");
        assertRecordAccess(initialMovement);
        await database.inventoryMovements.put(initialMovement);
      }
    });
  }
  async updateItem(item: InventoryItem): Promise<void> {
    assertRecordAccess(item);
    return database.transaction("rw", database.inventoryItems, async () => {
      const current = await database.inventoryItems.get(item.id);
      if (!current || current.storeId !== item.storeId) throw new Error("Produto não encontrado nesta loja.");
      assertRecordAccess(current);
      await database.inventoryItems.put({ ...item, quantity: current.quantity, reservedQuantity: current.reservedQuantity });
    });
  }
  async applyMovement(movement: InventoryMovement): Promise<InventoryItem> {
    assertRecordAccess(movement);
    return database.transaction("rw", database.inventoryItems, database.inventoryMovements, async () => applyStockMovement(movement));
  }
  async applyReservation(itemId: string, storeId: string, delta: number): Promise<InventoryItem> {
    assertStoreAccess(storeId);
    if (!Number.isSafeInteger(delta) || delta === 0) throw new Error("Quantidade de reserva inválida.");
    return database.transaction("rw", database.inventoryItems, async () => {
      const item = await database.inventoryItems.get(itemId);
      if (!item || item.storeId !== storeId) throw new Error("Produto não encontrado nesta loja.");
      const reserved = item.reservedQuantity ?? 0;
      const next = delta < 0 ? Math.max(0, reserved + delta) : reserved + delta;
      if (delta > 0 && availableQuantity(item) < delta) throw new Error(`Saldo disponível insuficiente de "${item.name}" (disponível para reserva: ${availableQuantity(item)}).`);
      const { reservedQuantity: _ignored, ...rest } = item;
      const updated: InventoryItem = next > 0 ? { ...rest, reservedQuantity: next } : rest;
      await database.inventoryItems.put(updated);
      return updated;
    });
  }
}

export class LocalTransferRepository implements TransferRepository {
  async listByStore(storeId: string): Promise<Transfer[]> {
    assertStoreAccess(storeId);
    return database.transfers.filter((transfer) => transfer.fromStoreId === storeId || transfer.toStoreId === storeId).reverse().sortBy("createdAt");
  }
  async create(transfer: Transfer): Promise<Transfer> {
    assertStoreAccess(transfer.fromStoreId);
    assertStoreAccess(transfer.toStoreId);
    if (!transfer.items.length) throw new Error("Adicione ao menos um produto à transferência.");
    await database.transfers.add(transfer);
    return transfer;
  }
  async separate(id: string, actor: string, at: string): Promise<Transfer> {
    return database.transaction("rw", database.transfers, database.inventoryItems, database.inventoryMovements, async () => {
      const transfer = await database.transfers.get(id);
      if (!transfer) throw new Error("Transferência não encontrada.");
      if (transfer.status !== "REQUESTED") throw new Error("Somente transferências solicitadas podem ser separadas.");
      for (const line of transfer.items) {
        const item = await database.inventoryItems.get(line.inventoryItemId);
        if (!item || item.storeId !== transfer.fromStoreId) throw new Error(`Produto "${line.name}" não encontrado na loja de origem.`);
        if (availableQuantity(item) < line.quantity) throw new Error(`Saldo disponível insuficiente de "${item.name}" (disponível: ${availableQuantity(item)}).`);
        await applyStockMovement({ id: `movement-${crypto.randomUUID()}`, itemId: item.id, storeId: transfer.fromStoreId, type: "OUT", quantity: line.quantity, reason: `Transferência ${transfer.id} → ${transfer.toStoreId}`, createdAt: at, author: actor, organizationId: transfer.organizationId ?? defaultOrganization.id });
      }
      const updated: Transfer = { ...transfer, status: "SEPARATED", separatedBy: actor, separatedAt: at };
      await database.transfers.put(updated);
      return updated;
    });
  }
  async markInTransit(id: string, actor: string, at: string): Promise<Transfer> {
    return database.transaction("rw", database.transfers, async () => {
      const transfer = await database.transfers.get(id);
      if (!transfer) throw new Error("Transferência não encontrada.");
      if (transfer.status !== "SEPARATED") throw new Error("Somente transferências separadas podem sair para trânsito.");
      const updated: Transfer = { ...transfer, status: "IN_TRANSIT", transitBy: actor, transitAt: at };
      await database.transfers.put(updated);
      return updated;
    });
  }
  async receive(id: string, actor: string, at: string): Promise<Transfer> {
    return database.transaction("rw", database.transfers, database.inventoryItems, database.inventoryMovements, async () => {
      const transfer = await database.transfers.get(id);
      if (!transfer) throw new Error("Transferência não encontrada.");
      if (transfer.status !== "IN_TRANSIT") throw new Error("Somente transferências em trânsito podem ser recebidas.");
      for (const line of transfer.items) {
        const origin = await database.inventoryItems.get(line.inventoryItemId);
        const code = origin?.code?.trim().toLowerCase() || "";
        const name = (origin?.name || line.name).trim().toLowerCase();
        const destination = await database.inventoryItems.where("storeId").equals(transfer.toStoreId).toArray();
        let target = code ? destination.find((candidate) => candidate.code?.trim().toLowerCase() === code) : undefined;
        if (!target) target = destination.find((candidate) => !candidate.code && candidate.name.trim().toLowerCase() === name);
        const movement: InventoryMovement = { id: `movement-${crypto.randomUUID()}`, itemId: target?.id ?? "", storeId: transfer.toStoreId, type: "IN", quantity: line.quantity, reason: `Transferência ${transfer.id} ← ${transfer.fromStoreId}`, createdAt: at, author: actor, organizationId: transfer.organizationId ?? defaultOrganization.id };
        if (target) {
          await applyStockMovement(movement);
        } else {
          const created: InventoryItem = { id: `item-${crypto.randomUUID()}`, storeId: transfer.toStoreId, name: origin?.name || line.name, code: origin?.code, quantity: 0, minimumQuantity: origin?.minimumQuantity ?? 0, defaultPrice: origin?.defaultPrice, cost: origin?.cost, category: origin?.category, brand: origin?.brand, material: origin?.material, description: origin?.description, organizationId: transfer.organizationId ?? defaultOrganization.id };
          await database.inventoryItems.put(created);
          await applyStockMovement({ ...movement, itemId: created.id });
        }
      }
      const updated: Transfer = { ...transfer, status: "RECEIVED", receivedBy: actor, receivedAt: at };
      await database.transfers.put(updated);
      return updated;
    });
  }
  async cancel(id: string, actor: string, at: string, reason: string): Promise<Transfer> {
    return database.transaction("rw", database.transfers, database.inventoryItems, database.inventoryMovements, async () => {
      const transfer = await database.transfers.get(id);
      if (!transfer) throw new Error("Transferência não encontrada.");
      if (transfer.status !== "REQUESTED" && transfer.status !== "SEPARATED") throw new Error("Esta transferência não pode ser cancelada.");
      if (transfer.status === "SEPARATED") {
        for (const line of transfer.items) {
          const item = await database.inventoryItems.get(line.inventoryItemId);
          if (!item || item.storeId !== transfer.fromStoreId) throw new Error(`Produto "${line.name}" não encontrado na loja de origem para devolução.`);
          await applyStockMovement({ id: `movement-${crypto.randomUUID()}`, itemId: item.id, storeId: transfer.fromStoreId, type: "IN", quantity: line.quantity, reason: `Cancelamento da transferência ${transfer.id}`, createdAt: at, author: actor, organizationId: transfer.organizationId ?? defaultOrganization.id });
        }
      }
      const updated: Transfer = { ...transfer, status: "CANCELLED", cancelledBy: actor, cancelledAt: at, cancelReason: reason };
      await database.transfers.put(updated);
      return updated;
    });
  }
}

export class LocalCashRepository implements CashRepository {
  private openSessionOf(storeId: string) { return database.cashSessions.where("storeId").equals(storeId).filter((session) => !session.closedAt).first(); }
  async current(storeId: string): Promise<CashSession | undefined> { assertStoreAccess(storeId); return this.openSessionOf(storeId); }
  async listSessions(storeId: string): Promise<CashSession[]> { assertStoreAccess(storeId); return database.cashSessions.where("storeId").equals(storeId).reverse().sortBy("openedAt"); }
  async listEntries(storeId: string): Promise<CashEntry[]> { assertStoreAccess(storeId); return database.cashEntries.where("storeId").equals(storeId).reverse().sortBy("createdAt"); }
  async openSession(session: CashSession): Promise<CashSession> {
    assertRecordAccess(session);
    return database.transaction("rw", database.cashSessions, async () => {
      if (await this.openSessionOf(session.storeId)) throw new Error("Já existe um caixa aberto nesta loja.");
      await database.cashSessions.add(session);
      return session;
    });
  }
  async recordReceipt(entry: CashEntry): Promise<CashEntry> {
    assertRecordAccess(entry);
    return database.transaction("rw", database.cashSessions, database.cashEntries, database.sales, async () => {
      const session = await database.cashSessions.get(entry.sessionId);
      if (!session || session.storeId !== entry.storeId || session.closedAt) throw new Error("Abra o caixa antes de registrar recebimentos.");
      assertRecordAccess(session);
      if (!entry.saleId) { await database.cashEntries.add(entry); return entry; }
      const sale = await database.sales.get(entry.saleId);
      if (!sale || sale.storeId !== entry.storeId) throw new Error("Venda não encontrada nesta loja.");
      if (sale.status !== "CONFIRMED") throw new Error("Somente vendas confirmadas podem ser recebidas.");
      const entries = await database.cashEntries.where("saleId").equals(entry.saleId).toArray();
      const paid = entries.reduce((total, item) => item.type === "RECEIPT" ? total + Math.round(item.amount * 100) : total, 0);
      const amount = Math.round(entry.amount * 100);
      const total = Math.round(sale.total * 100);
      if (paid >= total) throw new Error("Esta venda já foi recebida.");
      if (paid + amount > total) throw new Error("O valor informado excede o saldo pendente da venda.");
      await database.cashEntries.add(entry);
      await database.sales.put({ ...sale, paymentStatus: paid + amount >= total ? "PAID" : "PARTIAL" });
      return entry;
    });
  }
  async recordMovement(entry: CashEntry): Promise<CashEntry> {
    assertRecordAccess(entry);
    return database.transaction("rw", database.cashSessions, database.cashEntries, async () => {
      const session = await database.cashSessions.get(entry.sessionId);
      if (!session || session.storeId !== entry.storeId || session.closedAt) throw new Error("Abra o caixa antes de registrar movimentações.");
      assertRecordAccess(session);
      const entries = await database.cashEntries.where("sessionId").equals(session.id).toArray();
      const expected = cashTotals(session.openingBalance, entries).expected;
      if (entry.type === "WITHDRAWAL" && Math.round(entry.amount * 100) > Math.round(expected * 100)) throw new Error("Saldo insuficiente para esta sangria.");
      await database.cashEntries.add(entry);
      return entry;
    });
  }
  async closeSession(storeId: string, input: CashCloseInput): Promise<CashSession> {
    assertStoreAccess(storeId);
    return database.transaction("rw", database.cashSessions, database.cashEntries, async () => {
      const session = await this.openSessionOf(storeId);
      if (!session) throw new Error("Abra o caixa antes de fechar.");
      assertRecordAccess(session);
      const entries = await database.cashEntries.where("sessionId").equals(session.id).toArray();
      const totals = cashTotals(session.openingBalance, entries);
      const note = input.note?.trim();
      const closed: CashSession = { ...session, closedAt: new Date().toISOString(), expectedBalance: totals.expected, closingBalance: input.closingBalance, difference: Math.round((input.closingBalance - totals.expected) * 100) / 100, closedBy: input.closedBy?.trim() || undefined, closingNote: note || undefined };
      await database.cashSessions.put(closed);
      return closed;
    });
  }
}

export class LocalAuditRepository implements AuditRepository {
  async create(entry: AuditEntry): Promise<void> {
    await database.auditEntries.add(entry);
  }
  async list(filter: AuditListFilter = {}): Promise<AuditEntry[]> {
    let rows = await database.auditEntries.orderBy("at").reverse().toArray();
    if (filter.storeId) rows = rows.filter((row) => row.storeId === filter.storeId);
    if (filter.action) rows = rows.filter((row) => row.action === filter.action);
    if (filter.entity) rows = rows.filter((row) => row.entity === filter.entity);
    if (filter.author) rows = rows.filter((row) => row.author === filter.author!.trim());
    return filter.limit && filter.limit > 0 ? rows.slice(0, filter.limit) : rows;
  }
}
