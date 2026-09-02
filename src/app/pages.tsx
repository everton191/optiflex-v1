import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAppContext } from "./providers";
import { Button, Card, Input } from "../design-system/components";
import { hasPermission, roleDefinitions } from "../domain/access";
import type { Attendance, Customer } from "../domain/customer";
import { ReceptionService } from "../domain/reception-service";
import { ClinicalService } from "../domain/clinical-service";
import { SalesService } from "../domain/sales-service";
import type { Sale } from "../domain/sales";
import { WorkOrderService } from "../domain/work-order-service";
import { InventoryService } from "../domain/inventory-service";
import { CashService } from "../domain/cash-service";
import type { WorkOrder } from "../domain/work-order";
import type { ClinicalRecord } from "../domain/clinical";
import type { InventoryItem } from "../domain/inventory";
import type { CashSession } from "../domain/cash";
import { LocalAttendanceRepository, LocalCashRepository, LocalClinicalRepository, LocalCustomerRepository, LocalInventoryRepository, LocalSaleRepository, LocalWorkOrderRepository } from "../infrastructure/storage/local-repositories";

const receptionService = new ReceptionService(new LocalCustomerRepository(), new LocalAttendanceRepository());
const clinicalService = new ClinicalService(new LocalClinicalRepository());
const salesService = new SalesService(new LocalSaleRepository());
const workOrderService = new WorkOrderService(new LocalWorkOrderRepository());
const inventoryService = new InventoryService(new LocalInventoryRepository());
const cashRepository = new LocalCashRepository();
const cashService = new CashService(cashRepository);
const scopeLabels = { SELF: "Próprio usuário", STORE: "Loja", ORGANIZATION: "Empresa", NETWORK: "Todas as lojas" } as const;
const attendanceTypeLabels = { CONSULTATION: "Consulta", RETURN: "Retorno", ADJUSTMENT: "Ajuste", ASSESSMENT: "Avaliação" } as const;
const attendanceStatusLabels = { DRAFT: "Em preparação", WAITING: "Aguardando", IN_PROGRESS: "Em atendimento", FINISHED: "Finalizado", CANCELLED: "Cancelado" } as const;
const saleStatusLabels = { QUOTE: "Orçamento", CONFIRMED: "Venda confirmada", CANCELLED: "Cancelada" } as const;
const roleDescriptions = { OWNER: "Acesso completo a todas as lojas.", NETWORK_ADMINISTRATOR: "Administra lojas, usuários e configurações.", STORE_MANAGER: "Acompanha a operação da própria loja.", RECEPTIONIST: "Atende clientes e organiza a fila.", CLINICAL_PROFESSIONAL: "Preenche prontuários, exames e prescrições.", SELLER: "Cria orçamentos e registra vendas.", CASHIER: "Registra recebimentos e movimentações do caixa.", STOCK_MANAGER: "Controla produtos e quantidades.", FINANCE: "Acompanha cobranças e resultados financeiros.", AUDITOR: "Consulta informações e relatórios sem alterar dados." } as const;

export function DashboardPage() {
  const { settings, session } = useAppContext();
  const flow = [{ label: "Cliente", to: "/clientes", show: hasPermission(session.role, "customers.read") }, { label: "Atendimento", to: "/atendimentos", show: hasPermission(session.role, "attendance.read") }, { label: "Prescrição", to: "/clinico", show: hasPermission(session.role, "clinical.workspace.access") }, { label: "Exames", to: "/clinico", show: hasPermission(session.role, "clinical.workspace.access") }, { label: "Finalizar", to: "/clinico", show: hasPermission(session.role, "clinical.workspace.access") }, { label: "Caixa", to: "/caixa", show: hasPermission(session.role, "cash.read") }, { label: "Estoque", to: "/estoque", show: hasPermission(session.role, "inventory.read") }].filter((step) => step.show);
  return <div className="page dashboard"><section className="flow-card"><p className="eyebrow">Fluxo principal do atendimento</p><div className="flow-steps">{flow.map((step, index) => <Link className="flow-step" key={step.label} to={step.to}><span>{index + 1}</span><strong>{step.label}</strong></Link>)}</div></section><section className="page-title"><div><p className="eyebrow">Visão geral</p><h1>Olá, {session.userName}</h1><p className="page-intro">Acompanhe a operação de {settings.organizationName}.</p></div>{hasPermission(session.role, "customers.manage") && <Link className="button" to="/clientes/novo">Iniciar atendimento</Link>}</section><div className="metric-grid"><Card><small>Vendas hoje</small><strong>R$ 3.250,00</strong><span className="success">+12% vs. ontem</span></Card><Card><small>Recebimentos</small><strong>R$ 2.150,00</strong><span className="success">+8% vs. ontem</span></Card><Card><small>Atendimentos</small><strong>12</strong><span className="success">+25% vs. ontem</span></Card><Card><small>Clientes</small><strong>156</strong><span className="success">+5 novos</span></Card></div><div className="dashboard-grid"><Card><h2>Vendas dos últimos 7 dias</h2><div className="chart-placeholder" aria-label="Gráfico de vendas"><span /><span /><span /><span /><span /><span /><span /></div></Card><Card><h2>Pendências</h2><ul className="pending-list"><li>3 carnês vencidos</li><li>2 orçamentos para aprovar</li><li>1 pedido no laboratório</li></ul></Card></div></div>;
}

export function SettingsPage() {
  const { settings, saveSettings } = useAppContext();
  const [draft, setDraft] = useState(settings);
  const [saved, setSaved] = useState(false);
  async function submit(event: React.FormEvent) { event.preventDefault(); await saveSettings(draft); setSaved(true); }
  return <div className="page"><p className="eyebrow">Administração</p><h1>Configurações da organização</h1><form className="settings-form" onSubmit={submit}>
    <label>Nome da organização<Input value={draft.organizationName} onChange={(event) => setDraft({ ...draft, organizationName: event.target.value })} required /></label>
    <label>Cargo exibido na área clínica<Input value={draft.clinicalProfessionalLabel} onChange={(event) => setDraft({ ...draft, clinicalProfessionalLabel: event.target.value })} required /></label>
    <p className="help-text">Use o nome adotado pela empresa, como Médico, Oftalmologista ou Profissional autorizado.</p>
    <Button type="submit">Salvar alterações</Button>{saved && <span className="success">Configuração salva.</span>}
  </form></div>;
}

export function UsersPage() {
  const { users, stores } = useAppContext();
  const storeName = (storeId: string) => stores.find((store) => store.id === storeId)?.name ?? "Sem loja";
  return <div className="page"><p className="eyebrow">Administração</p><h1>Usuários</h1><p className="page-intro">Consulte quem utiliza o sistema e em quais lojas cada pessoa pode trabalhar.</p><div className="list-card">{users.map((user) => <article className="list-row" key={user.id}><div><strong>{user.name}</strong><span>{user.email}</span></div><div><span className="badge">{roleDefinitions.find((role) => role.key === user.role)?.label}</span><small>{scopeLabels[user.scope]} · {user.storeIds.map(storeName).join(", ")}</small></div></article>)}</div></div>;
}

export function ProfilesPage() {
  return <div className="page"><p className="eyebrow">Administração</p><h1>Perfis de acesso</h1><p className="page-intro">Cada perfil libera somente as áreas necessárias para o trabalho da pessoa.</p><div className="list-card">{roleDefinitions.map((role) => <article className="list-row role-row" key={role.key}><div><strong>{role.label}</strong><span>{roleDescriptions[role.key]}</span></div><small>{scopeLabels[role.scope]}</small></article>)}</div></div>;
}

export function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]); const [query, setQuery] = useState("");
  useEffect(() => { void receptionService.listCustomers(query).then(setCustomers); }, [query]);
  return <div className="page"><p className="eyebrow">Recepção</p><div className="page-title"><div><h1>Clientes</h1><p className="page-intro">Encontre ou cadastre clientes para iniciar um atendimento.</p></div><Link className="button" to="/clientes/novo">Novo cliente</Link></div><Input aria-label="Buscar cliente" placeholder="Buscar por nome, CPF ou telefone" value={query} onChange={(event) => setQuery(event.target.value)} /><div className="list-card">{customers.length ? customers.map((customer) => <Link className="list-row list-link" key={customer.id} to={`/clientes/${customer.id}`}><div><strong>{customer.name}</strong><span>{customer.cpf || customer.phone || "Sem documento ou telefone"}</span></div></Link>) : <p className="empty-state">Nenhum cliente encontrado.</p>}</div></div>;
}

export function CustomerProfilePage() {
  const { customerId = "" } = useParams(); const [customer, setCustomer] = useState<Customer>(); const [history, setHistory] = useState<Attendance[]>([]);
  useEffect(() => { void Promise.all([receptionService.getCustomer(customerId), receptionService.listCustomerAttendances(customerId)]).then(([loadedCustomer, loadedHistory]) => { setCustomer(loadedCustomer); setHistory(loadedHistory); }); }, [customerId]);
  if (!customer) return <div className="page"><h1>Cliente não encontrado</h1></div>;
  return <div className="page"><p className="eyebrow">Cliente</p><div className="page-title"><div><h1>{customer.name}</h1><p className="page-intro">{customer.phone || "Sem telefone"} · {customer.cpf || "Sem CPF"}</p></div><Link className="button" to={`/atendimentos?customer=${customer.id}`}>Novo atendimento</Link></div><h2 className="section-title">Histórico</h2><div className="list-card">{history.length ? history.map((item) => <article className="list-row" key={item.id}><div><strong>{attendanceTypeLabels[item.type]}</strong><span>{new Date(item.createdAt).toLocaleString("pt-BR")}</span></div><span className="badge">{attendanceStatusLabels[item.status]}</span></article>) : <p className="empty-state">Nenhum atendimento registrado.</p>}</div></div>;
}

export function CustomerNewPage() {
  const navigate = useNavigate(); const [name, setName] = useState(""); const [phone, setPhone] = useState(""); const [cpf, setCpf] = useState("");
  async function submit(event: React.FormEvent) { event.preventDefault(); const customer = await receptionService.createCustomer({ name, phone: phone || undefined, cpf: cpf || undefined }); navigate(`/atendimentos?customer=${customer.id}`); }
  return <div className="page"><p className="eyebrow">Recepção</p><h1>Novo cliente</h1><form className="settings-form" onSubmit={submit}><label>Nome completo<Input value={name} onChange={(event) => setName(event.target.value)} required /></label><label>Telefone<Input value={phone} onChange={(event) => setPhone(event.target.value)} /></label><label>CPF<Input value={cpf} onChange={(event) => setCpf(event.target.value)} /></label><Button type="submit">Salvar e iniciar atendimento</Button></form></div>;
}

export function AttendancePage() {
  const { currentStoreId } = useAppContext(); const [queue, setQueue] = useState<Attendance[]>([]); const [customers, setCustomers] = useState<Customer[]>([]); const [customerId, setCustomerId] = useState("");
  async function refresh() { setQueue(await receptionService.listQueue(currentStoreId)); setCustomers(await receptionService.listCustomers()); }
  useEffect(() => { void refresh(); }, [currentStoreId]);
  async function start() { if (!customerId) return; await receptionService.startAttendance(customerId, currentStoreId, "CONSULTATION"); setCustomerId(""); await refresh(); }
  const customerName = (id: string) => customers.find((customer) => customer.id === id)?.name ?? "Cliente";
  return <div className="page"><p className="eyebrow">Recepção</p><h1>Atendimentos</h1><div className="attendance-start"><select aria-label="Selecionar cliente" value={customerId} onChange={(event) => setCustomerId(event.target.value)}><option value="">Selecionar cliente</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select><Button type="button" disabled={!customerId} onClick={() => void start()}>Adicionar à fila</Button></div><h2 className="section-title">Fila atual</h2><div className="list-card">{queue.length ? queue.filter((item) => item.status === "WAITING").map((item) => <Link className="list-row list-link" key={item.id} to={`/clinico/atendimento/${item.id}`}><div><strong>{customerName(item.customerId)}</strong><span>{attendanceTypeLabels[item.type]} · aguardando atendimento</span></div></Link>) : <p className="empty-state">Nenhum atendimento aguardando.</p>}</div></div>;
}

export function ClinicalQueuePage() {
  const { currentStoreId } = useAppContext(); const [queue, setQueue] = useState<Attendance[]>([]);
  useEffect(() => { void receptionService.listQueue(currentStoreId).then((items) => setQueue(items.filter((item) => item.status === "WAITING"))); }, [currentStoreId]);
  return <div className="page"><p className="eyebrow">Área clínica</p><div className="page-title"><div><h1>Prontuários em atendimento</h1><p className="page-intro">Selecione um atendimento para registrar anamnese, prescrição e exames.</p></div><Link className="button" to="/atendimentos">Ver fila</Link></div><div className="list-card">{queue.length ? queue.map((attendance) => <Link className="list-row list-link" key={attendance.id} to={`/clinico/atendimento/${attendance.id}`}><div><strong>Atendimento {attendance.id.slice(-6)}</strong><span>Aguardando preenchimento</span></div><span className="badge">Abrir prontuário</span></Link>) : <p className="empty-state">Não há atendimentos aguardando nesta loja.</p>}</div></div>;
}

export function InventoryPage() {
  const { currentStoreId } = useAppContext(); const [items, setItems] = useState<InventoryItem[]>([]);
  useEffect(() => { void inventoryService.list(currentStoreId).then(setItems); }, [currentStoreId]);
  return <div className="page"><p className="eyebrow">Operação</p><h1>Estoque</h1><p className="page-intro">Acompanhe os produtos e os saldos disponíveis nesta loja.</p><div className="list-card">{items.length ? items.map((item) => <article className="list-row" key={item.id}><div><strong>{item.name}</strong><span>Quantidade mínima: {item.minimumQuantity}</span></div><span className="badge">{item.quantity} disponíveis</span></article>) : <p className="empty-state">Nenhum item cadastrado nesta loja.</p>}</div></div>;
}

type CashDeskView = "sales" | "receipts" | "session";

export function CashDeskPage() {
  const { currentStoreId, session: userSession } = useAppContext();
  const canReadSales = hasPermission(userSession.role, "sales.read"); const canReadCash = hasPermission(userSession.role, "cash.read"); const canManageSales = hasPermission(userSession.role, "sales.manage"); const canManageCash = hasPermission(userSession.role, "cash.manage");
  const showSales = canManageSales; const showReceipts = canManageCash || (!canManageSales && canReadSales && canReadCash); const showSession = canManageCash || (!canManageSales && canReadCash);
  const initialView: CashDeskView = showSales ? "sales" : showReceipts ? "receipts" : "session";
  const [view, setView] = useState<CashDeskView>(initialView); const [cashSession, setCashSession] = useState<CashSession>(); const [sales, setSales] = useState<Sale[]>([]); const [orders, setOrders] = useState<WorkOrder[]>([]); const [customers, setCustomers] = useState<Customer[]>([]); const [customerId, setCustomerId] = useState(""); const [description, setDescription] = useState(""); const [total, setTotal] = useState(""); const [openingBalance, setOpeningBalance] = useState(""); const [receivedSaleIds, setReceivedSaleIds] = useState<Set<string>>(() => new Set()); const [message, setMessage] = useState(""); const [error, setError] = useState("");
  const confirmedSales = sales.filter((sale) => sale.status === "CONFIRMED");
  async function refresh() { try { const [loadedSession, loadedSales, loadedOrders, loadedCustomers] = await Promise.all([cashRepository.current(currentStoreId), salesService.list(currentStoreId), workOrderService.list(currentStoreId), receptionService.listCustomers()]); setCashSession(loadedSession); setSales(loadedSales); setOrders(loadedOrders); setCustomers(loadedCustomers); setError(""); } catch { setError("Não foi possível carregar os dados desta loja."); } }
  useEffect(() => { void refresh(); }, [currentStoreId]);
  async function openCash(event: React.FormEvent) { event.preventDefault(); try { await cashService.open(currentStoreId, Number(openingBalance || 0)); setOpeningBalance(""); setMessage("Caixa aberto com sucesso."); await refresh(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível abrir o caixa."); } }
  async function createSale(event: React.FormEvent) { event.preventDefault(); if (!customerId) return; try { await salesService.createQuote(customerId, currentStoreId, description, Number(total)); setDescription(""); setTotal(""); setMessage("Orçamento criado."); await refresh(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível criar o orçamento."); } }
  async function confirmSale(sale: Sale) { try { await salesService.confirm(sale); setMessage("Venda confirmada e pronta para receber."); await refresh(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível confirmar a venda."); } }
  async function createOrder(sale: Sale) { try { await workOrderService.createFromConfirmedSale(sale); setMessage("Ordem criada."); await refresh(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível criar a ordem."); } }
  async function receive(sale: Sale) { try { await cashService.receive(currentStoreId, sale.id, sale.total); setReceivedSaleIds((current) => new Set(current).add(sale.id)); setMessage("Recebimento registrado."); setError(""); } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível registrar o recebimento."); } }
  return <div className="page cash-desk"><div className="cash-heading"><div><p className="eyebrow">Operação da loja</p><h1>Caixa</h1><p className="page-intro">Vendas, recebimentos e abertura do caixa em um só lugar.</p></div><span className={`cash-state ${cashSession ? "is-open" : ""}`}>{cashSession ? "Caixa aberto" : "Caixa fechado"}</span></div><div className="cash-summary-grid">{showSales && <button type="button" className="summary-card" onClick={() => setView("sales")}><small>Vendas registradas</small><strong>{sales.length}</strong><span>Ver vendas</span></button>}{showReceipts && <button type="button" className="summary-card" onClick={() => setView("receipts")}><small>Aguardando recebimento</small><strong>{confirmedSales.length}</strong><span>Ver recebimentos</span></button>}{showSession && <button type="button" className="summary-card" onClick={() => setView("session")}><small>Situação do caixa</small><strong>{cashSession ? "Aberto" : "Fechado"}</strong><span>Ver detalhes</span></button>}</div><div className="cash-tabs" role="tablist" aria-label="Áreas do caixa">{showSales && <button type="button" role="tab" aria-selected={view === "sales"} className={view === "sales" ? "active" : ""} onClick={() => setView("sales")}>Vendas</button>}{showReceipts && <button type="button" role="tab" aria-selected={view === "receipts"} className={view === "receipts" ? "active" : ""} onClick={() => setView("receipts")}>Recebimentos</button>}{showSession && <button type="button" role="tab" aria-selected={view === "session"} className={view === "session" ? "active" : ""} onClick={() => setView("session")}>Abertura</button>}</div>{message && <p className="notice success">{message}</p>}{error && <p className="notice error-text">{error}</p>}{view === "sales" && <section className="cash-panel" aria-label="Vendas"><div className="section-heading"><div><h2>Orçamentos e vendas</h2><p>Crie um orçamento e confirme quando o cliente aprovar.</p></div></div>{canManageSales && <form className="commerce-form" onSubmit={createSale}><select aria-label="Cliente" value={customerId} onChange={(event) => setCustomerId(event.target.value)} required><option value="">Selecione o cliente</option>{customers.map((customer) => <option value={customer.id} key={customer.id}>{customer.name}</option>)}</select><Input placeholder="Produto ou serviço" value={description} onChange={(event) => setDescription(event.target.value)} required /><Input type="number" min="0.01" step="0.01" placeholder="Valor" value={total} onChange={(event) => setTotal(event.target.value)} required /><Button type="submit">Criar orçamento</Button></form>}<div className="list-card compact-list">{sales.length ? sales.map((sale) => <article className="list-row" key={sale.id}><div><strong>{sale.description}</strong><span>{customers.find((customer) => customer.id === sale.customerId)?.name ?? "Cliente"}</span></div><div><span className="badge">R$ {sale.total.toFixed(2)} · {saleStatusLabels[sale.status]}</span>{canManageSales && sale.status === "QUOTE" && <Button type="button" onClick={() => void confirmSale(sale)}>Confirmar</Button>}{canManageSales && sale.status === "CONFIRMED" && (orders.some((order) => order.saleId === sale.id) ? <span className="success">Ordem criada</span> : <Button type="button" onClick={() => void createOrder(sale)}>Criar ordem</Button>)}</div></article>) : <p className="empty-state">Nenhuma venda registrada.</p>}</div></section>}{view === "receipts" && <section className="cash-panel" aria-label="Recebimentos"><div className="section-heading"><div><h2>Recebimentos</h2><p>Vendas confirmadas que estão prontas para pagamento.</p></div></div><div className="list-card compact-list">{confirmedSales.length ? confirmedSales.map((sale) => <article className="list-row" key={sale.id}><div><strong>{sale.description}</strong><span>Venda confirmada</span></div><div><span className="badge">R$ {sale.total.toFixed(2)}</span>{canManageCash && <Button type="button" disabled={receivedSaleIds.has(sale.id)} onClick={() => void receive(sale)}>{receivedSaleIds.has(sale.id) ? "Recebido" : "Receber"}</Button>}</div></article>) : <p className="empty-state">Nenhum recebimento pendente.</p>}</div></section>}{view === "session" && <section className="cash-panel" aria-label="Abertura do caixa"><div className="section-heading"><div><h2>Abertura do caixa</h2><p>Confira a sessão ativa antes de registrar recebimentos.</p></div></div>{cashSession ? <Card><span className="cash-state is-open">Em operação</span><h2>Caixa aberto</h2><p>Saldo inicial: R$ {cashSession.openingBalance.toFixed(2)}</p><p className="help-text">Aberto em {new Date(cashSession.openedAt).toLocaleString("pt-BR")}.</p></Card> : canManageCash ? <form className="open-cash-form" onSubmit={openCash}><label>Saldo inicial<Input type="number" min="0" step="0.01" value={openingBalance} onChange={(event) => setOpeningBalance(event.target.value)} placeholder="R$ 0,00" /></label><Button type="submit">Abrir caixa</Button></form> : <p className="empty-state">O caixa ainda não foi aberto.</p>}</section>}</div>;
}

export function ClinicalWorkspacePage() {
  const { attendanceId = "" } = useParams(); const [record, setRecord] = useState<ClinicalRecord>(); const [saved, setSaved] = useState(false); const [error, setError] = useState("");
  useEffect(() => { void clinicalService.load(attendanceId).then(setRecord); }, [attendanceId]);
  if (!record) return <div className="app-loading">Abrindo prontuário…</div>;
  async function save(event: React.FormEvent) { event.preventDefault(); await clinicalService.save(record!); setSaved(true); }
  async function finalize() { try { await clinicalService.finalize(record!); setRecord({ ...record!, finalizedAt: new Date().toISOString() }); setError(""); } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível finalizar."); } }
  return <div className="page"><p className="eyebrow">Área clínica</p><h1>Atendimento clínico</h1><form className="settings-form clinical-form" onSubmit={save}><label>Anamnese<textarea value={record.anamnesis} onChange={(event) => setRecord({ ...record, anamnesis: event.target.value })} /></label><label>Exame<textarea value={record.examination} onChange={(event) => setRecord({ ...record, examination: event.target.value })} /></label><label>Solicitações<textarea value={record.requests} onChange={(event) => setRecord({ ...record, requests: event.target.value })} /></label><label>Prescrição<textarea value={record.prescription} onChange={(event) => setRecord({ ...record, prescription: event.target.value })} /></label><p className="help-text">Anexos: {record.attachments.length}</p><div className="form-actions"><Button type="submit">Salvar rascunho</Button><Button type="button" disabled={Boolean(record.finalizedAt)} onClick={() => void finalize()}>{record.finalizedAt ? "Atendimento finalizado" : "Finalizar atendimento"}</Button></div>{saved && <span className="success">Rascunho salvo.</span>}{error && <span className="error-text">{error}</span>}</form></div>;
}

export function ForbiddenPage() { return <div className="page"><h1>Acesso não permitido</h1><p>Seu perfil atual não possui esta permissão.</p></div>; }
