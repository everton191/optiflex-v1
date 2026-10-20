import { useEffect, useState } from "react";
import { errorMessage } from "../domain/errors";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useAppContext, useSession } from "../app/providers";
import { CommandPalette } from "../app/CommandPalette";
import { Button, Drawer } from "../design-system/components";
import { hasPermission, roleDefinitions } from "../domain/access";
import { buildAccessContext, canAccessStore } from "../domain/access-context";
import { navigationEntries, type NavigationEntry } from "../domain/global-search";

export function AppShell() {
  const { settings, stores, users, currentStoreId, selectStore, navigationLocked, logout } = useAppContext();
  const session = useSession();
  const [storeError, setStoreError] = useState(""); const [switching, setSwitching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setSearchOpen((value) => !value); }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
  async function changeStore(id: string) {
    setSwitching(true); setStoreError("");
    try { await selectStore(id); } catch (reason) { setStoreError(errorMessage(reason, "Não foi possível trocar de loja. Salve as alterações e tente novamente.")); }
    finally { setSwitching(false); }
  }
  const canOpen = (item: NavigationEntry) => hasPermission(session.role, item.permission);
  const visibleMainLinks = navigationEntries.filter((item) => item.section === "main" && canOpen(item));
  const visibleAdministrationLinks = navigationEntries.filter((item) => item.section === "admin" && canOpen(item));
  const mobileShortcuts = visibleMainLinks.slice(0, 4);
  const mobileMoreLinks = [...visibleMainLinks.slice(4), ...visibleAdministrationLinks];
  const [moreOpen, setMoreOpen] = useState(false);
  const closeMore = () => setMoreOpen(false);
  const roleLabel = roleDefinitions.find((role) => role.key === session.role)?.label;
  const access = buildAccessContext(session, users, currentStoreId);
  const accessibleStores = stores.filter((store) => store.active && canAccessStore(access, store.id));
  return <div className="shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">O</span><span className="brand-copy"><strong>{settings.organizationName || "Opticore"}</strong><small>{roleLabel}</small></span></div>
      <nav aria-label="Navegação principal"><span className="nav-section-label">Menu</span>{visibleMainLinks.map((link) => <NavLink key={link.to} to={link.to} end={link.to === "/"}>{link.label}</NavLink>)}</nav>
      {visibleAdministrationLinks.length > 0 && <nav className="sidebar-bottom" aria-label="Administração"><span className="nav-section-label">Administração</span>{visibleAdministrationLinks.map((link) => <NavLink key={link.to} to={link.to}>{link.label}</NavLink>)}</nav>}
    </aside>
    <main className="content"><header className="topbar"><label className="store-selector">Loja atual<select disabled={navigationLocked || switching} value={currentStoreId} onChange={(event) => void changeStore(event.target.value)}>{accessibleStores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}</select></label><Button type="button" className="palette-trigger" aria-label="Busca global (Ctrl+K)" aria-haspopup="dialog" onClick={() => setSearchOpen(true)}><span className="palette-icon" aria-hidden="true">⌕</span><span className="palette-label">Buscar</span><kbd>Ctrl K</kbd></Button>{hasPermission(session.role, "settings.manage") && <Link to="/admin/configuracoes">Ajustes</Link>}<span className="user-summary"><strong>{session.userName}</strong><small>{roleLabel}</small>{session.demo && <small className="badge">Demonstração</small>}</span><Link to="/trocar-senha">Trocar senha</Link><Button type="button" onClick={() => void logout()}>Sair</Button></header>{storeError && <p role="alert">{storeError}</p>}<Outlet /></main>
    <nav className="mobile-nav" aria-label="Navegação móvel">{mobileShortcuts.map((link) => <NavLink key={link.to} to={link.to} end={link.to === "/"}>{link.shortLabel}</NavLink>)}{mobileMoreLinks.length > 0 && <button type="button" className="mobile-more" aria-expanded={moreOpen} onClick={() => setMoreOpen((value) => !value)}>Mais</button>}</nav>
    <Drawer open={moreOpen} onClose={closeMore} title="Mais áreas">
      <nav className="area-links" aria-label="Demais áreas">
        {visibleMainLinks.length > 4 && <span className="nav-section-label">Menu</span>}
        {visibleMainLinks.slice(4).map((link) => <NavLink key={link.to} to={link.to} end={link.to === "/"} onClick={closeMore}>{link.label}</NavLink>)}
        {visibleAdministrationLinks.length > 0 && <span className="nav-section-label">Administração</span>}
        {visibleAdministrationLinks.map((link) => <NavLink key={link.to} to={link.to} onClick={closeMore}>{link.label}</NavLink>)}
      </nav>
    </Drawer>
    <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
  </div>;
}
