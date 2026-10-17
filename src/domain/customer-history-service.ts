import type { RoleKey } from "./access";
import type { AttendanceRepository, CashRepository, SaleRepository, WorkOrderRepository } from "./repositories";
import { buildCustomerHistory, type CustomerHistoryEvent } from "./customer-history";

export interface CustomerHistoryQuery {
  storeId: string;
  role: RoleKey;
}

export class CustomerHistoryService {
  constructor(
    private readonly attendances: AttendanceRepository,
    private readonly sales: SaleRepository,
    private readonly workOrders: WorkOrderRepository,
    private readonly cash: CashRepository
  ) {}

  async list(customerId: string, query: CustomerHistoryQuery): Promise<CustomerHistoryEvent[]> {
    const [attendanceRows, saleRows, orderRows, entryRows] = await Promise.all([
      this.attendances.listByCustomer(customerId),
      this.sales.listByStore(query.storeId),
      this.workOrders.listByStore(query.storeId),
      this.cash.listEntries(query.storeId)
    ]);
    const sales = saleRows.filter((sale) => sale.customerId === customerId);
    const saleIds = new Set(sales.map((sale) => sale.id));
    const workOrders = orderRows.filter((order) => order.customerId === customerId);
    const payments = entryRows.filter((entry) => entry.saleId !== undefined && saleIds.has(entry.saleId));
    return buildCustomerHistory({ attendances: attendanceRows, sales, workOrders, payments }, { role: query.role, currentStoreId: query.storeId });
  }
}
