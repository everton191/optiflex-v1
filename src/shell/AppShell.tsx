import { useState } from "react";
import { errorMessage } from "../domain/errors";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useAppContext, useSession } from "../app/providers";
import { Button, Drawer } from "../design-system/components";
import { hasPermission, roleDefinitions, type Permission } from "../domain/access";
import { buildAccessContext, canAccessStore } from "../domain/access-context";

interface MenuItem { to: string; label: string; shortLabel: string; permission?: Permission }
const mainLinks: readonly MenuItem[] = [{ to: "/", label: "Visão geral", shortLabel: "Início" }, { to: "/clientes", label: "Clientes", shortLabel: "Clientes", permission: "customers.read" }, { to: "/agenda", label: "Agenda", shortLabel: "Agenda", permission: "attendance.read" }, { to: "/atendimentos", label: "Atendimentos", shortLabel: "Fila", permission: "attendance.read" }, { to: "/clinico", label: "Área clínica", shortLabel: "Clínico", permission: "clinical.workspace.access" }, { to: "/caixa", label: "Caixa", shortLabel: "Caixa", permission: "cash.read" }, { to: "/ordens-servico", label: "Ordens de serviço", shortLabel: "OS", permission: "sales.read" }, { to: "/estoque", label: "Estoque", shortLabel: "Estoque", permission: "inventory.read" }];
const administrationLinks: readonly MenuItem[] = [{ to: "/admin/lojas", label: "Lojas", shortLabel: "Lojas", permission: "stores.manage" }, { to: "/admin/usuarios", label: "Usuários", shortLabel: "Usuários", permission: "users.read" }, { to: "/admin/perfis", label: "Perfis de acesso", shortLabel: "Perfis", permission: "roles.read" }, { to: "/admin/auditoria", label: "Auditoria", shortLabel: "Auditoria", permission: "settings.manage" }, { to: "/admin/configuracoes", label: "Configurações", shortLabel: "Ajustes", permission: "settings.manage" }, { to: "/admin/assistente", label: "Assistente inicial", shortLabel: "Assistente", permission: "settings.manage" }];

export function AppShell() {
  const { settings, stores, users, currentStoreId, selectStore, navigationLocked, logout } = useAppContext();
  const session = useSession();
  const [storeError, setStoreError] = useState(""); const [switching, setSwitching] = useState(false);
  async function changeStore(id: string) {
    setSwitching(true); setStoreError("");
    try { await selectStore(id); } catch (reason) { setStoreError(errorMessage(reason, "Não foi possível trocar de loja. Salve as alterações e tente novamente.")); }
    finally { setSwitching(false); }
  }
  const canOpen = (item: MenuItem) => !item.permission || hasPermission(session.role, item.permission);
  const visibleMainLinks = mainLinks.filter(canOpen);
  const visibleAdministrationLinks = administrationLinks.filter(canOpen);
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
    <main className="content"><header className="topbar"><label className="store-selector">Loja atual<select disabled={navigationLocked || switching} value={currentStoreId} onChange={(event) => void changeStore(event.target.value)}>{accessibleStores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}</select></label>{hasPermission(session.role, "settings.manage") && <Link to="/admin/configuracoes">Ajustes</Link>}<span className="user-summary"><strong>{session.userName}</strong><small>{roleLabel}</small>{session.demo && <small className="badge">Demonstração</small>}</span><Link to="/trocar-senha">Trocar senha</Link><Button type="button" onClick={() => void logout()}>Sair</Button></header>{storeError && <p role="alert">{storeError}</p>}<Outlet /></main>
    <nav className="mobile-nav" aria-label="Navegação móvel">{mobileShortcuts.map((link) => <NavLink key={link.to} to={link.to} end={link.to === "/"}>{link.shortLabel}</NavLink>)}{mobileMoreLinks.length > 0 && <button type="button" className="mobile-more" aria-expanded={moreOpen} onClick={() => setMoreOpen((value) => !value)}>Mais</button>}</nav>
    <Drawer open={moreOpen} onClose={closeMore} title="Mais áreas">
      <nav className="area-links" aria-label="Demais áreas">
        {visibleMainLinks.length > 4 && <span className="nav-section-label">Menu</span>}
        {visibleMainLinks.slice(4).map((link) => <NavLink key={link.to} to={link.to} end={link.to === "/"} onClick={closeMore}>{link.label}</NavLink>)}
        {visibleAdministrationLinks.length > 0 && <span className="nav-section-label">Administração</span>}
        {visibleAdministrationLinks.map((link) => <NavLink key={link.to} to={link.to} onClick={closeMore}>{link.label}</NavLink>)}
      </nav>
    </Drawer>
  </div>;
}
