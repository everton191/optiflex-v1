import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { LocalSession, OrganizationSettings, Store, User } from "../domain/access";
import { AdministrationService } from "../domain/administration-service";
import { LocalAdministrationRepository, LocalSessionRepository, LocalSettingsRepository } from "../infrastructure/storage/local-repositories";
import { Button } from "../design-system/components";

interface AppContextValue {
  session: LocalSession;
  settings: OrganizationSettings;
  isReady: boolean;
  stores: Store[];
  users: User[];
  currentStoreId: string;
  navigationLocked: boolean;
  setNavigationLocked(locked: boolean): void;
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
  const [navigationLocked, setNavigationLocked] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setLoadError(false);
    setIsReady(false);
    async function load() {
      try {
        await administrationService.initialize();
        const [loadedSettings, loadedSession, loadedStores, loadedUsers, currentStore] = await Promise.all([
          settingsRepository.get(), sessionRepository.get(), administrationService.listStores(), administrationService.listUsers(), administrationService.currentStore()
        ]);
        if (!loadedStores.some((store) => store.id === currentStore?.storeId && store.active)) throw new Error("Loja atual indisponível.");
        if (!active) return;
        setSettings(loadedSettings); setSession(loadedSession); setStores(loadedStores); setUsers(loadedUsers); setCurrentStoreId(currentStore.storeId);
        setIsReady(true);
      } catch (reason) {
        console.error("Não foi possível inicializar o armazenamento local.", reason);
        if (active) setLoadError(true);
      }
    }
    void load();
    return () => { active = false; };
  }, [attempt]);

  async function saveSettings(nextSettings: OrganizationSettings) {
    await settingsRepository.save(nextSettings);
    setSettings(nextSettings);
  }
  async function selectStore(storeId: string) { if (navigationLocked) throw new Error("Salve as alterações antes de trocar de loja."); await administrationService.selectStore(storeId); setCurrentStoreId(storeId); }

  if (loadError) return <main className="page"><h1>Não foi possível abrir seus dados</h1><p role="alert">Confira se este navegador permite salvar dados e tente novamente. Seus registros não foram apagados.</p><Button type="button" onClick={() => setAttempt((value) => value + 1)}>Tentar novamente</Button></main>;
  if (!isReady) return <main className="app-loading" role="status">Abrindo seus dados…</main>;
  return <AppContext.Provider value={{ settings, session, isReady, stores, users, currentStoreId, saveSettings, selectStore, navigationLocked, setNavigationLocked }}>{children}</AppContext.Provider>;
}

export function useAppContext(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppContext must be used inside AppProviders");
  return context;
}
