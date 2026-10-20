import type { OrganizationSettings, TaxRegime } from "./access";
import { formatDocument, isValidCNPJ } from "./field-rules";

export const taxRegimeLabels: Record<TaxRegime, string> = {
  SIMPLES_NACIONAL: "Simples Nacional",
  SIMPLES_EXCESSO_SUBRECEITA: "Simples Nacional — excesso de sublimite de receita",
  REGIME_NORMAL: "Regime normal (lucro real ou presumido)",
  MEI: "MEI"
};

export function isTaxRegime(value: unknown): value is TaxRegime {
  return typeof value === "string" && Object.hasOwn(taxRegimeLabels, value);
}

const registrationPattern = /^[A-Z0-9.\-]{2,20}$/;

export function isValidRegistrationCode(value: string): boolean {
  return registrationPattern.test(value.trim().toUpperCase());
}

export function formatCnae(value: string): string {
  const digits = onlyDigits(value).slice(0, 7);
  if (digits.length < 7) return digits;
  return `${digits.slice(0, 4)}-${digits.slice(4, 5)}/${digits.slice(5)}`;
}

export function isValidCnae(value: string): boolean {
  return onlyDigits(value).length === 7;
}

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function formatCnpj(value: string): string {
  return formatDocument(value, "CNPJ");
}

export function isValidCnpj(value: string): boolean {
  return isValidCNPJ(value);
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
    taxRegime: input.taxRegime || undefined,
    stateRegistration: optional(input.stateRegistration)?.toUpperCase(),
    municipalRegistration: optional(input.municipalRegistration)?.toUpperCase(),
    cnae: input.cnae?.trim() ? formatCnae(input.cnae) : undefined,
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
  if (settings.taxRegime !== undefined && !isTaxRegime(settings.taxRegime)) throw new Error("Regime tributário inválido.");
  const stateRegistration = settings.stateRegistration?.trim();
  if (stateRegistration && !isValidRegistrationCode(stateRegistration)) throw new Error("Inscrição estadual inválida.");
  const municipalRegistration = settings.municipalRegistration?.trim();
  if (municipalRegistration && !isValidRegistrationCode(municipalRegistration)) throw new Error("Inscrição municipal inválida.");
  const cnae = settings.cnae?.trim();
  if (cnae && !isValidCnae(cnae)) throw new Error("CNAE inválido (use 4773-5/02).");
  const email = settings.email?.trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("E-mail inválido.");
  const state = settings.addressState?.trim();
  if (state && !/^[A-Za-z]{2}$/.test(state)) throw new Error("UF inválida (use duas letras).");
  const zip = settings.addressZip?.trim();
  if (zip && onlyDigits(zip).length !== 8) throw new Error("CEP inválido (use 8 dígitos).");
}
