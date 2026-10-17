import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import type { LocalSession } from "../../domain/access";
import { validateBackup } from "../../domain/backup";
import { CashService } from "../../domain/cash-service";
import { ClinicalService } from "../../domain/clinical-service";
import { InventoryService } from "../../domain/inventory-service";
import { ReceptionService } from "../../domain/reception-service";
import { SalesService } from "../../domain/sales-service";
import { WorkOrderService } from "../../domain/work-order-service";
import { database } from "./database";
import { LocalAdministrationRepository, LocalAttendanceRepository, LocalCashRepository, LocalClinicalRepository, LocalCustomerRepository, LocalInventoryRepository, LocalPrescriptionRepository, LocalSaleRepository, LocalWorkOrderRepository } from "./local-repositories";
import { LocalBackupRepository } from "./local-backup";

const reception = new ReceptionService(new LocalCustomerRepository(), new LocalAttendanceRepository());
const salesService = new SalesService(new LocalSaleRepository());
const cashService = new CashService(new LocalCashRepository(), new LocalSaleRepository());
const workOrders = new WorkOrderService(new LocalWorkOrderRepository());
const clinical = new ClinicalService(new LocalClinicalRepository(), new LocalPrescriptionRepository());
const inventory = new InventoryService(new LocalInventoryRepository());
const professionalSession: LocalSession = { id: "current", userName: "Dra. Ana", role: "CLINICAL_PROFESSIONAL" };

afterEach(async () => { await database.delete(); });

// Fluxo 5 (F8-04): evidência automatizada de que uma sessão inteira criada sem rede sobrevive ao
// fechamento do app e à reabertura com todos os dados e relações íntegros.
describe("offline session survives app close and reopen", () => {
  it("keeps the full shift — customer, prescription, discounted sale, stock, cash and order — after reopen", async () => {
    await database.open();
    await new LocalAdministrationRepository().initialize();
    const customer = await reception.createCustomer({ name: "Cliente Offline", phone: "11 99999-0000" });
    const attendance = await reception.startAttendance(customer.id, "store-centro", "CONSULTATION");
    await clinical.issuePrescription({ customerId: customer.id, od: { sphere: -1.25 }, oe: { sphere: -1 }, usage: "DISTANCE" }, attendance.id, { storeId: "store-centro", session: professionalSession });
    const product = await inventory.create("store-centro", { name: "Armação Offline", code: "FR-OFF-1", quantity: 4, minimumQuantity: 0, category: "FRAME", defaultPrice: 300 }, "Vendedora Ana");
    const quote = await salesService.createQuote(customer.id, "store-centro", "", 0, [{ inventoryItemId: product.id, name: product.name, quantity: 1, unitPrice: 300, category: "FRAME" }], undefined, [], { type: "PERCENT", value: 5 }, { appliedBy: "Vendedora Ana", role: "SELLER" });
    expect(quote.total).toBe(285);
    const confirmed = await salesService.confirm(quote);
    await cashService.open("store-centro", 0);
    await cashService.receive("store-centro", confirmed.id, 285, "CASH");
    await workOrders.createFromConfirmedSale(confirmed, "Vendedora Ana");

    await database.close();
    await database.open();

    const reopenedCustomer = await reception.getCustomer(customer.id);
    expect(reopenedCustomer?.name).toBe("Cliente Offline");
    const reopenedSale = await new LocalSaleRepository().get(confirmed.id);
    expect(reopenedSale).toMatchObject({ status: "CONFIRMED", total: 285, customerId: customer.id });
    expect(reopenedSale?.discount).toMatchObject({ type: "PERCENT", value: 5, grossTotal: 300, appliedBy: "Vendedora Ana", appliedByRole: "SELLER" });
    expect(reopenedSale?.discount?.approvedBy).toBeUndefined();
    const reopenedItems = await inventory.list("store-centro");
    expect(reopenedItems.find((item) => item.id === product.id)?.quantity).toBe(3);
    const reopenedEntries = await new LocalCashRepository().listEntries("store-centro");
    expect(reopenedEntries.some((entry) => entry.type === "RECEIPT" && entry.saleId === confirmed.id && entry.amount === 285)).toBe(true);
    const reopenedOrders = await workOrders.list("store-centro");
    expect(reopenedOrders.some((order) => order.saleId === confirmed.id)).toBe(true);
    const reopenedPrescriptions = await new LocalPrescriptionRepository().listByCustomer(customer.id, "store-centro");
    expect(reopenedPrescriptions).toHaveLength(1);
    const snapshot = validateBackup(await new LocalBackupRepository().snapshot());
    expect(snapshot.tables.customers).toHaveLength(1);
    expect(snapshot.tables.attendances).toHaveLength(1);
    expect(snapshot.tables.sales).toHaveLength(1);
    expect(snapshot.tables.prescriptions).toHaveLength(1);
    expect(snapshot.tables.workOrders).toHaveLength(1);
    expect(snapshot.tables.cashEntries.some((row) => row.saleId === confirmed.id)).toBe(true);
  });
});
