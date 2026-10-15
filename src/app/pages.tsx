export { ClinicalWorkspacePage, PrescriptionDocumentPage } from "./ClinicalWorkspace";
export { DashboardPage } from "./DashboardWorkspace";
export { SettingsPage, UsersPage, StoresPage, ProfilesPage } from "./AdminWorkspace";
export { AttendancePage, AgendaPage, AttendanceNewPage, AttendanceDetailPage, ClinicalQueuePage } from "./ReceptionWorkspace";
export { CustomersPage, CustomerProfilePage, CustomerNewPage, CustomerEditPage } from "./CustomersWorkspace";
export { InventoryPage } from "./InventoryWorkspace";
export { WorkOrdersPage, WorkOrderDetailPage } from "./WorkOrdersWorkspace";
export { CashDeskPage } from "./CashWorkspace";
export { LoginPage, BlockedPage, ChangePasswordPage } from "./AuthWorkspace";

export function ForbiddenPage() { return <div className="page"><h1>Acesso não permitido</h1><p>Seu perfil atual não possui esta permissão.</p></div>; }

