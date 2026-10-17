import { useEffect, useRef, useState } from "react";
import { errorMessage } from "../domain/errors";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAppContext, useSession } from "./providers";
import { Button, EmptyState, Skeleton } from "../design-system/components";
import { hasPermission } from "../domain/access";
import type { Attendance, AttendancePriority, AttendanceStatus, AttendanceType, Customer } from "../domain/customer";
import { attendanceStatusLabels, attendanceTypeLabels, isActiveQueueStatus, waitingMinutes } from "../domain/customer";
import type { AgendaEvent } from "../domain/agenda";
import { agendaEventStatusLabels, agendaEventTypeLabels } from "../domain/agenda";
import { ReceptionService } from "../domain/reception-service";
import { AgendaService } from "../domain/agenda-service";
import { LocalAgendaRepository, LocalAttendanceRepository, LocalCustomerRepository } from "../infrastructure/storage/local-repositories";

const receptionService = new ReceptionService(new LocalCustomerRepository(), new LocalAttendanceRepository());
const agendaService = new AgendaService(new LocalAgendaRepository(), new LocalCustomerRepository(), receptionService);

export const attendancePriorityLabels = { NORMAL: "Normal", URGENT: "Urgente" } as const;

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
      .catch((reason) => { if (active) setError(errorMessage(reason, "Não foi possível carregar a agenda desta loja.")); })
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
    } catch (reason) { if (mounted.current) setError(errorMessage(reason, "Não foi possível agendar o evento.")); }
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
    } catch (reason) { if (mounted.current) setError(errorMessage(reason, "Não foi possível converter o evento.")); }
    finally { pending.current = false; }
  }
  async function cancel(item: AgendaEvent) {
    if (pending.current) return;
    pending.current = true; setError(""); setMessage("");
    try { await agendaService.cancel(item.id); if (mounted.current) { setMessage("Evento cancelado."); setAttempt((value) => value + 1); } }
    catch (reason) { if (mounted.current) setError(errorMessage(reason, "Não foi possível cancelar o evento.")); }
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
    {loading ? <Skeleton lines={4} label="Carregando agenda…" /> : view === "day" ? <div className="list-card">{dayEvents(anchor).length ? dayEvents(anchor).map(renderEvent) : <EmptyState>Nenhum evento neste dia.</EmptyState>}</div> : <>{weekDays.map((day) => <section key={day.toISOString()}><h2 className="section-title">{day.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" })}</h2><div className="list-card">{dayEvents(day).length ? dayEvents(day).map(renderEvent) : <EmptyState>Sem eventos.</EmptyState>}</div></section>)}</>}</div>;
}

function AttendanceQueue() {
  const { currentStoreId, users } = useAppContext();
  const session = useSession();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedCustomerId = searchParams.get("customer") ?? "";
  const [queue, setQueue] = useState<Attendance[]>([]); const [customers, setCustomers] = useState<Customer[]>([]); const [customerId, setCustomerId] = useState(requestedCustomerId);
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false);
  const [error, setError] = useState(""); const [message, setMessage] = useState(""); const [attempt, setAttempt] = useState(0);
  const [filter, setFilter] = useState<"ALL" | AttendanceStatus>("ALL");
  const [now, setNow] = useState(() => new Date());
  const pending = useRef(false); const mounted = useRef(true);
  const canCreate = hasPermission(session.role, "attendance.create");
  const canOpenClinical = hasPermission(session.role, "clinical.workspace.access");
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { setCustomerId(requestedCustomerId); }, [requestedCustomerId]);
  useEffect(() => {
    const timer = setInterval(() => { if (mounted.current) setNow(new Date()); }, 30_000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    void Promise.all([receptionService.listQueue(currentStoreId), receptionService.listCustomers()])
      .then(([loadedQueue, loadedCustomers]) => { if (active) { setQueue(loadedQueue); setCustomers(loadedCustomers); } })
      .catch((reason) => { if (active) setError(errorMessage(reason, "Não foi possível carregar os atendimentos desta loja.")); })
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
    } catch (reason) { if (mounted.current) setError(errorMessage(reason, "Não foi possível adicionar à fila. Confira o cliente e tente novamente.")); }
    finally { pending.current = false; if (mounted.current) setSaving(false); }
  }
  async function transition(item: Attendance, to: AttendanceStatus) {
    if (pending.current || !canCreate) return;
    pending.current = true; setSaving(true); setError(""); setMessage("");
    try {
      const updated = await receptionService.transitionAttendance(item.id, to);
      if (!mounted.current) return;
      setQueue((items) => items.map((attendance) => attendance.id === updated.id ? updated : attendance));
      setMessage(to === "FINISHED" ? "Atendimento finalizado." : to === "NO_SHOW" ? "Atendimento marcado como falta." : to === "IN_PROGRESS" ? "Atendimento iniciado." : "Atendimento cancelado.");
    } catch (reason) { if (mounted.current) setError(errorMessage(reason, "Não foi possível atualizar o atendimento.")); }
    finally { pending.current = false; if (mounted.current) setSaving(false); }
  }
  const active = queue.filter((item) => isActiveQueueStatus(item.status));
  const visible = active.filter((item) => filter === "ALL" || item.status === filter);
  const customerName = (id: string) => customers.find((customer) => customer.id === id)?.name ?? "Cliente";
  const professionalName = (id?: string) => (id ? users.find((user) => user.id === id)?.name : undefined);
  const waitLabel = (item: Attendance) => {
    const minutes = waitingMinutes(item, now);
    if (minutes < 1) return "menos de 1 min";
    return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)}h ${minutes % 60}min`;
  };
  const emptyLabel = filter === "WAITING" ? "Nenhum atendimento aguardando." : filter === "IN_PROGRESS" ? "Nenhum atendimento em atendimento." : "Nenhum atendimento ativo.";
  const filterButton = (value: "ALL" | AttendanceStatus, label: string, count: number) => <button type="button" role="tab" key={value} aria-selected={filter === value} className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>{label} <span>{count}</span></button>;
  return <div className="page"><p className="eyebrow">Recepção</p><div className="page-title"><div><h1>Atendimentos</h1></div>{canCreate && <Link className="button" to="/atendimentos/novo">Novo atendimento</Link>}</div>
    {canCreate && <div className="attendance-start"><select aria-label="Selecionar cliente" value={validCustomer ? customerId : ""} disabled={loading || saving} onChange={(event) => setCustomerId(event.target.value)}><option value="">Selecionar cliente</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select><Button type="button" disabled={loading || saving || !validCustomer} onClick={() => void start()}>{saving ? "Adicionando…" : "Adicionar à fila"}</Button></div>}
    {!loading && customerId && !validCustomer && <p role="alert">Cliente não encontrado. Selecione um cliente cadastrado.</p>}
    {error && <p role="alert" className="error-text">{error} <Button type="button" disabled={saving || loading} onClick={() => setAttempt((value) => value + 1)}>Atualizar fila</Button></p>}
    {message && <p role="status" className="success">{message}</p>}
    <div className="status-filters" role="tablist" aria-label="Filtrar fila por status">
      {filterButton("ALL", "Todos", active.length)}
      {filterButton("WAITING", "Aguardando", active.filter((item) => item.status === "WAITING").length)}
      {filterButton("IN_PROGRESS", "Em atendimento", active.filter((item) => item.status === "IN_PROGRESS").length)}
    </div>
    <h2 className="section-title">Fila atual</h2><div className="list-card">{loading ? <Skeleton lines={4} label="Carregando atendimentos…" /> : visible.length ? visible.map((item) => {
      const professional = professionalName(item.professionalId);
      const detail = `${attendanceTypeLabels[item.type]} · ${attendanceStatusLabels[item.status]} · ${professional ?? "Sem responsável"}${item.status === "WAITING" ? ` · espera ${waitLabel(item)}` : ""}`;
      const content = <div><strong>{customerName(item.customerId)}</strong><span>{detail}</span></div>;
      const urgent = item.priority === "URGENT" ? <span className="badge">Urgente</span> : null;
      if (canOpenClinical) return <Link className="list-row list-link" key={item.id} to={`/clinico/atendimento/${item.id}`}>{content}{urgent}</Link>;
      const actions = <div className="page-title-actions">
        {canCreate && item.status === "WAITING" && <Button type="button" disabled={saving} onClick={() => void transition(item, "IN_PROGRESS")}>Iniciar</Button>}
        {canCreate && item.status === "WAITING" && <Button type="button" disabled={saving} onClick={() => void transition(item, "NO_SHOW")}>Faltou</Button>}
        {canCreate && item.status === "IN_PROGRESS" && <Button type="button" disabled={saving} onClick={() => void transition(item, "FINISHED")}>Finalizar</Button>}
        {canCreate && <Button type="button" disabled={saving} onClick={() => void transition(item, "CANCELLED")}>Cancelar</Button>}
        <Link className="button secondary" to={`/atendimentos/${item.id}`}>Ver detalhe</Link>
      </div>;
      return <article className="list-row" key={item.id}>{content}{urgent}{actions}</article>;
    }) : !error && <EmptyState>{emptyLabel}</EmptyState>}</div></div>;
}

export function AttendanceNewPage() {
  const { currentStoreId, users } = useAppContext();
  const session = useSession(); const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false);
  const [error, setError] = useState(""); const [attempt, setAttempt] = useState(0);
  const [customerId, setCustomerId] = useState(searchParams.get("customer") ?? "");
  const [type, setType] = useState<AttendanceType>("CONSULTATION");
  const [professionalId, setProfessionalId] = useState("");
  const [priority, setPriority] = useState<AttendancePriority>("NORMAL");
  const [notes, setNotes] = useState("");
  const pending = useRef(false); const mounted = useRef(true);
  const canCreate = hasPermission(session.role, "attendance.create");
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    void receptionService.listCustomers()
      .then((loaded) => { if (active) setCustomers(loaded); })
      .catch((reason) => { if (active) setError(errorMessage(reason, "Não foi possível carregar os clientes.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]);
  const validCustomer = customers.some((customer) => customer.id === customerId);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending.current || !canCreate || !validCustomer) return;
    pending.current = true; setSaving(true); setError("");
    try {
      const attendance = await receptionService.startAttendance(customerId, currentStoreId, type, notes, { professionalId: professionalId || undefined, priority });
      if (!mounted.current) return;
      navigate(`/atendimentos/${attendance.id}`, { replace: true });
    } catch (reason) { if (mounted.current) setError(errorMessage(reason, "Não foi possível iniciar o atendimento.")); }
    finally { pending.current = false; if (mounted.current) setSaving(false); }
  }
  return <div className="page"><p className="eyebrow">Recepção</p><div className="page-title"><div><h1>Novo atendimento</h1><p className="page-intro">Informe cliente, tipo, profissional, prioridade e observações antes de enviar para a fila.</p></div><Link className="button secondary" to="/atendimentos">Voltar para a fila</Link></div>
    <form className="settings-form" onSubmit={(event) => void submit(event)}>
      <label>Cliente<select aria-label="Selecionar cliente" value={validCustomer ? customerId : ""} disabled={loading || saving} required onChange={(event) => setCustomerId(event.target.value)}><option value="">Selecionar cliente</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
      <label>Tipo<select aria-label="Tipo de atendimento" value={type} disabled={saving} onChange={(event) => setType(event.target.value as AttendanceType)}>{(Object.keys(attendanceTypeLabels) as AttendanceType[]).map((key) => <option key={key} value={key}>{attendanceTypeLabels[key]}</option>)}</select></label>
      <label>Profissional<select aria-label="Selecionar profissional" value={professionalId} disabled={saving} onChange={(event) => setProfessionalId(event.target.value)}><option value="">Sem profissional</option>{users.filter((user) => user.active).map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
      <label>Prioridade<select aria-label="Prioridade do atendimento" value={priority} disabled={saving} onChange={(event) => setPriority(event.target.value as AttendancePriority)}>{(Object.keys(attendancePriorityLabels) as AttendancePriority[]).map((key) => <option key={key} value={key}>{attendancePriorityLabels[key]}</option>)}</select></label>
      <label>Observações<input value={notes} disabled={saving} onChange={(event) => setNotes(event.target.value)} /></label>
      {!loading && customerId && !validCustomer && <p role="alert" className="error-text">Cliente não encontrado. Selecione um cliente cadastrado.</p>}
      {error && <p role="alert" className="error-text">{error}</p>}
      <div className="form-actions"><Button type="submit" disabled={saving || loading || !validCustomer}>{saving ? "Enviando…" : "Iniciar atendimento"}</Button></div>
    </form>
  </div>;
}

export function AttendanceDetailPage() {
  const { users } = useAppContext();
  const session = useSession();
  const { attendanceId = "" } = useParams();
  const [attendance, setAttendance] = useState<Attendance>(); const [customer, setCustomer] = useState<Customer>();
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false);
  const [error, setError] = useState(""); const [message, setMessage] = useState(""); const [attempt, setAttempt] = useState(0);
  const pending = useRef(false); const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    void (async () => {
      const loaded = await receptionService.getAttendance(attendanceId);
      return { loaded, owner: loaded ? await receptionService.getCustomer(loaded.customerId) : undefined };
    })()
      .then(({ loaded, owner }) => { if (active) { setAttendance(loaded); setCustomer(owner); } })
      .catch((reason) => { if (active) setError(errorMessage(reason, "Não foi possível abrir este atendimento.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attendanceId, attempt]);
  async function transition(to: AttendanceStatus) {
    if (pending.current || !attendance) return;
    pending.current = true; setSaving(true); setError(""); setMessage("");
    try {
      const updated = await receptionService.transitionAttendance(attendance.id, to);
      if (mounted.current) { setAttendance(updated); setMessage("Status do atendimento atualizado."); }
    } catch (reason) { if (mounted.current) setError(errorMessage(reason, "Não foi possível atualizar o atendimento.")); }
    finally { pending.current = false; if (mounted.current) setSaving(false); }
  }
  if (loading) return <div className="page" role="status">Carregando atendimento…</div>;
  if (error && !attendance) return <div className="page"><p role="alert" className="error-text">{error}</p><Button type="button" onClick={() => setAttempt((value) => value + 1)}>Tentar novamente</Button></div>;
  if (!attendance) return <div className="page"><h1>Atendimento não encontrado</h1><Link className="button" to="/atendimentos">Voltar para a fila</Link></div>;
  const canManage = hasPermission(session.role, "attendance.create");
  const priority = attendance.priority ?? "NORMAL";
  const professional = attendance.professionalId ? users.find((user) => user.id === attendance.professionalId)?.name : undefined;
  const actions: [string, AttendanceStatus][] = attendance.status === "WAITING"
    ? [["Iniciar atendimento", "IN_PROGRESS"], ["Cancelar", "CANCELLED"]]
    : attendance.status === "IN_PROGRESS"
      ? [["Finalizar atendimento", "FINISHED"], ["Cancelar", "CANCELLED"]]
      : [];
  return <div className="page"><p className="eyebrow">Recepção</p><div className="page-title"><div><h1>{attendanceTypeLabels[attendance.type]} · {customer?.name ?? "Cliente"}</h1><p className="page-intro">{new Date(attendance.createdAt).toLocaleString("pt-BR")} · {attendanceStatusLabels[attendance.status]}{priority === "URGENT" ? " · Urgente" : ""}</p></div><div className="page-title-actions"><Link className="button secondary" to="/atendimentos">Voltar para a fila</Link></div></div>
    <div className="list-card">
      <article className="list-row"><div><strong>Status</strong><span>{attendanceStatusLabels[attendance.status]}</span></div><span className="badge">{attendanceStatusLabels[attendance.status]}</span></article>
      <article className="list-row"><div><strong>Tipo</strong><span>{attendanceTypeLabels[attendance.type]}</span></div></article>
      <article className="list-row"><div><strong>Prioridade</strong><span>{attendancePriorityLabels[priority]}</span></div></article>
      <article className="list-row"><div><strong>Profissional</strong><span>{professional ?? "Sem profissional"}</span></div></article>
      <article className="list-row"><div><strong>Observações da recepção</strong><span>{attendance.receptionNotes || "Sem observações."}</span></div></article>
    </div>
    {message && <p role="status" className="success">{message}</p>}
    {error && <p role="alert" className="error-text">{error}</p>}
    {canManage && actions.length > 0 && <div className="form-actions">{actions.map(([label, toStatus]) => <Button key={toStatus} type="button" disabled={saving} onClick={() => void transition(toStatus)}>{label}</Button>)}</div>}
  </div>;
}

export function ClinicalQueuePage() {
  const { currentStoreId } = useAppContext(); const [queue, setQueue] = useState<Attendance[]>([]); const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadedStore, setLoadedStore] = useState(""); const [error, setError] = useState(""); const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true; setLoadedStore(""); setError("");
    void Promise.all([receptionService.listQueue(currentStoreId), receptionService.listCustomers()])
      .then(([items, clients]) => { if (active) { setQueue(items.filter((item) => item.status === "WAITING" || item.status === "IN_PROGRESS")); setCustomers(clients); setLoadedStore(currentStoreId); } })
      .catch((reason) => { if (active) setError(errorMessage(reason, "Não foi possível carregar a fila.")); });
    return () => { active = false; };
  }, [currentStoreId, attempt]);
  return <div className="page"><p className="eyebrow">Área clínica</p><div className="page-title"><div><h1>Consultas em andamento</h1><p className="page-intro">Abra uma consulta ou continue um rascunho. Consultas finalizadas ficam no histórico do cliente.</p></div><Link className="button" to="/clientes">Buscar cliente</Link></div>{error && <p role="alert">{error} <Button onClick={() => setAttempt((value) => value + 1)}>Tentar novamente</Button></p>}<div className="list-card">{error ? null : loadedStore !== currentStoreId ? <p role="status">Carregando fila…</p> : queue.length ? queue.map((attendance) => <Link className="list-row list-link" key={attendance.id} to={`/clinico/atendimento/${attendance.id}`}><div><strong>{customers.find((customer) => customer.id === attendance.customerId)?.name ?? "Cliente"}</strong><span>{attendanceStatusLabels[attendance.status]}</span></div><span className="badge">{attendance.status === "IN_PROGRESS" ? "Continuar consulta" : "Abrir consulta"}</span></Link>) : <p className="empty-state">Não há consultas aguardando ou em andamento nesta loja.</p>}</div></div>;
}
