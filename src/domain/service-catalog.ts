import { defaultOrganization } from "./access";

export interface ServiceCatalogItem {
  organizationId?: string;
  id: string;
  storeId: string;
  name: string;
  defaultPrice: number;
  description?: string;
}

export function assertValidServiceInput(input: { name: string; defaultPrice: number }): void {
  const name = input.name?.trim();
  if (!name) throw new Error("Informe o nome do serviço.");
  if (name.length > 120) throw new Error("Nome do serviço muito longo (máximo 120 caracteres).");
  if (typeof input.defaultPrice !== "number" || !Number.isFinite(input.defaultPrice) || input.defaultPrice < 0) throw new Error("Preço padrão do serviço inválido.");
}

export function defaultServiceCatalogItem(storeId: string, name: string, defaultPrice: number, description?: string): ServiceCatalogItem {
  return {
    id: `service-${crypto.randomUUID()}`,
    storeId,
    name: name.trim(),
    defaultPrice,
    description: description?.trim() || undefined,
    organizationId: defaultOrganization.id,
  };
}
