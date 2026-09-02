import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { RequirePermission } from "./permissions";
import { DashboardPage, ForbiddenPage, SettingsPage } from "./pages";
import { AppShell } from "../shell/AppShell";

const router = createBrowserRouter([{ path: "/", element: <AppShell />, children: [
  { index: true, element: <DashboardPage /> },
  { path: "admin/configuracoes", element: <RequirePermission permission="settings.manage"><SettingsPage /></RequirePermission> },
  { path: "sem-acesso", element: <ForbiddenPage /> }
]}]);

export function AppRouter() { return <RouterProvider router={router} />; }
