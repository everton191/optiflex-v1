import { backupTables, validateBackup, type BackupRepository, type BackupSnapshot } from "../../domain/backup";
import { database } from "./database";

export class LocalBackupRepository implements BackupRepository {
  async snapshot(): Promise<BackupSnapshot> {
    const tables = backupTables.map((name) => database.table(name));
    return database.transaction("r", tables, async () => {
      const entries = await Promise.all(tables.map(async (table) => [table.name, await table.toArray()]));
      return { format: "opticore", version: 1, schema: 11, createdAt: new Date().toISOString(), tables: Object.fromEntries(entries) as BackupSnapshot["tables"] };
    });
  }
  async restore(input: BackupSnapshot) {
    const snapshot = validateBackup(input);
    // Clear + import form a single transaction: any failure rolls the entire operation back.
    await database.transaction("rw", backupTables.map((name) => database.table(name)), async () => {
      for (const name of backupTables) {
        await database.table(name).clear();
        await database.table(name).bulkAdd(snapshot.tables[name]);
      }
    });
  }
}
