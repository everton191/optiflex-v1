import type { OrganizationSettings } from "./access";

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function formatCnpj(value: string): string {
  const digits = onlyDigits(value).slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

export function isValidCnpj(value: string): boolean {
  const digits = onlyDigits(value);
  if (digits.length !== 14 || /^(\d)\1+$/.test(digits)) return false;
  const digitOf = (base: string, weights: readonly number[]): number => {
    const sum = [...base].reduce((total, char, index) => total + Number(char) * (weights[index] ?? 0), 0);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  const first = digitOf(digits.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const second = digitOf(`${digits.slice(0, 12)}${first}`, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return first === Number(digits[12]) && second === Number(digits[13]);
}

export function normalizeOrganizationSettings(input: OrganizationSettings): OrganizationSettings {
  const optional = (value: string | undefined): string | undefined => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  };
  return {
    id: "current",
    organizationName: input.organizationName.trim(),
    clinicalProfessionalLabel: input.clinicalProfessionalLabel.trim(),
    legalName: optional(input.legalName),
    cnpj: optional(input.cnpj),
    phone: optional(input.phone),
    email: optional(input.email),
    addressStreet: optional(input.addressStreet),
    addressNumber: optional(input.addressNumber),
    addressDistrict: optional(input.addressDistrict),
    addressCity: optional(input.addressCity),
    addressState: optional(input.addressState)?.toUpperCase(),
    addressZip: optional(input.addressZip)
  };
}

export function assertValidOrganizationSettings(settings: OrganizationSettings): void {
  if (!settings.organizationName.trim()) throw new Error("Informe o nome da organização.");
  if (!settings.clinicalProfessionalLabel.trim()) throw new Error("Informe o cargo exibido na área clínica.");
  const cnpj = settings.cnpj?.trim();
  if (cnpj && !isValidCnpj(cnpj)) throw new Error("CNPJ inválido.");
  const email = settings.email?.trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("E-mail inválido.");
  const state = settings.addressState?.trim();
  if (state && !/^[A-Za-z]{2}$/.test(state)) throw new Error("UF inválida (use duas letras).");
  const zip = settings.addressZip?.trim();
  if (zip && onlyDigits(zip).length !== 8) throw new Error("CEP inválido (use 8 dígitos).");
}
