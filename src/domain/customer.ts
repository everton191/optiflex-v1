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

export interface Attendance {
  id: string;
  customerId: string;
  storeId: string;
  type: AttendanceType;
  status: AttendanceStatus;
  receptionNotes?: string;
  createdAt: string;
}
