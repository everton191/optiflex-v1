import { assertStoreAccess } from "./access-context";
import type { ServiceCatalogRepository } from "./repositories";
import { assertValidServiceInput, defaultServiceCatalogItem, type ServiceCatalogItem } from "./service-catalog";

export class ServiceCatalogService {
  constructor(private readonly repository: ServiceCatalogRepository) {}

  list(storeId: string): Promise<ServiceCatalogItem[]> { return this.repository.listByStore(storeId); }

  async create(storeId: string, input: { name: string; defaultPrice: number; description?: string }): Promise<ServiceCatalogItem> {
    if (!storeId?.trim()) throw new Error("Selecione uma loja.");
    assertValidServiceInput(input);
    const existing = await this.repository.listByStore(storeId);
    const name = input.name.trim().toLowerCase();
    if (existing.some((item) => item.name.trim().toLowerCase() === name)) throw new Error("Já existe um serviço com este nome nesta loja.");
    return this.repository.create(defaultServiceCatalogItem(storeId, input.name, input.defaultPrice, input.description));
  }

  async update(item: ServiceCatalogItem, input: { name: string; defaultPrice: number; description?: string }): Promise<ServiceCatalogItem> {
    assertStoreAccess(item.storeId);
    assertValidServiceInput(input);
    const existing = await this.repository.listByStore(item.storeId);
    const name = input.name.trim().toLowerCase();
    if (existing.some((other) => other.id !== item.id && other.name.trim().toLowerCase() === name)) throw new Error("Já existe um serviço com este nome nesta loja.");
    return this.repository.update({ ...item, name: input.name.trim(), defaultPrice: input.defaultPrice, description: input.description?.trim() || undefined });
  }

  async remove(item: ServiceCatalogItem): Promise<void> {
    assertStoreAccess(item.storeId);
    return this.repository.remove(item.id);
  }
}
