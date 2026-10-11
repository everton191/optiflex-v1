import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { database } from "./database";
import { LocalSettingsRepository } from "./local-repositories";

// This suite uses only the in-memory IndexedDB implementation, never browser data.
afterEach(async () => { await database.delete(); });

const repository = new LocalSettingsRepository();

describe("organization settings contract", () => {
  it("returns the seeded defaults when nothing was saved", async () => {
    await database.open();
    const settings = await repository.get();
    expect(settings).toEqual({ id: "current", organizationName: "Opticore Demo", clinicalProfessionalLabel: "Profissional clínico" });
  });

  it("persists edited settings as a single row after reopening the database", async () => {
    await database.open();
    await repository.save({ id: "current", organizationName: "Ótica Central", clinicalProfessionalLabel: "Optometrista" });
    database.close();
    await database.open();
    expect(await repository.get()).toEqual({ id: "current", organizationName: "Ótica Central", clinicalProfessionalLabel: "Optometrista" });
    expect(await database.settings.count()).toBe(1);
  });

  it("overwrites the previous values on a second save", async () => {
    await database.open();
    await repository.save({ id: "current", organizationName: "Primeira", clinicalProfessionalLabel: "Rótulo 1" });
    await repository.save({ id: "current", organizationName: "Segunda", clinicalProfessionalLabel: "Rótulo 2" });
    expect(await repository.get()).toEqual({ id: "current", organizationName: "Segunda", clinicalProfessionalLabel: "Rótulo 2" });
    expect(await database.settings.count()).toBe(1);
  });
});
