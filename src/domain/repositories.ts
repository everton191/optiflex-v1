import type { LocalSession, OrganizationSettings } from "./access";

export interface SettingsRepository {
  get(): Promise<OrganizationSettings>;
  save(settings: OrganizationSettings): Promise<void>;
}

export interface SessionRepository {
  get(): Promise<LocalSession>;
  save(session: LocalSession): Promise<void>;
}
