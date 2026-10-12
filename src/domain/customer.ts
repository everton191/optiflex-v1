export interface Customer {
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

export const attendancePriorities: readonly AttendancePriority[] = ["NORMAL", "URGENT"];
export function isAttendancePriority(value: unknown): value is AttendancePriority {
  return attendancePriorities.includes(value as AttendancePriority);
}

export interface Attendance {
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
