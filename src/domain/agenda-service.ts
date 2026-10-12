import { attendanceTypeForAgendaEvent, dayRange, weekRange, type AgendaEvent, type AgendaEventType } from "./agenda";
import type { Attendance } from "./customer";
import type { AgendaRepository, CustomerRepository } from "./repositories";
import type { ReceptionService } from "./reception-service";

const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

export interface CreateAgendaEventInput {
  storeId: string;
  customerId: string;
  professionalId?: string;
  type: AgendaEventType;
  startsAt: string;
  notes?: string;
}

export class AgendaService {
  constructor(private readonly events: AgendaRepository, private readonly customers: CustomerRepository, private readonly reception: ReceptionService) {}

  async createEvent(input: CreateAgendaEventInput): Promise<AgendaEvent> {
    if (!input.storeId.trim()) throw new Error("Selecione uma loja para agendar.");
    if (!input.customerId || !await this.customers.get(input.customerId)) throw new Error("Selecione um cliente cadastrado.");
    const startsAt = new Date(input.startsAt);
    if (Number.isNaN(startsAt.getTime())) throw new Error("Informe uma data e hora válidas.");
    const event: AgendaEvent = { id: id("agenda"), storeId: input.storeId, customerId: input.customerId, professionalId: input.professionalId?.trim() || undefined, type: input.type, status: "SCHEDULED", startsAt: startsAt.toISOString(), notes: input.notes?.trim() || undefined, createdAt: new Date().toISOString() };
    await this.events.save(event);
    return event;
  }

  listDay(storeId: string, day: Date): Promise<AgendaEvent[]> {
    const { from, to } = dayRange(day);
    return this.events.listByStoreAndRange(storeId, from, to);
  }

  listWeek(storeId: string, day: Date): Promise<AgendaEvent[]> {
    const { from, to } = weekRange(day);
    return this.events.listByStoreAndRange(storeId, from, to);
  }

  async convertToAttendance(eventId: string): Promise<{ event: AgendaEvent; attendance: Attendance }> {
    const event = await this.events.get(eventId);
    if (!event) throw new Error("Evento não encontrado.");
    if (event.status !== "SCHEDULED") throw new Error("Somente eventos agendados podem virar atendimento.");
    const attendanceType = attendanceTypeForAgendaEvent(event.type);
    if (!attendanceType) throw new Error("Este tipo de evento não vira atendimento.");
    const attendance = await this.reception.startAttendance(event.customerId, event.storeId, attendanceType, event.notes);
    const updated: AgendaEvent = { ...event, status: "COMPLETED", attendanceId: attendance.id };
    await this.events.save(updated);
    return { event: updated, attendance };
  }

  async cancel(eventId: string): Promise<AgendaEvent> {
    const event = await this.events.get(eventId);
    if (!event) throw new Error("Evento não encontrado.");
    if (event.status !== "SCHEDULED") throw new Error("Somente eventos agendados podem ser cancelados.");
    const updated: AgendaEvent = { ...event, status: "CANCELLED" };
    await this.events.save(updated);
    return updated;
  }
}
