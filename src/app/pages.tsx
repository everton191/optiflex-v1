export { ClinicalWorkspacePage, PrescriptionDocumentPage } from "./ClinicalWorkspace";
export { DashboardPage } from "./DashboardWorkspace";
export { SettingsPage, UsersPage, StoresPage, ProfilesPage, AuditPage, SuppliersPage } from "./AdminWorkspace";
export { AttendancePage, AgendaPage, AttendanceNewPage, AttendanceDetailPage, ClinicalQueuePage } from "./ReceptionWorkspace";
export { CustomersPage, CustomerProfilePage, CustomerNewPage, CustomerEditPage } from "./CustomersWorkspace";
export { InventoryPage, ProductLabelPage } from "./InventoryWorkspace";
export { WorkOrdersPage, WorkOrderDetailPage } from "./WorkOrdersWorkspace";
export { CashDeskPage, SaleDocumentPage, SaleReceiptPage } from "./CashWorkspace";
export { LoginPage, BlockedPage, ChangePasswordPage } from "./AuthWorkspace";
export { OnboardingPage } from "./OnboardingWorkspace";

export function ForbiddenPage() { return <div className="page"><h1>Acesso não permitido</h1><p>Seu perfil atual não possui esta permissão.</p></div>; }

