import { useEffect, useRef, useState } from "react";
import { Button, Input } from "../design-system/components";
import { hasPermission } from "../domain/access";
import type { Customer } from "../domain/customer";
import type { Sale } from "../domain/sales";
import type { WorkOrder, WorkOrderStatus } from "../domain/work-order";
import { workOrderStatusLabels, workOrderTransitions } from "../domain/work-order";
import { ReceptionService } from "../domain/reception-service";
import { SalesService } from "../domain/sales-service";
import { WorkOrderService } from "../domain/work-order-service";
import { LocalAttendanceRepository, LocalCustomerRepository, LocalSaleRepository, LocalWorkOrderRepository } from "../infrastructure/storage/local-repositories";
import { useAppContext } from "./providers";

const service = new WorkOrderService(new LocalWorkOrderRepository());
const salesService = new SalesService(new LocalSaleRepository());
const receptionService = new ReceptionService(new LocalCustomerRepository(), new LocalAttendanceRepository());
const transitionLabels: Record<WorkOrderStatus, string> = {
  OPEN: "",
  IN_PRODUCTION: "Iniciar produção",
  READY: "Marcar pronta",
  DELIVERED: "Entregar",
  CANCELLED: "Cancelar",
};
type Filter = "ALL" | WorkOrderStatus;
const filters: readonly Filter[] = ["ALL", "OPEN", "IN_PRODUCTION", "READY", "DELIVERED", "CANCELLED"];

export function WorkOrdersPage() {
  const { currentStoreId, session } = useAppContext();
  const canManage = hasPermission(session.role, "sales.manage");
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [editing, setEditing] = useState<WorkOrder>();
  const [dueAt, setDueAt] = useState("");
  const [notes, setNotes] = useState("");
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

  async function createOrder(sale: Sale) {
    await run(async () => { await service.createFromConfirmedSale(sale); return "Ordem criada."; }, "Não foi possível criar a ordem.");
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

  const counts = (value: Filter) => value === "ALL" ? orders.length : orders.filter((order) => order.status === value).length;
  const visible = filter === "ALL" ? orders : orders.filter((order) => order.status === filter);
  const withoutOrder = sales.filter((sale) => sale.status === "CONFIRMED" && !orders.some((order) => order.saleId === sale.id));
  const isOverdue = (order: WorkOrder) => Boolean(order.dueAt) && Date.parse(order.dueAt as string) < Date.now() && order.status !== "DELIVERED" && order.status !== "CANCELLED";

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
            <span>{sale?.description ?? "Venda"} · {order.id.slice(-6).toUpperCase()} · Criada em {new Date(order.createdAt).toLocaleDateString("pt-BR")}</span>
            {order.updatedAt && <span>Última alteração: {workOrderStatusLabels[order.status].toLowerCase()} em {new Date(order.updatedAt).toLocaleString("pt-BR")}{order.updatedBy ? ` por ${order.updatedBy}` : ""}</span>}
            <span className={isOverdue(order) ? "error-text" : "help-text"}>{order.dueAt ? `Prazo: ${new Date(order.dueAt).toLocaleDateString("pt-BR")}${isOverdue(order) ? " · atrasada" : ""}` : "Sem prazo definido"}</span>
            {order.notes && <span className="help-text work-order-notes">{order.notes}</span>}
          </div>
          <div className="work-order-actions">
            <span className="badge">{workOrderStatusLabels[order.status]}</span>
            {canManage && workOrderTransitions[order.status].map((status) => <Button type="button" key={status} onClick={() => void transition(order, status)}>{transitionLabels[status]}</Button>)}
            {canManage && <Button type="button" onClick={() => editing?.id === order.id ? closeSchedule() : openSchedule(order)}>{editing?.id === order.id ? "Fechar" : "Prazo/notas"}</Button>}
          </div>
          {canManage && editing?.id === order.id && <form className="orders-form" onSubmit={saveSchedule}>
            <label>Prazo<Input type="date" value={dueAt} onChange={(event) => setDueAt(event.target.value)} /></label>
            <label>Observações<Input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Opcional" /></label>
            <div className="form-actions"><Button type="submit">Salvar prazo</Button><Button type="button" onClick={closeSchedule}>Cancelar</Button></div>
          </form>}
        </article>;
      }) : <p className="empty-state">Nenhuma ordem nesta situação.</p>}
    </div>
  </div>;
}
