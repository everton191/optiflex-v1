export type SortDirection = "asc" | "desc";

export interface SortState {
  key: string;
  direction: SortDirection;
}

export interface DataTableColumn<T> {
  key: string;
  label: string;
  value: (row: T) => string | number;
  align?: "left" | "right";
  sortable?: boolean;
}

export function toggleSort(current: SortState | undefined, key: string): SortState {
  if (!current || current.key !== key) return { key, direction: "asc" };
  if (current.direction === "asc") return { key, direction: "desc" };
  return { key, direction: "asc" };
}

export function sortRows<T>(rows: readonly T[], column: DataTableColumn<T> | undefined, direction: SortDirection): T[] {
  if (!column) return [...rows];
  const factor = direction === "asc" ? 1 : -1;
  return [...rows].sort((left, right) => {
    const a = column.value(left);
    const b = column.value(right);
    if (typeof a === "number" && typeof b === "number") return (a - b) * factor;
    return String(a).localeCompare(String(b), "pt-BR", { sensitivity: "base" }) * factor;
  });
}

export function normalizeForSearch(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("pt-BR");
}

export function filterRows<T>(rows: readonly T[], query: string, match: (row: T, needle: string) => boolean): T[] {
  const needle = normalizeForSearch(query).trim();
  if (!needle) return [...rows];
  return rows.filter((row) => match(row, needle));
}

export function paginateRows<T>(rows: readonly T[], page: number, pageSize: number): T[] {
  const safePage = Math.max(0, Math.floor(page));
  const safeSize = Math.max(1, Math.floor(pageSize));
  return rows.slice(safePage * safeSize, safePage * safeSize + safeSize);
}

export function pageCount(total: number, pageSize: number): number {
  const safeSize = Math.max(1, Math.floor(pageSize));
  return Math.max(1, Math.ceil(Math.max(0, total) / safeSize));
}
