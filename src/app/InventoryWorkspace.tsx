import { useEffect, useRef, useState } from "react";
import { errorMessage } from "../domain/errors";
import { Button, Drawer, ErrorState, Input, Select, Skeleton } from "../design-system/components";
import { hasPermission } from "../domain/access";
import { InventoryService } from "../domain/inventory-service";
import type { InventoryItem, InventoryMovement, InventoryMovementType, ProductCategory, ProductCategoryFilter } from "../domain/inventory";
import { filterByCategory, marginCents, productCategories, productCategoryLabels, stockState } from "../domain/inventory";
import { LocalInventoryRepository } from "../infrastructure/storage/local-repositories";
import { useAppContext, useSession } from "./providers";

const service = new InventoryService(new LocalInventoryRepository());
const stateLabels = { OK: "Disponível", LOW: "Abaixo do mínimo", OUT: "Esgotado" } as const;
const stateClasses = { OK: "", LOW: "is-low", OUT: "is-out" } as const;
const movementLabels = { IN: "Entrada", OUT: "Saída", ADJUSTMENT: "Ajuste" } as const;
const movementSign = (movement: InventoryMovement) => movement.type === "OUT" ? "-" : "+";

export function InventoryPage() {
  const { currentStoreId } = useAppContext();
  const session = useSession();
  const canManage = hasPermission(session.role, "inventory.manage");
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem>();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [quantity, setQuantity] = useState("");
  const [minimum, setMinimum] = useState("");
  const [defaultPrice, setDefaultPrice] = useState("");
  const [cost, setCost] = useState("");
  const [category, setCategory] = useState<ProductCategory | "">("");
  const [brand, setBrand] = useState("");
  const [material, setMaterial] = useState("");
  const [description, setDescription] = useState("");
  const [catalogFilter, setCatalogFilter] = useState<ProductCategoryFilter>("ALL");
  const [moving, setMoving] = useState<InventoryItem>();
  const [moveType, setMoveType] = useState<InventoryMovementType>("IN");
  const [moveQuantity, setMoveQuantity] = useState("");
  const [moveReason, setMoveReason] = useState("");
  const pending = useRef(false);

  async function refresh() {
    try {
      const [loadedItems, loadedMovements] = await Promise.all([service.list(currentStoreId), service.history(currentStoreId)]);
      setItems(loadedItems); setMovements(loadedMovements); setError("");
    } catch (reason) { setError(errorMessage(reason, "Não foi possível carregar o estoque desta loja.")); }
    finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, [currentStoreId, attempt]);
  function retry() { setLoading(true); setAttempt((value) => value + 1); }

  async function run(action: () => Promise<string>, fallback: string) {
    if (pending.current || !canManage) return;
    pending.current = true; setMessage(""); setError("");
    try { setMessage(await action()); await refresh(); } catch (reason) { setError(errorMessage(reason, fallback)); } finally { pending.current = false; }
  }
  function resetProductForm(open: boolean) { setFormOpen(open); setEditing(undefined); setName(""); setCode(""); setQuantity(""); setMinimum(""); setDefaultPrice(""); setCost(""); setCategory(""); setBrand(""); setMaterial(""); setDescription(""); }
  function editProduct(item: InventoryItem) { setMoving(undefined); setFormOpen(true); setEditing(item); setName(item.name); setCode(item.code ?? ""); setQuantity(String(item.quantity)); setMinimum(String(item.minimumQuantity)); setDefaultPrice(item.defaultPrice !== undefined ? String(item.defaultPrice) : ""); setCost(item.cost !== undefined ? String(item.cost) : ""); setCategory(item.category ?? ""); setBrand(item.brand ?? ""); setMaterial(item.material ?? ""); setDescription(item.description ?? ""); }
  function resetMovement() { setMoving(undefined); setMoveType("IN"); setMoveQuantity(""); setMoveReason(""); }

  async function saveProduct(event: React.FormEvent) {
    event.preventDefault();
    const prices = { defaultPrice: defaultPrice.trim() ? Number(defaultPrice) : undefined, cost: cost.trim() ? Number(cost) : undefined };
    const sheet = { category: category as ProductCategory, brand, material, description };
    await run(async () => {
      if (editing) {
        await service.update(editing, { name, code, minimumQuantity: Number(minimum), ...prices, ...sheet });
        resetProductForm(false);
        return "Produto atualizado.";
      }
      await service.create(currentStoreId, { name, code, quantity: Number(quantity || 0), minimumQuantity: Number(minimum || 0), ...prices, ...sheet }, session.userName);
      resetProductForm(false);
      return "Produto cadastrado.";
    }, "Não foi possível salvar o produto.");
  }

  async function applyMovement(event: React.FormEvent) {
    event.preventDefault();
    if (!moving) return;
    const item = moving;
    await run(async () => {
      await service.adjust(item, moveType, Number(moveQuantity), moveReason, session.userName);
      resetMovement();
      return "Movimentação registrada.";
    }, "Não foi possível registrar a movimentação.");
  }

  const alerts = items.filter((item) => stockState(item) !== "OK");
  const visibleItems = filterByCategory(items, catalogFilter);
  const itemName = (id: string) => items.find((item) => item.id === id)?.name ?? "Produto removido";
  return <div className="page inventory-page">
    <div className="page-title">
      <div><p className="eyebrow">Operação</p><h1>Estoque</h1><p className="page-intro">Cadastre produtos, movimente saldos e acompanhe o histórico desta loja.</p></div>
      {canManage && <Button type="button" onClick={() => { resetMovement(); resetProductForm(!formOpen || Boolean(editing)); }}>{formOpen && !editing ? "Fechar" : "Novo produto"}</Button>}
    </div>
    {message && <p className="notice success" role="status">{message}</p>}
    {error && <p className="notice error-text" role="alert">{error} <Button type="button" onClick={retry}>Tentar novamente</Button></p>}
    {alerts.length > 0 && <p className="notice error-text" role="status">{alerts.length} {alerts.length === 1 ? "produto está" : "produtos estão"} no limite mínimo ou esgotado{alerts.length === 1 ? "" : "s"}.</p>}

    {canManage && formOpen && <form className="inventory-form" onSubmit={saveProduct}>
      <label>Produto<Input value={name} onChange={(event) => setName(event.target.value)} required /></label>
      <label>Código<Input value={code} onChange={(event) => setCode(event.target.value)} placeholder="Barras ou interno" required /></label>
      <Select label="Categoria" aria-label="Categoria do produto" value={category} onChange={(event) => setCategory(event.target.value as ProductCategory)} required><option value="">Selecione</option>{productCategories.map((value) => <option key={value} value={value}>{productCategoryLabels[value]}</option>)}</Select>
      {!editing && <label>Saldo inicial<Input type="number" min="0" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder="0" /></label>}
      <label>Estoque mínimo<Input type="number" min="0" step="1" value={minimum} onChange={(event) => setMinimum(event.target.value)} placeholder="0" /></label>
      <label>Preço padrão (R$)<Input type="number" min="0" step="0.01" value={defaultPrice} onChange={(event) => setDefaultPrice(event.target.value)} placeholder="Opcional" /></label>
      <label>Custo (R$)<Input type="number" min="0" step="0.01" value={cost} onChange={(event) => setCost(event.target.value)} placeholder="Opcional" /></label>
      <label>Marca<Input value={brand} onChange={(event) => setBrand(event.target.value)} placeholder="Opcional" /></label>
      <label>Material<Input value={material} onChange={(event) => setMaterial(event.target.value)} placeholder="Opcional" /></label>
      <label>Descrição<Input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Opcional (ficha: grau, curvatura, etc.)" /></label>
      <div className="form-actions">
        <Button type="submit">{editing ? "Salvar alterações" : "Cadastrar produto"}</Button>
        <Button type="button" onClick={() => resetProductForm(false)}>Cancelar</Button>
      </div>
      {editing && <p className="help-text">O saldo não é editado aqui: use Movimentar para registrar entrada, saída ou ajuste com motivo.</p>}
    </form>}

    {canManage && <Drawer open={Boolean(moving)} onClose={resetMovement} title={moving ? `Movimentar ${moving.name}` : "Movimentar produto"}>{moving && <form className="inventory-form" onSubmit={applyMovement}>
      <p className="help-text inventory-moving">Movimentando <strong>{moving.name}</strong> · saldo atual {moving.quantity}</p>
      <Select label="Tipo" aria-label="Tipo de movimentação" value={moveType} onChange={(event) => setMoveType(event.target.value as InventoryMovementType)}><option value="IN">Entrada</option><option value="OUT">Saída</option><option value="ADJUSTMENT">Ajuste (com sinal)</option></Select>
      <label>Quantidade<Input type="number" step="1" value={moveQuantity} onChange={(event) => setMoveQuantity(event.target.value)} required /></label>
      <label>Motivo<Input value={moveReason} onChange={(event) => setMoveReason(event.target.value)} placeholder="Ex.: compra, venda, conferência" required /></label>
      <div className="form-actions">
        <Button type="submit">Registrar movimentação</Button>
        <Button type="button" onClick={resetMovement}>Cancelar</Button>
      </div>
    </form>}</Drawer>}

    <h2 className="section-title">Produtos</h2>
    <div className="status-filters" role="tablist" aria-label="Filtrar produtos por categoria">
      <button type="button" role="tab" aria-selected={catalogFilter === "ALL"} className={catalogFilter === "ALL" ? "active" : ""} onClick={() => setCatalogFilter("ALL")}>Todas <span>{items.length}</span></button>
      {productCategories.map((value) => <button type="button" role="tab" key={value} aria-selected={catalogFilter === value} className={catalogFilter === value ? "active" : ""} onClick={() => setCatalogFilter(value)}>{productCategoryLabels[value]} <span>{items.filter((item) => item.category === value).length}</span></button>)}
    </div>
    <div className="list-card compact-list">{loading ? <Skeleton lines={4} label="Carregando estoque…" /> : !error && (visibleItems.length ? visibleItems.map((item) => {
      const state = stockState(item);
      const margin = item.defaultPrice !== undefined && item.cost !== undefined ? marginCents(item.defaultPrice, item.cost) : undefined;
      return <article className="list-row" key={item.id}>
        <div><strong>{item.category ? `${productCategoryLabels[item.category]} · ` : ""}{item.name}</strong><span>{item.brand ? `Marca ${item.brand} · ` : ""}{item.material ? `${item.material} · ` : ""}{item.code ? `Código ${item.code} · ` : ""}Mínimo {item.minimumQuantity}{item.defaultPrice !== undefined ? ` · Preço R$ ${item.defaultPrice.toFixed(2)}` : ""}{canManage && item.cost !== undefined ? ` · Custo R$ ${item.cost.toFixed(2)}` : ""}{canManage && margin !== undefined ? ` · Margem R$ ${(margin / 100).toFixed(2)}` : ""}</span>{item.description && <span className="help-text">{item.description}</span>}</div>
        <div>
          <span className={`badge ${stateClasses[state]}`}>{item.quantity} disponíveis · {stateLabels[state]}</span>
          {canManage && <Button type="button" onClick={() => { resetProductForm(false); setEditing(undefined); setMoving(item); setMoveType("IN"); setMoveQuantity(""); setMoveReason(""); }}>Movimentar</Button>}
          {canManage && <Button type="button" onClick={() => { resetMovement(); editProduct(item); }}>Editar</Button>}
        </div>
      </article>;
    }) : items.length ? <p className="empty-state">Nenhum produto nesta categoria.</p> : <p className="empty-state">Nenhum produto cadastrado nesta loja.</p>)}</div>

    <h2 className="section-title">Histórico de movimentações</h2>
    <div className="list-card compact-list">{movements.length ? movements.map((movement) => <article className="list-row" key={movement.id}>
      <div><strong>{itemName(movement.itemId)}</strong><span>{movementLabels[movement.type]} · {movement.reason} · {new Date(movement.createdAt).toLocaleString("pt-BR")}{movement.author ? ` · ${movement.author}` : ""}</span></div>
      <div><span className="badge">{movementSign(movement)}{movement.quantity}</span></div>
    </article>) : <p className="empty-state">Nenhuma movimentação registrada nesta loja.</p>}</div>
  </div>;
}
