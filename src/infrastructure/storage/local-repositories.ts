import type { LocalSession, OrganizationSettings } from "../../domain/access";
import type { SessionRepository, SettingsRepository } from "../../domain/repositories";
import { database } from "./database";

const defaultSettings: OrganizationSettings = {
  id: "current",
  organizationName: "Opticore Demo",
  clinicalProfessionalLabel: "Profissional clínico"
};

const defaultSession: LocalSession = { id: "current", userName: "Administrador local", role: "ADMINISTRATOR" };

export class LocalSettingsRepository implements SettingsRepository {
  async get(): Promise<OrganizationSettings> {
    return (await database.settings.get("current")) ?? defaultSettings;
  }
  async save(settings: OrganizationSettings): Promise<void> {
    await database.settings.put(settings);
  }
}

export class LocalSessionRepository implements SessionRepository {
  async get(): Promise<LocalSession> {
    return (await database.sessions.get("current")) ?? defaultSession;
  }
  async save(session: LocalSession): Promise<void> {
    await database.sessions.put(session);
  }
}
