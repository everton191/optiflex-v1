import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAppContext, useSession } from "./providers";
import { Button, Card, Input } from "../design-system/components";
import { allPermissions, hasPermission, roleDefinitions, sessionUserState } from "../domain/access";
import type { RoleKey, User } from "../domain/access";
import type { Attendance, Customer } from "../domain/customer";
import type { AgendaEvent } from "../domain/agenda";
import { agendaEventStatusLabels, agendaEventTypeLabels } from "../domain/agenda";
import { ReceptionService } from "../domain/reception-service";
import { AgendaService } from "../domain/agenda-service";
import { BackupPanel } from "./BackupPanel";
export { ClinicalWorkspacePage } from "./ClinicalWorkspace";
export { DashboardPage } from "./DashboardWorkspace";
import { SalesService } from "../domain/sales-service";
import type { Sale, SaleItem } from "../domain/sales";
import { WorkOrderService } from "../domain/work-order-service";
import { InventoryService } from "../domain/inventory-service";
import type { InventoryItem } from "../domain/inventory";
import { CashService } from "../domain/cash-service";
import type { WorkOrder } from "../domain/work-order";
import type { CashEntry, CashMovementType, CashSession, PaymentMethod } from "../domain/cash";
import { cashTotals, paymentMethodLabels, paymentMethodOptions } from "../domain/cash";
import { LocalAgendaRepository, LocalAttendanceRepository, LocalCashRepository, LocalCustomerRepository, LocalInventoryRepository, LocalSaleRepository, LocalWorkOrderRepository } from "../infrastructure/storage/local-repositories";

const receptionService = new ReceptionService(new LocalCustomerRepository(), new LocalAttendanceRepository());
const agendaService = new AgendaService(new LocalAgendaRepository(), new LocalCustomerRepository(), receptionService);
const saleRepository = new LocalSaleRepository();
const salesService = new SalesService(saleRepository);
const workOrderService = new WorkOrderService(new LocalWorkOrderRepository());
const inventoryService = new InventoryService(new LocalInventoryRepository());
const cashRepository = new LocalCashRepository();
const cashService = new CashService(cashRepository, saleRepository);
const scopeLabels = { SELF: "Próprio usuário", STORE: "Loja", ORGANIZATION: "Empresa", NETWORK: "Todas as lojas" } as const;
const attendanceTypeLabels = { CONSULTATION: "Consulta", RETURN: "Retorno", ADJUSTMENT: "Ajuste", ASSESSMENT: "Avaliação" } as const;
const attendanceStatusLabels = { DRAFT: "Em preparação", WAITING: "Aguardando", IN_PROGRESS: "Em atendimento", FINISHED: "Finalizado", CANCELLED: "Cancelado" } as const;
const saleStatusLabels = { QUOTE: "Orçamento", CONFIRMED: "Venda confirmada", CANCELLED: "Cancelada" } as const;
const cashEntryLabels = { RECEIPT: "Recebimento", WITHDRAWAL: "Sangria", DEPOSIT: "Suprimento", REFUND: "Estorno" } as const;
const roleDescriptions = { OWNER: "Acesso completo a todas as lojas.", NETWORK_ADMINISTRATOR: "Administra lojas, usuários e configurações.", STORE_MANAGER: "Acompanha a operação da própria loja.", RECEPTIONIST: "Atende clientes e organiza a fila.", CLINICAL_PROFESSIONAL: "Preenche prontuários, exames e prescrições.", SELLER: "Cria orçamentos e registra vendas.", CASHIER: "Registra recebimentos e movimentações do caixa.", STOCK_MANAGER: "Controla produtos e quantidades.", FINANCE: "Acompanha cobranças e resultados financeiros.", AUDITOR: "Consulta informações e relatórios sem alterar dados." } as const;

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
  </form><BackupPanel /></div>;
}

export function UsersPage() {
  const { users, stores, createUser, updateUser, setUserActive } = useAppContext();
  const session = useSession();
  const canManage = hasPermission(session.role, "users.manage");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<User>();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<RoleKey>("RECEPTIONIST");
  const [storeIds, setStoreIds] = useState<string[]>([]);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const pending = useRef(false);
  const storeName = (storeId: string) => stores.find((store) => store.id === storeId)?.name ?? "Sem loja";
  const selectedRole = roleDefinitions.find((definition) => definition.key === role);

  function resetForm(open: boolean) { setFormOpen(open); setEditing(undefined); setName(""); setEmail(""); setRole("RECEPTIONIST"); setStoreIds([]); setPassword(""); }
  function editUser(user: User) { setFormOpen(true); setEditing(user); setName(user.name); setEmail(user.email); setRole(user.role); setStoreIds([...user.storeIds]); setPassword(""); }
  function toggleStore(storeId: string) { setStoreIds((current) => current.includes(storeId) ? current.filter((id) => id !== storeId) : [...current, storeId]); }

  async function run(action: () => Promise<string>, fallback: string) {
    if (pending.current || !canManage) return;
    pending.current = true; setMessage(""); setError("");
    try { setMessage(await action()); } catch (reason) { setError(reason instanceof Error ? reason.message : fallback); } finally { pending.current = false; }
  }

  async function saveUser(event: React.FormEvent) {
    event.preventDefault();
    const input = { name, email, role, storeIds, password: password || undefined };
    await run(async () => {
      if (editing) { await updateUser(editing.id, input); resetForm(false); return "Usuário atualizado."; }
      await createUser(input); resetForm(false); return "Usuário criado.";
    }, "Não foi possível salvar o usuário.");
  }

  async function toggleActive(user: User) {
    await run(async () => { await setUserActive(user.id, !user.active); return user.active ? "Usuário inativado." : "Usuário reativado."; }, "Não foi possível alterar o status do usuário.");
  }

  return <div className="page">
    <div className="page-title">
      <div><p className="eyebrow">Administração</p><h1>Usuários</h1><p className="page-intro">Cadastre quem usa o sistema, defina a função e as lojas em que cada pessoa pode trabalhar.</p></div>
      {canManage && <Button type="button" onClick={() => resetForm(!formOpen || Boolean(editing))}>{formOpen && !editing ? "Fechar" : "Novo usuário"}</Button>}
    </div>
    {message && <p className="notice success" role="status">{message}</p>}
    {error && <p className="notice error-text" role="alert">{error}</p>}

    {canManage && formOpen && <form className="settings-form" onSubmit={saveUser}>
      <label>Nome<Input value={name} onChange={(event) => setName(event.target.value)} required /></label>
      <label>E-mail<Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
      <label>{editing ? "Nova senha (opcional)" : "Senha (opcional)"}<Input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={editing && editing.passwordHash ? "Deixe em branco para manter a atual" : "Mínimo de 8 caracteres"} /></label>
      <p className="help-text">Sem senha, o acesso só é possível pela demonstração em /login. Defina uma senha para entrar com e-mail e senha.</p>
      <label>Função<select value={role} onChange={(event) => setRole(event.target.value as RoleKey)}>{roleDefinitions.map((definition) => <option key={definition.key} value={definition.key}>{definition.label}</option>)}</select></label>
      <div>
        <p className="help-text">Lojas autorizadas{selectedRole?.scope === "STORE" ? " (obrigatório para esta função)" : ""}:</p>
        {stores.map((store) => <label className="check-label" key={store.id}><input type="checkbox" checked={storeIds.includes(store.id)} onChange={() => toggleStore(store.id)} />{store.name}</label>)}
      </div>
      <div className="form-actions">
        <Button type="submit">{editing ? "Salvar alterações" : "Criar usuário"}</Button>
        <Button type="button" onClick={() => resetForm(false)}>Cancelar</Button>
      </div>
      <p className="help-text">A função define as permissões; as lojas definem onde a pessoa pode trabalhar.</p>
    </form>}

    <div className="list-card">{users.map((user) => {
      const isSessionUser = user.name === session.userName;
      return <article className="list-row" key={user.id}>
        <div><strong>{user.name}</strong><span>{user.email}</span></div>
        <div>
          <span className="badge">{roleDefinitions.find((definition) => definition.key === user.role)?.label}</span>
          <small>{scopeLabels[user.scope]} · {user.storeIds.map(storeName).join(", ") || "—"}</small>
          <small>{user.active ? "Ativo" : "Inativo"}{isSessionUser ? " · sessão atual" : ""}</small>
          <small className="help-text">{user.passwordHash ? "Senha definida" : "Sem senha local"}</small>
        </div>
        {canManage && <div>
          <Button type="button" onClick={() => editUser(user)}>Editar</Button>
          <Button type="button" disabled={isSessionUser && user.active} onClick={() => void toggleActive(user)}>{user.active ? "Inativar" : "Reativar"}</Button>
        </div>}
      </article>;
    })}</div>
  </div>;
}

function PermissionsMatrix() {
  return <div className="matrix-wrap"><table className="permissions-matrix"><caption className="help-text">Matriz de permissões — • = permitido para o perfil.</caption><thead><tr><th scope="col">Permissão</th>{roleDefinitions.map((role) => <th scope="col" key={role.key}>{role.label}<br /><small>{scopeLabels[role.scope]}</small></th>)}</tr></thead><tbody>{allPermissions.map((permission) => <tr key={permission}><th scope="row">{permission}</th>{roleDefinitions.map((role) => <td key={role.key}>{hasPermission(role.key, permission) ? "•" : "·"}</td>)}</tr>)}</tbody></table></div>;
}

export function ProfilesPage() {
  return <div className="page"><p className="eyebrow">Administração</p><h1>Perfis de acesso</h1><p className="page-intro">Cada perfil libera somente as áreas necessárias para o trabalho da pessoa. A troca de função/lojas de um usuário em Usuários reflete no menu e nas rotas sem recarregar.</p><div className="list-card">{roleDefinitions.map((role) => <article className="list-row role-row" key={role.key}><div><strong>{role.label}</strong><span>{roleDescriptions[role.key]}</span></div><small>{scopeLabels[role.scope]}</small></article>)}</div><h2 className="section-title">Matriz de permissões</h2><PermissionsMatrix /></div>;
}

export function CustomersPage() {
  const session = useSession();
  const [customers, setCustomers] = useState<Customer[]>([]); const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    void receptionService.listCustomers(query).then((items) => { if (active) setCustomers(items); })
      .catch(() => { if (active) setError("Não foi possível carregar os clientes."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [query, attempt]);
  return <div className="page"><p className="eyebrow">Recepção</p><div className="page-title"><div><h1>Clientes</h1><p className="page-intro">Encontre ou cadastre clientes para iniciar um atendimento.</p></div>{hasPermission(session.role, "customers.manage") && <Link className="button" to="/clientes/novo">Novo cliente</Link>}</div><Input aria-label="Buscar cliente" placeholder="Buscar por nome, CPF ou telefone" value={query} onChange={(event) => setQuery(event.target.value)} />{error && <p role="alert">{error} <Button type="button" onClick={() => setAttempt((value) => value + 1)}>Tentar novamente</Button></p>}<div className="list-card">{loading ? <p role="status" className="empty-state">Carregando clientes…</p> : !error && (customers.length ? customers.map((customer) => <Link className="list-row list-link" key={customer.id} to={`/clientes/${customer.id}`}><div><strong>{customer.name}</strong><span>{customer.cpf || customer.phone || "Sem documento ou telefone"}</span></div></Link>) : <p className="empty-state">Nenhum cliente encontrado.</p>)}</div></div>;
}

export function CustomerProfilePage() {
  const { currentStoreId } = useAppContext();
  const session = useSession();
  const { customerId = "" } = useParams(); const [customer, setCustomer] = useState<Customer>(); const [history, setHistory] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    void Promise.all([receptionService.getCustomer(customerId), receptionService.listCustomerAttendances(customerId)])
      .then(([loadedCustomer, loadedHistory]) => { if (active) { setCustomer(loadedCustomer); setHistory(loadedHistory); } })
      .catch(() => { if (active) setError("Não foi possível abrir este cliente."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [customerId, attempt]);
  if (loading) return <div className="page" role="status">Carregando cliente…</div>;
  if (error) return <div className="page"><p role="alert">{error}</p><Button type="button" onClick={() => setAttempt((value) => value + 1)}>Tentar novamente</Button></div>;
  if (!customer) return <div className="page"><h1>Cliente não encontrado</h1></div>;
  return <div className="page"><p className="eyebrow">Cliente</p><div className="page-title"><div><h1>{customer.name}</h1><p className="page-intro">{customer.phone || "Sem telefone"} · {customer.cpf || "Sem CPF"}{customer.email ? ` · ${customer.email}` : ""}{customer.birthDate ? ` · ${new Date(customer.birthDate).toLocaleDateString("pt-BR")}` : ""}</p></div><div className="page-title-actions">{hasPermission(session.role, "customers.manage") && <Link className="button secondary" to={`/clientes/${customer.id}/editar`}>Editar cadastro</Link>}{hasPermission(session.role, "attendance.create") && <Link className="button" to={`/atendimentos?customer=${customer.id}`}>Novo atendimento</Link>}</div></div><h2 className="section-title">Histórico de atendimentos</h2><div className="list-card">{history.length ? history.map((item) => <article className="list-row" key={item.id}><div><strong>{attendanceTypeLabels[item.type]}</strong><span>{new Date(item.createdAt).toLocaleString("pt-BR")}</span>{hasPermission(session.role, "clinical.workspace.access") && item.status !== "CANCELLED" && (item.storeId === currentStoreId ? <Link to={`/clinico/atendimento/${item.id}`}>Ver consulta e versões</Link> : <small>Consulta de outra loja — selecione a loja correspondente para acessar.</small>)}</div><span className="badge">{attendanceStatusLabels[item.status]}</span></article>) : <p className="empty-state">Nenhum atendimento registrado.</p>}</div></div>;
}

export function CustomerNewPage() {
  const session = useSession();
  const navigate = useNavigate(); const [name, setName] = useState(""); const [phone, setPhone] = useState(""); const [cpf, setCpf] = useState("");
  const [saving, setSaving] = useState(false); const [error, setError] = useState(""); const pending = useRef(false);
  const canStart = hasPermission(session.role, "attendance.create");
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending.current || !hasPermission(session.role, "customers.manage")) return;
    pending.current = true; setSaving(true); setError("");
    try {
      const customer = await receptionService.createCustomer({ name, phone, cpf });
      navigate(canStart ? `/atendimentos?customer=${customer.id}` : `/clientes/${customer.id}`);
    } catch { setError(!name.trim() ? "Informe o nome do cliente." : "Não foi possível salvar o cliente. Tente novamente."); }
    finally { pending.current = false; setSaving(false); }
  }
  return <div className="page"><p className="eyebrow">Recepção</p><h1>Novo cliente</h1><form className="settings-form" onSubmit={submit}><label>Nome completo<Input value={name} onChange={(event) => setName(event.target.value)} disabled={saving} required /></label><label>Telefone<Input value={phone} onChange={(event) => setPhone(event.target.value)} disabled={saving} /></label><label>CPF<Input value={cpf} onChange={(event) => setCpf(event.target.value)} disabled={saving} /></label>{error && <p role="alert" className="error-text">{error}</p>}<Button type="submit" disabled={saving}>{saving ? "Salvando…" : canStart ? "Salvar e iniciar atendimento" : "Salvar cliente"}</Button></form></div>;
}

export function CustomerEditPage() {
  const session = useSession();
  const navigate = useNavigate(); const { customerId = "" } = useParams();
  const [name, setName] = useState(""); const [phone, setPhone] = useState(""); const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState(""); const [birthDate, setBirthDate] = useState("");
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false);
  const [error, setError] = useState(""); const [attempt, setAttempt] = useState(0); const pending = useRef(false);
  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    void receptionService.getCustomer(customerId)
      .then((customer) => {
        if (!active) return;
        if (!customer) { setError("Cliente não encontrado."); return; }
        setName(customer.name); setPhone(customer.phone ?? ""); setCpf(customer.cpf ?? ""); setEmail(customer.email ?? ""); setBirthDate(customer.birthDate ?? "");
      })
      .catch(() => { if (active) setError("Não foi possível abrir este cliente."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [customerId, attempt]);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending.current || !hasPermission(session.role, "customers.manage")) return;
    pending.current = true; setSaving(true); setError("");
    try {
      await receptionService.updateCustomer(customerId, { name, phone, cpf, email, birthDate });
      navigate(`/clientes/${customerId}`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível salvar as alterações. Tente novamente."); }
    finally { pending.current = false; setSaving(false); }
  }
  if (loading) return <div className="page" role="status">Carregando cliente…</div>;
  return <div className="page"><p className="eyebrow">Cliente</p><h1>Editar cadastro</h1>{error && !saving && <p role="alert" className="error-text">{error} <Button type="button" onClick={() => setAttempt((value) => value + 1)}>Tentar novamente</Button></p>}<form className="settings-form" onSubmit={submit}><label>Nome completo<Input value={name} onChange={(event) => setName(event.target.value)} disabled={saving} required /></label><label>Telefone<Input value={phone} onChange={(event) => setPhone(event.target.value)} disabled={saving} /></label><label>CPF<Input value={cpf} onChange={(event) => setCpf(event.target.value)} disabled={saving} /></label><label>E-mail<Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={saving} /></label><label>Data de nascimento<Input type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} disabled={saving} /></label>{error && saving && <p role="alert" className="error-text">{error}</p>}<div className="form-actions"><Button type="submit" disabled={saving}>{saving ? "Salvando…" : "Salvar alterações"}</Button><Button type="button" onClick={() => navigate(`/clientes/${customerId}`)} disabled={saving}>Cancelar</Button></div></form></div>;
}

export function AttendancePage() {
  const { currentStoreId } = useAppContext();
  return <AttendanceQueue key={currentStoreId} />;
}

export function AgendaPage() {
  const { currentStoreId, users } = useAppContext();
  const session = useSession(); const navigate = useNavigate();
  const [view, setView] = useState<"day" | "week">("day");
  const [anchor, setAnchor] = useState(() => new Date());
  const [events, setEvents] = useState<AgendaEvent[]>([]); const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false);
  const [error, setError] = useState(""); const [message, setMessage] = useState(""); const [attempt, setAttempt] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [customerId, setCustomerId] = useState(""); const [professionalId, setProfessionalId] = useState("");
  const [type, setType] = useState<AgendaEvent["type"]>("CONSULTATION"); const [startsAt, setStartsAt] = useState(""); const [notes, setNotes] = useState("");
  const pending = useRef(false); const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const canManage = hasPermission(session.role, "attendance.create");
  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    const loader = view === "day" ? agendaService.listDay(currentStoreId, anchor) : agendaService.listWeek(currentStoreId, anchor);
    void Promise.all([loader, receptionService.listCustomers()])
      .then(([loadedEvents, loadedCustomers]) => { if (active) { setEvents(loadedEvents); setCustomers(loadedCustomers); } })
      .catch(() => { if (active) setError("Não foi possível carregar a agenda desta loja."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [currentStoreId, view, anchor, attempt]);
  const customersById = new Map(customers.map((customer) => [customer.id, customer.name]));
  const usersById = new Map(users.map((user) => [user.id, user.name]));
  const customerName = (id: string) => customersById.get(id) ?? "Cliente";
  const professionalName = (id?: string) => (id ? usersById.get(id) : undefined) ?? "Sem profissional";
  function shiftAnchor(direction: number) {
    const days = view === "day" ? direction : direction * 7;
    setAnchor((current) => new Date(current.getFullYear(), current.getMonth(), current.getDate() + days));
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending.current || !customerId) return;
    pending.current = true; setSaving(true); setError(""); setMessage("");
    try {
      await agendaService.createEvent({ storeId: currentStoreId, customerId, professionalId: professionalId || undefined, type, startsAt, notes });
      if (!mounted.current) return;
      setShowForm(false); setCustomerId(""); setProfessionalId(""); setStartsAt(""); setNotes("");
      setMessage("Evento agendado."); setAttempt((value) => value + 1);
    } catch (reason) { if (mounted.current) setError(reason instanceof Error ? reason.message : "Não foi possível agendar o evento."); }
    finally { pending.current = false; if (mounted.current) setSaving(false); }
  }
  async function convert(item: AgendaEvent) {
    if (pending.current) return;
    pending.current = true; setError(""); setMessage("");
    try {
      const { attendance } = await agendaService.convertToAttendance(item.id);
      if (!mounted.current) return;
      setMessage("Evento virou atendimento na fila.");
      navigate(`/atendimentos?customer=${attendance.customerId}`);
    } catch (reason) { if (mounted.current) setError(reason instanceof Error ? reason.message : "Não foi possível converter o evento."); }
    finally { pending.current = false; }
  }
  async function cancel(item: AgendaEvent) {
    if (pending.current) return;
    pending.current = true; setError(""); setMessage("");
    try { await agendaService.cancel(item.id); if (mounted.current) { setMessage("Evento cancelado."); setAttempt((value) => value + 1); } }
    catch { if (mounted.current) setError("Não foi possível cancelar o evento."); }
    finally { pending.current = false; }
  }
  const heading = view === "day" ? anchor.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" }) : `Semana de ${anchor.toLocaleDateString("pt-BR")}`;
  const renderEvent = (item: AgendaEvent) => <article className="list-row" key={item.id}>
    <div><strong>{customerName(item.customerId)}</strong><span>{agendaEventTypeLabels[item.type]} · {professionalName(item.professionalId)} · {agendaEventStatusLabels[item.status]}{item.notes ? ` · ${item.notes}` : ""}</span></div>
    {canManage && item.status === "SCHEDULED" && <div className="page-title-actions"><Button type="button" onClick={() => void convert(item)}>Virar atendimento</Button><Button type="button" onClick={() => void cancel(item)}>Cancelar</Button></div>}
  </article>;
  const dayEvents = (day: Date) => {
    const key = day.toDateString();
    return events.filter((item) => new Date(item.startsAt).toDateString() === key);
  };
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const offset = (anchor.getDay() + 6) % 7;
    return new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - offset + index);
  });
  return <div className="page"><p className="eyebrow">Recepção</p><div className="page-title"><div><h1>Agenda</h1><p className="page-intro">Consultas, retornos, entregas, ajustes e cobranças do dia ou da semana. Eventos do tipo consulta, retorno ou ajuste viram atendimento na fila sem redigitar o cliente.</p></div>{canManage && <Button type="button" onClick={() => setShowForm((open) => !open)}>{showForm ? "Fechar formulário" : "Novo evento"}</Button>}</div>
    <div className="page-title-actions"><Button type="button" onClick={() => shiftAnchor(-1)}>{view === "day" ? "Dia anterior" : "Semana anterior"}</Button><strong>{heading}</strong><Button type="button" onClick={() => shiftAnchor(1)}>{view === "day" ? "Próximo dia" : "Próxima semana"}</Button><Button type="button" onClick={() => setAnchor(new Date())}>Hoje</Button><Button type="button" onClick={() => setView(view === "day" ? "week" : "day")}>{view === "day" ? "Ver semana" : "Ver dia"}</Button></div>
    {showForm && canManage && <form className="settings-form" onSubmit={(event) => void submit(event)}>
      <label>Cliente<select aria-label="Selecionar cliente" value={customerId} disabled={saving} required onChange={(event) => setCustomerId(event.target.value)}><option value="">Selecionar cliente</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
      <label>Profissional<select aria-label="Selecionar profissional" value={professionalId} disabled={saving} onChange={(event) => setProfessionalId(event.target.value)}><option value="">Sem profissional</option>{users.filter((user) => user.active).map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
      <label>Tipo<select aria-label="Tipo de evento" value={type} disabled={saving} onChange={(event) => setType(event.target.value as AgendaEvent["type"])}>{(Object.keys(agendaEventTypeLabels) as AgendaEvent["type"][]).map((key) => <option key={key} value={key}>{agendaEventTypeLabels[key]}</option>)}</select></label>
      <label>Data e hora<input aria-label="Data e hora" type="datetime-local" value={startsAt} disabled={saving} required onChange={(event) => setStartsAt(event.target.value)} /></label>
      <label>Observações<input value={notes} disabled={saving} onChange={(event) => setNotes(event.target.value)} /></label>
      <div className="form-actions"><Button type="submit" disabled={saving || !customerId}>{saving ? "Agendando…" : "Agendar"}</Button></div>
    </form>}
    {error && <p role="alert" className="error-text">{error}</p>}
    {message && <p role="status" className="success">{message}</p>}
    {loading ? <p role="status" className="empty-state">Carregando agenda…</p> : view === "day" ? <div className="list-card">{dayEvents(anchor).length ? dayEvents(anchor).map(renderEvent) : <p className="empty-state">Nenhum evento neste dia.</p>}</div> : <>{weekDays.map((day) => <section key={day.toISOString()}><h2 className="section-title">{day.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" })}</h2><div className="list-card">{dayEvents(day).length ? dayEvents(day).map(renderEvent) : <p className="empty-state">Sem eventos.</p>}</div></section>)}</>}</div>;
}

function AttendanceQueue() {
  const { currentStoreId } = useAppContext();
  const session = useSession();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedCustomerId = searchParams.get("customer") ?? "";
  const [queue, setQueue] = useState<Attendance[]>([]); const [customers, setCustomers] = useState<Customer[]>([]); const [customerId, setCustomerId] = useState(requestedCustomerId);
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false);
  const [error, setError] = useState(""); const [message, setMessage] = useState(""); const [attempt, setAttempt] = useState(0);
  const pending = useRef(false); const mounted = useRef(true);
  const canCreate = hasPermission(session.role, "attendance.create");
  const canOpenClinical = hasPermission(session.role, "clinical.workspace.access");
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { setCustomerId(requestedCustomerId); }, [requestedCustomerId]);
  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    void Promise.all([receptionService.listQueue(currentStoreId), receptionService.listCustomers()])
      .then(([loadedQueue, loadedCustomers]) => { if (active) { setQueue(loadedQueue); setCustomers(loadedCustomers); } })
      .catch(() => { if (active) setError("Não foi possível carregar os atendimentos desta loja."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [currentStoreId, attempt]);
  const validCustomer = customers.some((customer) => customer.id === customerId);
  async function start() {
    if (pending.current || loading || !validCustomer || !canCreate) return;
    pending.current = true; setSaving(true); setError(""); setMessage("");
    try {
      const attendance = await receptionService.startAttendance(customerId, currentStoreId, "CONSULTATION");
      if (!mounted.current) return;
      setQueue((items) => [attendance, ...items]); setCustomerId("");
      setMessage("Cliente adicionado à fila.");
      setSearchParams((params) => { params.delete("customer"); return params; }, { replace: true });
    } catch { if (mounted.current) setError("Não foi possível adicionar à fila. Confira o cliente e tente novamente."); }
    finally { pending.current = false; if (mounted.current) setSaving(false); }
  }
  const waiting = queue.filter((item) => item.status === "WAITING");
  const customerName = (id: string) => customers.find((customer) => customer.id === id)?.name ?? "Cliente";
  return <div className="page"><p className="eyebrow">Recepção</p><h1>Atendimentos</h1>
    {canCreate && <div className="attendance-start"><select aria-label="Selecionar cliente" value={validCustomer ? customerId : ""} disabled={loading || saving} onChange={(event) => setCustomerId(event.target.value)}><option value="">Selecionar cliente</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select><Button type="button" disabled={loading || saving || !validCustomer} onClick={() => void start()}>{saving ? "Adicionando…" : "Adicionar à fila"}</Button></div>}
    {!loading && customerId && !validCustomer && <p role="alert">Cliente não encontrado. Selecione um cliente cadastrado.</p>}
    {error && <p role="alert" className="error-text">{error} <Button type="button" disabled={saving || loading} onClick={() => setAttempt((value) => value + 1)}>Atualizar fila</Button></p>}
    {message && <p role="status" className="success">{message}</p>}
    <h2 className="section-title">Fila atual</h2><div className="list-card">{loading ? <p role="status" className="empty-state">Carregando atendimentos…</p> : waiting.length ? waiting.map((item) => {
      const content = <div><strong>{customerName(item.customerId)}</strong><span>{attendanceTypeLabels[item.type]} · aguardando atendimento</span></div>;
      return canOpenClinical ? <Link className="list-row list-link" key={item.id} to={`/clinico/atendimento/${item.id}`}>{content}</Link> : <article className="list-row" key={item.id}>{content}</article>;
    }) : !error && <p className="empty-state">Nenhum atendimento aguardando.</p>}</div></div>;
}

export function ClinicalQueuePage() {
  const { currentStoreId } = useAppContext(); const [queue, setQueue] = useState<Attendance[]>([]); const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadedStore, setLoadedStore] = useState(""); const [error, setError] = useState(""); const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true; setLoadedStore(""); setError("");
    void Promise.all([receptionService.listQueue(currentStoreId), receptionService.listCustomers()])
      .then(([items, clients]) => { if (active) { setQueue(items.filter((item) => item.status === "WAITING" || item.status === "IN_PROGRESS")); setCustomers(clients); setLoadedStore(currentStoreId); } })
      .catch(() => { if (active) setError("Não foi possível carregar a fila."); });
    return () => { active = false; };
  }, [currentStoreId, attempt]);
  return <div className="page"><p className="eyebrow">Área clínica</p><div className="page-title"><div><h1>Consultas em andamento</h1><p className="page-intro">Abra uma consulta ou continue um rascunho. Consultas finalizadas ficam no histórico do cliente.</p></div><Link className="button" to="/clientes">Buscar cliente</Link></div>{error && <p role="alert">{error} <Button onClick={() => setAttempt((value) => value + 1)}>Tentar novamente</Button></p>}<div className="list-card">{error ? null : loadedStore !== currentStoreId ? <p role="status">Carregando fila…</p> : queue.length ? queue.map((attendance) => <Link className="list-row list-link" key={attendance.id} to={`/clinico/atendimento/${attendance.id}`}><div><strong>{customers.find((customer) => customer.id === attendance.customerId)?.name ?? "Cliente"}</strong><span>{attendanceStatusLabels[attendance.status]}</span></div><span className="badge">{attendance.status === "IN_PROGRESS" ? "Continuar consulta" : "Abrir consulta"}</span></Link>) : <p className="empty-state">Não há consultas aguardando ou em andamento nesta loja.</p>}</div></div>;
}

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
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]); const [itemProductId, setItemProductId] = useState(""); const [itemQuantity, setItemQuantity] = useState("1"); const [itemPrice, setItemPrice] = useState(""); const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]); const [paymentMethodBySale, setPaymentMethodBySale] = useState<Record<string, PaymentMethod>>({}); const [receiveAmountBySale, setReceiveAmountBySale] = useState<Record<string, string>>({}); const [movementType, setMovementType] = useState<CashMovementType>("DEPOSIT"); const [movementAmount, setMovementAmount] = useState(""); const [movementReason, setMovementReason] = useState(""); const [cancelSaleId, setCancelSaleId] = useState(""); const [cancelSaleReason, setCancelSaleReason] = useState("");
  const saleItemsTotal = saleItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const confirmedSales = sales.filter((sale) => sale.status === "CONFIRMED");
  const paidBySale = new Map<string, number>();
  for (const entry of entries) if (entry.saleId && entry.type === "RECEIPT") paidBySale.set(entry.saleId, (paidBySale.get(entry.saleId) ?? 0) + Math.round(entry.amount * 100));
  const isPaid = (sale: Sale) => sale.paymentStatus === "PAID" || (paidBySale.get(sale.id) ?? 0) >= Math.round(sale.total * 100);
  const pendingSales = confirmedSales.filter((sale) => !isPaid(sale));
  const pendingCents = (sale: Sale) => Math.round(sale.total * 100) - (paidBySale.get(sale.id) ?? 0);
  const sessionEntries = cashSession ? entries.filter((entry) => entry.sessionId === cashSession.id) : [];
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
  async function createSale(event: React.FormEvent) { event.preventDefault(); if (!customerId) return; await run(async () => { await salesService.createQuote(customerId, currentStoreId, description, Number(total), saleItems); setDescription(""); setTotal(""); setSaleItems([]); return "Orçamento criado."; }, "Não foi possível criar o orçamento."); }
  function addSaleItem(event: React.FormEvent) { event.preventDefault(); const product = inventoryItems.find((entry) => entry.id === itemProductId); if (!product) return; const quantity = Number(itemQuantity); const unitPrice = Number(itemPrice); if (!Number.isFinite(quantity) || quantity <= 0) { setError("Informe uma quantidade válida."); return; } if (!Number.isFinite(unitPrice) || unitPrice < 0) { setError("Informe um preço válido."); return; } if (quantity > product.quantity) { setError(`Saldo insuficiente de "${product.name}" (disponível: ${product.quantity}).`); return; } if (saleItems.some((entry) => entry.inventoryItemId === product.id)) { setError("Produto já adicionado ao orçamento."); return; } setSaleItems([...saleItems, { inventoryItemId: product.id, name: product.name, quantity, unitPrice }]); setItemProductId(""); setItemQuantity("1"); setItemPrice(""); setError(""); }
  function removeSaleItem(inventoryItemId: string) { setSaleItems((current) => current.filter((entry) => entry.inventoryItemId !== inventoryItemId)); }
  async function confirmSale(sale: Sale) { await run(async () => { await salesService.confirm(sale); return "Venda confirmada e pronta para receber."; }, "Não foi possível confirmar a venda."); }
  async function cancelSale(sale: Sale) { await run(async () => { const cancelled = await salesService.cancel(sale, cancelSaleReason, userSession.userName); setCancelSaleId(""); setCancelSaleReason(""); return cancelled.paymentStatus === "PAID" || cancelled.paymentStatus === "PARTIAL" ? "Venda cancelada; estorno registrado no caixa." : "Venda cancelada."; }, "Não foi possível cancelar a venda."); }
  async function createOrder(sale: Sale) { await run(async () => { await workOrderService.createFromConfirmedSale(sale); return "Ordem criada."; }, "Não foi possível criar a ordem."); }
  async function receive(sale: Sale) { const raw = receiveAmountBySale[sale.id]; const pendingAmount = pendingCents(sale) / 100; const amount = raw === undefined || raw === "" ? pendingAmount : Number(raw); if (!Number.isFinite(amount) || amount <= 0) { setError("Informe um valor válido para o recebimento."); return; } const partial = amount < pendingAmount; await run(async () => { await cashService.receive(currentStoreId, sale.id, amount, paymentMethodBySale[sale.id] ?? "CASH"); setReceiveAmountBySale((map) => { const next = { ...map }; delete next[sale.id]; return next; }); return partial ? "Recebimento parcial registrado." : "Recebimento registrado."; }, "Não foi possível registrar o recebimento."); }
  return <div className="page cash-desk"><div className="cash-heading"><div><p className="eyebrow">Operação da loja</p><h1>Caixa</h1><p className="page-intro">Vendas, recebimentos, abertura e fechamento do caixa em um só lugar.</p></div><span className={`cash-state ${cashSession ? "is-open" : ""}`}>{cashSession ? "Caixa aberto" : "Caixa fechado"}</span></div><div className="cash-summary-grid">{showSales && <button type="button" className="summary-card" onClick={() => setView("sales")}><small>Vendas registradas</small><strong>{sales.length}</strong><span>Ver vendas</span></button>}{showReceipts && <button type="button" className="summary-card" onClick={() => setView("receipts")}><small>Aguardando recebimento</small><strong>{pendingSales.length}</strong><span>Ver recebimentos</span></button>}{showSession && <button type="button" className="summary-card" onClick={() => setView("session")}><small>Situação do caixa</small><strong>{cashSession ? "Aberto" : "Fechado"}</strong><span>Ver detalhes</span></button>}</div><div className="cash-tabs" role="tablist" aria-label="Áreas do caixa">{showSales && <button type="button" role="tab" aria-selected={view === "sales"} className={view === "sales" ? "active" : ""} onClick={() => setView("sales")}>Vendas</button>}{showReceipts && <button type="button" role="tab" aria-selected={view === "receipts"} className={view === "receipts" ? "active" : ""} onClick={() => setView("receipts")}>Recebimentos</button>}{showSession && <button type="button" role="tab" aria-selected={view === "session"} className={view === "session" ? "active" : ""} onClick={() => setView("session")}>Sessão</button>}</div>{message && <p className="notice success">{message}</p>}{error && <p className="notice error-text">{error}</p>}{view === "sales" && <section className="cash-panel" aria-label="Vendas"><div className="section-heading"><div><h2>Orçamentos e vendas</h2><p>Crie um orçamento e confirme quando o cliente aprovar.</p></div></div>{canManageSales && <form className="commerce-form" onSubmit={createSale}><select aria-label="Cliente" value={customerId} onChange={(event) => setCustomerId(event.target.value)} required><option value="">Selecione o cliente</option>{customers.map((customer) => <option value={customer.id} key={customer.id}>{customer.name}</option>)}</select><Input placeholder="Produto ou serviço" value={description} onChange={(event) => setDescription(event.target.value)} required={saleItems.length === 0} /><Input type="number" min="0.01" step="0.01" placeholder="Valor" value={saleItems.length ? saleItemsTotal.toFixed(2) : total} onChange={(event) => setTotal(event.target.value)} disabled={saleItems.length > 0} required={saleItems.length === 0} /><Button type="submit">Criar orçamento</Button></form>}{canManageSales && <form className="sale-items-form" onSubmit={addSaleItem}><select aria-label="Produto do estoque" value={itemProductId} onChange={(event) => setItemProductId(event.target.value)}><option value="">Produto do estoque (opcional)</option>{inventoryItems.map((product) => <option key={product.id} value={product.id} disabled={product.quantity <= 0}>{product.name} · saldo {product.quantity}</option>)}</select><Input type="number" min="1" step="1" placeholder="Qtd" aria-label="Quantidade do item" value={itemQuantity} onChange={(event) => setItemQuantity(event.target.value)} /><Input type="number" min="0" step="0.01" placeholder="Preço unit." aria-label="Preço unitário do item" value={itemPrice} onChange={(event) => setItemPrice(event.target.value)} /><Button type="submit">Adicionar item</Button></form>}{saleItems.length > 0 && <ul className="sale-items-list">{saleItems.map((item) => <li key={item.inventoryItemId}><span>{item.name} × {item.quantity} · R$ {(item.quantity * item.unitPrice).toFixed(2)}</span><Button type="button" onClick={() => removeSaleItem(item.inventoryItemId)}>Remover</Button></li>)}</ul>}<div className="list-card compact-list">{sales.length ? sales.map((sale) => <article className="list-row" key={sale.id}><div><strong>{sale.description}</strong><span>{customers.find((customer) => customer.id === sale.customerId)?.name ?? "Cliente"}</span>{sale.items?.length ? <span className="help-text sale-items">{sale.items.map((item) => `${item.name} × ${item.quantity}`).join(" · ")}</span> : null}</div><div><span className="badge">R$ {sale.total.toFixed(2)} · {saleStatusLabels[sale.status]}</span>{sale.status === "CONFIRMED" && isPaid(sale) && <span className="success">Recebida</span>}{sale.status === "CONFIRMED" && !isPaid(sale) && sale.paymentStatus === "PARTIAL" && <span className="help-text">Parcial</span>}{sale.cancelReason && <span className="help-text">Motivo: {sale.cancelReason}</span>}{canManageSales && sale.status === "QUOTE" && <Button type="button" onClick={() => void confirmSale(sale)}>Confirmar</Button>}{canManageSales && sale.status === "CONFIRMED" && (orders.some((order) => order.saleId === sale.id) ? <span className="success">Ordem criada</span> : <Button type="button" onClick={() => void createOrder(sale)}>Criar ordem</Button>)}{canManageSales && (sale.status === "QUOTE" || sale.status === "CONFIRMED") && <Button type="button" onClick={() => { setCancelSaleId(sale.id); setCancelSaleReason(""); }}>Cancelar</Button>}</div>{canManageSales && cancelSaleId === sale.id && <form className="commerce-form cancel-sale-form" onSubmit={(event) => { event.preventDefault(); void cancelSale(sale); }}><Input aria-label={`Motivo do cancelamento de ${sale.description}`} placeholder="Motivo do cancelamento" value={cancelSaleReason} onChange={(event) => setCancelSaleReason(event.target.value)} required /><Button type="submit">Confirmar cancelamento</Button><Button type="button" onClick={() => { setCancelSaleId(""); setCancelSaleReason(""); }}>Voltar</Button></form>}</article>) : <p className="empty-state">Nenhuma venda registrada.</p>}</div></section>}{view === "receipts" && <section className="cash-panel" aria-label="Recebimentos"><div className="section-heading"><div><h2>Aguardando recebimento</h2><p>Vendas confirmadas que ainda têm saldo a receber.</p></div></div><div className="list-card compact-list">{pendingSales.length ? pendingSales.map((sale) => <article className="list-row" key={sale.id}><div><strong>{sale.description}</strong><span>{customerName(sale.customerId)}</span>{sale.paymentStatus === "PARTIAL" && <span className="help-text">Pagamento parcial registrado</span>}</div><div><span className="badge">R$ {(pendingCents(sale) / 100).toFixed(2)} pendentes</span>{canManageCash && <Input type="number" min="0.01" step="0.01" aria-label={`Valor a receber de ${sale.description}`} placeholder={(pendingCents(sale) / 100).toFixed(2)} value={receiveAmountBySale[sale.id] ?? ""} onChange={(event) => setReceiveAmountBySale((map) => ({ ...map, [sale.id]: event.target.value }))} />}{canManageCash && <select aria-label={`Forma de pagamento de ${sale.description}`} value={paymentMethodBySale[sale.id] ?? "CASH"} onChange={(event) => setPaymentMethodBySale((map) => ({ ...map, [sale.id]: event.target.value as PaymentMethod }))}>{paymentMethodOptions.map((method) => <option key={method} value={method}>{paymentMethodLabels[method]}</option>)}</select>}{canManageCash && <Button type="button" onClick={() => void receive(sale)}>Receber</Button>}</div></article>) : <p className="empty-state">Nenhum recebimento pendente.</p>}</div><h3 className="section-title">Movimentos registrados</h3><div className="list-card compact-list">{entries.length ? entries.map((entry) => <article className="list-row" key={entry.id}><div><strong>{entry.saleId ? sales.find((sale) => sale.id === entry.saleId)?.description ?? "Venda recebida" : cashEntryLabels[entry.type]}</strong><span>{cashEntryLabels[entry.type]}{entry.paymentMethod ? ` · ${paymentMethodLabels[entry.paymentMethod]}` : ""}{entry.reason ? ` · ${entry.reason}` : ""} · {new Date(entry.createdAt).toLocaleString("pt-BR")}{entry.author ? ` · ${entry.author}` : ""}</span></div><div><span className="badge">R$ {entry.amount.toFixed(2)}</span></div></article>) : <p className="empty-state">Nenhum movimento registrado nesta loja.</p>}</div></section>}{view === "session" && <section className="cash-panel" aria-label="Sessão do caixa"><div className="section-heading"><div><h2>Sessão do caixa</h2><p>Confira a abertura, o movimento e o fechamento desta loja.</p></div></div>{cashSession ? <Card><span className="cash-state is-open">Em operação</span><h2>Caixa aberto</h2><p>Saldo inicial: R$ {cashSession.openingBalance.toFixed(2)}</p><p className="help-text">Aberto em {new Date(cashSession.openedAt).toLocaleString("pt-BR")}.</p>{sessionTotals && <div className="cash-totals"><div><small>Recebimentos</small><strong>R$ {sessionTotals.receipts.toFixed(2)}</strong></div><div><small>Suprimentos</small><strong>R$ {sessionTotals.deposits.toFixed(2)}</strong></div><div><small>Sangrias</small><strong>R$ {sessionTotals.withdrawals.toFixed(2)}</strong></div>{sessionTotals.refunds > 0 && <div><small>Estornos</small><strong>R$ {sessionTotals.refunds.toFixed(2)}</strong></div>}<div><small>Saldo esperado</small><strong>R$ {sessionTotals.expected.toFixed(2)}</strong></div></div>}{sessionTotals && Object.entries(sessionTotals.byMethod).filter(([, amount]) => amount > 0).length > 0 && <div className="cash-totals method-totals" aria-label="Recebimentos por forma de pagamento">{Object.entries(sessionTotals.byMethod).filter(([, amount]) => amount > 0).map(([method, amount]) => <div key={method}><small>{paymentMethodLabels[method as PaymentMethod]}</small><strong>R$ {amount.toFixed(2)}</strong></div>)}</div>}{canManageCash && <form className="open-cash-form cash-closing" onSubmit={closeCash}><label>Valor contado<Input type="number" min="0" step="0.01" value={closingBalance} onChange={(event) => setClosingBalance(event.target.value)} placeholder="R$ 0,00" required /></label><label>Observação<Input value={closingNote} onChange={(event) => setClosingNote(event.target.value)} placeholder="Opcional" /></label><Button type="submit">Fechar caixa</Button></form>}{canManageCash && <form className="open-cash-form cash-closing" onSubmit={recordCashMovement}><label>Tipo<select aria-label="Tipo de movimentação do caixa" value={movementType} onChange={(event) => setMovementType(event.target.value as CashMovementType)}><option value="DEPOSIT">Suprimento</option><option value="WITHDRAWAL">Sangria</option></select></label><label>Valor<Input type="number" min="0.01" step="0.01" value={movementAmount} onChange={(event) => setMovementAmount(event.target.value)} placeholder="R$ 0,00" required /></label><label>Motivo<Input value={movementReason} onChange={(event) => setMovementReason(event.target.value)} placeholder="Ex.: troco, retirada de valores" required /></label><Button type="submit">Registrar movimento</Button></form>}<p className="help-text">O fechamento encerra a sessão e bloqueia novos lançamentos no caixa desta loja.</p></Card> : canManageCash ? <form className="open-cash-form" onSubmit={openCash}><label>Saldo inicial<Input type="number" min="0" step="0.01" value={openingBalance} onChange={(event) => setOpeningBalance(event.target.value)} placeholder="R$ 0,00" /></label><Button type="submit">Abrir caixa</Button></form> : <p className="empty-state">O caixa ainda não foi aberto.</p>}{lastClosed && lastClosed.closedAt && <Card><h2>Fechamento anterior</h2><p>Fechado em {new Date(lastClosed.closedAt).toLocaleString("pt-BR")}{lastClosed.closedBy ? ` por ${lastClosed.closedBy}` : ""}.</p><p>Contado: R$ {(lastClosed.closingBalance ?? 0).toFixed(2)} · Esperado: R$ {(lastClosed.expectedBalance ?? 0).toFixed(2)}</p><p className={lastClosed.difference ? "error-text" : "success"}>{lastClosed.difference ? `Diferença de R$ ${lastClosed.difference.toFixed(2)}` : "Sem diferença de conferência"}</p>{lastClosed.closingNote && <p className="help-text">{lastClosed.closingNote}</p>}</Card>}</section>}</div>;
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
