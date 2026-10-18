import { describe, expect, it } from "vitest";
import { filterRows, normalizeForSearch, pageCount, paginateRows, sortRows, toggleSort, type DataTableColumn } from "./data-table";

interface Row { id: string; name: string; quantity: number }

const rows: Row[] = [
  { id: "1", name: "lente fotocromática", quantity: 3 },
  { id: "2", name: "Armação infantil", quantity: 12 },
  { id: "3", name: "coleção Arno", quantity: 7 },
];

const nameColumn: DataTableColumn<Row> = { key: "name", label: "Nome", value: (row) => row.name };
const quantityColumn: DataTableColumn<Row> = { key: "quantity", label: "Saldo", value: (row) => row.quantity };

describe("toggleSort", () => {
  it("inicia ascendente e alterna descendente", () => {
    expect(toggleSort(undefined, "name")).toEqual({ key: "name", direction: "asc" });
    expect(toggleSort({ key: "name", direction: "asc" }, "name")).toEqual({ key: "name", direction: "desc" });
    expect(toggleSort({ key: "name", direction: "desc" }, "name")).toEqual({ key: "name", direction: "asc" });
  });

  it("coluna diferente volta para ascendente", () => {
    expect(toggleSort({ key: "name", direction: "desc" }, "quantity")).toEqual({ key: "quantity", direction: "asc" });
  });
});

describe("sortRows", () => {
  it("ordena texto com acentos e caixa ignorados (pt-BR)", () => {
    const sorted = sortRows(rows, nameColumn, "asc").map((row) => row.name);
    expect(sorted).toEqual(["Armação infantil", "coleção Arno", "lente fotocromática"]);
  });

  it("ordena números de forma ascendente e descendente", () => {
    expect(sortRows(rows, quantityColumn, "asc").map((row) => row.quantity)).toEqual([3, 7, 12]);
    expect(sortRows(rows, quantityColumn, "desc").map((row) => row.quantity)).toEqual([12, 7, 3]);
  });

  it("sem coluna mantém a ordem original", () => {
    expect(sortRows(rows, undefined, "asc")).toEqual(rows);
  });
});

describe("filterRows", () => {
  const match = (row: Row, needle: string) => normalizeForSearch(row.name).includes(needle);

  it("filtra ignorando caixa e acentos", () => {
    expect(filterRows(rows, "ARNO", match).map((row) => row.id)).toEqual(["3"]);
    expect(filterRows(rows, "armacao", match).map((row) => row.id)).toEqual(["2"]);
  });

  it("query vazia devolve tudo", () => {
    expect(filterRows(rows, "   ", match)).toEqual(rows);
  });
});

describe("paginateRows", () => {
  it("fatia por página", () => {
    expect(paginateRows(rows, 0, 2).map((row) => row.id)).toEqual(["1", "2"]);
    expect(paginateRows(rows, 1, 2).map((row) => row.id)).toEqual(["3"]);
    expect(paginateRows(rows, 2, 2)).toEqual([]);
  });
});

describe("pageCount", () => {
  it("calcula páginas com arredondamento para cima", () => {
    expect(pageCount(0, 10)).toBe(1);
    expect(pageCount(5, 10)).toBe(1);
    expect(pageCount(11, 10)).toBe(2);
    expect(pageCount(20, 10)).toBe(2);
  });
});
