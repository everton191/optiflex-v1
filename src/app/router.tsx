import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { RequirePermission, RequireSession } from "./permissions";
import { AttendancePage, BlockedPage, CashDeskPage, ChangePasswordPage, ClinicalQueuePage, ClinicalWorkspacePage, CustomerEditPage, CustomerNewPage, CustomerProfilePage, CustomersPage, DashboardPage, ForbiddenPage, InventoryPage, LoginPage, ProfilesPage, SettingsPage, UsersPage, WorkOrderDetailPage, WorkOrdersPage, AgendaPage } from "./pages";
import { routeGuards } from "./route-guards";
import { AppShell } from "../shell/AppShell";

const guardedPages: Record<string, React.ReactNode> = {
  "clientes": <CustomersPage />,
  "clientes/novo": <CustomerNewPage />,
  "clientes/:customerId": <CustomerProfilePage />,
  "clientes/:customerId/editar": <CustomerEditPage />,
  "atendimentos": <AttendancePage />,
  "agenda": <AgendaPage />,
  "clinico": <ClinicalQueuePage />,
  "clinico/atendimento/:attendanceId": <ClinicalWorkspacePage />,
  "caixa": <CashDeskPage />,
  "estoque": <InventoryPage />,
  "ordens-servico": <WorkOrdersPage />,
  "ordens-servico/:orderId": <WorkOrderDetailPage />,
  "admin/usuarios": <UsersPage />,
  "admin/perfis": <ProfilesPage />,
  "admin/configuracoes": <SettingsPage />
};

const guardedChildren = routeGuards.map((guard) => guard.index
  ? { index: true, element: <RequirePermission permission={guard.permission}><DashboardPage /></RequirePermission> }
  : { path: guard.path, element: <RequirePermission permission={guard.permission}>{guardedPages[guard.path!]}</RequirePermission> });

const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/bloqueado", element: <BlockedPage /> },
  { path: "/", element: <RequireSession />, children: [
    { element: <AppShell />, children: [
      ...guardedChildren,
      { path: "vendas", element: <Navigate to="/caixa" replace /> },
      { path: "pagamentos", element: <Navigate to="/caixa" replace /> },
      { path: "trocar-senha", element: <ChangePasswordPage /> },
      { path: "sem-acesso", element: <ForbiddenPage /> }
    ]}
  ]}
]);

export function AppRouter() { return <RouterProvider router={router} />; }
