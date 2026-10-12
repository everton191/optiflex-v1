export interface Customer {
  id: string;
  name: string;
  cpf?: string;
  phone?: string;
  birthDate?: string;
  email?: string;
  createdAt: string;
}

export type AttendanceStatus = "DRAFT" | "WAITING" | "IN_PROGRESS" | "FINISHED" | "CANCELLED";
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
  WAITING: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["FINISHED", "CANCELLED"],
  FINISHED: [],
  CANCELLED: []
};
