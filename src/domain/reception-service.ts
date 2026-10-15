import type { Attendance, AttendancePriority, AttendanceStatus, AttendanceType, Customer } from "./customer";
import { attendanceTransitions, isValidDocument } from "./customer";
import { defaultOrganization } from "./access";
import type { AttendanceRepository, CustomerRepository } from "./repositories";

const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

export interface StartAttendanceOptions {
  professionalId?: string;
  priority?: AttendancePriority;
}

export class ReceptionService {
  constructor(private readonly customers: CustomerRepository, private readonly attendances: AttendanceRepository) {}
  listCustomers(query?: string): Promise<Customer[]> { return this.customers.list(query); }
  getCustomer(id: string): Promise<Customer | undefined> { return this.customers.get(id); }
  async createCustomer(input: Omit<Customer, "id" | "createdAt">): Promise<Customer> {
    const name = input.name.trim();
    if (!name) throw new Error("Informe o nome do cliente.");
    const cpf = input.cpf?.trim() || undefined;
    if (cpf && !isValidDocument(cpf)) throw new Error("CPF ou CNPJ inválido.");
    const customer = { ...input, name, phone: input.phone?.trim() || undefined, cpf, email: input.email?.trim() || undefined, birthDate: input.birthDate?.trim() || undefined, id: id("customer"), createdAt: new Date().toISOString(), organizationId: defaultOrganization.id };
    await this.customers.save(customer); return customer;
  }
  async updateCustomer(customerId: string, input: Pick<Customer, "name" | "phone" | "cpf" | "email" | "birthDate">): Promise<Customer> {
    const existing = await this.customers.get(customerId);
    if (!existing) throw new Error("Cliente não encontrado.");
    const name = input.name?.trim();
    if (!name) throw new Error("Informe o nome do cliente.");
    const cpf = input.cpf?.trim() || undefined;
    if (cpf && !isValidDocument(cpf)) throw new Error("CPF ou CNPJ inválido.");
    const customer: Customer = { ...existing, name, phone: input.phone?.trim() || undefined, cpf, email: input.email?.trim() || undefined, birthDate: input.birthDate?.trim() || undefined };
    await this.customers.save(customer); return customer;
  }
  async startAttendance(customerId: string, storeId: string, type: AttendanceType, receptionNotes?: string, options?: StartAttendanceOptions): Promise<Attendance> {
    if (!storeId.trim()) throw new Error("Selecione uma loja para iniciar o atendimento.");
    if (!customerId || !await this.customers.get(customerId)) throw new Error("Selecione um cliente cadastrado.");
    const attendance: Attendance = {
      id: id("attendance"), customerId, storeId, type,
      organizationId: defaultOrganization.id,
      professionalId: options?.professionalId?.trim() || undefined,
      priority: options?.priority === "URGENT" ? "URGENT" : "NORMAL",
      receptionNotes: receptionNotes?.trim() || undefined,
      status: "WAITING", createdAt: new Date().toISOString()
    };
    await this.attendances.save(attendance); return attendance;
  }
  getAttendance(id: string): Promise<Attendance | undefined> { return this.attendances.get(id); }
  async transitionAttendance(attendanceId: string, to: AttendanceStatus): Promise<Attendance> {
    const existing = await this.attendances.get(attendanceId);
    if (!existing) throw new Error("Atendimento não encontrado.");
    if (!attendanceTransitions[existing.status].includes(to)) throw new Error("Status atual não permite esta transição.");
    const attendance: Attendance = { ...existing, status: to };
    await this.attendances.save(attendance); return attendance;
  }
  listQueue(storeId: string): Promise<Attendance[]> { return this.attendances.listByStore(storeId); }
  listCustomerAttendances(customerId: string): Promise<Attendance[]> { return this.attendances.listByCustomer(customerId); }
}
