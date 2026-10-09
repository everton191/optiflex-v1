import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button, Input } from "../design-system/components";
import { hasPermission } from "../domain/access";
import type { Customer } from "../domain/customer";
import type { InventoryItem } from "../domain/inventory";
import type { Sale } from "../domain/sales";
import type { WorkOrder, WorkOrderStatus } from "../domain/work-order";
import { canTransition, workOrderEventLabels, workOrderStatusLabels, workOrderTransitions } from "../domain/work-order";
import { ReceptionService } from "../domain/reception-service";
import { SalesService } from "../domain/sales-service";
import { InventoryService } from "../domain/inventory-service";
import { WorkOrderService } from "../domain/work-order-service";
import { LocalAttendanceRepository, LocalCustomerRepository, LocalInventoryRepository, LocalSaleRepository, LocalWorkOrderRepository } from "../infrastructure/storage/local-repositories";
import { useAppContext, useSession } from "./providers";

const service = new WorkOrderService(new LocalWorkOrderRepository());
const salesService = new SalesService(new LocalSaleRepository());
const receptionService = new ReceptionService(new LocalCustomerRepository(), new LocalAttendanceRepository());
const inventoryService = new InventoryService(new LocalInventoryRepository());
const transitionLabels: Record<WorkOrderStatus, string> = {
  OPEN: "",
  IN_PRODUCTION: "Iniciar produção",
  READY: "Marcar pronta",
  DELIVERED: "Entregar",
  CANCELLED: "Cancelar",
};
type Filter = "ALL" | WorkOrderStatus;
const filters: readonly Filter[] = ["ALL", "OPEN", "IN_PRODUCTION", "READY", "DELIVERED", "CANCELLED"];
const isOverdue = (order: WorkOrder) => Boolean(order.dueAt) && Date.parse(order.dueAt as string) < Date.now() && order.status !== "DELIVERED" && order.status !== "CANCELLED";
const orderCode = (order: WorkOrder) => order.id.slice(-6).toUpperCase();

export function WorkOrdersPage() {
  const { currentStoreId } = useAppContext();
  const session = useSession();
  const canManage = hasPermission(session.role, "sales.manage");
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [editing, setEditing] = useState<WorkOrder>();
  const [dueAt, setDueAt] = useState("");
  const [notes, setNotes] = useState("");
  const [cancelling, setCancelling] = useState<WorkOrder>();
  const [cancelReason, setCancelReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const pending = useRef(false);

  async function refresh() {
    try {
      const [loadedOrders, loadedSales, loadedCustomers] = await Promise.all([service.list(currentStoreId), salesService.list(currentStoreId), receptionService.listCustomers()]);
      setOrders(loadedOrders); setSales(loadedSales); setCustomers(loadedCustomers); setError("");
    } catch { setError("Não foi possível carregar as ordens desta loja."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, [currentStoreId, attempt]);
  function retry() { setLoading(true); setAttempt((value) => value + 1); }

  async function run(action: () => Promise<string>, fallback: string) {
    if (pending.current || !canManage) return;
    pending.current = true; setMessage(""); setError("");
    try { setMessage(await action()); await refresh(); } catch (reason) { setError(reason instanceof Error ? reason.message : fallback); } finally { pending.current = false; }
  }
  const customerName = (id: string) => customers.find((customer) => customer.id === id)?.name ?? "Cliente";
  const saleOf = (saleId: string) => sales.find((sale) => sale.id === saleId);
  function openSchedule(order: WorkOrder) { setEditing(order); setDueAt(order.dueAt ? order.dueAt.slice(0, 10) : ""); setNotes(order.notes ?? ""); }
  function closeSchedule() { setEditing(undefined); setDueAt(""); setNotes(""); }
  function openCancel(order: WorkOrder) { setCancelling(order); setCancelReason(""); }
  function closeCancel() { setCancelling(undefined); setCancelReason(""); }

  async function createOrder(sale: Sale) {
    await run(async () => { await service.createFromConfirmedSale(sale, session.userName); return "Ordem criada."; }, "Não foi possível criar a ordem.");
  }
  async function transition(order: WorkOrder, status: WorkOrderStatus) {
    await run(async () => { await service.transition(order, status, session.userName); return `Ordem marcada como ${workOrderStatusLabels[status].toLowerCase()}.`; }, "Não foi possível atualizar a ordem.");
  }
  async function saveSchedule(event: React.FormEvent) {
    event.preventDefault();
    if (!editing) return;
    const order = editing;
    await run(async () => {
      await service.schedule(order, { dueAt: dueAt ? new Date(`${dueAt}T12:00:00`).toISOString() : "", notes }, session.userName);
      closeSchedule();
      return "Prazo e observações atualizados.";
    }, "Não foi possível salvar o prazo.");
  }
  async function saveCancel(event: React.FormEvent) {
    event.preventDefault();
    if (!cancelling) return;
    const order = cancelling;
    await run(async () => {
      await service.cancel(order, cancelReason, session.userName);
      closeCancel();
      return "Ordem cancelada com motivo registrado no histórico.";
    }, "Não foi possível cancelar a ordem.");
  }

  const counts = (value: Filter) => value === "ALL" ? orders.length : orders.filter((order) => order.status === value).length;
  const visible = filter === "ALL" ? orders : orders.filter((order) => order.status === filter);
  const withoutOrder = sales.filter((sale) => sale.status === "CONFIRMED" && !orders.some((order) => order.saleId === sale.id));

  return <div className="page work-orders-page">
    <div className="page-title">
      <div><p className="eyebrow">Operação</p><h1>Ordens de serviço</h1><p className="page-intro">Acompanhe a produção, o prazo e a entrega das ordens desta loja.</p></div>
    </div>
    {message && <p className="notice success" role="status">{message}</p>}
    {error && <p className="notice error-text" role="alert">{error} <Button type="button" onClick={retry}>Tentar novamente</Button></p>}

    <div className="status-filters" role="tablist" aria-label="Filtrar ordens por status">
      {filters.map((value) => <button type="button" role="tab" key={value} aria-selected={filter === value} className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>{value === "ALL" ? "Todas" : workOrderStatusLabels[value]} <span>{counts(value)}</span></button>)}
    </div>

    {canManage && withoutOrder.length > 0 && <section aria-label="Vendas sem ordem">
      <h2 className="section-title">Vendas confirmadas sem ordem</h2>
      <div className="list-card compact-list">{withoutOrder.map((sale) => <article className="list-row" key={sale.id}>
        <div><strong>{sale.description}</strong><span>{customerName(sale.customerId)} · R$ {sale.total.toFixed(2)}</span></div>
        <div><Button type="button" onClick={() => void createOrder(sale)}>Criar ordem</Button></div>
      </article>)}</div>
    </section>}

    <h2 className="section-title">{filter === "ALL" ? "Todas as ordens" : workOrderStatusLabels[filter as WorkOrderStatus]}</h2>
    <div className="list-card compact-list">
      {loading ? <p className="empty-state" role="status">Carregando ordens…</p> : visible.length ? visible.map((order) => {
        const sale = saleOf(order.saleId);
        return <article className="list-row work-order-row" key={order.id}>
          <div>
            <strong>{customerName(order.customerId)}</strong>
            <span>{sale?.description ?? "Venda"} · {orderCode(order)} · Criada em {new Date(order.createdAt).toLocaleDateString("pt-BR")}</span>
            {order.updatedAt && <span>Última alteração: {workOrderStatusLabels[order.status].toLowerCase()} em {new Date(order.updatedAt).toLocaleString("pt-BR")}{order.updatedBy ? ` por ${order.updatedBy}` : ""}</span>}
            <span className={isOverdue(order) ? "error-text" : "help-text"}>{order.dueAt ? `Prazo: ${new Date(order.dueAt).toLocaleDateString("pt-BR")}${isOverdue(order) ? " · atrasada" : ""}` : "Sem prazo definido"}</span>
            {order.notes && <span className="help-text work-order-notes">{order.notes}</span>}
            {order.cancelReason && <span className="error-text">Cancelada: {order.cancelReason}</span>}
          </div>
          <div className="work-order-actions">
            <span className="badge">{workOrderStatusLabels[order.status]}</span>
            {canManage && workOrderTransitions[order.status].filter((status) => status !== "CANCELLED").map((status) => <Button type="button" key={status} onClick={() => void transition(order, status)}>{transitionLabels[status]}</Button>)}
            {canManage && canTransition(order.status, "CANCELLED") && <Button type="button" onClick={() => cancelling?.id === order.id ? closeCancel() : openCancel(order)}>{cancelling?.id === order.id ? "Fechar" : "Cancelar"}</Button>}
            {canManage && <Button type="button" onClick={() => editing?.id === order.id ? closeSchedule() : openSchedule(order)}>{editing?.id === order.id ? "Fechar" : "Prazo/notas"}</Button>}
            <Link className="button" to={`/ordens-servico/${order.id}`}>Detalhes</Link>
          </div>
          {canManage && editing?.id === order.id && <form className="orders-form" onSubmit={saveSchedule}>
            <label>Prazo<Input type="date" value={dueAt} onChange={(event) => setDueAt(event.target.value)} /></label>
            <label>Observações<Input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Opcional" /></label>
            <div className="form-actions"><Button type="submit">Salvar prazo</Button><Button type="button" onClick={closeSchedule}>Cancelar</Button></div>
          </form>}
          {canManage && cancelling?.id === order.id && <form className="orders-form" onSubmit={saveCancel}>
            <label>Motivo do cancelamento<Input value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} placeholder="Obrigatório" /></label>
            <div className="form-actions"><Button type="submit" disabled={!cancelReason.trim()}>Confirmar cancelamento</Button><Button type="button" onClick={closeCancel}>Voltar</Button></div>
          </form>}
        </article>;
      }) : <p className="empty-state">Nenhuma ordem nesta situação.</p>}
    </div>
  </div>;
}

export function WorkOrderDetailPage() {
  const { orderId = "" } = useParams();
  const { currentStoreId } = useAppContext();
  const session = useSession();
  const canManage = hasPermission(session.role, "sales.manage");
  const [order, setOrder] = useState<WorkOrder>();
  const [sale, setSale] = useState<Sale>();
  const [customer, setCustomer] = useState<Customer>();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const pending = useRef(false);
  const [editing, setEditing] = useState(false);
  const [dueAt, setDueAt] = useState("");
  const [notes, setNotes] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [inputItem, setInputItem] = useState("");
  const [inputQuantity, setInputQuantity] = useState("1");

  async function refresh() {
    try {
      const [orders, sales, inventoryItems] = await Promise.all([service.list(currentStoreId), salesService.list(currentStoreId), inventoryService.list(currentStoreId)]);
      const found = orders.find((item) => item.id === orderId);
      if (!found) { setOrder(undefined); setError("Ordem não encontrada nesta loja."); return; }
      const foundSale = sales.find((item) => item.id === found.saleId);
      setOrder(found); setSale(foundSale); setItems(inventoryItems); setError("");
      setCustomer(await receptionService.getCustomer(found.customerId));
      setDueAt(found.dueAt ? found.dueAt.slice(0, 10) : "");
      setNotes(found.notes ?? "");
    } catch { setError("Não foi possível carregar a ordem."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, [currentStoreId, orderId, attempt]);
  function retry() { setLoading(true); setAttempt((value) => value + 1); }

  async function run(action: () => Promise<string>, fallback: string) {
    if (pending.current || !canManage || !order) return;
    pending.current = true; setMessage(""); setError("");
    try { setMessage(await action()); await refresh(); } catch (reason) { setError(reason instanceof Error ? reason.message : fallback); } finally { pending.current = false; }
  }
  async function transition(status: WorkOrderStatus) {
    await run(async () => { await service.transition(order!, status, session.userName); return `Ordem marcada como ${workOrderStatusLabels[status].toLowerCase()}.`; }, "Não foi possível atualizar a ordem.");
  }
  async function saveSchedule(event: React.FormEvent) {
    event.preventDefault();
    await run(async () => {
      await service.schedule(order!, { dueAt: dueAt ? new Date(`${dueAt}T12:00:00`).toISOString() : "", notes }, session.userName);
      setEditing(false);
      return "Prazo e observações atualizados.";
    }, "Não foi possível salvar o prazo.");
  }
  async function saveCancel(event: React.FormEvent) {
    event.preventDefault();
    await run(async () => {
      await service.cancel(order!, cancelReason, session.userName);
      setCancelling(false); setCancelReason("");
      return "Ordem cancelada com motivo registrado no histórico.";
    }, "Não foi possível cancelar a ordem.");
  }
  async function recordInput(event: React.FormEvent) {
    event.preventDefault();
    const item = items.find((entry) => entry.id === inputItem);
    if (!item) return;
    await run(async () => {
      await service.recordInputs(order!, [{ itemId: item.id, name: item.name, quantity: Number(inputQuantity) }], session.userName);
      setInputQuantity("1");
      return "Insumo registrado e estoque atualizado.";
    }, "Não foi possível registrar o insumo.");
  }

  if (loading && !order) return <div className="page"><p className="eyebrow">Operação</p><h1>Abrindo ordem</h1><p role="status">Carregando os dados…</p></div>;
  if (!order) return <div className="page"><p className="eyebrow">Operação</p><h1>Ordem não encontrada</h1>{error && <p role="alert" className="notice error-text">{error}</p>}<Link className="button" to="/ordens-servico">Voltar às ordens</Link></div>;
  const events = [...(order.events ?? [])].reverse();
  const acceptsInputs = order.status === "OPEN" || order.status === "IN_PRODUCTION" || order.status === "READY";
  return <div className="page work-orders-page">
    <div className="page-title">
      <div><p className="eyebrow">Operação</p><h1>Ordem {orderCode(order)}</h1><p className="page-intro">{customer?.name ?? "Cliente"} · {sale?.description ?? "Venda"}</p></div>
      <Link className="button" to="/ordens-servico">Voltar à lista</Link>
    </div>
    {message && <p className="notice success" role="status">{message}</p>}
    {error && <p className="notice error-text" role="alert">{error} <Button type="button" onClick={retry}>Tentar novamente</Button></p>}

    <section className="card">
      <h2>Situação</h2>
      <p><span className="badge">{workOrderStatusLabels[order.status]}</span></p>
      {order.updatedAt && <p className="help-text">Última alteração: {workOrderStatusLabels[order.status].toLowerCase()} em {new Date(order.updatedAt).toLocaleString("pt-BR")}{order.updatedBy ? ` por ${order.updatedBy}` : ""}</p>}
      <p className={isOverdue(order) ? "error-text" : "help-text"}>{order.dueAt ? `Prazo: ${new Date(order.dueAt).toLocaleDateString("pt-BR")}${isOverdue(order) ? " · atrasada" : ""}` : "Sem prazo definido"}</p>
      {order.notes && <p className="help-text">{order.notes}</p>}
      {order.cancelReason && <p className="error-text">Motivo do cancelamento: {order.cancelReason}</p>}
      <p className="help-text">Criada em {new Date(order.createdAt).toLocaleString("pt-BR")}{sale ? ` · Venda R$ ${sale.total.toFixed(2)}` : ""}</p>
      {customer && <Link to={`/clientes/${customer.id}`}>Ver histórico do cliente</Link>}
    </section>

    {canManage && <section className="card">
      <h2>Ações</h2>
      <div className="form-actions">
        {workOrderTransitions[order.status].filter((status) => status !== "CANCELLED").map((status) => <Button type="button" key={status} onClick={() => void transition(status)}>{transitionLabels[status]}</Button>)}
        {canTransition(order.status, "CANCELLED") && !cancelling && <Button type="button" onClick={() => { setCancelling(true); setCancelReason(""); }}>Cancelar ordem</Button>}
        {acceptsInputs && <Button type="button" onClick={() => setEditing(!editing)}>{editing ? "Fechar prazo" : "Prazo/notas"}</Button>}
      </div>
      {cancelling && <form className="orders-form" onSubmit={saveCancel}>
        <label>Motivo do cancelamento<Input value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} placeholder="Obrigatório" /></label>
        <div className="form-actions"><Button type="submit" disabled={!cancelReason.trim()}>Confirmar cancelamento</Button><Button type="button" onClick={() => setCancelling(false)}>Voltar</Button></div>
      </form>}
      {editing && <form className="orders-form" onSubmit={saveSchedule}>
        <label>Prazo<Input type="date" value={dueAt} onChange={(event) => setDueAt(event.target.value)} /></label>
        <label>Observações<Input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Opcional" /></label>
        <div className="form-actions"><Button type="submit">Salvar prazo</Button><Button type="button" onClick={() => setEditing(false)}>Cancelar</Button></div>
      </form>}
    </section>}

    {canManage && acceptsInputs && <section className="card">
      <h2>Insumos</h2>
      <form className="orders-form" onSubmit={recordInput}>
        <label>Produto<select value={inputItem} onChange={(event) => setInputItem(event.target.value)}><option value="">Selecione um item do estoque</option>{items.map((item) => <option key={item.id} value={item.id}>{item.name} · saldo {item.quantity}</option>)}</select></label>
        <label>Quantidade<Input type="number" min="1" step="1" value={inputQuantity} onChange={(event) => setInputQuantity(event.target.value)} /></label>
        <div className="form-actions"><Button type="submit" disabled={!inputItem || !inputQuantity.trim()}>Registrar insumo</Button></div>
        <p className="help-text">Cada registro baixa o estoque e entra no histórico da ordem.</p>
      </form>
    </section>}

    <h2 className="section-title">Histórico da ordem</h2>
    <div className="list-card compact-list">
      {events.length ? events.map((event) => <article className="list-row" key={event.id}>
        <div>
          <strong>{workOrderEventLabels[event.type]}</strong>
          {event.from && event.to && <span>{workOrderStatusLabels[event.from]} → {workOrderStatusLabels[event.to]}</span>}
          {event.note && <span>{event.note}</span>}
        </div>
        <div><span className="help-text">{new Date(event.at).toLocaleString("pt-BR")} · {event.author || "Sistema"}</span></div>
      </article>) : <p className="empty-state">Sem eventos registrados.</p>}
    </div>
  </div>;
}
