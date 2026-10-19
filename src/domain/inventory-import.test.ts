import { beforeEach, describe, expect, it, vi } from "vitest";
import { InvalidImportError, applyInventoryImport, mapImportColumns, parseCsv, parseImportCategory, parseImportNumber, previewInventoryImport } from "./inventory-import";
import type { InventoryItem } from "./inventory";
import type { InventoryRepository } from "./repositories";

const repository = { listByStore: vi.fn(), listMovements: vi.fn(), createItem: vi.fn(), createMany: vi.fn(), updateItem: vi.fn(), applyMovement: vi.fn(), applyReservation: vi.fn() };
const existing: InventoryItem[] = [{ id: "item-old", storeId: "store-centro", name: "Lente antiga", code: "lt-100", quantity: 3, minimumQuantity: 1, category: "LENS" }];

const sample = [
  "nome,código,categoria,quantidade,estoque mínimo,preço,custo,marca",
  "Armação Rayban,AR-100,Armação,10,2,299.90,150,Rayban",
  "\"Lente multifocal, 1.67\",LT-200,Lente,5,1,\"1.234,56\",800,Essilor",
  ""
].join("\r\n");

beforeEach(() => { vi.resetAllMocks(); repository.createMany.mockResolvedValue(undefined); repository.updateItem.mockResolvedValue(undefined); });

describe("CSV parser", () => {
  it("parses headers, quoted fields, embedded commas and CRLF after a BOM", () => {
    const { headers, rows } = parseCsv("\uFEFFnome,código\r\n\"Ferrugem, teste\",AR-1\r\n");
    expect(headers).toEqual(["nome", "código"]);
    expect(rows).toEqual([["Ferrugem, teste", "AR-1"]]);
  });

  it("keeps escaped quotes and skips blank lines", () => {
    const { rows } = parseCsv('nome\n"A ""raro"" peça"\n\n');
    expect(rows).toEqual([['A "raro" peça']]);
  });

  it("rejects empty files, missing headers, unclosed quotes and header-only files", () => {
    expect(() => parseCsv("   ")).toThrow(InvalidImportError);
    expect(() => parseCsv('\n"aberto')).toThrow("aspas não fechadas");
    expect(() => previewInventoryImport("nome,código,categoria", [])).toThrow("linhas de dados");
  });
});

describe("column mapping and cell parsing", () => {
  it("auto-maps accented and English aliases", () => {
    expect(mapImportColumns(["Nome", "Código", "Categoria", "Estoque mínimo", "Preço", "Descrição"])).toMatchObject({ name: 0, code: 1, category: 2, minimumQuantity: 3, defaultPrice: 4, description: 5 });
    expect(mapImportColumns(["Product", "SKU", "Cost"])).toMatchObject({ name: 0, code: 1, cost: 2 });
  });

  it("parses Brazilian numbers, currency prefixes and categories", () => {
    expect(parseImportNumber("1.234,56")).toBe(1234.56);
    expect(parseImportNumber("R$ 12,50")).toBe(12.5);
    expect(parseImportNumber("")).toBeUndefined();
    expect(parseImportNumber("abc")).toBeNaN();
    expect(parseImportCategory("Armação")).toBe("FRAME");
    expect(parseImportCategory("lens")).toBe("LENS");
    expect(parseImportCategory("óculos")).toBeUndefined();
  });
});

describe("preview", () => {
  it("imports the sample CSV as ready rows with mapped values", () => {
    const preview = previewInventoryImport(sample, []);
    expect(preview.readyCount).toBe(2);
    expect(preview.rows[0]).toMatchObject({ line: 2, name: "Armação Rayban", code: "AR-100", category: "FRAME", quantity: 10, minimumQuantity: 2, defaultPrice: 299.9, cost: 150, brand: "Rayban", status: "READY" });
    expect(preview.rows[1]).toMatchObject({ name: "Lente multifocal, 1.67", quantity: 5, defaultPrice: 1234.56, category: "LENS" });
  });

  it("rejects a file without the required columns, listing them", () => {
    expect(() => previewInventoryImport("nome,quantidade\nPeça,1\n", [])).toThrow("Colunas obrigatórias ausentes: code, category");
    expect(() => previewInventoryImport("código,categoria\nAR-1,FRAME\n", [])).toThrow("Colunas obrigatórias ausentes: name");
  });

  it("marks invalid cells with the reason and keeps the row out of READY", () => {
    const preview = previewInventoryImport("nome,código,categoria,quantidade,preço\n,AR-1,Óculos,-2,abc\n", []);
    expect(preview.rows[0].status).toBe("ERROR");
    expect(preview.rows[0].messages.join(" ")).toContain("Nome vazio");
    expect(preview.rows[0].messages.join(" ")).toContain("Categoria inválida");
    expect(preview.rows[0].messages.join(" ")).toContain("Saldo inicial inválido");
    expect(preview.rows[0].messages.join(" ")).toContain("Preço inválido");
    expect(preview.readyCount).toBe(0);
  });

  it("flags duplicates inside the file and codes already in the store", () => {
    const csv = "nome,código,categoria\nArmação,AR-100,Armação\nOutra,ar-100,Armação\nLente,LT-100,Lente\n";
    const preview = previewInventoryImport(csv, existing);
    expect(preview.rows.map((row) => row.status)).toEqual(["READY", "DUPLICATE_IN_FILE", "EXISTS"]);
    expect(preview.rows[2].existingItem).toMatchObject({ id: "item-old" });
    expect(preview.duplicateCount).toBe(1);
    expect(preview.updateCount).toBe(1);
  });
});

describe("apply", () => {
  it("creates the batch in one transactional call with initial movements", async () => {
    const preview = previewInventoryImport(sample, []);
    const result = await applyInventoryImport(repository as unknown as InventoryRepository, "store-centro", preview, { author: "Operador" });
    expect(result).toEqual({ created: 2, updated: 0, skipped: 0 });
    expect(repository.createMany).toHaveBeenCalledTimes(1);
    const [items, movements] = repository.createMany.mock.calls[0];
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ storeId: "store-centro", name: "Armação Rayban", code: "AR-100", quantity: 10 });
    expect(movements).toHaveLength(2);
    expect(movements[0]).toMatchObject({ type: "IN", quantity: 10, reason: "Importação de planilha", author: "Operador" });
    expect(repository.updateItem).not.toHaveBeenCalled();
  });

  it("propagates a batch failure without applying updates (rollback)", async () => {
    repository.createMany.mockRejectedValue(new Error("falha de transação"));
    const csv = "nome,código,categoria,quantidade\nNovo,NEW-1,Armação,1\nLente,LT-100,Lente,9\n";
    const preview = previewInventoryImport(csv, existing);
    await expect(applyInventoryImport(repository as unknown as InventoryRepository, "store-centro", preview, { updateExisting: true })).rejects.toThrow("falha de transação");
    expect(repository.createMany).toHaveBeenCalledTimes(1);
    expect(repository.updateItem).not.toHaveBeenCalled();
  });

  it("skips existing codes unless updateExisting is enabled, updating descriptive fields then", async () => {
    const csv = "nome,código,categoria,quantidade,preço\nNovo item,NEW-5,Armação,4,50\nLente nova,LT-100,Lente,9,799.90\n";
    const preview = previewInventoryImport(csv, existing);
    const skipped = await applyInventoryImport(repository as unknown as InventoryRepository, "store-centro", preview);
    expect(skipped).toEqual({ created: 1, updated: 0, skipped: 1 });
    expect(repository.updateItem).not.toHaveBeenCalled();
    const updated = await applyInventoryImport(repository as unknown as InventoryRepository, "store-centro", preview, { updateExisting: true, author: "Ana" });
    expect(updated).toEqual({ created: 1, updated: 1, skipped: 0 });
    expect(repository.updateItem).toHaveBeenCalledWith(expect.objectContaining({ id: "item-old", name: "Lente nova", code: "LT-100", quantity: 3, defaultPrice: 799.9 }));
  });

  it("rejects a blank store and a preview with nothing appliable", async () => {
    const ready = previewInventoryImport(sample, []);
    await expect(applyInventoryImport(repository as unknown as InventoryRepository, "  ", ready)).rejects.toThrow("loja");
    const allErrors = previewInventoryImport("nome,código,categoria\n,AR-99,\n", []);
    await expect(applyInventoryImport(repository as unknown as InventoryRepository, "store-centro", allErrors)).rejects.toThrow("Nenhuma linha pronta");
  });
});
