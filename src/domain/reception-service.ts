import type { Attendance, AttendanceType, Customer } from "./customer";
import type { AttendanceRepository, CustomerRepository } from "./repositories";

const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

export class ReceptionService {
  constructor(private readonly customers: CustomerRepository, private readonly attendances: AttendanceRepository) {}
  listCustomers(query?: string): Promise<Customer[]> { return this.customers.list(query); }
  getCustomer(id: string): Promise<Customer | undefined> { return this.customers.get(id); }
  async createCustomer(input: Omit<Customer, "id" | "createdAt">): Promise<Customer> {
    const customer = { ...input, id: id("customer"), createdAt: new Date().toISOString() };
    await this.customers.save(customer); return customer;
  }
  async startAttendance(customerId: string, storeId: string, type: AttendanceType, receptionNotes?: string): Promise<Attendance> {
    const attendance: Attendance = { id: id("attendance"), customerId, storeId, type, receptionNotes, status: "WAITING", createdAt: new Date().toISOString() };
    await this.attendances.save(attendance); return attendance;
  }
  listQueue(storeId: string): Promise<Attendance[]> { return this.attendances.listByStore(storeId); }
}
