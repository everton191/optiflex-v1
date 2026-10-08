import { useEffect, useRef, useState } from "react";
import { Button, Input } from "../design-system/components";
import { hasPermission } from "../domain/access";
import { InventoryService } from "../domain/inventory-service";
import type { InventoryItem, InventoryMovement, InventoryMovementType } from "../domain/inventory";
import { stockState } from "../domain/inventory";
import { LocalInventoryRepository } from "../infrastructure/storage/local-repositories";
import { useAppContext } from "./providers";

const service = new InventoryService(new LocalInventoryRepository());
const stateLabels = { OK: "Disponível", LOW: "Abaixo do mínimo", OUT: "Esgotado" } as const;
const stateClasses = { OK: "", LOW: "is-low", OUT: "is-out" } as const;
const movementLabels = { IN: "Entrada", OUT: "Saída", ADJUSTMENT: "Ajuste" } as const;
const movementSign = (movement: InventoryMovement) => movement.type === "OUT" ? "-" : "+";

export function InventoryPage() {
  const { currentStoreId, session } = useAppContext();
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
  const [moving, setMoving] = useState<InventoryItem>();
  const [moveType, setMoveType] = useState<InventoryMovementType>("IN");
  const [moveQuantity, setMoveQuantity] = useState("");
  const [moveReason, setMoveReason] = useState("");
  const pending = useRef(false);

  async function refresh() {
    try {
      const [loadedItems, loadedMovements] = await Promise.all([service.list(currentStoreId), service.history(currentStoreId)]);
      setItems(loadedItems); setMovements(loadedMovements); setError("");
    } catch { setError("Não foi possível carregar o estoque desta loja."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, [currentStoreId, attempt]);
  function retry() { setLoading(true); setAttempt((value) => value + 1); }

  async function run(action: () => Promise<string>, fallback: string) {
    if (pending.current || !canManage) return;
    pending.current = true; setMessage(""); setError("");
    try { setMessage(await action()); await refresh(); } catch (reason) { setError(reason instanceof Error ? reason.message : fallback); } finally { pending.current = false; }
  }
  function resetProductForm(open: boolean) { setFormOpen(open); setEditing(undefined); setName(""); setCode(""); setQuantity(""); setMinimum(""); }
  function editProduct(item: InventoryItem) { setMoving(undefined); setFormOpen(true); setEditing(item); setName(item.name); setCode(item.code ?? ""); setQuantity(String(item.quantity)); setMinimum(String(item.minimumQuantity)); }
  function resetMovement() { setMoving(undefined); setMoveType("IN"); setMoveQuantity(""); setMoveReason(""); }

  async function saveProduct(event: React.FormEvent) {
    event.preventDefault();
    await run(async () => {
      if (editing) {
        await service.update(editing, { name, code, minimumQuantity: Number(minimum) });
        resetProductForm(false);
        return "Produto atualizado.";
      }
      await service.create(currentStoreId, { name, code, quantity: Number(quantity || 0), minimumQuantity: Number(minimum || 0) }, session.userName);
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
      <label>Código<Input value={code} onChange={(event) => setCode(event.target.value)} placeholder="Opcional" /></label>
      {!editing && <label>Saldo inicial<Input type="number" min="0" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder="0" /></label>}
      <label>Estoque mínimo<Input type="number" min="0" step="1" value={minimum} onChange={(event) => setMinimum(event.target.value)} placeholder="0" /></label>
      <div className="form-actions">
        <Button type="submit">{editing ? "Salvar alterações" : "Cadastrar produto"}</Button>
        <Button type="button" onClick={() => resetProductForm(false)}>Cancelar</Button>
      </div>
      {editing && <p className="help-text">O saldo não é editado aqui: use Movimentar para registrar entrada, saída ou ajuste com motivo.</p>}
    </form>}

    {canManage && moving && <form className="inventory-form" onSubmit={applyMovement}>
      <p className="help-text inventory-moving">Movimentando <strong>{moving.name}</strong> · saldo atual {moving.quantity}</p>
      <label>Tipo<select aria-label="Tipo de movimentação" value={moveType} onChange={(event) => setMoveType(event.target.value as InventoryMovementType)}><option value="IN">Entrada</option><option value="OUT">Saída</option><option value="ADJUSTMENT">Ajuste (com sinal)</option></select></label>
      <label>Quantidade<Input type="number" step="1" value={moveQuantity} onChange={(event) => setMoveQuantity(event.target.value)} required /></label>
      <label>Motivo<Input value={moveReason} onChange={(event) => setMoveReason(event.target.value)} placeholder="Ex.: compra, venda, conferência" required /></label>
      <div className="form-actions">
        <Button type="submit">Registrar movimentação</Button>
        <Button type="button" onClick={resetMovement}>Cancelar</Button>
      </div>
    </form>}

    <h2 className="section-title">Produtos</h2>
    <div className="list-card compact-list">{loading ? <p role="status" className="empty-state">Carregando estoque…</p> : items.length ? items.map((item) => {
      const state = stockState(item);
      return <article className="list-row" key={item.id}>
        <div><strong>{item.name}</strong><span>{item.code ? `Código ${item.code} · ` : ""}Mínimo {item.minimumQuantity}</span></div>
        <div>
          <span className={`badge ${stateClasses[state]}`}>{item.quantity} disponíveis · {stateLabels[state]}</span>
          {canManage && <Button type="button" onClick={() => { resetProductForm(false); setEditing(undefined); setMoving(item); setMoveType("IN"); setMoveQuantity(""); setMoveReason(""); }}>Movimentar</Button>}
          {canManage && <Button type="button" onClick={() => { resetMovement(); editProduct(item); }}>Editar</Button>}
        </div>
      </article>;
    }) : <p className="empty-state">Nenhum produto cadastrado nesta loja.</p>}</div>

    <h2 className="section-title">Histórico de movimentações</h2>
    <div className="list-card compact-list">{movements.length ? movements.map((movement) => <article className="list-row" key={movement.id}>
      <div><strong>{itemName(movement.itemId)}</strong><span>{movementLabels[movement.type]} · {movement.reason} · {new Date(movement.createdAt).toLocaleString("pt-BR")}{movement.author ? ` · ${movement.author}` : ""}</span></div>
      <div><span className="badge">{movementSign(movement)}{movement.quantity}</span></div>
    </article>) : <p className="empty-state">Nenhuma movimentação registrada nesta loja.</p>}</div>
  </div>;
}
