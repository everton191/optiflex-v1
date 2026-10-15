import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAppContext, useSession } from "./providers";
import { Badge, Button, Card, Dialog, EmptyState, Input, PageHeader, Search, Select, Skeleton, Table, Tabs, Toast, Tooltip } from "../design-system/components";
import { hasPermission, roleDefinitions, sessionUserState } from "../domain/access";
import type { Attendance, Customer } from "../domain/customer";
import { ReceptionService } from "../domain/reception-service";
export { ClinicalWorkspacePage } from "./ClinicalWorkspace";
export { DashboardPage } from "./DashboardWorkspace";
export { SettingsPage, UsersPage, StoresPage, ProfilesPage } from "./AdminWorkspace";
export { AttendancePage, AgendaPage, AttendanceNewPage, AttendanceDetailPage, ClinicalQueuePage } from "./ReceptionWorkspace";
export { CustomersPage, CustomerProfilePage, CustomerNewPage, CustomerEditPage } from "./CustomersWorkspace";
import { SalesService } from "../domain/sales-service";
import type { QuoteStatus, Sale, SaleItem, SaleStatus } from "../domain/sales";
import { quoteStatusLabels, quoteStatusOf } from "../domain/sales";
import { WorkOrderService } from "../domain/work-order-service";
import { InventoryService } from "../domain/inventory-service";
import type { InventoryItem } from "../domain/inventory";
import { productCategoryLabels } from "../domain/inventory";
import { CashService } from "../domain/cash-service";
import type { WorkOrder } from "../domain/work-order";
import type { CashEntry, CashMovementType, CashSession, PaymentMethod } from "../domain/cash";
import { cashTotals, paymentMethodLabels, paymentMethodOptions, receiptPlan } from "../domain/cash";
import { LocalAttendanceRepository, LocalCashRepository, LocalCustomerRepository, LocalInventoryRepository, LocalSaleRepository, LocalWorkOrderRepository } from "../infrastructure/storage/local-repositories";

const receptionService = new ReceptionService(new LocalCustomerRepository(), new LocalAttendanceRepository());
const saleRepository = new LocalSaleRepository();
const salesService = new SalesService(saleRepository);
const workOrderService = new WorkOrderService(new LocalWorkOrderRepository());
const inventoryService = new InventoryService(new LocalInventoryRepository());
const cashRepository = new LocalCashRepository();
const cashService = new CashService(cashRepository, saleRepository);
const saleStatusLabels = { QUOTE: "Orçamento", CONFIRMED: "Venda confirmada", CANCELLED: "Cancelada" } as const;
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => (char === "&" ? "&amp;" : char === "<" ? "&lt;" : char === ">" ? "&gt;" : char === '"' ? "&quot;" : "&#39;"));
const cashEntryLabels = { RECEIPT: "Recebimento", WITHDRAWAL: "Sangria", DEPOSIT: "Suprimento", REFUND: "Estorno" } as const;




export { InventoryPage } from "./InventoryWorkspace";
export { WorkOrdersPage, WorkOrderDetailPage } from "./WorkOrdersWorkspace";

type CashDeskView = "sales" | "receipts" | "session";

export function CashDeskPage() {
  const { currentStoreId } = useAppContext();
  const userSession = useSession();
  const canReadSales = hasPermission(userSession.role, "sales.read"); const canReadCash = hasPermission(userSession.role, "cash.read"); const canManageSales = hasPermission(userSession.role, "sales.manage"); const canManageCash = hasPermission(userSession.role, "cash.manage");
  const showSales = canManageSales; const showReceipts = canManageCash || (!canManageSales && canReadSales && canReadCash); const showSession = canManageCash || (!canManageSales && canReadCash);
  const initialView: CashDeskView = showSales ? "sales" : showReceipts ? "receipts" : "session";
  const [view, setView] = useState<CashDeskView>(initialView); const [cashSession, setCashSession] = useState<CashSession>(); const [sessions, setSessions] = useState<CashSession[]>([]); const [entries, setEntries] = useState<CashEntry[]>([]); const [sales, setSales] = useState<Sale[]>([]); const [orders, setOrders] = useState<WorkOrder[]>([]); const [customers, setCustomers] = useState<Customer[]>([]); const [customerId, setCustomerId] = useState(""); const [description, setDescription] = useState(""); const [total, setTotal] = useState(""); const [openingBalance, setOpeningBalance] = useState(""); const [closingBalance, setClosingBalance] = useState("");   const [closingNote, setClosingNote] = useState(""); const [message, setMessage] = useState(""); const [error, setError] = useState(""); const pending = useRef(false);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]); const [itemProductId, setItemProductId] = useState(""); const [itemQuantity, setItemQuantity] = useState("1"); const [itemPrice, setItemPrice] = useState(""); const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]); const [paymentMethodBySale, setPaymentMethodBySale] = useState<Record<string, PaymentMethod>>({}); const [receiveAmountBySale, setReceiveAmountBySale] = useState<Record<string, string>>({}); const [pixReferenceBySale, setPixReferenceBySale] = useState<Record<string, string>>({}); const [movementType, setMovementType] = useState<CashMovementType>("DEPOSIT"); const [movementAmount, setMovementAmount] = useState(""); const [movementReason, setMovementReason] = useState(""); const [cancelSaleId, setCancelSaleId] = useState(""); const [cancelSaleReason, setCancelSaleReason] = useState(""); const [editingSaleId, setEditingSaleId] = useState(""); const [quoteFilter, setQuoteFilter] = useState<"ALL" | SaleStatus>("ALL");
  const saleItemsTotal = saleItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const confirmedSales = sales.filter((sale) => sale.status === "CONFIRMED");
  const paidBySale = new Map<string, number>();
  for (const entry of entries) if (entry.saleId && entry.type === "RECEIPT") paidBySale.set(entry.saleId, (paidBySale.get(entry.saleId) ?? 0) + Math.round(entry.amount * 100));
  const isPaid = (sale: Sale) => sale.paymentStatus === "PAID" || (paidBySale.get(sale.id) ?? 0) >= Math.round(sale.total * 100);
  const pendingSales = confirmedSales.filter((sale) => !isPaid(sale));
  const pendingCents = (sale: Sale) => Math.round(sale.total * 100) - (paidBySale.get(sale.id) ?? 0);
  const receiptPreview = (sale: Sale) => { const raw = receiveAmountBySale[sale.id]; const pendingAmount = pendingCents(sale) / 100; const received = raw === undefined || raw === "" ? pendingAmount : Number(raw); if (!Number.isFinite(received) || received <= 0) return undefined; return receiptPlan(received, pendingAmount); };
  const sessionEntries = cashSession ? entries.filter((entry) => entry.sessionId === cashSession.id) : [];
  const visibleSales = sales.filter((sale) => quoteFilter === "ALL" || sale.status === quoteFilter);
  const sessionTotals = cashSession ? cashTotals(cashSession.openingBalance, sessionEntries) : undefined;
  const lastClosed = sessions.find((session) => session.closedAt);
  const customerName = (id: string) => customers.find((customer) => customer.id === id)?.name ?? "Cliente";
  const failureMessage = (fallback: string, reason: unknown) => reason instanceof Error ? reason.message : fallback;
  async function refresh() { try { const [loadedSession, loadedSessions, loadedEntries, loadedSales, loadedOrders, loadedCustomers, loadedInventory] = await Promise.all([cashRepository.current(currentStoreId), cashRepository.listSessions(currentStoreId), cashRepository.listEntries(currentStoreId), salesService.list(currentStoreId), workOrderService.list(currentStoreId), receptionService.listCustomers(), canManageSales ? inventoryService.list(currentStoreId) : Promise.resolve([])]); setCashSession(loadedSession); setSessions(loadedSessions); setEntries(loadedEntries); setSales(loadedSales); setOrders(loadedOrders); setCustomers(loadedCustomers); setInventoryItems(loadedInventory); setError(""); } catch { setError("Não foi possível carregar os dados desta loja."); } }
  useEffect(() => { void refresh(); }, [currentStoreId]);
  async function run(action: () => Promise<string>, fallback: string) {
    if (pending.current) return;
    pending.current = true; setMessage(""); setError("");
    try { setMessage(await action()); await refresh(); } catch (reason) { setError(failureMessage(fallback, reason)); } finally { pending.current = false; }
  }
  async function openCash(event: React.FormEvent) { event.preventDefault(); await run(async () => { await cashService.open(currentStoreId, Number(openingBalance || 0)); setOpeningBalance(""); return "Caixa aberto com sucesso."; }, "Não foi possível abrir o caixa."); }
  async function closeCash(event: React.FormEvent) { event.preventDefault(); await run(async () => { const closed = await cashService.close(currentStoreId, Number(closingBalance), userSession.userName, closingNote); setClosingBalance(""); setClosingNote(""); return closed.difference ? `Caixa fechado com diferença de R$ ${closed.difference.toFixed(2)}.` : "Caixa fechado sem diferença."; }, "Não foi possível fechar o caixa."); }
  async function recordCashMovement(event: React.FormEvent) { event.preventDefault(); await run(async () => { await cashService.recordMovement(currentStoreId, movementType, Number(movementAmount), movementReason, userSession.userName); setMovementAmount(""); setMovementReason(""); return movementType === "DEPOSIT" ? "Suprimento registrado." : "Sangria registrada."; }, "Não foi possível registrar a movimentação."); }
  async function createSale(event: React.FormEvent) { event.preventDefault(); if (!customerId) return; const editing = sales.find((sale) => sale.id === editingSaleId); await run(async () => { if (editing) { await salesService.updateQuote(editing, { customerId, description, total: Number(total), items: saleItems }); setDescription(""); setTotal(""); setSaleItems([]); setEditingSaleId(""); return "Rascunho de orçamento atualizado."; } await salesService.createQuote(customerId, currentStoreId, description, Number(total), saleItems); setDescription(""); setTotal(""); setSaleItems([]); return "Orçamento criado."; }, editing ? "Não foi possível salvar o rascunho." : "Não foi possível criar o orçamento."); }
  function addSaleItem(event: React.FormEvent) { event.preventDefault(); const product = inventoryItems.find((entry) => entry.id === itemProductId); if (!product) return; const quantity = Number(itemQuantity); const unitPrice = Number(itemPrice); if (!Number.isFinite(quantity) || quantity <= 0) { setError("Informe uma quantidade válida."); return; } if (!Number.isFinite(unitPrice) || unitPrice < 0) { setError("Informe um preço válido."); return; } if (quantity > product.quantity) { setError(`Saldo insuficiente de "${product.name}" (disponível: ${product.quantity}).`); return; } if (saleItems.some((entry) => entry.inventoryItemId === product.id)) { setError("Produto já adicionado ao orçamento."); return; } setSaleItems([...saleItems, { inventoryItemId: product.id, name: product.name, quantity, unitPrice }]); setItemProductId(""); setItemQuantity("1"); setItemPrice(""); setError(""); }
  function removeSaleItem(inventoryItemId: string) { setSaleItems((current) => current.filter((entry) => entry.inventoryItemId !== inventoryItemId)); }
  function startEdit(sale: Sale) { setEditingSaleId(sale.id); setCustomerId(sale.customerId); setDescription(sale.description); setTotal(String(sale.total)); setSaleItems(sale.items ? [...sale.items] : []); setError(""); setMessage(""); }
  function cancelEdit() { setEditingSaleId(""); setDescription(""); setTotal(""); setSaleItems([]); }
  async function moveQuote(sale: Sale, to: QuoteStatus, success: string) { await run(async () => { await salesService.transitionQuote(sale, to); return success; }, "Não foi possível atualizar o orçamento."); }
  function printQuote(sale: Sale) {
    const win = window.open("", "_blank", "width=760,height=860");
    if (!win) { setError("Não foi possível abrir a janela de impressão."); return; }
    const rows = (sale.items ?? []).map((item) => `<tr><td>${escapeHtml(item.name)}</td><td class="num">${item.quantity}</td><td class="num">R$ ${item.unitPrice.toFixed(2)}</td><td class="num">R$ ${(item.quantity * item.unitPrice).toFixed(2)}</td></tr>`).join("");
    const itemsTable = sale.items?.length ? `<table><thead><tr><th>Produto</th><th class="num">Qtd</th><th class="num">Preço unit.</th><th class="num">Subtotal</th></tr></thead><tbody>${rows}</tbody></table>` : "";
    win.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Orçamento — ${escapeHtml(sale.description)}</title><style>body{font-family:system-ui,sans-serif;margin:2rem;color:#111}h1{font-size:1.2rem;margin:0 0 .5rem}p{margin:.2rem 0;font-size:.95rem}.meta{color:#555}table{width:100%;border-collapse:collapse;margin-top:1rem}th,td{border:1px solid #ccc;padding:.4rem .5rem;font-size:.9rem;text-align:left}th{background:#f2f2f2}.num{text-align:right}.total{margin-top:1rem;font-size:1.05rem;font-weight:700;text-align:right}</style></head><body><h1>Orçamento</h1><p class="meta">Emitido em ${new Date().toLocaleString("pt-BR")} · Situação: ${escapeHtml(quoteStatusLabels[quoteStatusOf(sale)])}</p><p><strong>Cliente:</strong> ${escapeHtml(customerName(sale.customerId))}</p><p><strong>Descrição:</strong> ${escapeHtml(sale.description)}</p>${itemsTable}<p class="total">Total: R$ ${sale.total.toFixed(2)}</p></body></html>`);
    win.document.close();
    win.focus();
    win.print();
  }
  async function confirmSale(sale: Sale) { await run(async () => { await salesService.confirm(sale); return "Venda confirmada e pronta para receber."; }, "Não foi possível confirmar a venda."); }
  async function cancelSale(sale: Sale) { await run(async () => { const cancelled = await salesService.cancel(sale, cancelSaleReason, userSession.userName); setCancelSaleId(""); setCancelSaleReason(""); return cancelled.paymentStatus === "PAID" || cancelled.paymentStatus === "PARTIAL" ? "Venda cancelada; estorno registrado no caixa." : "Venda cancelada."; }, "Não foi possível cancelar a venda."); }
  async function createOrder(sale: Sale) { await run(async () => { await workOrderService.createFromConfirmedSale(sale); return "Ordem criada."; }, "Não foi possível criar a ordem."); }
  async function receive(sale: Sale) { const plan = receiptPreview(sale); if (!plan) { setError("Informe um valor válido para o recebimento."); return; } const method = paymentMethodBySale[sale.id] ?? "CASH"; const wasPartial = plan.appliedCents < pendingCents(sale); await run(async () => { await cashService.receive(currentStoreId, sale.id, plan.appliedCents / 100, method, method === "PIX" ? pixReferenceBySale[sale.id] : undefined); setReceiveAmountBySale((map) => { const next = { ...map }; delete next[sale.id]; return next; }); setPixReferenceBySale((map) => { const next = { ...map }; delete next[sale.id]; return next; }); if (plan.changeCents > 0) return `Recebimento registrado. Troco: R$ ${(plan.changeCents / 100).toFixed(2)}.`; return wasPartial ? "Recebimento parcial registrado." : "Recebimento registrado."; }, "Não foi possível registrar o recebimento."); }
  return <div className="page cash-desk"><div className="cash-heading"><div><p className="eyebrow">Operação da loja</p><h1>Caixa</h1><p className="page-intro">Vendas, recebimentos, abertura e fechamento do caixa em um só lugar.</p></div><span className={`cash-state ${cashSession ? "is-open" : ""}`}>{cashSession ? "Caixa aberto" : "Caixa fechado"}</span></div><div className="cash-summary-grid">{showSales && <button type="button" className="summary-card" onClick={() => setView("sales")}><small>Vendas registradas</small><strong>{sales.length}</strong><span>Ver vendas</span></button>}{showReceipts && <button type="button" className="summary-card" onClick={() => setView("receipts")}><small>Aguardando recebimento</small><strong>{pendingSales.length}</strong><span>Ver recebimentos</span></button>}{showSession && <button type="button" className="summary-card" onClick={() => setView("session")}><small>Situação do caixa</small><strong>{cashSession ? "Aberto" : "Fechado"}</strong><span>Ver detalhes</span></button>}</div><Tabs className="cash-tabs" label="Áreas do caixa" value={view} onChange={(id) => setView(id as CashDeskView)} items={[...(showSales ? [{ id: "sales", label: "Vendas" }] : []), ...(showReceipts ? [{ id: "receipts", label: "Recebimentos" }] : []), ...(showSession ? [{ id: "session", label: "Sessão" }] : [])]} />{message && <Toast onClose={() => setMessage("")}>{message}</Toast>}{error && <p className="notice error-text">{error}</p>}{view === "sales" && <section className="cash-panel" aria-label="Vendas"><div className="section-heading"><div><h2>Orçamentos e vendas</h2><p>Crie um orçamento e confirme quando o cliente aprovar.</p></div></div>{canManageSales && <form className="commerce-form" onSubmit={createSale}><select aria-label="Cliente" value={customerId} onChange={(event) => setCustomerId(event.target.value)} required><option value="">Selecione o cliente</option>{customers.map((customer) => <option value={customer.id} key={customer.id}>{customer.name}</option>)}</select><Input placeholder="Produto ou serviço" value={description} onChange={(event) => setDescription(event.target.value)} required={saleItems.length === 0} /><Input type="number" min="0.01" step="0.01" placeholder="Valor" value={saleItems.length ? saleItemsTotal.toFixed(2) : total} onChange={(event) => setTotal(event.target.value)} disabled={saleItems.length > 0} required={saleItems.length === 0} /><Button type="submit">{editingSaleId ? "Salvar rascunho" : "Criar orçamento"}</Button>{editingSaleId && <Button type="button" onClick={cancelEdit}>Cancelar edição</Button>}</form>}{canManageSales && <form className="sale-items-form" onSubmit={addSaleItem}><select aria-label="Produto do estoque" value={itemProductId} onChange={(event) => { const id = event.target.value; setItemProductId(id); const product = inventoryItems.find((entry) => entry.id === id); setItemPrice(product?.defaultPrice !== undefined ? String(product.defaultPrice) : ""); }}><option value="">Produto do estoque (opcional)</option>{inventoryItems.map((product) => <option key={product.id} value={product.id} disabled={product.quantity <= 0}>{product.name}{product.category ? ` · ${productCategoryLabels[product.category]}` : ""} · saldo {product.quantity}</option>)}</select><Input type="number" min="1" step="1" placeholder="Qtd" aria-label="Quantidade do item" value={itemQuantity} onChange={(event) => setItemQuantity(event.target.value)} /><Input type="number" min="0" step="0.01" placeholder="Preço unit." aria-label="Preço unitário do item" value={itemPrice} onChange={(event) => setItemPrice(event.target.value)} /><Button type="submit">Adicionar item</Button></form>}{saleItems.length > 0 && <ul className="sale-items-list">{saleItems.map((item) => <li key={item.inventoryItemId}><span>{item.name} × {item.quantity} · R$ {(item.quantity * item.unitPrice).toFixed(2)}</span><Button type="button" onClick={() => removeSaleItem(item.inventoryItemId)}>Remover</Button></li>)}</ul>}<div className="status-filters" role="tablist" aria-label="Filtrar vendas por status"><button type="button" role="tab" aria-selected={quoteFilter === "ALL"} className={quoteFilter === "ALL" ? "active" : ""} onClick={() => setQuoteFilter("ALL")}>Todos <span>{sales.length}</span></button><button type="button" role="tab" aria-selected={quoteFilter === "QUOTE"} className={quoteFilter === "QUOTE" ? "active" : ""} onClick={() => setQuoteFilter("QUOTE")}>Orçamentos <span>{sales.filter((sale) => sale.status === "QUOTE").length}</span></button><button type="button" role="tab" aria-selected={quoteFilter === "CONFIRMED"} className={quoteFilter === "CONFIRMED" ? "active" : ""} onClick={() => setQuoteFilter("CONFIRMED")}>Vendas <span>{sales.filter((sale) => sale.status === "CONFIRMED").length}</span></button><button type="button" role="tab" aria-selected={quoteFilter === "CANCELLED"} className={quoteFilter === "CANCELLED" ? "active" : ""} onClick={() => setQuoteFilter("CANCELLED")}>Canceladas <span>{sales.filter((sale) => sale.status === "CANCELLED").length}</span></button></div><div className="list-card compact-list">{visibleSales.length ? visibleSales.map((sale) => <article className="list-row" key={sale.id}><div><strong>{sale.description}</strong><span>{customers.find((customer) => customer.id === sale.customerId)?.name ?? "Cliente"}</span>{sale.items?.length ? <span className="help-text sale-items">{sale.items.map((item) => `${item.name} × ${item.quantity}`).join(" · ")}</span> : null}</div><div><span className="badge">R$ {sale.total.toFixed(2)} · {saleStatusLabels[sale.status]}</span>{sale.status === "QUOTE" && <span className="help-text">{quoteStatusLabels[quoteStatusOf(sale)]}</span>}{sale.status === "CONFIRMED" && isPaid(sale) && <span className="success">Recebida</span>}{sale.status === "CONFIRMED" && !isPaid(sale) && sale.paymentStatus === "PARTIAL" && <span className="help-text">Parcial</span>}{sale.cancelReason && <span className="help-text">Motivo: {sale.cancelReason}</span>}{canManageSales && sale.status === "QUOTE" && quoteStatusOf(sale) === "DRAFT" && <Button type="button" onClick={() => void moveQuote(sale, "SENT", "Orçamento marcado como enviado.")}>Enviar</Button>}{canManageSales && sale.status === "QUOTE" && quoteStatusOf(sale) === "DRAFT" && <Button type="button" onClick={() => startEdit(sale)}>Editar</Button>}{canManageSales && sale.status === "QUOTE" && quoteStatusOf(sale) === "SENT" && <Button type="button" onClick={() => void moveQuote(sale, "ACCEPTED", "Orçamento aceito.")}>Aceitar</Button>}{canManageSales && sale.status === "QUOTE" && quoteStatusOf(sale) === "SENT" && <Button type="button" onClick={() => void moveQuote(sale, "REJECTED", "Orçamento recusado.")}>Recusar</Button>}{canManageSales && sale.status === "QUOTE" && quoteStatusOf(sale) === "SENT" && <Button type="button" onClick={() => void moveQuote(sale, "EXPIRED", "Orçamento expirado.")}>Expirar</Button>}{sale.status === "QUOTE" && <Button type="button" onClick={() => printQuote(sale)}>Imprimir</Button>}{canManageSales && sale.status === "QUOTE" && quoteStatusOf(sale) !== "REJECTED" && quoteStatusOf(sale) !== "EXPIRED" && <Button type="button" onClick={() => void confirmSale(sale)}>Confirmar</Button>}{canManageSales && sale.status === "CONFIRMED" && (orders.some((order) => order.saleId === sale.id) ? <span className="success">Ordem criada</span> : <Button type="button" onClick={() => void createOrder(sale)}>Criar ordem</Button>)}{canManageSales && (sale.status === "QUOTE" || sale.status === "CONFIRMED") && <Button type="button" onClick={() => { setCancelSaleId(sale.id); setCancelSaleReason(""); }}>Cancelar</Button>}</div><Dialog open={canManageSales && cancelSaleId === sale.id} onClose={() => { setCancelSaleId(""); setCancelSaleReason(""); }} title={`Cancelar ${sale.description}`}><form className="commerce-form cancel-sale-form" onSubmit={(event) => { event.preventDefault(); void cancelSale(sale); }}><label>Motivo<Input autoFocus aria-label={`Motivo do cancelamento de ${sale.description}`} placeholder="Motivo do cancelamento" value={cancelSaleReason} onChange={(event) => setCancelSaleReason(event.target.value)} required /></label><div className="form-actions"><Button type="submit">Confirmar cancelamento</Button><Button type="button" onClick={() => { setCancelSaleId(""); setCancelSaleReason(""); }}>Voltar</Button></div></form></Dialog></article>) : <p className="empty-state">{quoteFilter === "ALL" ? "Nenhuma venda registrada." : "Nenhuma venda neste filtro."}</p>}</div></section>}{view === "receipts" && <section className="cash-panel" aria-label="Recebimentos"><div className="section-heading"><div><h2>Aguardando recebimento</h2><p>Vendas confirmadas que ainda têm saldo a receber.</p></div></div><div className="list-card compact-list">{pendingSales.length ? pendingSales.map((sale) => <article className="list-row" key={sale.id}><div><strong>{sale.description}</strong><span>{customerName(sale.customerId)}</span>{sale.paymentStatus === "PARTIAL" && <span className="help-text">Pagamento parcial registrado</span>}</div><div><span className="badge">R$ {(pendingCents(sale) / 100).toFixed(2)} pendentes</span>{canManageCash && <Input type="number" min="0.01" step="0.01" aria-label={`Valor a receber de ${sale.description}`} placeholder={(pendingCents(sale) / 100).toFixed(2)} value={receiveAmountBySale[sale.id] ?? ""} onChange={(event) => setReceiveAmountBySale((map) => ({ ...map, [sale.id]: event.target.value }))} />}{canManageCash && <select aria-label={`Forma de pagamento de ${sale.description}`} value={paymentMethodBySale[sale.id] ?? "CASH"} onChange={(event) => setPaymentMethodBySale((map) => ({ ...map, [sale.id]: event.target.value as PaymentMethod }))}>{paymentMethodOptions.map((method) => <option key={method} value={method}>{paymentMethodLabels[method]}</option>)}</select>}{canManageCash && (paymentMethodBySale[sale.id] ?? "CASH") === "PIX" && <Input aria-label={`Referência PIX de ${sale.description}`} placeholder="Referência PIX (opcional)" value={pixReferenceBySale[sale.id] ?? ""} onChange={(event) => setPixReferenceBySale((map) => ({ ...map, [sale.id]: event.target.value }))} />}{canManageCash && (paymentMethodBySale[sale.id] ?? "CASH") === "CASH" && (receiptPreview(sale)?.changeCents ?? 0) > 0 && <span className="help-text">Troco: R$ {((receiptPreview(sale)?.changeCents ?? 0) / 100).toFixed(2)}</span>}{canManageCash && <Button type="button" onClick={() => void receive(sale)}>Receber</Button>}</div></article>) : <p className="empty-state">Nenhum recebimento pendente.</p>}</div><h3 className="section-title">Movimentos registrados</h3><div className="list-card compact-list">{entries.length ? entries.map((entry) => <article className="list-row" key={entry.id}><div><strong>{entry.saleId ? sales.find((sale) => sale.id === entry.saleId)?.description ?? "Venda recebida" : cashEntryLabels[entry.type]}</strong><span>{cashEntryLabels[entry.type]}{entry.paymentMethod ? ` · ${paymentMethodLabels[entry.paymentMethod]}` : ""}{entry.reason ? ` · ${entry.reason}` : ""} · {new Date(entry.createdAt).toLocaleString("pt-BR")}{entry.author ? ` · ${entry.author}` : ""}</span></div><div><span className="badge">R$ {entry.amount.toFixed(2)}</span></div></article>) : <p className="empty-state">Nenhum movimento registrado nesta loja.</p>}</div></section>}{view === "session" && <section className="cash-panel" aria-label="Sessão do caixa"><div className="section-heading"><div><h2>Sessão do caixa</h2><p>Confira a abertura, o movimento e o fechamento desta loja.</p></div></div>{cashSession ? <Card><span className="cash-state is-open">Em operação</span><h2>Caixa aberto</h2><p>Saldo inicial: R$ {cashSession.openingBalance.toFixed(2)}</p><p className="help-text">Aberto em {new Date(cashSession.openedAt).toLocaleString("pt-BR")}.</p>{sessionTotals && <div className="cash-totals"><div><small>Recebimentos</small><strong>R$ {sessionTotals.receipts.toFixed(2)}</strong></div><div><small>Suprimentos</small><strong>R$ {sessionTotals.deposits.toFixed(2)}</strong></div><div><small>Sangrias</small><strong>R$ {sessionTotals.withdrawals.toFixed(2)}</strong></div>{sessionTotals.refunds > 0 && <div><small>Estornos</small><strong>R$ {sessionTotals.refunds.toFixed(2)}</strong></div>}<div><Tooltip text="Saldo inicial + recebimentos + suprimentos − sangrias − estornos."><small>Saldo esperado</small></Tooltip><strong>R$ {sessionTotals.expected.toFixed(2)}</strong></div></div>}{sessionTotals && Object.entries(sessionTotals.byMethod).filter(([, amount]) => amount > 0).length > 0 && <div className="cash-totals method-totals" aria-label="Recebimentos por forma de pagamento">{Object.entries(sessionTotals.byMethod).filter(([, amount]) => amount > 0).map(([method, amount]) => <div key={method}><small>{paymentMethodLabels[method as PaymentMethod]}</small><strong>R$ {amount.toFixed(2)}</strong></div>)}</div>}{canManageCash && <form className="open-cash-form cash-closing" onSubmit={closeCash}><label>Valor contado<Input type="number" min="0" step="0.01" value={closingBalance} onChange={(event) => setClosingBalance(event.target.value)} placeholder="R$ 0,00" required /></label><label>Observação<Input value={closingNote} onChange={(event) => setClosingNote(event.target.value)} placeholder="Opcional" /></label><Button type="submit">Fechar caixa</Button></form>}{canManageCash && <form className="open-cash-form cash-closing" onSubmit={recordCashMovement}><label>Tipo<select aria-label="Tipo de movimentação do caixa" value={movementType} onChange={(event) => setMovementType(event.target.value as CashMovementType)}><option value="DEPOSIT">Suprimento</option><option value="WITHDRAWAL">Sangria</option></select></label><label>Valor<Input type="number" min="0.01" step="0.01" value={movementAmount} onChange={(event) => setMovementAmount(event.target.value)} placeholder="R$ 0,00" required /></label><label>Motivo<Input value={movementReason} onChange={(event) => setMovementReason(event.target.value)} placeholder="Ex.: troco, retirada de valores" required /></label><Button type="submit">Registrar movimento</Button></form>}<p className="help-text">O fechamento encerra a sessão e bloqueia novos lançamentos no caixa desta loja.</p></Card> : canManageCash ? <form className="open-cash-form" onSubmit={openCash}><label>Saldo inicial<Input type="number" min="0" step="0.01" value={openingBalance} onChange={(event) => setOpeningBalance(event.target.value)} placeholder="R$ 0,00" /></label><Button type="submit">Abrir caixa</Button></form> : <p className="empty-state">O caixa ainda não foi aberto.</p>}{lastClosed && lastClosed.closedAt && <Card><h2>Fechamento anterior</h2><p>Fechado em {new Date(lastClosed.closedAt).toLocaleString("pt-BR")}{lastClosed.closedBy ? ` por ${lastClosed.closedBy}` : ""}.</p><p>Contado: R$ {(lastClosed.closingBalance ?? 0).toFixed(2)} · Esperado: R$ {(lastClosed.expectedBalance ?? 0).toFixed(2)}</p><p className={lastClosed.difference ? "error-text" : "success"}>{lastClosed.difference ? `Diferença de R$ ${lastClosed.difference.toFixed(2)}` : "Sem diferença de conferência"}</p>{lastClosed.closingNote && <p className="help-text">{lastClosed.closingNote}</p>}</Card>}</section>}</div>;
}

export function ForbiddenPage() { return <div className="page"><h1>Acesso não permitido</h1><p>Seu perfil atual não possui esta permissão.</p></div>; }

export function LoginPage() {
  const { session, users, login, loginDemo, logout } = useAppContext();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [error, setError] = useState(""); const pending = useRef(false);
  const expired = searchParams.get("motivo") === "expirada";
  if (session && sessionUserState(users, session) === "active") return <Navigate to="/" replace />;
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending.current) return;
    pending.current = true; setError("");
    try { await login(email, password); } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível entrar."); } finally { pending.current = false; }
  }
  async function startDemo(userId: string) {
    if (pending.current) return;
    pending.current = true; setError("");
    try { await loginDemo(userId); } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível entrar em demonstração."); } finally { pending.current = false; }
  }
  return <main className="login-page">
    <div className="login-card">
      <div className="brand"><span className="brand-mark">O</span><span className="brand-copy"><strong>Opticore</strong><small>Sistema local</small></span></div>
      <h1>Entrar</h1>
      {expired && <p className="notice" role="status">Sua sessão expirou. Entre novamente para continuar de onde parou.</p>}
      {session && <p className="notice error-text" role="alert">A sessão atual não é mais válida. Entre novamente para continuar.</p>}
      {error && <p className="notice error-text" role="alert">{error}</p>}
      <form className="settings-form" onSubmit={(event) => void submit(event)}>
        <label>E-mail<Input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
        <label>Senha<Input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
        <Button type="submit" disabled={pending.current}>Entrar</Button>
      </form>
      <section className="demo-box">
        <h2>Modo demonstração</h2>
        <p className="help-text">Entrada explícita para explorar o sistema sem senha. A tela fica marcada com o selo "Demonstração".</p>
        {users.filter((user) => user.active).map((user) => <div className="demo-row" key={user.id}>
          <span>{user.name} · {roleDefinitions.find((definition) => definition.key === user.role)?.label}</span>
          <Button type="button" onClick={() => void startDemo(user.id)} disabled={pending.current}>Entrar</Button>
        </div>)}
        {!users.some((user) => user.active) && <p className="empty-state">Nenhum usuário ativo cadastrado.</p>}
      </section>
      {session && <Button type="button" onClick={() => void logout()}>Limpar sessão guardada</Button>}
      <p className="help-text">Sem senha cadastrada? Peça ao administrador para definir em Usuários → Editar → nova senha.</p>
    </div>
  </main>;
}

export function BlockedPage() {
  const { session, users, logout } = useAppContext();
  if (!session) return <Navigate to="/login" replace />;
  if (sessionUserState(users, session) === "active") return <Navigate to="/" replace />;
  return <main className="login-page">
    <div className="login-card">
      <h1>Acesso bloqueado</h1>
      <p role="alert">O usuário <strong>{session.userName}</strong> está inativo ou a sessão não é mais válida. Peça a reativação ao administrador ou entre com outra conta.</p>
      <div className="form-actions">
        <Button type="button" onClick={() => void logout()}>Sair</Button>
        <Link className="button" to="/login">Entrar com outra conta</Link>
      </div>
    </div>
  </main>;
}

export function ChangePasswordPage() {
  const session = useSession();
  const { changePassword, users } = useAppContext();
  const [current, setCurrent] = useState(""); const [next, setNext] = useState(""); const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState(""); const [error, setError] = useState(""); const pending = useRef(false);
  const hasCredential = Boolean(users.find((user) => user.name === session.userName)?.passwordHash);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending.current) return;
    pending.current = true; setMessage(""); setError("");
    if (next !== confirm) { setError("A confirmação não corresponde à nova senha."); pending.current = false; return; }
    try {
      await changePassword(current, next);
      setCurrent(""); setNext(""); setConfirm("");
      setMessage("Senha atualizada. Use a nova senha no próximo login.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível trocar a senha."); } finally { pending.current = false; }
  }
  return <div className="page">
    <p className="eyebrow">Conta</p><h1>Trocar senha</h1>
    <p className="page-intro">A senha vale para entrar com e-mail e senha em qualquer dispositivo deste computador.</p>
    {message && <p className="notice success" role="status">{message}</p>}
    {error && <p className="notice error-text" role="alert">{error}</p>}
    <form className="settings-form" onSubmit={(event) => void submit(event)}>
      {hasCredential ? <label>Senha atual<Input type="password" autoComplete="current-password" value={current} onChange={(event) => setCurrent(event.target.value)} required /></label> : <p className="help-text">Sua conta ainda não tem senha local. Defina a primeira abaixo.</p>}
      <label>Nova senha<Input type="password" autoComplete="new-password" value={next} onChange={(event) => setNext(event.target.value)} required minLength={8} /></label>
      <label>Confirmar nova senha<Input type="password" autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} required minLength={8} /></label>
      <div className="form-actions">
        <Button type="submit" disabled={pending.current}>Salvar nova senha</Button>
        <Link className="button" to="/">Voltar</Link>
      </div>
      <p className="help-text">Mínimo de 8 caracteres. A senha é guardada apenas neste computador, com salt exclusivo.</p>
    </form>
  </div>;
}
