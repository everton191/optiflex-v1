import type { CurrentStoreContext, LocalSession, OrganizationSettings, Store, User } from "./access";

export interface SettingsRepository {
  get(): Promise<OrganizationSettings>;
  save(settings: OrganizationSettings): Promise<void>;
}

export interface SessionRepository {
  get(): Promise<LocalSession>;
  save(session: LocalSession): Promise<void>;
}

export interface AdministrationRepository {
  initialize(): Promise<void>;
  listStores(): Promise<Store[]>;
  saveStore(store: Store): Promise<void>;
  listUsers(): Promise<User[]>;
  saveUser(user: User): Promise<void>;
  getCurrentStore(): Promise<CurrentStoreContext>;
  saveCurrentStore(context: CurrentStoreContext): Promise<void>;
}
