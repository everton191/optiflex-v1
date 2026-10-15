import { describe, expect, it } from "vitest";
import { attendanceTransitions, findDuplicateCustomer, isActiveQueueStatus, isValidCPF, isValidCNPJ, isValidDocument, normalizeSearchText, waitingMinutes, type AttendanceStatus, type Customer } from "./customer";

const allStatuses: readonly AttendanceStatus[] = ["DRAFT", "WAITING", "IN_PROGRESS", "FINISHED", "CANCELLED", "NO_SHOW"];

describe("active queue membership", () => {
  it("keeps only waiting and in-progress attendances and lets final states leave the queue", () => {
    expect(allStatuses.map((status) => isActiveQueueStatus(status))).toEqual([false, true, true, false, false, false]);
  });
});

describe("waiting time per attendance", () => {
  const now = new Date("2026-10-08T12:00:00.000Z");
  it("calculates whole minutes since arrival for waiting records", () => {
    expect(waitingMinutes({ status: "WAITING", createdAt: "2026-10-08T11:45:30.000Z" }, now)).toBe(14);
    expect(waitingMinutes({ status: "WAITING", createdAt: "2026-10-08T11:59:10.000Z" }, now)).toBe(0);
    expect(waitingMinutes({ status: "WAITING", createdAt: "2026-10-08T08:00:00.000Z" }, now)).toBe(240);
  });
  it("returns zero for other statuses, future arrivals and invalid timestamps", () => {
    expect(waitingMinutes({ status: "IN_PROGRESS", createdAt: "2026-10-08T08:00:00.000Z" }, now)).toBe(0);
    expect(waitingMinutes({ status: "FINISHED", createdAt: "2026-10-08T08:00:00.000Z" }, now)).toBe(0);
    expect(waitingMinutes({ status: "CANCELLED", createdAt: "2026-10-08T08:00:00.000Z" }, now)).toBe(0);
    expect(waitingMinutes({ status: "NO_SHOW", createdAt: "2026-10-08T08:00:00.000Z" }, now)).toBe(0);
    expect(waitingMinutes({ status: "WAITING", createdAt: "2026-10-08T13:00:00.000Z" }, now)).toBe(0);
    expect(waitingMinutes({ status: "WAITING", createdAt: "not-a-date" }, now)).toBe(0);
  });
});

describe("attendance transition guards", () => {
  it("allows start, no-show and closing only from active statuses", () => {
    expect(attendanceTransitions.DRAFT).toEqual(["WAITING", "CANCELLED"]);
    expect(attendanceTransitions.WAITING).toEqual(["IN_PROGRESS", "CANCELLED", "NO_SHOW"]);
    expect(attendanceTransitions.IN_PROGRESS).toEqual(["FINISHED", "CANCELLED"]);
    expect(attendanceTransitions.FINISHED).toEqual([]);
    expect(attendanceTransitions.CANCELLED).toEqual([]);
    expect(attendanceTransitions.NO_SHOW).toEqual([]);
  });
});

describe("CPF/CNPJ validation", () => {
  it("accepts known valid documents with and without mask", () => {
    expect(isValidCPF("111.444.777-35")).toBe(true);
    expect(isValidCPF("11144477735")).toBe(true);
    expect(isValidCPF("529.982.247-25")).toBe(true);
    expect(isValidCPF("52998224725")).toBe(true);
    expect(isValidCNPJ("11.222.333/0001-81")).toBe(true);
    expect(isValidCNPJ("11222333000181")).toBe(true);
    expect(isValidCNPJ("00.000.000/0001-91")).toBe(true);
  });
  it("rejects known invalid documents", () => {
    expect(isValidCPF("111.111.111-11")).toBe(false);
    expect(isValidCPF("11144477734")).toBe(false);
    expect(isValidCPF("529.982.247-2")).toBe(false);
    expect(isValidCPF("529.982.247-2x")).toBe(false);
    expect(isValidCPF("")).toBe(false);
    expect(isValidCNPJ("11.222.333/0001-80")).toBe(false);
    expect(isValidCNPJ("11111111111111")).toBe(false);
    expect(isValidCNPJ("1122233300018")).toBe(false);
    expect(isValidCNPJ("abc")).toBe(false);
  });
  it("routes by digit count and rejects other lengths", () => {
    expect(isValidDocument("11144477735")).toBe(true);
    expect(isValidDocument("11222333000181")).toBe(true);
    expect(isValidDocument("529.982.247-25")).toBe(true);
    expect(isValidDocument("11.222.333/0001-81")).toBe(true);
    expect(isValidDocument("1122233300018")).toBe(false);
    expect(isValidDocument("123")).toBe(false);
    expect(isValidDocument("")).toBe(false);
  });
});

describe("duplicate customer detection", () => {
  const customer = (id: string, name: string, phone?: string, cpf?: string): Customer => ({ id, name, phone, cpf, createdAt: "2026-01-01T10:00:00.000Z" });
  const existing = [customer("c1", "José da Silva", "(11) 99999-0000", "111.444.777-35"), customer("c2", "Maria Souza", "1133334444")];

  it("normalizes accents, case and punctuation for comparisons", () => {
    expect(normalizeSearchText("  JOSE   da-Silva! ")).toBe("jose da silva");
    expect(normalizeSearchText("María Souza")).toBe("maria souza");
  });

  it("flags the same document even with a different mask", () => {
    expect(findDuplicateCustomer(existing, { name: "Outro Nome", phone: "988887777", cpf: "11144477735" })?.id).toBe("c1");
    expect(findDuplicateCustomer(existing, { name: "Outro Nome", phone: "988887777", cpf: "999.888.777-66" })).toBeUndefined();
  });

  it("flags the same normalized name and phone when no document is given", () => {
    expect(findDuplicateCustomer(existing, { name: "jose da silva", phone: "11 99999 0000" })?.id).toBe("c1");
    expect(findDuplicateCustomer(existing, { name: "MARIA SOUZA", phone: "(11) 3333-4444" })?.id).toBe("c2");
  });

  it("stays quiet when there is no document and name or phone differ", () => {
    expect(findDuplicateCustomer(existing, { name: "José da Silva", phone: "(11) 98888-7777" })).toBeUndefined();
    expect(findDuplicateCustomer(existing, { name: "Ana Paula", phone: "(11) 99999-0000" })).toBeUndefined();
    expect(findDuplicateCustomer(existing, { name: "", phone: "", cpf: "" })).toBeUndefined();
  });

  it("skips the customer being edited", () => {
    expect(findDuplicateCustomer(existing, { name: "José da Silva", phone: "(11) 99999-0000", cpf: "111.444.777-35" }, "c1")).toBeUndefined();
  });
});