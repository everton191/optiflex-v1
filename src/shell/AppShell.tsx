import { NavLink, Outlet } from "react-router-dom";
import { useAppContext } from "../app/providers";
import { Can } from "../app/permissions";

const mainLinks = [{ to: "/", label: "Visão geral" }];

export function AppShell() {
  const { settings, session } = useAppContext();
  return <div className="shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">O</span><span>{settings.organizationName || "Opticore"}</span></div>
      <nav aria-label="Navegação principal">{mainLinks.map((link) => <NavLink key={link.to} to={link.to} end>{link.label}</NavLink>)}</nav>
      <Can permission="settings.manage"><nav className="sidebar-bottom" aria-label="Administração"><NavLink to="/admin/configuracoes">Configurações</NavLink></nav></Can>
    </aside>
    <main className="content"><header className="topbar"><span>Offline-first</span><span>{session.userName}</span></header><Outlet /></main>
    <nav className="mobile-nav" aria-label="Navegação móvel"><NavLink to="/" end>Início</NavLink><Can permission="settings.manage"><NavLink to="/admin/configuracoes">Ajustes</NavLink></Can></nav>
  </div>;
}
