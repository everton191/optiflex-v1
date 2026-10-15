import { useEffect, useRef, useState } from "react";
import { errorMessage } from "../domain/errors";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAppContext, useSession } from "./providers";
import { Button, EmptyState, Input, PageHeader, Search, Skeleton } from "../design-system/components";
import { hasPermission } from "../domain/access";
import type { Attendance, Customer } from "../domain/customer";
import { findDuplicateCustomer } from "../domain/customer";
import { ReceptionService } from "../domain/reception-service";
import { LocalAttendanceRepository, LocalCustomerRepository } from "../infrastructure/storage/local-repositories";
import { attendanceStatusLabels, attendanceTypeLabels } from "./ReceptionWorkspace";

const receptionService = new ReceptionService(new LocalCustomerRepository(), new LocalAttendanceRepository());

export function CustomersPage() {
  const session = useSession();
  const [customers, setCustomers] = useState<Customer[]>([]); const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    void receptionService.listCustomers(query).then((items) => { if (active) setCustomers(items); })
      .catch((reason) => { if (active) setError(errorMessage(reason, "Não foi possível carregar os clientes.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [query, attempt]);
  return <div className="page"><PageHeader eyebrow="Recepção" title="Clientes" intro="Encontre ou cadastre clientes para iniciar um atendimento." actions={hasPermission(session.role, "customers.manage") && <Link className="button" to="/clientes/novo">Novo cliente</Link>} /><Search aria-label="Buscar cliente" placeholder="Buscar por nome, CPF ou telefone" value={query} onChange={(event) => setQuery(event.target.value)} />{error && <p role="alert">{error} <Button type="button" onClick={() => setAttempt((value) => value + 1)}>Tentar novamente</Button></p>}<div className="list-card">{loading ? <Skeleton label="Carregando clientes…" /> : !error && (customers.length ? customers.map((customer) => <Link className="list-row list-link" key={customer.id} to={`/clientes/${customer.id}`}><div><strong>{customer.name}</strong><span>{customer.cpf || customer.phone || "Sem documento ou telefone"}</span></div></Link>) : <EmptyState>Nenhum cliente encontrado.</EmptyState>)}</div></div>;
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
      .catch((reason) => { if (active) setError(errorMessage(reason, "Não foi possível abrir este cliente.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [customerId, attempt]);
  if (loading) return <div className="page" role="status">Carregando cliente…</div>;
  if (error) return <div className="page"><p role="alert">{error}</p><Button type="button" onClick={() => setAttempt((value) => value + 1)}>Tentar novamente</Button></div>;
  if (!customer) return <div className="page"><h1>Cliente não encontrado</h1></div>;
  return <div className="page"><p className="eyebrow">Cliente</p><div className="page-title"><div><h1>{customer.name}</h1><p className="page-intro">{customer.phone || "Sem telefone"} · {customer.cpf || "Sem CPF"}{customer.email ? ` · ${customer.email}` : ""}{customer.birthDate ? ` · ${new Date(customer.birthDate).toLocaleDateString("pt-BR")}` : ""}</p></div><div className="page-title-actions">{hasPermission(session.role, "customers.manage") && <Link className="button secondary" to={`/clientes/${customer.id}/editar`}>Editar cadastro</Link>}{hasPermission(session.role, "attendance.create") && <Link className="button" to={`/atendimentos?customer=${customer.id}`}>Novo atendimento</Link>}</div></div><h2 className="section-title">Histórico de atendimentos</h2><div className="list-card">{history.length ? history.map((item) => <article className="list-row" key={item.id}><div><strong>{attendanceTypeLabels[item.type]}</strong><span>{new Date(item.createdAt).toLocaleString("pt-BR")}</span>{hasPermission(session.role, "clinical.workspace.access") && item.status !== "CANCELLED" && (item.storeId === currentStoreId ? <Link to={`/clinico/atendimento/${item.id}`}>Ver consulta e versões</Link> : <small>Consulta de outra loja — selecione a loja correspondente para acessar.</small>)}{hasPermission(session.role, "attendance.read") && (!hasPermission(session.role, "clinical.workspace.access") || item.status === "CANCELLED") && <Link to={`/atendimentos/${item.id}`}>Ver detalhe</Link>}</div><span className="badge">{attendanceStatusLabels[item.status]}</span></article>) : <p className="empty-state">Nenhum atendimento registrado.</p>}</div></div>;
}

export function CustomerNewPage() {
  const session = useSession();
  const navigate = useNavigate(); const [name, setName] = useState(""); const [phone, setPhone] = useState(""); const [cpf, setCpf] = useState("");
  const [saving, setSaving] = useState(false); const [error, setError] = useState(""); const pending = useRef(false);
  const [known, setKnown] = useState<Customer[]>([]); const [duplicate, setDuplicate] = useState<Customer>();
  const [override, setOverride] = useState(false); const [overrideReason, setOverrideReason] = useState("");
  const canStart = hasPermission(session.role, "attendance.create");
  useEffect(() => { void receptionService.listCustomers("").then((items) => setKnown(items)).catch(() => setKnown([])); }, []);
  function change(setter: (value: string) => void) {
    return (event: React.ChangeEvent<HTMLInputElement>) => { setter(event.target.value); setDuplicate(undefined); setOverride(false); setOverrideReason(""); };
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending.current || !hasPermission(session.role, "customers.manage")) return;
    if (!override) {
      const found = findDuplicateCustomer(known, { name, phone, cpf });
      if (found) { setDuplicate(found); setError(""); return; }
    }
    pending.current = true; setSaving(true); setError("");
    try {
      const customer = await receptionService.createCustomer({ name, phone, cpf });
      navigate(canStart ? `/atendimentos?customer=${customer.id}` : `/clientes/${customer.id}`);
    } catch (reason) { setError(errorMessage(reason, !name.trim() ? "Informe o nome do cliente." : "Não foi possível salvar o cliente. Tente novamente.")); }
    finally { pending.current = false; setSaving(false); }
  }
  return <div className="page"><p className="eyebrow">Recepção</p><h1>Novo cliente</h1><form className="settings-form" onSubmit={submit}><label>Nome completo<Input value={name} onChange={change(setName)} disabled={saving} required /></label><label>Telefone<Input value={phone} onChange={change(setPhone)} disabled={saving} /></label><label>CPF/CNPJ<Input value={cpf} onChange={change(setCpf)} disabled={saving} /></label>{duplicate && <div className="notice" role="alert"><p>Possível cliente duplicado: <strong>{duplicate.name}</strong>{duplicate.phone ? ` · ${duplicate.phone}` : ""}{duplicate.cpf ? ` · ${duplicate.cpf}` : ""} já está cadastrado. Cadastrar de novo quebra histórico e financeiro.</p>{override ? <label>Motivo para cadastrar mesmo assim<Input value={overrideReason} onChange={(event) => setOverrideReason(event.target.value)} disabled={saving} required /></label> : <div className="form-actions"><Button type="button" onClick={() => setOverride(true)} disabled={saving}>Cadastrar mesmo assim</Button><Button type="button" onClick={() => { setDuplicate(undefined); setOverride(false); }} disabled={saving}>Revisar cadastro</Button></div>}</div>}{error && <p role="alert" className="error-text">{error}</p>}<Button type="submit" disabled={saving}>{saving ? "Salvando…" : canStart ? "Salvar e iniciar atendimento" : "Salvar cliente"}</Button></form></div>;
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
      .catch((reason) => { if (active) setError(errorMessage(reason, "Não foi possível abrir este cliente.")); })
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
    } catch (reason) { setError(errorMessage(reason, "Não foi possível salvar as alterações. Tente novamente.")); }
    finally { pending.current = false; setSaving(false); }
  }
  if (loading) return <div className="page" role="status">Carregando cliente…</div>;
  return <div className="page"><p className="eyebrow">Cliente</p><h1>Editar cadastro</h1>{error && !saving && <p role="alert" className="error-text">{error} <Button type="button" onClick={() => setAttempt((value) => value + 1)}>Tentar novamente</Button></p>}<form className="settings-form" onSubmit={submit}><label>Nome completo<Input value={name} onChange={(event) => setName(event.target.value)} disabled={saving} required /></label><label>Telefone<Input value={phone} onChange={(event) => setPhone(event.target.value)} disabled={saving} /></label><label>CPF/CNPJ<Input value={cpf} onChange={(event) => setCpf(event.target.value)} disabled={saving} /></label><label>E-mail<Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={saving} /></label><label>Data de nascimento<Input type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} disabled={saving} /></label>{error && saving && <p role="alert" className="error-text">{error}</p>}<div className="form-actions"><Button type="submit" disabled={saving}>{saving ? "Salvando…" : "Salvar alterações"}</Button><Button type="button" onClick={() => navigate(`/clientes/${customerId}`)} disabled={saving}>Cancelar</Button></div></form></div>;
}
