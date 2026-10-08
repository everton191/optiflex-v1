import { rolePermissions, type RoleKey } from "./access";

// Session is intentionally excluded: restoring business data must not import a login.
export const backupTables = ["settings", "stores", "users", "currentStore", "customers", "attendances", "clinicalRecords", "clinicalVersions", "sales", "workOrders", "inventoryItems", "inventoryMovements", "cashSessions", "cashEntries"] as const;
export type BackupTable = typeof backupTables[number];
export interface BackupSnapshot { format: "opticore"; version: 1; schema: 10; createdAt: string; tables: Record<BackupTable, Record<string, unknown>[]>; }
export interface BackupRepository { snapshot(): Promise<BackupSnapshot>; restore(snapshot: BackupSnapshot): Promise<void>; }
export interface BackupCodec { encrypt(value: string, password: string): Promise<string>; decrypt(value: string, password: string): Promise<string>; }

const requiredStrings: Record<BackupTable, string[]> = {
  settings: ["id", "organizationName", "clinicalProfessionalLabel"], stores: ["id", "name"], users: ["id", "name", "email", "role", "scope"], currentStore: ["id", "storeId"],
  customers: ["id", "name", "createdAt"], attendances: ["id", "customerId", "storeId", "type", "status", "createdAt"],
  clinicalRecords: ["attendanceId", "anamnesis", "examination", "prescription", "requests", "updatedAt"], clinicalVersions: ["id", "attendanceId", "anamnesis", "examination", "prescription", "requests", "updatedAt", "finalizedAt"],
  sales: ["id", "customerId", "storeId", "status", "description", "createdAt"], workOrders: ["id", "saleId", "storeId", "customerId", "status", "createdAt"],
  inventoryItems: ["id", "storeId", "name"], inventoryMovements: ["id", "itemId", "storeId", "type", "reason", "createdAt"], cashSessions: ["id", "storeId", "openedAt"], cashEntries: ["id", "sessionId", "storeId", "type", "createdAt"],
};
const object = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === "object" && !Array.isArray(value));
const invalid = () => new Error("Backup inválido ou incompatível. Nenhum dado foi substituído.");
export function validateBackup(value: unknown): BackupSnapshot {
  if (!object(value) || value.format !== "opticore" || value.version !== 1 || value.schema !== 10 || typeof value.createdAt !== "string" || !Number.isFinite(Date.parse(value.createdAt)) || !object(value.tables)) throw invalid();
  if (Object.keys(value.tables).length !== backupTables.length) throw invalid();
  for (const name of backupTables) {
    const rows = value.tables[name];
    if (!Array.isArray(rows)) throw invalid();
    const keys = new Set<string>();
    for (const row of rows) {
      if (!object(row) || requiredStrings[name].some((key) => typeof row[key] !== "string")) throw invalid();
      const key = row[name === "clinicalRecords" ? "attendanceId" : "id"] as string;
      if (!key || keys.has(key)) throw invalid();
      keys.add(key);
      const numericFields = name === "sales" ? ["total"] : name === "inventoryItems" ? ["quantity", "minimumQuantity"] : name === "inventoryMovements" ? ["quantity"] : name === "cashSessions" ? ["openingBalance"] : name === "cashEntries" ? ["amount"] : [];
      if (numericFields.some((field) => typeof row[field] !== "number" || !Number.isFinite(row[field]))) throw invalid();
      if ((name === "stores" || name === "users") && typeof row.active !== "boolean") throw invalid();
      if (name === "users" && (!Array.isArray(row.storeIds) || row.storeIds.some((id) => typeof id !== "string"))) throw invalid();
      if (name === "users" && (!Object.hasOwn(rolePermissions, row.role as string) || !["SELF", "STORE", "ORGANIZATION", "NETWORK"].includes(row.scope as string))) throw invalid();
      if (name === "sales" && row.paymentStatus !== undefined && !["PENDING", "PAID"].includes(row.paymentStatus as string)) throw invalid();
      if (name === "cashSessions") {
        for (const field of ["expectedBalance", "closingBalance"]) if (row[field] !== undefined && (typeof row[field] !== "number" || !Number.isFinite(row[field]) || (row[field] as number) < 0)) throw invalid();
        if (row.difference !== undefined && (typeof row.difference !== "number" || !Number.isFinite(row.difference))) throw invalid();
      }
      for (const field of ["cpf", "phone", "birthDate", "email", "receptionNotes", "closedAt", "closedBy", "closingNote"]) if (row[field] !== undefined && typeof row[field] !== "string") throw invalid();
      if (name === "clinicalRecords" || name === "clinicalVersions") {
        if (!Array.isArray(row.attachments) || row.attachments.some((item) => !object(item) || typeof item.id !== "string" || typeof item.name !== "string" || typeof item.mimeType !== "string" || typeof item.size !== "number" || typeof item.createdAt !== "string")) throw invalid();
        for (const field of ["revision", "version"]) if (row[field] !== undefined && (!Number.isSafeInteger(row[field]) || (row[field] as number) < (field === "version" ? 1 : 0))) throw invalid();
        for (const field of ["author", "amendmentReason", "finalizedAt"]) if (row[field] !== undefined && typeof row[field] !== "string") throw invalid();
      }
    }
  }
  const snapshot = value as unknown as BackupSnapshot;
  const tables = snapshot.tables;
  const ids = (name: BackupTable) => new Set(tables[name].map((row) => row.id));
  const customers = ids("customers"), stores = ids("stores"), attendances = ids("attendances");
  if (tables.currentStore.length !== 1 || tables.currentStore[0].id !== "current" || !tables.stores.some((store) => store.id === tables.currentStore[0].storeId && store.active)) throw invalid();
  if (tables.settings.length > 1 || tables.settings.some((row) => row.id !== "current")) throw invalid();
  for (const name of ["attendances", "sales", "workOrders"] as const) for (const row of tables[name]) if (!customers.has(row.customerId) || !stores.has(row.storeId)) throw invalid();
  for (const name of ["clinicalRecords", "clinicalVersions"] as const) for (const row of tables[name]) if (!attendances.has(row.attendanceId)) throw invalid();
  for (const name of ["inventoryItems", "inventoryMovements", "cashSessions", "cashEntries"] as const) for (const row of tables[name]) if (!stores.has(row.storeId)) throw invalid();
  if (tables.users.some((row) => (row.storeIds as string[]).some((id) => !stores.has(id)))) throw invalid();
  for (const [child, field, parent] of [["workOrders", "saleId", "sales"], ["inventoryMovements", "itemId", "inventoryItems"], ["cashEntries", "sessionId", "cashSessions"]] as const) {
    const parents = new Map(tables[parent].map((row) => [row.id, row]));
    for (const row of tables[child]) if (parents.get(row[field])?.storeId !== row.storeId) throw invalid();
  }
  const sales = new Map(tables.sales.map((row) => [row.id, row]));
  if (tables.cashEntries.some((row) => row.saleId !== undefined && sales.get(row.saleId)?.storeId !== row.storeId)) throw invalid();
  for (const row of tables.clinicalVersions) {
    if (row.id !== `${row.attendanceId}:${row.version ?? 1}` || !Number.isFinite(Date.parse(row.finalizedAt as string))) throw invalid();
  }
  const enums: Partial<Record<BackupTable, [string, string[]]>> = {
    attendances: ["status", ["DRAFT", "WAITING", "IN_PROGRESS", "FINISHED", "CANCELLED"]], sales: ["status", ["QUOTE", "CONFIRMED", "CANCELLED"]], workOrders: ["status", ["OPEN", "IN_PRODUCTION", "READY", "DELIVERED", "CANCELLED"]], inventoryMovements: ["type", ["IN", "OUT", "ADJUSTMENT"]], cashEntries: ["type", ["RECEIPT", "WITHDRAWAL", "DEPOSIT"]],
  };
  for (const name of backupTables) {
    const rule = enums[name];
    if (rule && tables[name].some((row) => !rule[1].includes(row[rule[0]] as string))) throw invalid();
  }
  if (tables.attendances.some((row) => !["CONSULTATION", "RETURN", "ADJUSTMENT", "ASSESSMENT"].includes(row.type as string))) throw invalid();
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
    return validateBackup(JSON.parse(await this.codec.decrypt(file, password)));
  }
  async restore(snapshot: BackupSnapshot, confirmation: string, role: RoleKey) {
    this.authorize(role);
    if (confirmation !== "RESTAURAR") throw new Error("Digite RESTAURAR para confirmar a substituição.");
    await this.repository.restore(validateBackup(snapshot));
  }
}
