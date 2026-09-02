import { NavLink, Outlet } from "react-router-dom";
import { useAppContext } from "../app/providers";
import { hasPermission, roleDefinitions, type Permission } from "../domain/access";

interface MenuItem { to: string; label: string; shortLabel: string; permission?: Permission }
const mainLinks: readonly MenuItem[] = [{ to: "/", label: "Visão geral", shortLabel: "Início" }, { to: "/clientes", label: "Clientes", shortLabel: "Clientes", permission: "customers.read" }, { to: "/atendimentos", label: "Atendimentos", shortLabel: "Fila", permission: "attendance.read" }, { to: "/clinico", label: "Área clínica", shortLabel: "Clínico", permission: "clinical.workspace.access" }, { to: "/caixa", label: "Caixa", shortLabel: "Caixa", permission: "cash.read" }, { to: "/estoque", label: "Estoque", shortLabel: "Estoque", permission: "inventory.read" }];
const administrationLinks: readonly MenuItem[] = [{ to: "/admin/usuarios", label: "Usuários", shortLabel: "Usuários", permission: "users.read" }, { to: "/admin/perfis", label: "Perfis de acesso", shortLabel: "Perfis", permission: "roles.read" }, { to: "/admin/configuracoes", label: "Configurações", shortLabel: "Ajustes", permission: "settings.manage" }];

export function AppShell() {
  const { settings, session, stores, currentStoreId, selectStore } = useAppContext();
  const canOpen = (item: MenuItem) => !item.permission || hasPermission(session.role, item.permission);
  const visibleMainLinks = mainLinks.filter(canOpen);
  const visibleAdministrationLinks = administrationLinks.filter(canOpen);
  const roleLabel = roleDefinitions.find((role) => role.key === session.role)?.label;
  return <div className="shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">O</span><span className="brand-copy"><strong>{settings.organizationName || "Opticore"}</strong><small>{roleLabel}</small></span></div>
      <nav aria-label="Navegação principal"><span className="nav-section-label">Menu</span>{visibleMainLinks.map((link) => <NavLink key={link.to} to={link.to} end={link.to === "/"}>{link.label}</NavLink>)}</nav>
      {visibleAdministrationLinks.length > 0 && <nav className="sidebar-bottom" aria-label="Administração"><span className="nav-section-label">Administração</span>{visibleAdministrationLinks.map((link) => <NavLink key={link.to} to={link.to}>{link.label}</NavLink>)}</nav>}
    </aside>
    <main className="content"><header className="topbar"><label className="store-selector">Loja atual<select value={currentStoreId} onChange={(event) => void selectStore(event.target.value)}>{stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}</select></label><span className="user-summary"><strong>{session.userName}</strong><small>{roleLabel}</small></span></header><Outlet /></main>
    <nav className="mobile-nav" aria-label="Navegação móvel">{visibleMainLinks.map((link) => <NavLink key={link.to} to={link.to} end={link.to === "/"}>{link.shortLabel}</NavLink>)}</nav>
  </div>;
}
