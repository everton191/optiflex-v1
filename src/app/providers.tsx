import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { LocalSession, OrganizationSettings, Store, User } from "../domain/access";
import { AdministrationService } from "../domain/administration-service";
import { LocalAdministrationRepository, LocalSessionRepository, LocalSettingsRepository } from "../infrastructure/storage/local-repositories";

interface AppContextValue {
  session: LocalSession;
  settings: OrganizationSettings;
  isReady: boolean;
  stores: Store[];
  users: User[];
  currentStoreId: string;
  saveSettings(settings: OrganizationSettings): Promise<void>;
  selectStore(storeId: string): Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);
const settingsRepository = new LocalSettingsRepository();
const sessionRepository = new LocalSessionRepository();
const administrationService = new AdministrationService(new LocalAdministrationRepository());

export function AppProviders({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<OrganizationSettings>({ id: "current", organizationName: "", clinicalProfessionalLabel: "" });
  const [session, setSession] = useState<LocalSession>({ id: "current", userName: "", role: "RECEPTIONIST" });
  const [isReady, setIsReady] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentStoreId, setCurrentStoreId] = useState("");

  useEffect(() => {
    async function load() {
      await administrationService.initialize();
      const [loadedSettings, loadedSession, loadedStores, loadedUsers, currentStore] = await Promise.all([
        settingsRepository.get(), sessionRepository.get(), administrationService.listStores(), administrationService.listUsers(), administrationService.currentStore()
      ]);
      setSettings(loadedSettings); setSession(loadedSession); setStores(loadedStores); setUsers(loadedUsers); setCurrentStoreId(currentStore.storeId); setIsReady(true);
    }
    void load();
  }, []);

  async function saveSettings(nextSettings: OrganizationSettings) {
    await settingsRepository.save(nextSettings);
    setSettings(nextSettings);
  }
  async function selectStore(storeId: string) { await administrationService.selectStore(storeId); setCurrentStoreId(storeId); }

  return <AppContext.Provider value={{ settings, session, isReady, stores, users, currentStoreId, saveSettings, selectStore }}>{children}</AppContext.Provider>;
}

export function useAppContext(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppContext must be used inside AppProviders");
  return context;
}
