import { rolePermissions, type RoleKey } from "./access";
import { paymentMethodLabels } from "./cash";
import { isAttendancePriority } from "./customer";
import { isProductCategory } from "./inventory";
import { prescriptionUsageLabels } from "./clinical";
import { quoteStatusLabels } from "./sales";
import { workOrderEventLabels, workOrderStatusLabels } from "./work-order";

// Session is intentionally excluded: restoring business data must not import a login.
export const backupTables = ["settings", "stores", "users", "currentStore", "customers", "attendances", "agendaEvents", "clinicalRecords", "clinicalVersions", "prescriptions", "attachments", "sales", "workOrders", "inventoryItems", "inventoryMovements", "cashSessions", "cashEntries"] as const;
export type BackupTable = typeof backupTables[number];
// Schema 10 predates attachments content; 11 predates agenda events; 12 predates structured prescriptions. All remain importable.
export interface BackupSnapshot { format: "opticore"; version: 1; schema: 10 | 11 | 12 | 13; createdAt: string; tables: Record<BackupTable, Record<string, unknown>[]>; }
export interface BackupRepository { snapshot(): Promise<BackupSnapshot>; restore(snapshot: BackupSnapshot): Promise<void>; }
export interface BackupCodec { encrypt(value: string, password: string): Promise<string>; decrypt(value: string, password: string): Promise<string>; }

const requiredStrings: Record<BackupTable, string[]> = {
  settings: ["id", "organizationName", "clinicalProfessionalLabel"], stores: ["id", "name"], users: ["id", "name", "email", "role", "scope"], currentStore: ["id", "storeId"],
  customers: ["id", "name", "createdAt"], attendances: ["id", "customerId", "storeId", "type", "status", "createdAt"], agendaEvents: ["id", "customerId", "storeId", "type", "status", "startsAt", "createdAt"],
  clinicalRecords: ["attendanceId", "anamnesis", "examination", "prescription", "requests", "updatedAt"], clinicalVersions: ["id", "attendanceId", "anamnesis", "examination", "prescription", "requests", "updatedAt", "finalizedAt"],
  prescriptions: ["id", "attendanceId", "customerId", "storeId", "author", "issuedAt"],
  attachments: ["id", "content"],
  sales: ["id", "customerId", "storeId", "status", "description", "createdAt"], workOrders: ["id", "saleId", "storeId", "customerId", "status", "createdAt"],
  inventoryItems: ["id", "storeId", "name"], inventoryMovements: ["id", "itemId", "storeId", "type", "reason", "createdAt"], cashSessions: ["id", "storeId", "openedAt"], cashEntries: ["id", "sessionId", "storeId", "type", "createdAt"],
};
const object = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === "object" && !Array.isArray(value));
const invalid = () => new Error("Backup inválido ou incompatível. Nenhum dado foi substituído.");
const invalidReason = (reason: string) => new Error(`Backup inválido: ${reason} Nenhum dado foi substituído.`);
export function validateBackup(value: unknown): BackupSnapshot {
  if (!object(value)) throw invalid();
  if (value.format !== "opticore") throw invalidReason("o arquivo não é um backup do Opticore.");
  if (value.version !== 1) throw invalidReason("versão de arquivo desconhecida.");
  if (![10, 11, 12, 13].includes(value.schema as number)) throw invalidReason("schema não suportado (arquivo de outra versão ou corrompido).");
  if (typeof value.createdAt !== "string" || !Number.isFinite(Date.parse(value.createdAt))) throw invalidReason("data de criação ausente ou corrompida.");
  if (!object(value.tables)) throw invalidReason("estrutura de tabelas ausente.");
  const importedTables = { ...value.tables };
  if (value.schema === 10) {
    if (Object.keys(importedTables).length !== backupTables.length - 3 || "attachments" in importedTables || "agendaEvents" in importedTables || "prescriptions" in importedTables) throw invalidReason("o conteúdo das tabelas não corresponde ao schema 10.");
    importedTables.attachments = [];
    importedTables.agendaEvents = [];
    importedTables.prescriptions = [];
  } else if (value.schema === 11) {
    if (Object.keys(importedTables).length !== backupTables.length - 2 || "agendaEvents" in importedTables || "prescriptions" in importedTables || !("attachments" in importedTables)) throw invalidReason("o conteúdo das tabelas não corresponde ao schema 11.");
    importedTables.agendaEvents = [];
    importedTables.prescriptions = [];
  } else if (value.schema === 12) {
    if (Object.keys(importedTables).length !== backupTables.length - 1 || "prescriptions" in importedTables || !("attachments" in importedTables) || !("agendaEvents" in importedTables)) throw invalidReason("o conteúdo das tabelas não corresponde ao schema 12.");
    importedTables.prescriptions = [];
  } else if (Object.keys(importedTables).length !== backupTables.length || !("attachments" in importedTables) || !("agendaEvents" in importedTables) || !("prescriptions" in importedTables)) throw invalidReason("faltam tabelas esperadas no arquivo (arquivo truncado ou corrompido).");
  for (const name of backupTables) {
    const rows = importedTables[name];
    if (!Array.isArray(rows)) throw invalid();
    const keys = new Set<string>();
    for (const row of rows) {
      if (!object(row) || requiredStrings[name].some((key) => typeof row[key] !== "string")) throw invalid();
      if ("organizationId" in row && (typeof row.organizationId !== "string" || !row.organizationId.trim())) throw invalid();
      const key = row[name === "clinicalRecords" ? "attendanceId" : "id"] as string;
      if (!key || keys.has(key)) throw invalid();
      keys.add(key);
      const numericFields = name === "sales" ? ["total"] : name === "inventoryItems" ? ["quantity", "minimumQuantity"] : name === "inventoryMovements" ? ["quantity"] : name === "cashSessions" ? ["openingBalance"] : name === "cashEntries" ? ["amount"] : [];
      if (numericFields.some((field) => typeof row[field] !== "number" || !Number.isFinite(row[field]))) throw invalid();
      if (name === "prescriptions" && (!Number.isSafeInteger(row.version) || (row.version as number) < 1)) throw invalid();
      if (name === "prescriptions") {
        for (const field of ["od", "oe"]) {
          const eye = row[field];
          if (!object(eye)) throw invalid();
          for (const key of ["sphere", "cylinder", "add"]) if (eye[key] !== undefined && (typeof eye[key] !== "number" || !Number.isFinite(eye[key] as number))) throw invalid();
          if (eye.axis !== undefined && (typeof eye.axis !== "number" || !Number.isFinite(eye.axis as number) || (eye.axis as number) < 0 || (eye.axis as number) > 180)) throw invalid();
        }
      }
      if ((name === "stores" || name === "users") && typeof row.active !== "boolean") throw invalid();
      if (name === "users" && (!Array.isArray(row.storeIds) || row.storeIds.some((id) => typeof id !== "string"))) throw invalid();
      if (name === "users" && (!Object.hasOwn(rolePermissions, row.role as string) || !["SELF", "STORE", "ORGANIZATION", "NETWORK"].includes(row.scope as string))) throw invalid();
      if (name === "sales" && row.paymentStatus !== undefined && !["PENDING", "PARTIAL", "PAID"].includes(row.paymentStatus as string)) throw invalid();
      if (name === "sales" && row.quoteStatus !== undefined && !Object.hasOwn(quoteStatusLabels, row.quoteStatus as string)) throw invalid();
      if (name === "cashEntries" && row.paymentMethod !== undefined && !Object.hasOwn(paymentMethodLabels, row.paymentMethod as string)) throw invalid();
      if (name === "cashEntries" && row.reason !== undefined && (typeof row.reason !== "string" || !row.reason.trim())) throw invalid();
      if (name === "cashEntries" && row.author !== undefined && typeof row.author !== "string") throw invalid();
      if (name === "inventoryItems" && row.defaultPrice !== undefined && (typeof row.defaultPrice !== "number" || !Number.isFinite(row.defaultPrice) || row.defaultPrice < 0)) throw invalid();
      if (name === "inventoryItems" && row.cost !== undefined && (typeof row.cost !== "number" || !Number.isFinite(row.cost) || row.cost < 0)) throw invalid();
      if (name === "inventoryItems" && row.category !== undefined && !isProductCategory(row.category)) throw invalid();
      if (name === "attendances" && row.priority !== undefined && !isAttendancePriority(row.priority)) throw invalid();
      if (name === "sales" && row.items !== undefined && (!Array.isArray(row.items) || row.items.some((item) => !object(item) || typeof item.inventoryItemId !== "string" || typeof item.name !== "string" || typeof item.quantity !== "number" || !Number.isFinite(item.quantity) || item.quantity <= 0 || typeof item.unitPrice !== "number" || !Number.isFinite(item.unitPrice) || item.unitPrice < 0))) throw invalid();
      if (name === "sales" && row.items !== undefined && Array.isArray(row.items)) for (const item of row.items as Record<string, unknown>[]) if (item.category !== undefined && !isProductCategory(item.category)) throw invalid();
      if (name === "sales" && row.treatments !== undefined && (!Array.isArray(row.treatments) || row.treatments.some((treatment) => !object(treatment) || typeof treatment.name !== "string" || !treatment.name.trim() || typeof treatment.price !== "number" || !Number.isFinite(treatment.price) || treatment.price < 0))) throw invalid();
      if (name === "sales" && row.prescription !== undefined) {
        const rx = row.prescription;
        if (!object(rx) || typeof rx.prescriptionId !== "string" || !rx.prescriptionId.trim() || typeof rx.customerId !== "string" || !rx.customerId.trim() || !Number.isSafeInteger(rx.version) || (rx.version as number) < 1) throw invalid();
        if (rx.usage !== undefined && !Object.hasOwn(prescriptionUsageLabels, rx.usage as string)) throw invalid();
        if (rx.notes !== undefined && typeof rx.notes !== "string") throw invalid();
        for (const field of ["od", "oe"]) {
          const eye = rx[field];
          if (!object(eye)) throw invalid();
          for (const key of ["sphere", "cylinder", "add"]) if (eye[key] !== undefined && (typeof eye[key] !== "number" || !Number.isFinite(eye[key] as number))) throw invalid();
          if (eye.axis !== undefined && (typeof eye.axis !== "number" || !Number.isFinite(eye.axis as number) || (eye.axis as number) < 0 || (eye.axis as number) > 180)) throw invalid();
        }
      }
      if (name === "cashSessions") {
        for (const field of ["expectedBalance", "closingBalance"]) if (row[field] !== undefined && (typeof row[field] !== "number" || !Number.isFinite(row[field]) || (row[field] as number) < 0)) throw invalid();
        if (row.difference !== undefined && (typeof row.difference !== "number" || !Number.isFinite(row.difference))) throw invalid();
      }
      for (const field of ["cpf", "phone", "birthDate", "email", "receptionNotes", "closedAt", "closedBy", "closingNote", "code", "author", "updatedAt", "updatedBy", "dueAt", "notes", "cancelledBy", "professionalId", "attendanceId", "brand", "material", "description", "retifies", "retificationReason"]) if (row[field] !== undefined && typeof row[field] !== "string") throw invalid();
      if (name === "clinicalRecords" || name === "clinicalVersions") {
        if (!Array.isArray(row.attachments) || row.attachments.some((item) => !object(item) || typeof item.id !== "string" || typeof item.name !== "string" || typeof item.mimeType !== "string" || typeof item.size !== "number" || typeof item.createdAt !== "string")) throw invalid();
        for (const field of ["revision", "version"]) if (row[field] !== undefined && (!Number.isSafeInteger(row[field]) || (row[field] as number) < (field === "version" ? 1 : 0))) throw invalid();
        for (const field of ["author", "amendmentReason", "finalizedAt"]) if (row[field] !== undefined && typeof row[field] !== "string") throw invalid();
      }
      if (name === "attachments" && (typeof row.content !== "string" || !row.content || row.content.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(row.content))) throw invalid();
      if (name === "sales") {
        if (row.cancelReason !== undefined && (typeof row.cancelReason !== "string" || !row.cancelReason.trim())) throw invalid();
        if (row.cancelledAt !== undefined && (typeof row.cancelledAt !== "string" || !Number.isFinite(Date.parse(row.cancelledAt)))) throw invalid();
      }
      if (name === "workOrders") {
        if (row.cancelReason !== undefined && (typeof row.cancelReason !== "string" || !row.cancelReason.trim())) throw invalid();        if (row.events !== undefined) {
          if (!Array.isArray(row.events)) throw invalid();
          const eventIds = new Set<string>();
          for (const event of row.events) {
            if (!object(event) || typeof event.id !== "string" || !event.id || eventIds.has(event.id) || typeof event.author !== "string" || typeof event.at !== "string" || !Number.isFinite(Date.parse(event.at))) throw invalid();
            eventIds.add(event.id);
            if (typeof event.type !== "string" || !Object.hasOwn(workOrderEventLabels, event.type)) throw invalid();
            for (const field of ["from", "to"]) if (event[field] !== undefined && (typeof event[field] !== "string" || !Object.hasOwn(workOrderStatusLabels, event[field]))) throw invalid();
            if (event.note !== undefined && typeof event.note !== "string") throw invalid();
          }
        }
      }
    }
  }
  const snapshot = { ...value, tables: importedTables } as unknown as BackupSnapshot;
  const tables = snapshot.tables;
  const ids = (name: BackupTable) => new Set(tables[name].map((row) => row.id));
  const customers = ids("customers"), stores = ids("stores"), attendances = ids("attendances");
  if (tables.currentStore.length !== 1 || tables.currentStore[0].id !== "current" || !tables.stores.some((store) => store.id === tables.currentStore[0].storeId && store.active)) throw invalid();
  if (tables.settings.length > 1 || tables.settings.some((row) => row.id !== "current")) throw invalid();
  for (const name of ["attendances", "sales", "workOrders", "agendaEvents"] as const) for (const row of tables[name]) if (!customers.has(row.customerId) || !stores.has(row.storeId)) throw invalid();
  for (const row of tables.prescriptions) if (!attendances.has(row.attendanceId) || !stores.has(row.storeId) || !customers.has(row.customerId)) throw invalid();
  for (const name of ["clinicalRecords", "clinicalVersions"] as const) for (const row of tables[name]) if (!attendances.has(row.attendanceId)) throw invalid();
  for (const name of ["inventoryItems", "inventoryMovements", "cashSessions", "cashEntries"] as const) for (const row of tables[name]) if (!stores.has(row.storeId)) throw invalid();
  if (tables.users.some((row) => (row.storeIds as string[]).some((id) => !stores.has(id)))) throw invalid();
  for (const [child, field, parent] of [["workOrders", "saleId", "sales"], ["inventoryMovements", "itemId", "inventoryItems"], ["cashEntries", "sessionId", "cashSessions"]] as const) {
    const parents = new Map(tables[parent].map((row) => [row.id, row]));
    for (const row of tables[child]) if (parents.get(row[field])?.storeId !== row.storeId) throw invalid();
  }
  const sales = new Map(tables.sales.map((row) => [row.id, row]));
  const inventoryItems = new Map(tables.inventoryItems.map((row) => [row.id, row]));
  for (const row of tables.sales) for (const item of (row.items ?? []) as Record<string, unknown>[]) if (inventoryItems.get(item.inventoryItemId as string)?.storeId !== row.storeId) throw invalid();
  const prescriptions = new Map(tables.prescriptions.map((row) => [row.id, row]));
  for (const row of tables.sales) if (row.prescription !== undefined) {
    const linked = prescriptions.get((row.prescription as { prescriptionId: string }).prescriptionId);
    if (!linked || linked.customerId !== (row.prescription as { customerId: string }).customerId || linked.storeId !== row.storeId) throw invalid();
  }
  if (tables.cashEntries.some((row) => row.saleId !== undefined && sales.get(row.saleId)?.storeId !== row.storeId)) throw invalid();
  for (const row of tables.clinicalVersions) {
    if (row.id !== `${row.attendanceId}:${row.version ?? 1}` || !Number.isFinite(Date.parse(row.finalizedAt as string))) throw invalid();
  }
  const enums: Partial<Record<BackupTable, [string, string[]]>> = {
    attendances: ["status", ["DRAFT", "WAITING", "IN_PROGRESS", "FINISHED", "CANCELLED", "NO_SHOW"]], agendaEvents: ["status", ["SCHEDULED", "COMPLETED", "CANCELLED"]], sales: ["status", ["QUOTE", "CONFIRMED", "CANCELLED"]], workOrders: ["status", ["OPEN", "SENT_TO_LAB", "IN_PRODUCTION", "RETURNED", "IN_INSPECTION", "READY", "AWAITING_PICKUP", "DELIVERED", "CANCELLED"]], inventoryMovements: ["type", ["IN", "OUT", "ADJUSTMENT"]], cashEntries: ["type", ["RECEIPT", "WITHDRAWAL", "DEPOSIT", "REFUND"]],
  };
  for (const name of backupTables) {
    const rule = enums[name];
    if (rule && tables[name].some((row) => !rule[1].includes(row[rule[0]] as string))) throw invalid();
  }
  if (tables.attendances.some((row) => !["CONSULTATION", "RETURN", "ADJUSTMENT", "ASSESSMENT"].includes(row.type as string))) throw invalid();
  if (tables.agendaEvents.some((row) => !["CONSULTATION", "RETURN", "DELIVERY", "ADJUSTMENT", "BILLING"].includes(row.type as string))) throw invalid();
  const attendanceIds = ids("attendances");
  if (tables.agendaEvents.some((row) => row.attendanceId !== undefined && !attendanceIds.has(row.attendanceId as string))) throw invalid();
  return snapshot;
}

export class BackupService {
  constructor(private repository: BackupRepository, private codec: BackupCodec) {}
  private authorize(role: RoleKey) { if (role !== "OWNER") throw new Error("Somente o proprietário pode gerenciar o backup completo."); }
  async create(password: string, role: RoleKey) {
    this.authorize(role);
    if (password.length < 12) throw new Error("Use uma senha com pelo menos 12 caracteres.");
    return this.codec.encrypt(JSON.stringify(await this.repository.snapshot()), password);
  }
  async inspect(file: string, password: string, role: RoleKey) {
    this.authorize(role);
    const content = await this.codec.decrypt(file, password);
    let parsed: unknown;
    try { parsed = JSON.parse(content); }
    catch { throw new Error("Backup inválido: o conteúdo decifrado não é um arquivo válido. Nenhum dado foi substituído."); }
    return validateBackup(parsed);
  }
  async restore(snapshot: BackupSnapshot, confirmation: string, role: RoleKey) {
    this.authorize(role);
    if (confirmation !== "RESTAURAR") throw new Error("Digite RESTAURAR para confirmar a substituição.");
    await this.repository.restore(validateBackup(snapshot));
  }
}
