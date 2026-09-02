import type { CurrentStoreContext, Store, User } from "./access";
import type { AdministrationRepository } from "./repositories";

export class AdministrationService {
  constructor(private readonly repository: AdministrationRepository) {}
  async initialize(): Promise<void> { await this.repository.initialize(); }
  async listStores(): Promise<Store[]> { return this.repository.listStores(); }
  async listUsers(): Promise<User[]> { return this.repository.listUsers(); }
  async currentStore(): Promise<CurrentStoreContext> { return this.repository.getCurrentStore(); }
  async selectStore(storeId: string): Promise<void> {
    const store = (await this.repository.listStores()).find((item) => item.id === storeId && item.active);
    if (!store) throw new Error("Loja inválida ou inativa.");
    await this.repository.saveCurrentStore({ id: "current", storeId });
  }
}
