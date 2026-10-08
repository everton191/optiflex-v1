import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button, Card } from "../design-system/components";
import { hasPermission } from "../domain/access";
import type { Attendance } from "../domain/customer";
import type { CashEntry, CashSession } from "../domain/cash";
import type { InventoryItem } from "../domain/inventory";
import type { Sale } from "../domain/sales";
import type { WorkOrder } from "../domain/work-order";
import { chartHeights, openOrders, overdueOrders, pendingQuotes, receiptsTodayCents, salesByDay, salesTodayCents, stockAlerts, waitingQueue } from "../domain/dashboard";
import { InventoryService } from "../domain/inventory-service";
import { ReceptionService } from "../domain/reception-service";
import { SalesService } from "../domain/sales-service";
import { WorkOrderService } from "../domain/work-order-service";
import { LocalAttendanceRepository, LocalCashRepository, LocalCustomerRepository, LocalInventoryRepository, LocalSaleRepository, LocalWorkOrderRepository } from "../infrastructure/storage/local-repositories";
import { useAppContext } from "./providers";

const receptionService = new ReceptionService(new LocalCustomerRepository(), new LocalAttendanceRepository());
const salesService = new SalesService(new LocalSaleRepository());
const workOrderService = new WorkOrderService(new LocalWorkOrderRepository());
const inventoryService = new InventoryService(new LocalInventoryRepository());
const cashRepository = new LocalCashRepository();
const brl = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

export function DashboardPage() {
  const { settings, session, currentStoreId } = useAppContext();
  const canReadSales = hasPermission(session.role, "sales.read");
  const canReadCash = hasPermission(session.role, "cash.read");
  const canManageCash = hasPermission(session.role, "cash.manage");
  const canQueue = hasPermission(session.role, "attendance.queue.read");
  const canReadInventory = hasPermission(session.role, "inventory.read");
  const [queue, setQueue] = useState<Attendance[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [entries, setEntries] = useState<CashEntry[]>([]);
  const [cashSession, setCashSession] = useState<CashSession>();
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  async function refresh() {
    try {
      const [loadedQueue, loadedSales, loadedEntries, loadedSession, loadedOrders, loadedItems] = await Promise.all([
        canQueue ? receptionService.listQueue(currentStoreId) : Promise.resolve([]),
        canReadSales ? salesService.list(currentStoreId) : Promise.resolve([]),
        canReadCash ? cashRepository.listEntries(currentStoreId) : Promise.resolve([]),
        canReadCash ? cashRepository.current(currentStoreId) : Promise.resolve(undefined),
        canReadSales ? workOrderService.list(currentStoreId) : Promise.resolve([]),
        canReadInventory ? inventoryService.list(currentStoreId) : Promise.resolve([]),
      ]);
      setQueue(loadedQueue); setSales(loadedSales); setEntries(loadedEntries); setCashSession(loadedSession); setOrders(loadedOrders); setItems(loadedItems); setError("");
    } catch { setError("Não foi possível carregar os dados desta loja."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, [currentStoreId, attempt]);
  function retry() { setLoading(true); setAttempt((value) => value + 1); }

  const quotes = pendingQuotes(sales);
  const waiting = waitingQueue(queue);
  const alerts = stockAlerts(items);
  const open = openOrders(orders);
  const overdue = overdueOrders(orders);
  const buckets = salesByDay(sales);
  const heights = chartHeights(buckets);
  const weekCents = buckets.reduce((total, bucket) => total + bucket.cents, 0);

  const metrics = [
    { show: canReadSales, label: "Vendas hoje", value: brl(salesTodayCents(sales)), hint: plural(quotes.length, "orçamento aberto", "orçamentos abertos") },
    { show: canReadCash, label: "Recebimentos hoje", value: brl(receiptsTodayCents(entries)), hint: cashSession ? "Caixa aberto agora" : "Caixa fechado agora" },
    { show: canQueue, label: "Fila agora", value: String(waiting.length), hint: "aguardando ou em atendimento" },
    { show: canReadSales, label: "OS em andamento", value: String(open.length), hint: plural(overdue.length, "ordem atrasada", "ordens atrasadas") },
    { show: canReadInventory, label: "Estoque em alerta", value: String(alerts.length), hint: "no mínimo ou esgotados" },
  ].filter((metric) => metric.show).slice(0, 4);

  const pendencias = [
    { show: canQueue && waiting.length > 0, text: plural(waiting.length, "cliente aguardando", "clientes aguardando") + " na fila", to: "/atendimentos" },
    { show: canReadSales && quotes.length > 0, text: plural(quotes.length, "orçamento", "orçamentos") + " aguardando aprovação", to: "/caixa" },
    { show: canReadSales && overdue.length > 0, text: plural(overdue.length, "ordem", "ordens") + " com prazo vencido", to: "/ordens-servico" },
    { show: canReadInventory && alerts.length > 0, text: plural(alerts.length, "produto", "produtos") + " no mínimo ou esgotado", to: "/estoque" },
    { show: canManageCash && !cashSession, text: "Caixa ainda não aberto nesta loja", to: "/caixa" },
  ].filter((item) => item.show);

  const flow = [
    { label: "Cliente", to: "/clientes", show: hasPermission(session.role, "customers.read") },
    { label: "Atendimento", to: "/atendimentos", show: hasPermission(session.role, "attendance.read") },
    { label: "Prescrição", to: "/clinico", show: hasPermission(session.role, "clinical.workspace.access") },
    { label: "Exames", to: "/clinico", show: hasPermission(session.role, "clinical.workspace.access") },
    { label: "Finalizar", to: "/clinico", show: hasPermission(session.role, "clinical.workspace.access") },
    { label: "Caixa", to: "/caixa", show: canReadCash },
    { label: "Ordens", to: "/ordens-servico", show: canReadSales },
    { label: "Estoque", to: "/estoque", show: canReadInventory },
  ].filter((step) => step.show);

  return <div className="page dashboard">
    <section className="flow-card"><p className="eyebrow">Fluxo principal do atendimento</p><div className="flow-steps">{flow.map((step, index) => <Link className="flow-step" key={step.label} to={step.to}><span>{index + 1}</span><strong>{step.label}</strong></Link>)}</div></section>
    <section className="page-title"><div><p className="eyebrow">Visão geral</p><h1>Olá, {session.userName}</h1><p className="page-intro">Acompanhe a operação de {settings.organizationName}.</p></div>{hasPermission(session.role, "customers.manage") && <Link className="button" to="/clientes/novo">Iniciar atendimento</Link>}</section>
    {error && <p className="notice error-text" role="alert">{error} <Button type="button" onClick={retry}>Tentar novamente</Button></p>}
    {loading ? <p className="empty-state" role="status">Carregando visão geral…</p> : <>
      <div className="metric-grid">{metrics.map((metric) => <Card key={metric.label}><small>{metric.label}</small><strong>{metric.value}</strong><span className="help-text">{metric.hint}</span></Card>)}</div>
      <div className="dashboard-grid">
        <Card>
          <h2>Vendas dos últimos 7 dias</h2>
          <div className="chart-placeholder" role="img" aria-label={`Vendas confirmadas nos últimos 7 dias: ${brl(weekCents)}`}>{buckets.map((bucket, index) => <span key={bucket.key} title={`${bucket.label} ${bucket.key}: ${brl(bucket.cents)}`} style={{ height: `${heights[index]}%` }} />)}</div>
          <p className="help-text">{brl(weekCents)} confirmados no período.</p>
        </Card>
        <Card>
          <h2>Pendências</h2>
          {pendencias.length ? <ul className="pending-list">{pendencias.map((item) => <li key={item.to + item.text}><Link to={item.to}>{item.text}</Link></li>)}</ul> : <p className="empty-state">Nenhuma pendência para o seu perfil nesta loja.</p>}
        </Card>
      </div>
    </>}
  </div>;
}
