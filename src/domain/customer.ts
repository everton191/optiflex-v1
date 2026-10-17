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

export function normalizeDocument(value: string): string {
  return value.trim().replace(/[.\-/ ]/g, "");
}

function isAllSameDigit(digits: string): boolean {
  return /^(\d)\1+$/.test(digits);
}

export function isValidCPF(value: string): boolean {
  const digits = normalizeDocument(value);
  if (!/^\d{11}$/.test(digits) || isAllSameDigit(digits)) return false;
  const numbers = [...digits].map(Number);
  const first = numbers.slice(0, 9).reduce((sum, digit, index) => sum + digit * (10 - index), 0);
  const firstCheck = first % 11 < 2 ? 0 : 11 - (first % 11);
  if (numbers[9] !== firstCheck) return false;
  const second = numbers.slice(0, 10).reduce((sum, digit, index) => sum + digit * (11 - index), 0);
  const secondCheck = second % 11 < 2 ? 0 : 11 - (second % 11);
  return numbers[10] === secondCheck;
}

export function isValidCNPJ(value: string): boolean {
  const digits = normalizeDocument(value);
  if (!/^\d{14}$/.test(digits) || isAllSameDigit(digits)) return false;
  const numbers = [...digits].map(Number);
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const sum1 = numbers.slice(0, 12).reduce((total, digit, index) => total + digit * weights1[index], 0);
  const check1 = sum1 % 11 < 2 ? 0 : 11 - (sum1 % 11);
  if (numbers[12] !== check1) return false;
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const sum2 = numbers.slice(0, 13).reduce((total, digit, index) => total + digit * weights2[index], 0);
  const check2 = sum2 % 11 < 2 ? 0 : 11 - (sum2 % 11);
  return numbers[13] === check2;
}

export function isValidDocument(value: string): boolean {
  const digits = normalizeDocument(value);
  if (digits.length === 11) return isValidCPF(digits);
  if (digits.length === 14) return isValidCNPJ(digits);
  return false;
}

export function normalizeSearchText(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
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
