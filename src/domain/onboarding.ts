import type { OrganizationSettings } from "./access";
import { assertValidOrganizationSettings, normalizeOrganizationSettings } from "./organization";
import type { SettingsRepository } from "./repositories";
import type { AdministrationService } from "./administration-service";
import type { UserInput } from "./administration-service";

export type OnboardingStepId = "organization" | "store" | "user" | "products" | "review";

export interface OnboardingStep {
  id: OnboardingStepId;
  label: string;
  description: string;
  optional: boolean;
}

export const onboardingSteps: readonly OnboardingStep[] = [
  { id: "organization", label: "Organização", description: "Nome da empresa e dados fiscais básicos.", optional: false },
  { id: "store", label: "Loja", description: "Primeira loja da operação.", optional: true },
  { id: "user", label: "Usuário", description: "Dono ou responsável pelo acesso inicial.", optional: true },
  { id: "products", label: "Produtos iniciais", description: "Itens do catálogo desta loja.", optional: true },
  { id: "review", label: "Revisão", description: "Confira o que foi configurado.", optional: false }
];

export function onboardingStepIndex(id: OnboardingStepId): number {
  const index = onboardingSteps.findIndex((step) => step.id === id);
  if (index < 0) throw new Error(`Etapa desconhecida: ${id}`);
  return index;
}

export function nextOnboardingStep(current: OnboardingStepId, skipped: readonly OnboardingStepId[] = []): OnboardingStepId | "done" {
  const skip = new Set(skipped);
  for (let index = onboardingStepIndex(current) + 1; index < onboardingSteps.length; index++) {
    const step = onboardingSteps[index];
    if (!skip.has(step.id)) return step.id;
  }
  return "done";
}

export function previousOnboardingStep(current: OnboardingStepId, skipped: readonly OnboardingStepId[] = []): OnboardingStepId | undefined {
  const skip = new Set(skipped);
  for (let index = onboardingStepIndex(current) - 1; index >= 0; index--) {
    const step = onboardingSteps[index];
    if (!skip.has(step.id)) return step.id;
  }
  return undefined;
}

export interface OnboardingSummary {
  organizationName: string;
  storeName?: string;
  ownerName?: string;
  productNames: readonly string[];
  skipped: readonly OnboardingStepId[];
}

export function buildOnboardingSummary(input: { settings?: OrganizationSettings; storeName?: string; ownerName?: string; productNames?: readonly string[]; skipped?: readonly OnboardingStepId[] }): OnboardingSummary {
  return {
    organizationName: input.settings?.organizationName.trim() || "—",
    storeName: input.storeName?.trim() || undefined,
    ownerName: input.ownerName?.trim() || undefined,
    productNames: input.productNames ?? [],
    skipped: input.skipped ?? []
  };
}

export const ONBOARDING_PROGRESS_KEY = "opticore-onboarding-progress";

export interface OnboardingProgress {
  step: OnboardingStepId;
  skipped: OnboardingStepId[];
  organizationName?: string;
  clinicalProfessionalLabel?: string;
  legalName?: string;
  cnpj?: string;
  storeName?: string;
  createdStoreId?: string;
  ownerName?: string;
  ownerEmail?: string;
  productNames: string[];
}

export function isOnboardingStepId(value: unknown): value is OnboardingStepId {
  return typeof value === "string" && onboardingSteps.some((step) => step.id === value);
}

// Stored progress is untrusted: unknown keys (including any secret) are dropped, ids are coerced.
export function sanitizeOnboardingProgress(input: Record<string, unknown>): OnboardingProgress {
  const text = (key: string) => { const value = input[key]; return typeof value === "string" ? value : undefined; };
  return {
    step: isOnboardingStepId(input.step) ? input.step : "organization",
    skipped: Array.isArray(input.skipped) ? input.skipped.filter(isOnboardingStepId) : [],
    organizationName: text("organizationName"),
    clinicalProfessionalLabel: text("clinicalProfessionalLabel"),
    legalName: text("legalName"),
    cnpj: text("cnpj"),
    storeName: text("storeName"),
    createdStoreId: text("createdStoreId"),
    ownerName: text("ownerName"),
    ownerEmail: text("ownerEmail"),
    productNames: Array.isArray(input.productNames) ? input.productNames.filter((name): name is string => typeof name === "string") : []
  };
}

export interface OnboardingRepositories {
  settings: SettingsRepository;
  administration: AdministrationService;
}

export class OnboardingService {
  constructor(private readonly repositories: OnboardingRepositories) {}

  async completeOrganization(input: OrganizationSettings): Promise<OrganizationSettings> {
    const normalized = normalizeOrganizationSettings(input);
    assertValidOrganizationSettings(normalized);
    await this.repositories.settings.save(normalized);
    return normalized;
  }

  async createStore(name: string, author?: string) {
    return this.repositories.administration.createStore({ name }, author);
  }

  async createOwner(input: UserInput, author?: string) {
    if (input.role !== "OWNER") throw new Error("O usuário inicial do assistente deve ser OWNER.");
    return this.repositories.administration.createUser(input, author);
  }
}
