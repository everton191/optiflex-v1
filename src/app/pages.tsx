import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAppContext } from "./providers";
import { Button, Card, Input } from "../design-system/components";
import { roleDefinitions } from "../domain/access";
import type { Attendance, Customer } from "../domain/customer";
import { ReceptionService } from "../domain/reception-service";
import { ClinicalService } from "../domain/clinical-service";
import { SalesService } from "../domain/sales-service";
import type { Sale } from "../domain/sales";
import { WorkOrderService } from "../domain/work-order-service";
import type { WorkOrder } from "../domain/work-order";
import type { ClinicalRecord } from "../domain/clinical";
import { LocalAttendanceRepository, LocalClinicalRepository, LocalCustomerRepository, LocalSaleRepository, LocalWorkOrderRepository } from "../infrastructure/storage/local-repositories";

const receptionService = new ReceptionService(new LocalCustomerRepository(), new LocalAttendanceRepository());
const clinicalService = new ClinicalService(new LocalClinicalRepository());
const salesService = new SalesService(new LocalSaleRepository());
const workOrderService = new WorkOrderService(new LocalWorkOrderRepository());

export function DashboardPage() {
  const { settings, session } = useAppContext();
  const flow = ["Cliente", "Atendimento", "Prescrição", "Exames", "Finalizar", "Venda", "Pagamento"];
  return <div className="page dashboard"><section className="flow-card"><p className="eyebrow">Fluxo principal do atendimento</p><div className="flow-steps">{flow.map((label, index) => <div className="flow-step" key={label}><span>{index + 1}</span><strong>{label}</strong></div>)}</div></section><section className="page-title"><div><p className="eyebrow">Visão geral</p><h1>Olá, {session.userName}</h1><p className="page-intro">Acompanhe a operação de {settings.organizationName}.</p></div></section><div className="metric-grid"><Card><small>Vendas hoje</small><strong>R$ 3.250,00</strong><span className="success">+12% vs. ontem</span></Card><Card><small>Recebimentos</small><strong>R$ 2.150,00</strong><span className="success">+8% vs. ontem</span></Card><Card><small>Atendimentos</small><strong>12</strong><span className="success">+25% vs. ontem</span></Card><Card><small>Clientes</small><strong>156</strong><span className="success">+5 novos</span></Card></div><div className="dashboard-grid"><Card><h2>Vendas dos últimos 7 dias</h2><div className="chart-placeholder" aria-label="Gráfico de vendas"><span /><span /><span /><span /><span /><span /><span /></div></Card><Card><h2>Pendências</h2><ul className="pending-list"><li>3 carnês vencidos</li><li>2 orçamentos para aprovar</li><li>1 pedido no laboratório</li></ul></Card></div></div>;
}

export function SettingsPage() {
  const { settings, saveSettings } = useAppContext();
  const [draft, setDraft] = useState(settings);
  const [saved, setSaved] = useState(false);
  async function submit(event: React.FormEvent) { event.preventDefault(); await saveSettings(draft); setSaved(true); }
  return <div className="page"><p className="eyebrow">Administração</p><h1>Configurações da organização</h1><form className="settings-form" onSubmit={submit}>
    <label>Nome da organização<Input value={draft.organizationName} onChange={(event) => setDraft({ ...draft, organizationName: event.target.value })} required /></label>
    <label>Cargo clínico exibido<Input value={draft.clinicalProfessionalLabel} onChange={(event) => setDraft({ ...draft, clinicalProfessionalLabel: event.target.value })} required /></label>
    <p className="help-text">Este rótulo não altera permissões. O perfil interno permanece <code>CLINICAL_PROFESSIONAL</code>.</p>
    <Button type="submit">Salvar localmente</Button>{saved && <span className="success">Configuração salva neste dispositivo.</span>}
  </form></div>;
}

export function UsersPage() {
  const { users, stores } = useAppContext();
  const storeName = (storeId: string) => stores.find((store) => store.id === storeId)?.name ?? "Sem loja";
  return <div className="page"><p className="eyebrow">Administração</p><h1>Usuários</h1><p className="page-intro">Acesso é definido por perfil e escopo; cargos exibidos não concedem permissões.</p><div className="list-card">{users.map((user) => <article className="list-row" key={user.id}><div><strong>{user.name}</strong><span>{user.email}</span></div><div><span className="badge">{roleDefinitions.find((role) => role.key === user.role)?.label}</span><small>{user.scope} · {user.storeIds.map(storeName).join(", ")}</small></div></article>)}</div></div>;
}

export function ProfilesPage() {
  return <div className="page"><p className="eyebrow">Administração</p><h1>Perfis e permissões</h1><p className="page-intro">Perfis são técnicos; as verificações de acesso nunca dependem do nome de uma profissão.</p><div className="list-card">{roleDefinitions.map((role) => <article className="list-row role-row" key={role.key}><div><strong>{role.label}</strong><span><code>{role.key}</code> · escopo {role.scope}</span></div><small>{role.permissions.join(" · ")}</small></article>)}</div></div>;
}

export function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]); const [query, setQuery] = useState("");
  useEffect(() => { void receptionService.listCustomers(query).then(setCustomers); }, [query]);
  return <div className="page"><p className="eyebrow">Recepção</p><div className="page-title"><div><h1>Clientes</h1><p className="page-intro">Cadastros disponíveis na rede conforme permissão.</p></div><Link className="button" to="/clientes/novo">Novo cliente</Link></div><Input aria-label="Buscar cliente" placeholder="Buscar por nome, CPF ou telefone" value={query} onChange={(event) => setQuery(event.target.value)} /><div className="list-card">{customers.length ? customers.map((customer) => <Link className="list-row list-link" key={customer.id} to={`/clientes/${customer.id}`}><div><strong>{customer.name}</strong><span>{customer.cpf || customer.phone || "Sem documento ou telefone"}</span></div></Link>) : <p className="empty-state">Nenhum cliente encontrado.</p>}</div></div>;
}

export function CustomerProfilePage() {
  const { customerId = "" } = useParams(); const [customer, setCustomer] = useState<Customer>(); const [history, setHistory] = useState<Attendance[]>([]);
  useEffect(() => { void Promise.all([receptionService.getCustomer(customerId), receptionService.listCustomerAttendances(customerId)]).then(([loadedCustomer, loadedHistory]) => { setCustomer(loadedCustomer); setHistory(loadedHistory); }); }, [customerId]);
  if (!customer) return <div className="page"><h1>Cliente não encontrado</h1></div>;
  return <div className="page"><p className="eyebrow">Cliente</p><div className="page-title"><div><h1>{customer.name}</h1><p className="page-intro">{customer.phone || "Sem telefone"} · {customer.cpf || "Sem CPF"}</p></div><Link className="button" to={`/atendimentos?customer=${customer.id}`}>Novo atendimento</Link></div><h2 className="section-title">Histórico</h2><div className="list-card">{history.length ? history.map((item) => <article className="list-row" key={item.id}><div><strong>{item.type}</strong><span>{new Date(item.createdAt).toLocaleString("pt-BR")}</span></div><span className="badge">{item.status}</span></article>) : <p className="empty-state">Nenhum atendimento registrado.</p>}</div></div>;
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
  return <div className="page"><p className="eyebrow">Recepção</p><h1>Atendimentos</h1><div className="attendance-start"><select aria-label="Selecionar cliente" value={customerId} onChange={(event) => setCustomerId(event.target.value)}><option value="">Selecionar cliente</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select><Button type="button" disabled={!customerId} onClick={() => void start()}>Enviar para fila</Button></div><h2 className="section-title">Fila atual</h2><div className="list-card">{queue.length ? queue.filter((item) => item.status === "WAITING").map((item) => <Link className="list-row list-link" key={item.id} to={`/clinico/atendimento/${item.id}`}><div><strong>{customerName(item.customerId)}</strong><span>{item.type} · aguardando atendimento</span></div></Link>) : <p className="empty-state">Nenhum atendimento aguardando.</p>}</div></div>;
}

export function ClinicalWorkspacePage() {
  const { attendanceId = "" } = useParams(); const [record, setRecord] = useState<ClinicalRecord>(); const [saved, setSaved] = useState(false); const [error, setError] = useState("");
  useEffect(() => { void clinicalService.load(attendanceId).then(setRecord); }, [attendanceId]);
  if (!record) return <div className="app-loading">Abrindo prontuário local…</div>;
  async function save(event: React.FormEvent) { event.preventDefault(); await clinicalService.save(record!); setSaved(true); }
  async function finalize() { try { await clinicalService.finalize(record!); setRecord({ ...record!, finalizedAt: new Date().toISOString() }); setError(""); } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível finalizar."); } }
  return <div className="page"><p className="eyebrow">Workspace clínico</p><h1>Atendimento clínico</h1><form className="settings-form" onSubmit={save}><label>Anamnese<textarea value={record.anamnesis} onChange={(event) => setRecord({ ...record, anamnesis: event.target.value })} /></label><label>Exame<textarea value={record.examination} onChange={(event) => setRecord({ ...record, examination: event.target.value })} /></label><label>Solicitações<textarea value={record.requests} onChange={(event) => setRecord({ ...record, requests: event.target.value })} /></label><label>Prescrição<textarea value={record.prescription} onChange={(event) => setRecord({ ...record, prescription: event.target.value })} /></label><p className="help-text">Anexos clínicos: {record.attachments.length}. O armazenamento de arquivos será ligado ao backup local na etapa de documentos.</p><Button type="submit">Salvar rascunho clínico</Button><Button type="button" disabled={Boolean(record.finalizedAt)} onClick={() => void finalize()}>{record.finalizedAt ? "Atendimento finalizado" : "Finalizar atendimento"}</Button>{saved && <span className="success">Rascunho salvo localmente.</span>}{error && <span className="error-text">{error}</span>}</form></div>;
}

export function SalesPage() {
  const { currentStoreId } = useAppContext(); const [sales, setSales] = useState<Sale[]>([]); const [orders, setOrders] = useState<WorkOrder[]>([]); const [customers, setCustomers] = useState<Customer[]>([]); const [customerId, setCustomerId] = useState(""); const [description, setDescription] = useState(""); const [total, setTotal] = useState("");
  async function refresh() { const [loadedSales, loadedOrders, loadedCustomers] = await Promise.all([salesService.list(currentStoreId), workOrderService.list(currentStoreId), receptionService.listCustomers()]); setSales(loadedSales); setOrders(loadedOrders); setCustomers(loadedCustomers); }
  useEffect(() => { void refresh(); }, [currentStoreId]);
  async function submit(event: React.FormEvent) { event.preventDefault(); if (!customerId) return; await salesService.createQuote(customerId, currentStoreId, description, Number(total)); setDescription(""); setTotal(""); await refresh(); }
  async function confirm(sale: Sale) { await salesService.confirm(sale); await refresh(); }
  async function createOrder(sale: Sale) { await workOrderService.createFromConfirmedSale(sale); await refresh(); }
  return <div className="page"><p className="eyebrow">Comercial</p><h1>Orçamentos e vendas</h1><form className="attendance-start" onSubmit={submit}><select value={customerId} onChange={(event) => setCustomerId(event.target.value)}><option value="">Cliente</option>{customers.map((customer) => <option value={customer.id} key={customer.id}>{customer.name}</option>)}</select><Input placeholder="Descrição" value={description} onChange={(event) => setDescription(event.target.value)} /><Input type="number" min="0.01" step="0.01" placeholder="Valor" value={total} onChange={(event) => setTotal(event.target.value)} /><Button type="submit">Salvar orçamento</Button></form><div className="list-card">{sales.length ? sales.map((sale) => <article className="list-row" key={sale.id}><div><strong>{sale.description}</strong><span>{customers.find((customer) => customer.id === sale.customerId)?.name ?? "Cliente"}</span></div><div><span className="badge">R$ {sale.total.toFixed(2)} · {sale.status}</span>{sale.status === "QUOTE" && <Button type="button" onClick={() => void confirm(sale)}>Confirmar venda</Button>}{sale.status === "CONFIRMED" && (orders.some((order) => order.saleId === sale.id) ? <span className="success">OS criada</span> : <Button type="button" onClick={() => void createOrder(sale)}>Criar OS</Button>)}</div></article>) : <p className="empty-state">Nenhum orçamento nesta loja.</p>}</div></div>;
}

export function ForbiddenPage() { return <div className="page"><h1>Acesso não permitido</h1><p>Seu perfil atual não possui esta permissão.</p></div>; }
