import type { ReactNode } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { hasPermission, sessionUserState, type Permission } from "../domain/access";
import { useAppContext } from "./providers";

export function Can({ permission, children }: { permission: Permission; children: ReactNode }) {
  const { session } = useAppContext();
  if (!session) return null;
  return hasPermission(session.role, permission) ? <>{children}</> : null;
}

export function RequireSession() {
  const { session, isReady, users } = useAppContext();
  if (!isReady) return <div className="app-loading">Carregando configuração local…</div>;
  if (!session) return <Navigate to="/login" replace />;
  if (sessionUserState(users, session) === "inactive") return <Navigate to="/bloqueado" replace />;
  return <Outlet />;
}

export function RequirePermission({ permission, children }: { permission: Permission; children: ReactNode }) {
  const { session, isReady } = useAppContext();
  if (!isReady) return <div className="app-loading">Carregando configuração local…</div>;
  if (!session) return <Navigate to="/login" replace />;
  return hasPermission(session.role, permission) ? <>{children}</> : <Navigate to="/sem-acesso" replace />;
}
