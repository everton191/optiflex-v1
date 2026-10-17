import { describe, expect, it } from "vitest";
import type { OrganizationSettings } from "./access";
import { assertValidOrganizationSettings, formatCnae, formatCnpj, isTaxRegime, isValidCnae, isValidCnpj, normalizeOrganizationSettings, onlyDigits } from "./organization";

const base: OrganizationSettings = { id: "current", organizationName: "Ótica Central", clinicalProfessionalLabel: "Optometrista" };

describe("cnpj", () => {
  it("validates the check digits of a known valid cnpj in any punctuation", () => {
    expect(isValidCnpj("11.222.333/0001-81")).toBe(true);
    expect(isValidCnpj("11222333000181")).toBe(true);
  });

  it("rejects wrong length, repeated digits and bad check digits", () => {
    expect(isValidCnpj("11.222.333/0001-8")).toBe(false);
    expect(isValidCnpj("1122233300018")).toBe(false);
    expect(isValidCnpj("00000000000000")).toBe(false);
    expect(isValidCnpj("11.222.333/0001-82")).toBe(false);
  });

  it("formats progressively while typing", () => {
    expect(formatCnpj("1")).toBe("1");
    expect(formatCnpj("11")).toBe("11");
    expect(formatCnpj("11222")).toBe("11.222");
    expect(formatCnpj("11222333")).toBe("11.222.333");
    expect(formatCnpj("112223330001")).toBe("11.222.333/0001");
    expect(formatCnpj("11222333000181")).toBe("11.222.333/0001-81");
    expect(onlyDigits("11.222.333/0001-81")).toBe("11222333000181");
  });
});

describe("organization settings", () => {
  it("normalizes blanks into undefined and uppercases the state", () => {
    const normalized = normalizeOrganizationSettings({ ...base, legalName: "  Central Ltda  ", cnpj: "", phone: " ", addressState: "sp", addressZip: "01310-100" });
    expect(normalized.legalName).toBe("Central Ltda");
    expect(normalized.cnpj).toBeUndefined();
    expect(normalized.phone).toBeUndefined();
    expect(normalized.addressState).toBe("SP");
    expect(normalized.addressZip).toBe("01310-100");
  });

  it("accepts a complete valid payload", () => {
    expect(() => assertValidOrganizationSettings({ ...base, legalName: "Central Serviços Ópticos Ltda", cnpj: "11.222.333/0001-81", email: "contato@central.com", addressState: "SP", addressZip: "01310-100" })).not.toThrow();
  });

  it("rejects blank required names", () => {
    expect(() => assertValidOrganizationSettings({ ...base, organizationName: "  " })).toThrow("Informe o nome da organização");
    expect(() => assertValidOrganizationSettings({ ...base, clinicalProfessionalLabel: "" })).toThrow("Informe o cargo exibido");
  });

  it("rejects invalid cnpj, email, state and zip when present", () => {
    expect(() => assertValidOrganizationSettings({ ...base, cnpj: "11.222.333/0001-82" })).toThrow("CNPJ inválido");
    expect(() => assertValidOrganizationSettings({ ...base, email: "sem-arroba" })).toThrow("E-mail inválido");
    expect(() => assertValidOrganizationSettings({ ...base, addressState: "São Paulo" })).toThrow("UF inválida");
    expect(() => assertValidOrganizationSettings({ ...base, addressZip: "0131-100" })).toThrow("CEP inválido");
  });
});

describe("fiscal identification fields", () => {
  it("formats cnae while typing and validates the 7 digits", () => {
    expect(formatCnae("4773502")).toBe("4773-5/02");
    expect(formatCnae("4773")).toBe("4773");
    expect(formatCnae("4773-5/02")).toBe("4773-5/02");
    expect(isValidCnae("4773-5/02")).toBe(true);
    expect(isValidCnae("4773-5/0")).toBe(false);
    expect(isValidCnae("")).toBe(false);
  });

  it("recognizes only known tax regimes", () => {
    expect(isTaxRegime("SIMPLES_NACIONAL")).toBe(true);
    expect(isTaxRegime("MEI")).toBe(true);
    expect(isTaxRegime("PURPURA")).toBe(false);
    expect(isTaxRegime(42)).toBe(false);
  });

  it("normalizes regime, registrations and cnae", () => {
    const normalized = normalizeOrganizationSettings({ ...base, taxRegime: "SIMPLES_NACIONAL", stateRegistration: " isento ", municipalRegistration: "123456", cnae: "4773502" });
    expect(normalized.taxRegime).toBe("SIMPLES_NACIONAL");
    expect(normalized.stateRegistration).toBe("ISENTO");
    expect(normalized.municipalRegistration).toBe("123456");
    expect(normalized.cnae).toBe("4773-5/02");
  });

  it("accepts a complete fiscal payload", () => {
    expect(() => assertValidOrganizationSettings({ ...base, taxRegime: "REGIME_NORMAL", stateRegistration: "ISENTO", municipalRegistration: "123456", cnae: "4773-5/02" })).not.toThrow();
  });

  it("rejects invalid regime, registrations and cnae when present", () => {
    expect(() => assertValidOrganizationSettings({ ...base, taxRegime: "LUCRO_SOLUCAO" as never })).toThrow("Regime tributário inválido");
    expect(() => assertValidOrganizationSettings({ ...base, stateRegistration: "a b c" })).toThrow("Inscrição estadual inválida");
    expect(() => assertValidOrganizationSettings({ ...base, municipalRegistration: "!!" })).toThrow("Inscrição municipal inválida");
    expect(() => assertValidOrganizationSettings({ ...base, cnae: "47-5" })).toThrow("CNAE inválido");
  });
});
