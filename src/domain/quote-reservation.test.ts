import { describe, expect, it } from "vitest";
import { availableQuantity } from "./inventory";
import { quoteReservationDeltas } from "./sales";
import type { SaleItem } from "./sales";

const item = (id: string, quantity: number): SaleItem => ({ inventoryItemId: id, name: `Item ${id}`, quantity, unitPrice: 10 });

describe("available quantity", () => {
  it("subtracts the reserved balance and defaults to zero reservation", () => {
    expect(availableQuantity({ quantity: 5 })).toBe(5);
    expect(availableQuantity({ quantity: 5, reservedQuantity: 2 })).toBe(3);
    expect(availableQuantity({ quantity: 1, reservedQuantity: 3 })).toBe(-2);
  });
});

describe("quote reservation deltas", () => {
  it("reserves everything on creation and releases everything on removal", () => {
    expect([...quoteReservationDeltas(undefined, [item("a", 2), item("b", 1)])]).toEqual([["a", 2], ["b", 1]]);
    expect([...quoteReservationDeltas([item("a", 2), item("b", 1)], undefined)]).toEqual([["a", -2], ["b", -1]]);
  });

  it("computes the net change per product when a draft is edited", () => {
    expect([...quoteReservationDeltas([item("a", 1)], [item("a", 3)])]).toEqual([["a", 2]]);
    expect([...quoteReservationDeltas([item("a", 2), item("b", 1)], [item("a", 2)])]).toEqual([["b", -1]]);
    expect(quoteReservationDeltas([item("a", 2)], [item("a", 2)]).size).toBe(0);
  });
});
