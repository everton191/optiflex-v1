import type { InventoryItem, InventoryMovement, ProductCategory } from "./inventory";
import { productCategoryLabels, productCategories } from "./inventory";
import { parseBrazilianNumber } from "./field-rules";
import type { InventoryRepository } from "./repositories";

export type ImportField = "name" | "code" | "category" | "quantity" | "minimumQuantity" | "defaultPrice" | "cost" | "brand" | "material" | "description";

export const importRequiredFields: readonly ImportField[] = ["name", "code", "category"];

export const importFieldAliases: Record<ImportField, readonly string[]> = {
  name: ["nome", "produto", "name", "product"],
  code: ["codigo", "code", "sku"],
  category: ["categoria", "category"],
  quantity: ["quantidade", "saldo", "quantity"],
  minimumQuantity: ["estoque minimo", "minimo", "minimumquantity"],
  defaultPrice: ["preco", "preco padrao", "preco de venda", "defaultprice"],
  cost: ["custo", "cost"],
  brand: ["marca", "brand"],
  material: ["material"],
  description: ["descricao", "detalhes", "description"]
};

export class InvalidImportError extends Error {}

export interface ParsedCsv { headers: string[]; rows: string[][] }

export function normalizeHeader(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim().replace(/\s+/g, " ");
}

export function parseCsv(text: string): ParsedCsv {
  const clean = text.replace(/^\uFEFF/, "");
  if (!clean.trim()) throw new InvalidImportError("O arquivo está vazio.");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < clean.length; index++) {
    const char = clean[index];
    if (quoted) {
      if (char === '"') {
        if (clean[index + 1] === '"') { field += '"'; index++; }
        else quoted = false;
      } else field += char;
      continue;
    }
    if (char === '"' && field === "") { quoted = true; continue; }
    if (char === ",") { row.push(field); field = ""; continue; }
    if (char === "\r") continue;
    if (char === "\n") { row.push(field); rows.push(row); row = []; field = ""; continue; }
    field += char;
  }
  if (quoted) throw new InvalidImportError("CSV malformado: aspas não fechadas.");
  row.push(field);
  rows.push(row);
  const [headers, ...data] = rows;
  if (!headers || headers.every((cell) => !cell.trim())) throw new InvalidImportError("O arquivo não tem cabeçalho.");
  return { headers: headers.map((cell) => cell.trim()), rows: data.filter((cells) => cells.some((cell) => cell.trim())) };
}

export type ImportMapping = Partial<Record<ImportField, number>>;

export function mapImportColumns(headers: readonly string[]): ImportMapping {
  const mapping: ImportMapping = {};
  headers.forEach((header, index) => {
    const normalized = normalizeHeader(header);
    for (const field of Object.keys(importFieldAliases) as ImportField[]) {
      if (mapping[field] !== undefined) continue;
      if (importFieldAliases[field].includes(normalized)) { mapping[field] = index; return; }
    }
  });
  return mapping;
}

export function parseImportNumber(value: string): number | undefined {
  return parseBrazilianNumber(value);
}

export function parseImportCategory(value: string): ProductCategory | undefined {
  const normalized = normalizeHeader(value);
  if (!normalized) return undefined;
  for (const category of productCategories) {
    if (category.toLowerCase() === normalized) return category;
    if (normalizeHeader(productCategoryLabels[category]) === normalized) return category;
  }
  return undefined;
}

export type ImportRowStatus = "READY" | "ERROR" | "DUPLICATE_IN_FILE" | "EXISTS";

export interface ImportPreviewRow {
  line: number;
  rawCells: string[];
  name: string;
  code: string;
  category: ProductCategory;
  quantity: number;
  minimumQuantity: number;
  defaultPrice?: number;
  cost?: number;
  brand?: string;
  material?: string;
  description?: string;
  status: ImportRowStatus;
  messages: string[];
  existingItem?: InventoryItem;
}

export interface ImportPreview {
  headers: string[];
  mapping: ImportMapping;
  rows: ImportPreviewRow[];
  readyCount: number;
  updateCount: number;
  errorCount: number;
  duplicateCount: number;
}

export function previewInventoryImport(csvText: string, existing: readonly InventoryItem[]): ImportPreview {
  const { headers, rows } = parseCsv(csvText);
  const mapping = mapImportColumns(headers);
  const missing = importRequiredFields.filter((field) => mapping[field] === undefined);
  if (missing.length) throw new InvalidImportError(`Colunas obrigatórias ausentes: ${missing.join(", ")}. Cabeçalhos encontrados: ${headers.join(", ")}.`);
  if (!rows.length) throw new InvalidImportError("O arquivo não tem linhas de dados.");
  const cell = (cells: string[], field: ImportField): string => { const index = mapping[field]; return index === undefined ? "" : (cells[index] ?? "").trim(); };
  const byCode = new Map(existing.map((item) => [item.code?.trim().toLowerCase() ?? "", item]));
  const seenCodes = new Set<string>();
  const previewRows: ImportPreviewRow[] = rows.map((cells, index) => {
    const messages: string[] = [];
    const name = cell(cells, "name");
    const code = cell(cells, "code");
    const categoryText = cell(cells, "category");
    if (!name) messages.push("Nome vazio.");
    if (!code) messages.push("Código vazio.");
    const category = parseImportCategory(categoryText);
    if (!category) messages.push(`Categoria inválida: "${categoryText || "—"}" (use Armação/Lente/Acesso ou FRAME/LENS/ACCESSORY).`);
    const quantityRaw = parseImportNumber(cell(cells, "quantity"));
    const minimumRaw = parseImportNumber(cell(cells, "minimumQuantity"));
    const priceRaw = parseImportNumber(cell(cells, "defaultPrice"));
    const costRaw = parseImportNumber(cell(cells, "cost"));
    if (quantityRaw !== undefined && (!Number.isFinite(quantityRaw) || quantityRaw < 0)) messages.push("Saldo inicial inválido.");
    if (minimumRaw !== undefined && (!Number.isFinite(minimumRaw) || minimumRaw < 0)) messages.push("Estoque mínimo inválido.");
    if (priceRaw !== undefined && (!Number.isFinite(priceRaw) || priceRaw < 0)) messages.push("Preço inválido.");
    if (costRaw !== undefined && (!Number.isFinite(costRaw) || costRaw < 0)) messages.push("Custo inválido.");
    const row: ImportPreviewRow = {
      line: index + 2,
      rawCells: cells,
      name,
      code,
      category: category as ProductCategory,
      quantity: quantityRaw !== undefined && Number.isFinite(quantityRaw) ? quantityRaw : 0,
      minimumQuantity: minimumRaw !== undefined && Number.isFinite(minimumRaw) ? minimumRaw : 0,
      defaultPrice: priceRaw !== undefined && Number.isFinite(priceRaw) ? priceRaw : undefined,
      cost: costRaw !== undefined && Number.isFinite(costRaw) ? costRaw : undefined,
      brand: cell(cells, "brand") || undefined,
      material: cell(cells, "material") || undefined,
      description: cell(cells, "description") || undefined,
      status: "READY",
      messages
    };
    const normalizedCode = code.toLowerCase();
    if (seenCodes.has(normalizedCode)) { row.status = "DUPLICATE_IN_FILE"; row.messages.push(`Código "${code}" repetido no arquivo; só a primeira linha vale.`); }
    else if (normalizedCode && byCode.has(normalizedCode)) { row.status = "EXISTS"; row.existingItem = byCode.get(normalizedCode); }
    else if (messages.length) row.status = "ERROR";
    if (code) seenCodes.add(normalizedCode);
    return row;
  });
  return {
    headers,
    mapping,
    rows: previewRows,
    readyCount: previewRows.filter((row) => row.status === "READY").length,
    updateCount: previewRows.filter((row) => row.status === "EXISTS").length,
    errorCount: previewRows.filter((row) => row.status === "ERROR").length,
    duplicateCount: previewRows.filter((row) => row.status === "DUPLICATE_IN_FILE").length
  };
}

export interface ImportApplyResult { created: number; updated: number; skipped: number }

export async function applyInventoryImport(repository: InventoryRepository, storeId: string, preview: ImportPreview, options: { updateExisting?: boolean; author?: string } = {}): Promise<ImportApplyResult> {
  if (!storeId?.trim()) throw new InvalidImportError("Selecione uma loja para importar.");
  const creates = preview.rows.filter((row) => row.status === "READY");
  const updates = options.updateExisting ? preview.rows.filter((row) => row.status === "EXISTS" && row.existingItem) : [];
  const skipped = preview.rows.length - creates.length - updates.length;
  if (!creates.length && !updates.length) throw new InvalidImportError("Nenhuma linha pronta para importar: corrija os erros ou habilite a atualização de existentes.");
  const finalCodes = new Set(preview.rows.filter((row) => row.status === "EXISTS" && !options.updateExisting).map((row) => row.code.trim().toLowerCase()));
  const batchCodes = new Set<string>();
  for (const row of creates) {
    const normalized = row.code.trim().toLowerCase();
    if (batchCodes.has(normalized) || finalCodes.has(normalized)) throw new InvalidImportError(`Linha ${row.line}: código "${row.code}" conflita com outro item da loja.`);
    batchCodes.add(normalized);
  }
  const items: InventoryItem[] = [];
  const movements: InventoryMovement[] = [];
  const now = new Date().toISOString();
  for (const row of creates) {
    const item: InventoryItem = { id: `item-${crypto.randomUUID()}`, storeId, name: row.name.trim(), code: row.code.trim(), quantity: row.quantity, minimumQuantity: row.minimumQuantity, defaultPrice: row.defaultPrice, cost: row.cost, category: row.category, brand: row.brand, material: row.material, description: row.description };
    items.push(item);
    if (row.quantity > 0) movements.push({ id: `movement-${crypto.randomUUID()}`, itemId: item.id, storeId, type: "IN", quantity: row.quantity, reason: "Importação de planilha", createdAt: now, author: options.author });
  }
  if (items.length) await repository.createMany(items, movements);
  const rawCell = (row: ImportPreviewRow, field: ImportField): string => { const index = preview.mapping[field]; return index === undefined ? "" : (row.rawCells[index] ?? "").trim(); };
  for (const row of updates) {
    const target = row.existingItem!;
    const updated: InventoryItem = { ...target, name: row.name.trim(), code: row.code.trim(), category: row.category };
    if (rawCell(row, "minimumQuantity")) updated.minimumQuantity = row.minimumQuantity;
    if (rawCell(row, "defaultPrice")) updated.defaultPrice = row.defaultPrice;
    if (rawCell(row, "cost")) updated.cost = row.cost;
    if (rawCell(row, "brand")) updated.brand = row.brand;
    if (rawCell(row, "material")) updated.material = row.material;
    if (rawCell(row, "description")) updated.description = row.description;
    await repository.updateItem(updated);
  }
  return { created: items.length, updated: updates.length, skipped };
}
