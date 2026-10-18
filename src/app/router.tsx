import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { RequirePermission, RequireSession } from "./permissions";
import { AttendanceDetailPage, AttendanceNewPage, AttendancePage, AuditPage, BlockedPage, CashDeskPage, ChangePasswordPage, ClinicalQueuePage, ClinicalWorkspacePage, CustomerEditPage, CustomerNewPage, CustomerProfilePage, CustomersPage, DashboardPage, ForbiddenPage, InventoryPage, LoginPage, OnboardingPage, ProfilesPage, PrescriptionDocumentPage, SaleDocumentPage, SettingsPage, StoresPage, UsersPage, WorkOrderDetailPage, WorkOrdersPage, AgendaPage } from "./pages";
import { routeGuards } from "./route-guards";
import { RouteErrorBoundary } from "./RouteErrorBoundary";
import { AppShell } from "../shell/AppShell";

const guardedPages: Record<string, React.ReactNode> = {
  "clientes": <CustomersPage />,
  "clientes/novo": <CustomerNewPage />,
  "clientes/:customerId": <CustomerProfilePage />,
  "clientes/:customerId/editar": <CustomerEditPage />,
  "atendimentos": <AttendancePage />,
  "atendimentos/novo": <AttendanceNewPage />,
  "atendimentos/:attendanceId": <AttendanceDetailPage />,
  "agenda": <AgendaPage />,
  "clinico": <ClinicalQueuePage />,
  "clinico/atendimento/:attendanceId": <ClinicalWorkspacePage />,
  "prescricoes/:prescriptionId": <PrescriptionDocumentPage />,
  "caixa": <CashDeskPage />,
  "vendas/:saleId": <SaleDocumentPage />,
  "estoque": <InventoryPage />,
  "ordens-servico": <WorkOrdersPage />,
  "ordens-servico/:orderId": <WorkOrderDetailPage />,
  "admin/lojas": <StoresPage />,
  "admin/usuarios": <UsersPage />,
  "admin/perfis": <ProfilesPage />,
  "admin/auditoria": <AuditPage />,
  "admin/configuracoes": <SettingsPage />,
  "admin/assistente": <OnboardingPage />
};

const guardedChildren = routeGuards.map((guard) => guard.index
  ? { index: true, element: <RequirePermission permission={guard.permission}><DashboardPage /></RequirePermission> }
  : { path: guard.path, element: <RequirePermission permission={guard.permission}>{guardedPages[guard.path!]}</RequirePermission> });

const router = createBrowserRouter([
  { path: "/login", element: <RouteErrorBoundary><LoginPage /></RouteErrorBoundary> },
  { path: "/bloqueado", element: <RouteErrorBoundary><BlockedPage /></RouteErrorBoundary> },
  { path: "/", element: <RequireSession />, children: [
    { element: <RouteErrorBoundary><AppShell /></RouteErrorBoundary>, children: [
      ...guardedChildren,
      { path: "vendas", element: <Navigate to="/caixa" replace /> },
      { path: "pagamentos", element: <Navigate to="/caixa" replace /> },
      { path: "trocar-senha", element: <ChangePasswordPage /> },
      { path: "sem-acesso", element: <ForbiddenPage /> }
    ]}
  ]}
]);

export function AppRouter() { return <RouterProvider router={router} />; }
