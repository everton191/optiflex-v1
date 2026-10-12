import { describe, expect, it } from "vitest";
import { attendanceTransitions, isActiveQueueStatus, waitingMinutes, type AttendanceStatus } from "./customer";

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
