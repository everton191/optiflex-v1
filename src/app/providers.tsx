import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { LocalSession, OrganizationSettings } from "../domain/access";
import { LocalSessionRepository, LocalSettingsRepository } from "../infrastructure/storage/local-repositories";

interface AppContextValue {
  session: LocalSession;
  settings: OrganizationSettings;
  isReady: boolean;
  saveSettings(settings: OrganizationSettings): Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);
const settingsRepository = new LocalSettingsRepository();
const sessionRepository = new LocalSessionRepository();

export function AppProviders({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<OrganizationSettings>({ id: "current", organizationName: "", clinicalProfessionalLabel: "" });
  const [session, setSession] = useState<LocalSession>({ id: "current", userName: "", role: "RECEPTIONIST" });
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    Promise.all([settingsRepository.get(), sessionRepository.get()]).then(([loadedSettings, loadedSession]) => {
      setSettings(loadedSettings);
      setSession(loadedSession);
      setIsReady(true);
    });
  }, []);

  async function saveSettings(nextSettings: OrganizationSettings) {
    await settingsRepository.save(nextSettings);
    setSettings(nextSettings);
  }

  return <AppContext.Provider value={{ settings, session, isReady, saveSettings }}>{children}</AppContext.Provider>;
}

export function useAppContext(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppContext must be used inside AppProviders");
  return context;
}
