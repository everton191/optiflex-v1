// Regras reutilizáveis de formulário por tipo de dado (F7-07 — issue #122).
// Moeda, documento e data com uma única implementação por regra, usadas pelos
// formulários via componentes MoneyInput/DocumentInput/DateInput (components.tsx).
//
// Moeda (fronteira de formulário) complementa money.ts (regra de centavos F1-09):
// o parser aceita formato pt-BR ("1.234,56", "R$ 12,50") e rejeita negativos.
// Documento consolida as validações que existiam em customer.ts e organization.ts.
// Data trabalha com o formato do input type="date" (YYYY-MM-DD), sem depender
// de fuso (formatDateBR lê as partes — evita o off-by-one de new Date(iso)).

export function parseBrazilianNumber(value: string): number | undefined {
  const text = value.trim().replace(/R\$/g, "").replace(/\s/g, "");
  if (!text) return undefined;
  const withDot = text.includes(",") ? text.replace(/\./g, "").replace(",", ".") : text;
  const number = Number(withDot);
  return Number.isFinite(number) ? number : Number.NaN;
}

export const MONEY_INPUT_ERROR = "Informe um valor monetário válido (ex.: 12,50).";

export function parseMoneyInput(value: string): number | undefined {
  const number = parseBrazilianNumber(value);
  if (number === undefined || !Number.isFinite(number) || number < 0) return undefined;
  return number;
}

export function moneyInputError(value: string, options: { required: true }): string;
export function moneyInputError(value: string, options?: { required?: boolean }): string | undefined;
export function moneyInputError(value: string, options: { required?: boolean } = {}): string | undefined {
  if (!value.trim()) return options.required ? "Informe um valor." : undefined;
  return parseMoneyInput(value) === undefined ? MONEY_INPUT_ERROR : undefined;
}

export function normalizeDocument(value: string): string {
  return value.trim().replace(/[.\-/ ]/g, "");
}

function isAllSameDigit(digits: string): boolean {
  return /^(\d)\1+$/.test(digits);
}

export function isValidCPF(value: string): boolean {
  const digits = normalizeDocument(value);
  if (!/^\d{11}$/.test(digits) || isAllSameDigit(digits)) return false;
  const numbers = [...digits].map(Number);
  const first = numbers.slice(0, 9).reduce((sum, digit, index) => sum + digit * (10 - index), 0);
  const firstCheck = first % 11 < 2 ? 0 : 11 - (first % 11);
  if (numbers[9] !== firstCheck) return false;
  const second = numbers.slice(0, 10).reduce((sum, digit, index) => sum + digit * (11 - index), 0);
  const secondCheck = second % 11 < 2 ? 0 : 11 - (second % 11);
  return numbers[10] === secondCheck;
}

export function isValidCNPJ(value: string): boolean {
  const digits = normalizeDocument(value);
  if (!/^\d{14}$/.test(digits) || isAllSameDigit(digits)) return false;
  const numbers = [...digits].map(Number);
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const sum1 = numbers.slice(0, 12).reduce((total, digit, index) => total + digit * weights1[index], 0);
  const check1 = sum1 % 11 < 2 ? 0 : 11 - (sum1 % 11);
  if (numbers[12] !== check1) return false;
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const sum2 = numbers.slice(0, 13).reduce((total, digit, index) => total + digit * weights2[index], 0);
  const check2 = sum2 % 11 < 2 ? 0 : 11 - (sum2 % 11);
  return numbers[13] === check2;
}

export function isValidDocument(value: string): boolean {
  const digits = normalizeDocument(value);
  if (digits.length === 11) return isValidCPF(digits);
  if (digits.length === 14) return isValidCNPJ(digits);
  return false;
}

export function formatDocument(value: string, kind?: "CPF" | "CNPJ"): string {
  const digits = normalizeDocument(value).replace(/\D/g, "");
  if (kind === "CPF") {
    const capped = digits.slice(0, 11);
    if (capped.length <= 3) return capped;
    if (capped.length <= 6) return `${capped.slice(0, 3)}.${capped.slice(3)}`;
    if (capped.length <= 9) return `${capped.slice(0, 3)}.${capped.slice(3, 6)}.${capped.slice(6)}`;
    return `${capped.slice(0, 3)}.${capped.slice(3, 6)}.${capped.slice(6, 9)}-${capped.slice(9)}`;
  }
  if (kind === "CNPJ" || digits.length > 11) {
    const capped = digits.slice(0, 14);
    if (capped.length <= 2) return capped;
    if (capped.length <= 5) return `${capped.slice(0, 2)}.${capped.slice(2)}`;
    if (capped.length <= 8) return `${capped.slice(0, 2)}.${capped.slice(2, 5)}.${capped.slice(5)}`;
    if (capped.length <= 12) return `${capped.slice(0, 2)}.${capped.slice(2, 5)}.${capped.slice(5, 8)}/${capped.slice(8)}`;
    return `${capped.slice(0, 2)}.${capped.slice(2, 5)}.${capped.slice(5, 8)}/${capped.slice(8, 12)}-${capped.slice(12)}`;
  }
  const capped = digits.slice(0, 11);
  if (capped.length <= 3) return capped;
  if (capped.length <= 6) return `${capped.slice(0, 3)}.${capped.slice(3)}`;
  if (capped.length <= 9) return `${capped.slice(0, 3)}.${capped.slice(3, 6)}.${capped.slice(6)}`;
  return `${capped.slice(0, 3)}.${capped.slice(3, 6)}.${capped.slice(6, 9)}-${capped.slice(9)}`;
}

export const DOCUMENT_INPUT_ERROR = "CPF ou CNPJ inválido.";

export function documentError(value: string, options: { required: true }): string;
export function documentError(value: string, options?: { required?: boolean }): string | undefined;
export function documentError(value: string, options: { required?: boolean } = {}): string | undefined {
  if (!value.trim()) return options.required ? "Informe o CPF ou CNPJ." : undefined;
  return isValidDocument(value) ? undefined : DOCUMENT_INPUT_ERROR;
}

export function parseDateInput(value: string): string | undefined {
  const trimmed = value.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) return undefined;
  const year = Number(match[1]); const month = Number(match[2]); const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return undefined;
  return trimmed;
}

function todayIso(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function isFutureDateInput(value: string): boolean {
  const iso = parseDateInput(value);
  return iso !== undefined && iso > todayIso();
}

export function dateInputError(value: string, options: { required: true; notFuture?: boolean }): string;
export function dateInputError(value: string, options?: { required?: boolean; notFuture?: boolean }): string | undefined;
export function dateInputError(value: string, options: { required?: boolean; notFuture?: boolean } = {}): string | undefined {
  if (!value.trim()) return options.required ? "Informe a data." : undefined;
  if (!parseDateInput(value)) return "Data inválida.";
  if (options.notFuture && isFutureDateInput(value)) return "A data não pode estar no futuro.";
  return undefined;
}

export function formatDateBR(value: string): string {
  const iso = parseDateInput(value);
  if (!iso) return "";
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}
