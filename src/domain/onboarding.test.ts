import { beforeEach, describe, expect, it, vi } from "vitest";
import { OnboardingService, buildOnboardingSummary, nextOnboardingStep, onboardingSteps, previousOnboardingStep, type OnboardingStepId } from "./onboarding";
import type { AdministrationService } from "./administration-service";
import type { SettingsRepository } from "./repositories";
import type { OrganizationSettings } from "./access";

const settings = { get: vi.fn(), save: vi.fn() };
const administration = { createStore: vi.fn(), createUser: vi.fn() };
const service = new OnboardingService({ settings: settings as unknown as SettingsRepository, administration: administration as unknown as AdministrationService });

const baseSettings: OrganizationSettings = { id: "current", organizationName: "  Óptica Demo ", clinicalProfessionalLabel: "Optometrista" };

beforeEach(() => {
  vi.resetAllMocks();
  settings.save.mockResolvedValue(undefined);
  administration.createStore.mockResolvedValue({ id: "store-1", name: "Loja Centro", active: true });
  administration.createUser.mockResolvedValue({ id: "user-1", name: "Ana", email: "ana@opticore.local", role: "OWNER", scope: "NETWORK", storeIds: [], active: true });
});

describe("step navigation", () => {
  it("walks forward skipping optional steps and ends at review", () => {
    expect(nextOnboardingStep("organization")).toBe("store");
    expect(nextOnboardingStep("store", ["store", "user", "products"])).toBe("review");
    expect(nextOnboardingStep("review")).toBe("done");
  });

  it("walks backward skipping the same steps", () => {
    expect(previousOnboardingStep("review", ["store", "user", "products"])).toBe("organization");
    expect(previousOnboardingStep("organization")).toBeUndefined();
  });

  it("marks only organization and review as required", () => {
    expect(onboardingSteps.filter((step) => !step.optional).map((step) => step.id)).toEqual(["organization", "review"]);
  });
});

describe("organization step", () => {
  it("normalizes and persists settings", async () => {
    const saved = await service.completeOrganization(baseSettings);
    expect(saved.organizationName).toBe("Óptica Demo");
    expect(settings.save).toHaveBeenCalledWith(saved);
  });

  it("rejects blank organization name without saving", async () => {
    await expect(service.completeOrganization({ ...baseSettings, organizationName: "   " })).rejects.toThrow("Informe o nome da organização.");
    expect(settings.save).not.toHaveBeenCalled();
  });
});

describe("store and owner steps", () => {
  it("creates the first store through administration", async () => {
    const store = await service.createStore("Loja Centro", "admin");
    expect(administration.createStore).toHaveBeenCalledWith({ name: "Loja Centro" }, "admin");
    expect(store.id).toBe("store-1");
  });

  it("creates the initial owner and rejects other roles", async () => {
    const user = await service.createOwner({ name: "Ana", email: "ana@opticore.local", role: "OWNER", storeIds: [] });
    expect(user.role).toBe("OWNER");
    await expect(service.createOwner({ name: "Bia", email: "bia@opticore.local", role: "SELLER", storeIds: ["store-1"] })).rejects.toThrow("O usuário inicial do assistente deve ser OWNER.");
  });
});

describe("review summary", () => {
  it("collects configured names and skips", () => {
    const summary = buildOnboardingSummary({ settings: baseSettings, storeName: "Loja Centro", ownerName: "Ana", productNames: ["Armação"], skipped: ["products"] as OnboardingStepId[] });
    expect(summary).toEqual({ organizationName: "Óptica Demo", storeName: "Loja Centro", ownerName: "Ana", productNames: ["Armação"], skipped: ["products"] });
  });

  it("falls back to placeholders when steps were skipped", () => {
    expect(buildOnboardingSummary({})).toEqual({ organizationName: "—", storeName: undefined, ownerName: undefined, productNames: [], skipped: [] });
  });
});
