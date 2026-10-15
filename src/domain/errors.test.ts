import { describe, expect, it } from "vitest";
import { errorMessage } from "./errors";

describe("errorMessage", () => {
  it("uses the message from an Error", () => {
    expect(errorMessage(new Error("Falha ao gravar no dispositivo."), "Fallback")).toBe("Falha ao gravar no dispositivo.");
  });

  it("falls back when the message is blank", () => {
    expect(errorMessage(new Error("   "), "Fallback")).toBe("Fallback");
  });

  it("falls back for non-Error values", () => {
    expect(errorMessage("algo quebrou", "Fallback")).toBe("Fallback");
    expect(errorMessage({ code: 7 }, "Fallback")).toBe("Fallback");
    expect(errorMessage(null, "Fallback")).toBe("Fallback");
    expect(errorMessage(undefined, "Fallback")).toBe("Fallback");
  });

  it("never returns an empty string", () => {
    expect(errorMessage(new Error(""), "Fallback")).not.toBe("");
  });
});
