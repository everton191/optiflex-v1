export type AgendaEventType = "CONSULTATION" | "RETURN" | "DELIVERY" | "ADJUSTMENT" | "BILLING";
export type AgendaEventStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED";

export interface AgendaEvent {
  id: string;
  storeId: string;
  customerId: string;
  professionalId?: string;
  type: AgendaEventType;
  status: AgendaEventStatus;
  startsAt: string;
  notes?: string;
  attendanceId?: string;
  createdAt: string;
}

export const agendaEventTypeLabels: Readonly<Record<AgendaEventType, string>> = { CONSULTATION: "Consulta", RETURN: "Retorno", DELIVERY: "Entrega", ADJUSTMENT: "Ajuste", BILLING: "Cobrança" };
export const agendaEventStatusLabels: Readonly<Record<AgendaEventStatus, string>> = { SCHEDULED: "Agendado", COMPLETED: "Concluído", CANCELLED: "Cancelado" };

const attendanceTypeByAgendaType = { CONSULTATION: "CONSULTATION", RETURN: "RETURN", ADJUSTMENT: "ADJUSTMENT" } as const;
export function attendanceTypeForAgendaEvent(type: AgendaEventType): (typeof attendanceTypeByAgendaType)[keyof typeof attendanceTypeByAgendaType] | undefined {
  return attendanceTypeByAgendaType[type as keyof typeof attendanceTypeByAgendaType];
}

export function dayRange(day: Date): { from: string; to: string } {
  const from = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const to = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
  return { from: from.toISOString(), to: to.toISOString() };
}

export function weekRange(day: Date): { from: string; to: string } {
  const mondayOffset = (day.getDay() + 6) % 7;
  const from = new Date(day.getFullYear(), day.getMonth(), day.getDate() - mondayOffset);
  const to = new Date(from.getFullYear(), from.getMonth(), from.getDate() + 7);
  return { from: from.toISOString(), to: to.toISOString() };
}
