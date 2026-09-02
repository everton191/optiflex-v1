import { describe, expect, it } from "vitest";
import { hasPermission } from "./access";

describe("clinical professional permission model", () => {
  it("grants clinical workspace access without relying on a profession label", () => {
    expect(hasPermission("CLINICAL_PROFESSIONAL", "clinical.workspace.access")).toBe(true);
    expect(hasPermission("CLINICAL_PROFESSIONAL", "settings.manage")).toBe(false);
  });
});
