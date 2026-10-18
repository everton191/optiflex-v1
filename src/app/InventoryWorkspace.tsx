import { useEffect, useRef, useState } from "react";
import { errorMessage } from "../domain/errors";
import { Button, DataTable, Dialog, Drawer, ErrorState, Input, Select, Skeleton } from "../design-system/components";
import { hasPermission } from "../domain/access";
import { InventoryService } from "../domain/inventory-service";
import { AuditService } from "../domain/audit-service";
import type { InventoryItem, InventoryMovement, InventoryMovementType, ProductCategory, ProductCategoryFilter } from "../domain/inventory";
import { availableQuantity, filterByCategory, marginCents, productCategories, productCategoryLabels, stockState } from "../domain/inventory";
import type { Transfer, TransferItem } from "../domain/transfer";
import { transferStatusLabels } from "../domain/transfer";
import { TransferService } from "../domain/transfer-service";
import { LocalAuditRepository, LocalInventoryRepository, LocalServiceCatalogRepository, LocalTransferRepository } from "../infrastructure/storage/local-repositories";
import { ServiceCatalogService } from "../domain/service-catalog-service";
import type { ServiceCatalogItem } from "../domain/service-catalog";
import { useAppContext, useSession } from "./providers";

const service = new InventoryService(new LocalInventoryRepository(), new AuditService(new LocalAuditRepository()));
const transferService = new TransferService(new LocalTransferRepository(), new LocalInventoryRepository(), new AuditService(new LocalAuditRepository()));
const serviceCatalog = new ServiceCatalogService(new LocalServiceCatalogRepository());
const stateLabels = { OK: "Disponível", LOW: "Abaixo do mínimo", OUT: "Esgotado" } as const;
const stateClasses = { OK: "", LOW: "is-low", OUT: "is-out" } as const;
const movementLabels = { IN: "Entrada", OUT: "Saída", ADJUSTMENT: "Ajuste" } as const;
const movementSign = (movement: InventoryMovement) => movement.type === "OUT" ? "-" : "+";

export function InventoryPage() {
  const { currentStoreId, stores } = useAppContext();
  const session = useSession();
  const canManage = hasPermission(session.role, "inventory.manage");
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
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
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferTo, setTransferTo] = useState("");
  const [transferProductId, setTransferProductId] = useState("");
  const [transferQty, setTransferQty] = useState("1");
  const [transferNote, setTransferNote] = useState("");
  const [transferLines, setTransferLines] = useState<TransferItem[]>([]);
  const [cancelTransferId, setCancelTransferId] = useState("");
  const [cancelTransferReason, setCancelTransferReason] = useState("");
  const [services, setServices] = useState<ServiceCatalogItem[]>([]);
  const [serviceName, setServiceName] = useState("");
  const [servicePrice, setServicePrice] = useState("");
  const [serviceDescription, setServiceDescription] = useState("");
  const [editingServiceId, setEditingServiceId] = useState("");
  const pending = useRef(false);

  async function refresh() {
    try {
      const [loadedItems, loadedMovements, loadedTransfers, loadedServices] = await Promise.all([service.list(currentStoreId), service.history(currentStoreId), transferService.list(currentStoreId), canManage ? serviceCatalog.list(currentStoreId) : Promise.resolve([])]);
      setItems(loadedItems); setMovements(loadedMovements); setTransfers(loadedTransfers); setServices(loadedServices); setError("");
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

  function resetTransferForm() { setTransferOpen(false); setTransferTo(""); setTransferProductId(""); setTransferQty("1"); setTransferNote(""); setTransferLines([]); }
  function addTransferLine(event: React.FormEvent) {
    event.preventDefault();
    const product = items.find((entry) => entry.id === transferProductId);
    if (!product) { setError("Selecione o produto."); return; }
    const quantityValue = Number(transferQty);
    if (!Number.isInteger(quantityValue) || quantityValue <= 0) { setError("Informe uma quantidade inteira maior que zero."); return; }
    if (transferLines.some((line) => line.inventoryItemId === product.id)) { setError("Produto já adicionado à transferência."); return; }
    const free = availableQuantity(product) - transferLines.filter((line) => line.inventoryItemId === product.id).reduce((sum, line) => sum + line.quantity, 0);
    if (quantityValue > free) { setError(`Saldo disponível insuficiente de "${product.name}" (disponível: ${free}).`); return; }
    setTransferLines([...transferLines, { inventoryItemId: product.id, name: product.name, quantity: quantityValue }]);
    setTransferProductId(""); setTransferQty("1"); setError("");
  }
  async function requestTransfer() {
    await run(async () => {
      const created = await transferService.request(currentStoreId, transferTo, transferLines, session.userName, transferNote);
      resetTransferForm();
      return `Transferência solicitada para ${transferStoreName(transferTo)}.`;
    }, "Não foi possível solicitar a transferência.");
  }
  async function advance(transfer: Transfer, action: "separate" | "transit" | "receive") {
    await run(async () => {
      if (action === "separate") await transferService.separate(transfer.id, session.userName);
      if (action === "transit") await transferService.markInTransit(transfer.id, session.userName);
      if (action === "receive") await transferService.receive(transfer.id, session.userName);
      return action === "separate" ? "Transferência separada: saldo de origem baixado." : action === "transit" ? "Transferência saiu para trânsito." : "Transferência recebida: saldo creditado no destino.";
    }, "Não foi possível atualizar a transferência.");
  }
  async function cancelTransfer(transfer: Transfer) {
    await run(async () => {
      await transferService.cancel(transfer.id, session.userName, cancelTransferReason);
      setCancelTransferId(""); setCancelTransferReason("");
      return transfer.status === "SEPARATED" ? "Transferência cancelada e saldo devolvido à origem." : "Transferência cancelada.";
    }, "Não foi possível cancelar a transferência.");
  }
  const transferStoreName = (id: string) => stores.find((store) => store.id === id)?.name ?? id;

  function resetServiceForm() { setServiceName(""); setServicePrice(""); setServiceDescription(""); setEditingServiceId(""); }
  async function saveService(event: React.FormEvent) {
    event.preventDefault();
    await run(async () => {
      const input = { name: serviceName, defaultPrice: Number(servicePrice), description: serviceDescription };
      if (editingServiceId) {
        const target = services.find((entry) => entry.id === editingServiceId);
        if (!target) throw new Error("Serviço não encontrado.");
        await serviceCatalog.update(target, input);
        resetServiceForm();
        return "Serviço atualizado.";
      }
      const created = await serviceCatalog.create(currentStoreId, input);
      resetServiceForm();
      return `Serviço "${created.name}" cadastrado.`;
    }, "Não foi possível salvar o serviço.");
  }
  async function removeService(entry: ServiceCatalogItem) {
    await run(async () => {
      await serviceCatalog.remove(entry);
      return `Serviço "${entry.name}" removido do catálogo.`;
    }, "Não foi possível remover o serviço.");
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
    {loading ? <Skeleton lines={4} label="Carregando estoque…" /> : !error && <DataTable label="Lista de produtos" rows={visibleItems} columns={[
      { key: "name", label: "Produto", value: (item) => item.name },
      { key: "category", label: "Categoria", value: (item) => item.category ? productCategoryLabels[item.category] : "" },
      { key: "quantity", label: "Saldo", value: (item) => item.quantity, align: "right" },
      { key: "price", label: "Preço", value: (item) => item.defaultPrice ?? -1, align: "right" },
      { key: "actions", label: "Ações", value: () => "", sortable: false }
    ]} rowKey={(item) => item.id} pageSize={10} emptyMessage={items.length ? "Nenhum produto nesta categoria." : "Nenhum produto cadastrado nesta loja."} renderRow={(item) => {
      const state = stockState(item);
      const margin = item.defaultPrice !== undefined && item.cost !== undefined ? marginCents(item.defaultPrice, item.cost) : undefined;
      return <>
        <td><div className="cell-stack"><strong>{item.category ? `${productCategoryLabels[item.category]} · ` : ""}{item.name}</strong><span>{item.brand ? `Marca ${item.brand} · ` : ""}{item.material ? `${item.material} · ` : ""}{item.code ? `Código ${item.code} · ` : ""}Mínimo {item.minimumQuantity}</span>{item.description && <span className="help-text">{item.description}</span>}</div></td>
        <td>{item.category ? productCategoryLabels[item.category] : "—"}</td>
        <td style={{ textAlign: "right" }}><span className={`badge ${stateClasses[state]}`}>{item.quantity} · {stateLabels[state]}</span></td>
        <td style={{ textAlign: "right" }}>{item.defaultPrice !== undefined ? `R$ ${item.defaultPrice.toFixed(2)}` : "—"}{canManage && item.cost !== undefined ? <div className="help-text">Custo R$ {item.cost.toFixed(2)}{margin !== undefined ? ` · Margem R$ ${(margin / 100).toFixed(2)}` : ""}</div> : null}</td>
        <td><div className="table-actions">{canManage && <Button type="button" onClick={() => { resetProductForm(false); setEditing(undefined); setMoving(item); setMoveType("IN"); setMoveQuantity(""); setMoveReason(""); }}>Movimentar</Button>}{canManage && <Button type="button" onClick={() => { resetMovement(); editProduct(item); }}>Editar</Button>}</div></td>
      </>;
    }} />}

    <div className="page-title">
      <div><h2 className="section-title">Transferências entre filiais</h2><p className="page-intro">Solicite, separe, despache e receba produtos de outra loja: o saldo sai da origem na separação e entra no destino no recebimento, uma única vez.</p></div>
      {canManage && stores.filter((store) => store.active && store.id !== currentStoreId).length > 0 && <Button type="button" onClick={() => { resetTransferForm(); setTransferOpen(!transferOpen); }}>{transferOpen ? "Fechar" : "Nova transferência"}</Button>}
    </div>
    {canManage && transferOpen && <form className="inventory-form" onSubmit={addTransferLine}>
      <Select label="Loja de destino" aria-label="Loja de destino da transferência" value={transferTo} onChange={(event) => setTransferTo(event.target.value)} required><option value="">Selecione</option>{stores.filter((store) => store.active && store.id !== currentStoreId).map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}</Select>
      <Select label="Produto" aria-label="Produto da transferência" value={transferProductId} onChange={(event) => setTransferProductId(event.target.value)} required><option value="">Selecione</option>{items.filter((item) => availableQuantity(item) > 0).map((item) => <option key={item.id} value={item.id}>{item.name} · disponível {availableQuantity(item)}</option>)}</Select>
      <label>Quantidade<Input type="number" min="1" step="1" value={transferQty} onChange={(event) => setTransferQty(event.target.value)} required /></label>
      <Button type="submit">Adicionar item</Button>
      {transferLines.length > 0 && <ul className="sale-items-list">{transferLines.map((line) => <li key={line.inventoryItemId}><span>{line.name} × {line.quantity}</span><Button type="button" onClick={() => setTransferLines(transferLines.filter((entry) => entry.inventoryItemId !== line.inventoryItemId))}>Remover</Button></li>)}</ul>}
      <label>Observação<Input value={transferNote} onChange={(event) => setTransferNote(event.target.value)} placeholder="Opcional" /></label>
      <div className="form-actions">
        <Button type="button" onClick={() => void requestTransfer()} disabled={!transferTo || transferLines.length === 0}>Solicitar transferência</Button>
        <Button type="button" onClick={resetTransferForm}>Cancelar</Button>
      </div>
    </form>}
    <div className="list-card compact-list">{transfers.length ? transfers.map((transfer) => <article className="list-row" key={transfer.id}>
      <div>
        <strong>{transfer.fromStoreId === currentStoreId ? `→ ${transferStoreName(transfer.toStoreId)}` : `← ${transferStoreName(transfer.fromStoreId)}`}</strong>
        <span>{transferStatusLabels[transfer.status]} · {transfer.items.map((line) => `${line.name} × ${line.quantity}`).join(" · ")}</span>
        <span className="help-text">Solicitada em {new Date(transfer.createdAt).toLocaleString("pt-BR")} por {transfer.createdBy}{transfer.receivedAt ? ` · recebida em ${new Date(transfer.receivedAt).toLocaleString("pt-BR")} por ${transfer.receivedBy}` : ""}{transfer.cancelReason ? ` · motivo: ${transfer.cancelReason}` : ""}</span>
      </div>
      <div>
        {canManage && transfer.fromStoreId === currentStoreId && transfer.status === "REQUESTED" && <Button type="button" onClick={() => void advance(transfer, "separate")}>Separar</Button>}
        {canManage && transfer.fromStoreId === currentStoreId && transfer.status === "SEPARATED" && <Button type="button" onClick={() => void advance(transfer, "transit")}>Em trânsito</Button>}
        {canManage && transfer.toStoreId === currentStoreId && transfer.status === "IN_TRANSIT" && <Button type="button" onClick={() => void advance(transfer, "receive")}>Receber</Button>}
        {canManage && transfer.fromStoreId === currentStoreId && (transfer.status === "REQUESTED" || transfer.status === "SEPARATED") && <Button type="button" onClick={() => { setCancelTransferId(transfer.id); setCancelTransferReason(""); }}>Cancelar</Button>}
      </div>
      <Dialog open={cancelTransferId === transfer.id} onClose={() => { setCancelTransferId(""); setCancelTransferReason(""); }} title="Cancelar transferência">
        <form className="commerce-form" onSubmit={(event) => { event.preventDefault(); void cancelTransfer(transfer); }}>
          <label>Motivo<Input autoFocus aria-label="Motivo do cancelamento da transferência" value={cancelTransferReason} onChange={(event) => setCancelTransferReason(event.target.value)} required /></label>
          {transfer.status === "SEPARATED" && <p className="help-text">O saldo já separado será devolvido à loja de origem.</p>}
          <div className="form-actions"><Button type="submit" className="button-danger">Confirmar cancelamento</Button><Button type="button" onClick={() => { setCancelTransferId(""); setCancelTransferReason(""); }}>Voltar</Button></div>
        </form>
      </Dialog>
    </article>) : <p className="empty-state">Nenhuma transferência nesta loja.</p>}</div>

    <div className="page-title">
      <div><h2 className="section-title">Serviços</h2><p className="page-intro">Catálogo de serviços (montagem, ajuste, exame particular) com preço padrão, selecionável no Caixa como tratamento — sem movimento de estoque.</p></div>
      {canManage && <Button type="button" onClick={() => { resetServiceForm(); }}>{editingServiceId ? "Cancelar edição" : "Novo serviço"}</Button>}
    </div>
    {canManage && <form className="inventory-form" onSubmit={saveService}>
      <label>Nome<Input value={serviceName} onChange={(event) => setServiceName(event.target.value)} placeholder="Ex.: Montagem padrão" required /></label>
      <label>Preço padrão (R$)<Input type="number" min="0" step="0.01" value={servicePrice} onChange={(event) => setServicePrice(event.target.value)} required /></label>
      <label>Descrição<Input value={serviceDescription} onChange={(event) => setServiceDescription(event.target.value)} placeholder="Opcional" /></label>
      <div className="form-actions"><Button type="submit">{editingServiceId ? "Salvar serviço" : "Cadastrar serviço"}</Button></div>
    </form>}
    <div className="list-card compact-list">{services.length ? services.map((entry) => <article className="list-row" key={entry.id}>
      <div>
        <strong>{entry.name}</strong>
        <span>R$ {entry.defaultPrice.toFixed(2)}{entry.description ? ` · ${entry.description}` : ""}</span>
      </div>
      <div>
        {canManage && <Button type="button" onClick={() => { setEditingServiceId(entry.id); setServiceName(entry.name); setServicePrice(String(entry.defaultPrice)); setServiceDescription(entry.description ?? ""); }}>Editar</Button>}
        {canManage && <Button type="button" onClick={() => void removeService(entry)}>Remover</Button>}
      </div>
    </article>) : <p className="empty-state">Nenhum serviço cadastrado nesta loja.</p>}</div>

    <h2 className="section-title">Histórico de movimentações</h2>
    <div className="list-card compact-list">{movements.length ? movements.map((movement) => <article className="list-row" key={movement.id}>
      <div><strong>{itemName(movement.itemId)}</strong><span>{movementLabels[movement.type]} · {movement.reason} · {new Date(movement.createdAt).toLocaleString("pt-BR")}{movement.author ? ` · ${movement.author}` : ""}</span></div>
      <div><span className="badge">{movementSign(movement)}{movement.quantity}</span></div>
    </article>) : <p className="empty-state">Nenhuma movimentação registrada nesta loja.</p>}</div>
  </div>;
}
