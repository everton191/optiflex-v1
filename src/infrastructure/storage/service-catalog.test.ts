import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { InventoryService } from "../../domain/inventory-service";
import { SalesService } from "../../domain/sales-service";
import { ServiceCatalogService } from "../../domain/service-catalog-service";
import { database } from "./database";
import { LocalInventoryRepository, LocalSaleRepository, LocalServiceCatalogRepository } from "./local-repositories";

const catalog = new ServiceCatalogService(new LocalServiceCatalogRepository());
const inventoryRepository = new LocalInventoryRepository();
const inventoryService = new InventoryService(inventoryRepository);
const salesService = new SalesService(new LocalSaleRepository(), undefined, undefined, inventoryRepository);

afterEach(async () => { await database.delete(); });

describe("service catalog", () => {
  it("creates, lists, updates and removes catalog services per store", async () => {
    await database.open();
    const created = await catalog.create("store-centro", { name: "Montagem padrão", defaultPrice: 80, description: "Troca de lentes" });
    expect(created).toMatchObject({ storeId: "store-centro", name: "Montagem padrão", defaultPrice: 80 });
    expect(created.id).toMatch(/^service-/);
    await catalog.create("store-centro", { name: "Exame particular", defaultPrice: 120 });
    await catalog.create("store-shopping", { name: "Ajuste de armação", defaultPrice: 30 });
    const centro = await catalog.list("store-centro");
    expect(centro.map((item) => item.name).sort()).toEqual(["Exame particular", "Montagem padrão"]);
    const updated = await catalog.update(created, { name: "Montagem completa", defaultPrice: 95, description: "" });
    expect(updated).toMatchObject({ id: created.id, name: "Montagem completa", defaultPrice: 95, description: undefined });
    expect(await catalog.list("store-shopping")).toHaveLength(1);
    await catalog.remove(updated);
    expect((await catalog.list("store-centro")).map((item) => item.name)).toEqual(["Exame particular"]);
  });

  it("rejects blank names, negative prices and duplicate names in the same store", async () => {
    await database.open();
    await expect(catalog.create("store-centro", { name: "   ", defaultPrice: 10 })).rejects.toThrow("Informe o nome do serviço");
    await expect(catalog.create("store-centro", { name: "Ajuste", defaultPrice: -1 })).rejects.toThrow("Preço padrão do serviço inválido");
    await expect(catalog.create("store-centro", { name: "Ajuste", defaultPrice: Number.NaN })).rejects.toThrow("Preço padrão do serviço inválido");
    await expect(catalog.create("store-centro", { name: "x".repeat(121), defaultPrice: 10 })).rejects.toThrow("muito longo");
    await catalog.create("store-centro", { name: "Ajuste", defaultPrice: 30 });
    await expect(catalog.create("store-centro", { name: "  ajuste  ", defaultPrice: 40 })).rejects.toThrow("Já existe um serviço");
    await catalog.create("store-shopping", { name: "Ajuste", defaultPrice: 40 });
    const only = (await catalog.list("store-centro"))[0];
    const renamed = await catalog.update(only, { name: "Ajuste fino", defaultPrice: 40 });
    expect(renamed.name).toBe("Ajuste fino");
    await catalog.remove(renamed);
    expect(await catalog.list("store-centro")).toHaveLength(0);
  });

  it("survives reopen with the catalog intact", async () => {
    await database.open();
    await catalog.create("store-centro", { name: "Exame particular", defaultPrice: 120 });
    database.close();
    await database.open();
    expect(await catalog.list("store-centro")).toHaveLength(1);
  });

  it("sells a catalog service as a treatment without touching inventory", async () => {
    await database.open();
    const product = await inventoryService.create("store-centro", { name: "Lente", code: "LT-1", quantity: 5, minimumQuantity: 0, category: "LENS" }, "Operador");
    const service = await catalog.create("store-centro", { name: "Montagem padrão", defaultPrice: 80 });
    await database.customers.add({ id: "customer-1", name: "Cliente", createdAt: "2026-01-01T09:00:00.000Z" });
    const quote = await salesService.createQuote("customer-1", "store-centro", "", 0, [], undefined, [{ name: service.name, price: service.defaultPrice }]);
    expect(quote.status).toBe("QUOTE");
    expect(quote.total).toBe(80);
    expect(quote.items).toBeUndefined();
    expect(quote.treatments).toEqual([{ name: "Montagem padrão", price: 80 }]);
    const confirmed = await salesService.confirm(quote);
    expect(confirmed.status).toBe("CONFIRMED");
    expect(await inventoryRepository.listMovements("store-centro")).toHaveLength(1);
    expect((await inventoryRepository.listByStore("store-centro")).find((item) => item.id === product.id)).toMatchObject({ quantity: 5 });
  });
});
