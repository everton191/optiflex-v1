import { describe, expect, it } from "vitest";
import {
  DOCUMENT_INPUT_ERROR,
  MONEY_INPUT_ERROR,
  dateInputError,
  documentError,
  formatDocument,
  formatDateBR,
  isFutureDateInput,
  isValidCNPJ,
  isValidCPF,
  isValidDocument,
  moneyInputError,
  normalizeDocument,
  parseBrazilianNumber,
  parseDateInput,
  parseMoneyInput
} from "./field-rules";
import { formatCnpj, isValidCnpj } from "./organization";

describe("parseBrazilianNumber", () => {
  it("reads plain, decimal and thousand-separated numbers", () => {
    expect(parseBrazilianNumber("12")).toBe(12);
    expect(parseBrazilianNumber("12.5")).toBe(12.5);
    expect(parseBrazilianNumber("1,5")).toBe(1.5);
    expect(parseBrazilianNumber("1.234,56")).toBe(1234.56);
    expect(parseBrazilianNumber("R$ 1.234,56")).toBe(1234.56);
  });

  it("returns undefined for empty values and NaN for garbage", () => {
    expect(parseBrazilianNumber("")).toBeUndefined();
    expect(parseBrazilianNumber("   ")).toBeUndefined();
    expect(parseBrazilianNumber("abc")).toBeNaN();
  });

  it("keeps negatives as numbers for parity with the import parser", () => {
    expect(parseBrazilianNumber("-2")).toBe(-2);
  });
});

describe("money input", () => {
  it("parses valid non-negative values and rejects the rest", () => {
    expect(parseMoneyInput("0")).toBe(0);
    expect(parseMoneyInput("12,50")).toBe(12.5);
    expect(parseMoneyInput("")).toBeUndefined();
    expect(parseMoneyInput("-1")).toBeUndefined();
    expect(parseMoneyInput("abc")).toBeUndefined();
  });

  it("explains the expected format and the required state", () => {
    expect(moneyInputError("12,50")).toBeUndefined();
    expect(moneyInputError("")).toBeUndefined();
    expect(moneyInputError("", { required: true })).toBe("Informe um valor.");
    expect(moneyInputError("abc")).toBe(MONEY_INPUT_ERROR);
  });
});

describe("documents", () => {
  it("normalizes punctuation for comparison", () => {
    expect(normalizeDocument(" 111.444.777-35 ")).toBe("11144477735");
    expect(normalizeDocument("11.222.333/0001-81")).toBe("11222333000181");
  });

  it("validates known CPF and CNPJ vectors", () => {
    expect(isValidCPF("111.444.777-35")).toBe(true);
    expect(isValidCPF("11144477735")).toBe(true);
    expect(isValidCPF("111.444.777-30")).toBe(false);
    expect(isValidCPF("00000000000")).toBe(false);
    expect(isValidCNPJ("11.222.333/0001-81")).toBe(true);
    expect(isValidCNPJ("11222333000181")).toBe(true);
    expect(isValidCNPJ("11.222.333/0001-82")).toBe(false);
    expect(isValidCNPJ("00000000000000")).toBe(false);
    expect(isValidCNPJ("11.222.333/0001-8")).toBe(false);
  });

  it("keeps the organization module as a thin facade", () => {
    expect(isValidCnpj("11.222.333/0001-81")).toBe(isValidCNPJ("11.222.333/0001-81"));
    expect(isValidCnpj("11.222.333/0001-82")).toBe(isValidCNPJ("11.222.333/0001-82"));
    expect(formatCnpj("112223330001")).toBe(formatDocument("112223330001", "CNPJ"));
    expect(formatCnpj("11222333000181")).toBe(formatDocument("11222333000181", "CNPJ"));
  });

  it("dispatches by length", () => {
    expect(isValidDocument("111.444.777-35")).toBe(true);
    expect(isValidDocument("11.222.333/0001-81")).toBe(true);
    expect(isValidDocument("123")).toBe(false);
    expect(isValidDocument("111.444.777-30")).toBe(false);
  });

  it("masks progressively as the user types", () => {
    expect(formatDocument("1", "CPF")).toBe("1");
    expect(formatDocument("1114", "CPF")).toBe("111.4");
    expect(formatDocument("111444777", "CPF")).toBe("111.444.777");
    expect(formatDocument("11144477735", "CPF")).toBe("111.444.777-35");
    expect(formatDocument("1114447773599", "CPF")).toBe("111.444.777-35");
    expect(formatDocument("11", "CNPJ")).toBe("11");
    expect(formatDocument("112223330001", "CNPJ")).toBe("11.222.333/0001");
    expect(formatDocument("11222333000181", "CNPJ")).toBe("11.222.333/0001-81");
    expect(formatDocument("112223330001819", "CNPJ")).toBe("11.222.333/0001-81");
  });

  it("infers the kind from the digit count while typing", () => {
    expect(formatDocument("1114447773")).toBe("111.444.777-3");
    expect(formatDocument("112223330001")).toBe("11.222.333/0001");
  });

  it("reports one message for invalid documents", () => {
    expect(documentError("111.444.777-35")).toBeUndefined();
    expect(documentError("")).toBeUndefined();
    expect(documentError("", { required: true })).toBe("Informe o CPF ou CNPJ.");
    expect(documentError("111.444.777-30")).toBe(DOCUMENT_INPUT_ERROR);
    expect(documentError("123")).toBe(DOCUMENT_INPUT_ERROR);
  });
});

describe("dates", () => {
  it("accepts real ISO dates and rejects the rest", () => {
    expect(parseDateInput("2026-01-05")).toBe("2026-01-05");
    expect(parseDateInput("2024-02-29")).toBe("2024-02-29");
    expect(parseDateInput("2026-02-30")).toBeUndefined();
    expect(parseDateInput("2026-13-01")).toBeUndefined();
    expect(parseDateInput("2026-00-10")).toBeUndefined();
    expect(parseDateInput("05/01/2026")).toBeUndefined();
    expect(parseDateInput("")).toBeUndefined();
  });

  it("detects future dates against the local calendar day", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const pad = (value: number) => String(value).padStart(2, "0");
    const iso = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`;
    expect(isFutureDateInput(iso)).toBe(true);
    expect(isFutureDateInput("2020-01-01")).toBe(false);
    expect(isFutureDateInput("not-a-date")).toBe(false);
  });

  it("explains empty, invalid and future dates", () => {
    expect(dateInputError("2026-01-05")).toBeUndefined();
    expect(dateInputError("")).toBeUndefined();
    expect(dateInputError("", { required: true })).toBe("Informe a data.");
    expect(dateInputError("2026-02-30")).toBe("Data inválida.");
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const pad = (value: number) => String(value).padStart(2, "0");
    const iso = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`;
    expect(dateInputError(iso, { notFuture: true })).toBe("A data não pode estar no futuro.");
  });

  it("formats for display without shifting the day across timezones", () => {
    expect(formatDateBR("2026-01-05")).toBe("05/01/2026");
    expect(formatDateBR("2026-12-31")).toBe("31/12/2026");
    expect(formatDateBR("not-a-date")).toBe("");
  });
});
