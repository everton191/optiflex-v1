import type { RoleKey } from "./access";
import type { AttendanceRepository, CashRepository, ClinicalRepository, PrescriptionRepository, SaleRepository, WorkOrderRepository } from "./repositories";
import { buildCustomerHistory, type CustomerHistoryEvent } from "./customer-history";
import { buildCustomerClinicalDocuments, canViewClinicalHistory, type CustomerClinicalDocument, type CustomerClinicalRecordSummary } from "./customer-clinical-history";

export interface CustomerHistoryQuery {
  storeId: string;
  role: RoleKey;
}

export class CustomerHistoryService {
  constructor(
    private readonly attendances: AttendanceRepository,
    private readonly sales: SaleRepository,
    private readonly workOrders: WorkOrderRepository,
    private readonly cash: CashRepository,
    private readonly prescriptions: PrescriptionRepository,
    private readonly clinical: ClinicalRepository
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

  // Gate duplo: o chamador (UI) só chama com acesso clínico e o serviço devolve [] sem a permissão.
  async listClinicalDocuments(customerId: string, query: CustomerHistoryQuery): Promise<CustomerClinicalDocument[]> {
    if (!canViewClinicalHistory(query.role)) return [];
    const [prescriptionRows, attendanceRows] = await Promise.all([
      this.prescriptions.listByCustomer(customerId, query.storeId),
      this.attendances.listByCustomer(customerId)
    ]);
    const loaded = await Promise.all(attendanceRows.map(async (attendance): Promise<CustomerClinicalRecordSummary | undefined> => {
      if (attendance.status === "CANCELLED") return undefined;
      try {
        const { record } = await this.clinical.load(attendance.id, attendance.storeId);
        const hasAnamnesis = Boolean(record.anamnesis.trim());
        const hasExamination = Boolean(record.examination.trim());
        if (!hasAnamnesis && !hasExamination && record.attachments.length === 0) return undefined;
        return { attendanceId: attendance.id, storeId: attendance.storeId, updatedAt: record.updatedAt, finalizedAt: record.finalizedAt, hasAnamnesis, hasExamination, attachments: record.attachments };
      } catch {
        return undefined;
      }
    }));
    const records = loaded.filter((record): record is CustomerClinicalRecordSummary => record !== undefined);
    return buildCustomerClinicalDocuments({ prescriptions: prescriptionRows, records }, { role: query.role, currentStoreId: query.storeId });
  }
}
