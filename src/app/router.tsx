import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { RequirePermission } from "./permissions";
import { AttendancePage, CustomerNewPage, CustomerProfilePage, CustomersPage, DashboardPage, ForbiddenPage, ProfilesPage, SettingsPage, UsersPage } from "./pages";
import { AppShell } from "../shell/AppShell";

const router = createBrowserRouter([{ path: "/", element: <AppShell />, children: [
  { index: true, element: <DashboardPage /> },
  { path: "clientes", element: <RequirePermission permission="customers.read"><CustomersPage /></RequirePermission> },
  { path: "clientes/novo", element: <RequirePermission permission="customers.manage"><CustomerNewPage /></RequirePermission> },
  { path: "clientes/:customerId", element: <RequirePermission permission="customers.read"><CustomerProfilePage /></RequirePermission> },
  { path: "atendimentos", element: <RequirePermission permission="attendance.read"><AttendancePage /></RequirePermission> },
  { path: "admin/usuarios", element: <RequirePermission permission="users.read"><UsersPage /></RequirePermission> },
  { path: "admin/perfis", element: <RequirePermission permission="roles.read"><ProfilesPage /></RequirePermission> },
  { path: "admin/configuracoes", element: <RequirePermission permission="settings.manage"><SettingsPage /></RequirePermission> },
  { path: "sem-acesso", element: <ForbiddenPage /> }
]}]);

export function AppRouter() { return <RouterProvider router={router} />; }
