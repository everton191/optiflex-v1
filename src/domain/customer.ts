import { isValidDocument, normalizeDocument } from "./field-rules";

export { formatDocument, isValidCPF, isValidCNPJ, isValidDocument, normalizeDocument } from "./field-rules";

export interface Customer {
  organizationId?: string;
  id: string;
  name: string;
  cpf?: string;
  phone?: string;
  birthDate?: string;
  email?: string;
  createdAt: string;
}

export type AttendanceStatus = "DRAFT" | "WAITING" | "IN_PROGRESS" | "FINISHED" | "CANCELLED" | "NO_SHOW";
export type AttendanceType = "CONSULTATION" | "RETURN" | "ADJUSTMENT" | "ASSESSMENT";
export type AttendancePriority = "NORMAL" | "URGENT";

export const attendanceTypeLabels: Record<AttendanceType, string> = { CONSULTATION: "Consulta", RETURN: "Retorno", ADJUSTMENT: "Ajuste", ASSESSMENT: "Avaliação" };
export const attendanceStatusLabels: Record<AttendanceStatus, string> = { DRAFT: "Em preparação", WAITING: "Aguardando", IN_PROGRESS: "Em atendimento", FINISHED: "Finalizado", CANCELLED: "Cancelado", NO_SHOW: "Faltou" };

export const attendancePriorities: readonly AttendancePriority[] = ["NORMAL", "URGENT"];
export function isAttendancePriority(value: unknown): value is AttendancePriority {
  return attendancePriorities.includes(value as AttendancePriority);
}

export interface Attendance {
  organizationId?: string;
  id: string;
  customerId: string;
  storeId: string;
  type: AttendanceType;
  status: AttendanceStatus;
  professionalId?: string;
  priority?: AttendancePriority;
  receptionNotes?: string;
  createdAt: string;
}

export const attendanceTransitions: Record<AttendanceStatus, readonly AttendanceStatus[]> = {
  DRAFT: ["WAITING", "CANCELLED"],
  WAITING: ["IN_PROGRESS", "CANCELLED", "NO_SHOW"],
  IN_PROGRESS: ["FINISHED", "CANCELLED"],
  FINISHED: [],
  CANCELLED: [],
  NO_SHOW: []
};

export const activeQueueStatuses: readonly AttendanceStatus[] = ["WAITING", "IN_PROGRESS"];

export function isActiveQueueStatus(status: AttendanceStatus): boolean {
  return activeQueueStatuses.includes(status);
}

export function waitingMinutes(attendance: Pick<Attendance, "status" | "createdAt">, now: Date): number {
  if (attendance.status !== "WAITING") return 0;
  const createdAt = Date.parse(attendance.createdAt);
  if (Number.isNaN(createdAt)) return 0;
  return Math.max(0, Math.floor((now.getTime() - createdAt) / 60_000));
}

export function normalizeSearchText(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
}

function foldCase(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}

export function customerSearchTerms(customer: Pick<Customer, "name" | "cpf" | "phone">): string[] {
  return [customer.name, customer.cpf, customer.phone].filter(Boolean).map((value) => foldCase(value!));
}

export function customerSearchTermsMatch(terms: readonly string[], needle: string): boolean {
  const query = foldCase(needle.trim());
  if (!query) return true;
  return terms.some((term) => term.includes(query));
}

export function customerMatchesQuery(customer: Pick<Customer, "name" | "cpf" | "phone">, needle: string): boolean {
  return customerSearchTermsMatch(customerSearchTerms(customer), needle);
}

function normalizePhoneDigits(value: string): string {
  return (value ?? "").replace(/\D/g, "");
}

export function findDuplicateCustomer(customers: readonly Customer[], input: Pick<Customer, "name" | "phone" | "cpf">, excludeId?: string): Customer | undefined {
  const document = normalizeDocument(input.cpf ?? "").trim();
  const name = normalizeSearchText(input.name ?? "");
  const phone = normalizePhoneDigits(input.phone ?? "");
  for (const customer of customers) {
    if (excludeId && customer.id === excludeId) continue;
    if (document && document === normalizeDocument(customer.cpf ?? "").trim()) return customer;
    if (name && phone && name === normalizeSearchText(customer.name) && phone === normalizePhoneDigits(customer.phone ?? "")) return customer;
  }
  return undefined;
}
