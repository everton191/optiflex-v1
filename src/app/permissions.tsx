import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { hasPermission, type Permission } from "../domain/access";
import { useAppContext } from "./providers";

export function Can({ permission, children }: { permission: Permission; children: ReactNode }) {
  const { session } = useAppContext();
  return hasPermission(session.role, permission) ? <>{children}</> : null;
}

export function RequirePermission({ permission, children }: { permission: Permission; children: ReactNode }) {
  const { session, isReady } = useAppContext();
  if (!isReady) return <div className="app-loading">Carregando configuração local…</div>;
  return hasPermission(session.role, permission) ? <>{children}</> : <Navigate to="/sem-acesso" replace />;
}
