import { useEffect, useRef, useState } from "react";
import { errorMessage } from "../domain/errors";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAppContext, useSession } from "./providers";
import { Button, DataTable, DateInput, DocumentInput, Input, PageHeader, Search, Skeleton } from "../design-system/components";
import { dateInputError, documentError, formatDocument, formatDateBR } from "../domain/field-rules";
import { hasPermission } from "../domain/access";
import type { Customer } from "../domain/customer";
import { findDuplicateCustomer } from "../domain/customer";
import { CustomerHistoryService } from "../domain/customer-history-service";
import { customerHistoryKinds, customerHistoryKindLabels, historyKindsFor, type CustomerHistoryEvent, type CustomerHistoryKind } from "../domain/customer-history";
import { canViewClinicalHistory, customerClinicalDocumentKinds, customerClinicalDocumentKindLabels, type CustomerClinicalDocument, type CustomerClinicalDocumentKind } from "../domain/customer-clinical-history";
import { ReceptionService } from "../domain/reception-service";
import { LocalAttendanceRepository, LocalCashRepository, LocalClinicalRepository, LocalCustomerRepository, LocalPrescriptionRepository, LocalSaleRepository, LocalWorkOrderRepository } from "../infrastructure/storage/local-repositories";

const receptionService = new ReceptionService(new LocalCustomerRepository(), new LocalAttendanceRepository());
const historyService = new CustomerHistoryService(new LocalAttendanceRepository(), new LocalSaleRepository(), new LocalWorkOrderRepository(), new LocalCashRepository(), new LocalPrescriptionRepository(), new LocalClinicalRepository());

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
  return <div className="page"><PageHeader eyebrow="Recepção" title="Clientes" intro="Encontre ou cadastre clientes para iniciar um atendimento." actions={hasPermission(session.role, "customers.manage") && <Link className="button" to="/clientes/novo">Novo cliente</Link>} /><Search aria-label="Buscar cliente" placeholder="Buscar por nome, CPF ou telefone" value={query} onChange={(event) => setQuery(event.target.value)} />{error && <p role="alert">{error} <Button type="button" onClick={() => setAttempt((value) => value + 1)}>Tentar novamente</Button></p>}{loading ? <Skeleton label="Carregando clientes…" /> : !error && <DataTable label="Lista de clientes" rows={customers} columns={[{ key: "name", label: "Nome", value: (customer) => customer.name }, { key: "document", label: "Documento", value: (customer) => customer.cpf || customer.phone || "Sem documento ou telefone" }]} rowKey={(customer) => customer.id} pageSize={10} emptyMessage="Nenhum cliente encontrado." renderRow={(customer) => <><td><Link to={`/clientes/${customer.id}`}><strong>{customer.name}</strong></Link></td><td>{customer.cpf || customer.phone || "Sem documento ou telefone"}</td></>} />}</div>;
}

export function CustomerProfilePage() {
  const { currentStoreId } = useAppContext();
  const session = useSession();
  const { customerId = "" } = useParams(); const [customer, setCustomer] = useState<Customer>(); const [events, setEvents] = useState<CustomerHistoryEvent[]>([]);
  const [documents, setDocuments] = useState<CustomerClinicalDocument[]>([]);
  const [kindFilter, setKindFilter] = useState<"" | CustomerHistoryKind>("");
  const [documentKindFilter, setDocumentKindFilter] = useState<"" | CustomerClinicalDocumentKind>("");
  const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [attempt, setAttempt] = useState(0);
  const visibleKinds = historyKindsFor(session.role);
  const canClinical = canViewClinicalHistory(session.role);
  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    void Promise.all([
      receptionService.getCustomer(customerId),
      historyService.list(customerId, { storeId: currentStoreId, role: session.role }),
      canClinical ? historyService.listClinicalDocuments(customerId, { storeId: currentStoreId, role: session.role }) : Promise.resolve([] as CustomerClinicalDocument[])
    ])
      .then(([loadedCustomer, loadedHistory, loadedDocuments]) => { if (active) { setCustomer(loadedCustomer); setEvents(loadedHistory); setDocuments(loadedDocuments); } })
      .catch((reason) => { if (active) setError(errorMessage(reason, "Não foi possível abrir este cliente.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [customerId, currentStoreId, session.role, attempt, canClinical]);
  const timeline = events.filter((event) => !kindFilter || event.kind === kindFilter);
  const clinicalDocuments = documents.filter((document) => !documentKindFilter || document.kind === documentKindFilter);
  if (loading) return <div className="page" role="status">Carregando cliente…</div>;
  if (error) return <div className="page"><p role="alert">{error}</p><Button type="button" onClick={() => setAttempt((value) => value + 1)}>Tentar novamente</Button></div>;
  if (!customer) return <div className="page"><h1>Cliente não encontrado</h1></div>;
  return <div className="page"><p className="eyebrow">Cliente</p><div className="page-title"><div><h1>{customer.name}</h1><p className="page-intro">{customer.phone || "Sem telefone"} · {customer.cpf || "Sem CPF"}{customer.email ? ` · ${customer.email}` : ""}{customer.birthDate ? ` · ${formatDateBR(customer.birthDate)}` : ""}</p></div><div className="page-title-actions">{hasPermission(session.role, "customers.manage") && <Link className="button secondary" to={`/clientes/${customer.id}/editar`}>Editar cadastro</Link>}{hasPermission(session.role, "attendance.create") && <Link className="button" to={`/atendimentos?customer=${customer.id}`}>Novo atendimento</Link>}</div></div><h2 className="section-title">Histórico</h2>
    <div className="status-filters" role="tablist" aria-label="Filtrar histórico por tipo">
      <button type="button" role="tab" aria-selected={kindFilter === ""} className={kindFilter === "" ? "active" : ""} onClick={() => setKindFilter("")}>Todos <span>{events.length}</span></button>
      {customerHistoryKinds.filter((kind) => visibleKinds.includes(kind)).map((kind) => <button key={kind} type="button" role="tab" aria-selected={kindFilter === kind} className={kindFilter === kind ? "active" : ""} onClick={() => setKindFilter(kind)}>{customerHistoryKindLabels[kind]} <span>{events.filter((event) => event.kind === kind).length}</span></button>)}
    </div>
    <div className="list-card">{timeline.length ? timeline.map((event) => <article className="list-row" key={event.id}><div><strong>{event.title}</strong><span>{new Date(event.at).toLocaleString("pt-BR")} · {customerHistoryKindLabels[event.kind]}</span>{event.otherStore && <small>Outra loja — troque de loja no topo para abrir o registro.</small>}</div><div>{event.detail && <span className="badge">{event.detail}</span>}{event.href && <Link to={event.href}>Ver registro</Link>}</div></article>) : <p className="empty-state">Nenhum registro no histórico para esta loja.</p>}</div>
    {canClinical && <><h2 className="section-title">Guia clínica</h2>
      <div className="status-filters" role="tablist" aria-label="Filtrar documentos clínicos por tipo">
        <button type="button" role="tab" aria-selected={documentKindFilter === ""} className={documentKindFilter === "" ? "active" : ""} onClick={() => setDocumentKindFilter("")}>Todos <span>{documents.length}</span></button>
        {customerClinicalDocumentKinds.filter((kind) => documents.some((document) => document.kind === kind)).map((kind) => <button key={kind} type="button" role="tab" aria-selected={documentKindFilter === kind} className={documentKindFilter === kind ? "active" : ""} onClick={() => setDocumentKindFilter(kind)}>{customerClinicalDocumentKindLabels[kind]} <span>{documents.filter((document) => document.kind === kind).length}</span></button>)}
      </div>
      <div className="list-card">{clinicalDocuments.length ? clinicalDocuments.map((document) => <article className="list-row" key={document.id}><div><strong>{document.title}</strong><span>{new Date(document.at).toLocaleString("pt-BR")} · {customerClinicalDocumentKindLabels[document.kind]}</span>{document.otherStore && <small>Outra loja — troque de loja no topo para abrir o documento.</small>}</div><div>{document.detail && <span className="badge">{document.detail}</span>}{document.href && <Link to={document.href}>Abrir consulta</Link>}</div></article>) : <p className="empty-state">Nenhum documento clínico para este cliente.</p>}</div></>}</div>;
}

export function CustomerNewPage() {
  const session = useSession();
  const navigate = useNavigate(); const [name, setName] = useState(""); const [phone, setPhone] = useState(""); const [cpf, setCpf] = useState("");
  const [saving, setSaving] = useState(false); const [error, setError] = useState(""); const pending = useRef(false);
  const [known, setKnown] = useState<Customer[]>([]); const [duplicate, setDuplicate] = useState<Customer>();
  const [override, setOverride] = useState(false); const [overrideReason, setOverrideReason] = useState("");
  const canStart = hasPermission(session.role, "attendance.create");
  const cpfIssue = documentError(cpf);
  useEffect(() => { void receptionService.listCustomers("").then((items) => setKnown(items)).catch(() => setKnown([])); }, []);
  function change(setter: (value: string) => void) {
    return (event: React.ChangeEvent<HTMLInputElement>) => { setter(event.target.value); setDuplicate(undefined); setOverride(false); setOverrideReason(""); };
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending.current || !hasPermission(session.role, "customers.manage")) return;
    if (cpfIssue) { setError(cpfIssue); return; }
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
  return <div className="page"><p className="eyebrow">Recepção</p><h1>Novo cliente</h1><form className="settings-form" onSubmit={submit}><label>Nome completo<Input value={name} onChange={change(setName)} disabled={saving} required /></label><label>Telefone<Input value={phone} onChange={change(setPhone)} disabled={saving} /></label><label>CPF/CNPJ<DocumentInput value={cpf} onValueChange={(next) => { setCpf(next); setDuplicate(undefined); setOverride(false); setOverrideReason(""); }} disabled={saving} /></label>{cpfIssue && <p className="error-text" role="alert">{cpfIssue}</p>}{duplicate && <div className="notice" role="alert"><p>Possível cliente duplicado: <strong>{duplicate.name}</strong>{duplicate.phone ? ` · ${duplicate.phone}` : ""}{duplicate.cpf ? ` · ${duplicate.cpf}` : ""} já está cadastrado. Cadastrar de novo quebra histórico e financeiro.</p>{override ? <label>Motivo para cadastrar mesmo assim<Input value={overrideReason} onChange={(event) => setOverrideReason(event.target.value)} disabled={saving} required /></label> : <div className="form-actions"><Button type="button" onClick={() => setOverride(true)} disabled={saving}>Cadastrar mesmo assim</Button><Button type="button" onClick={() => { setDuplicate(undefined); setOverride(false); }} disabled={saving}>Revisar cadastro</Button></div>}</div>}{error && <p role="alert" className="error-text">{error}</p>}<Button type="submit" disabled={saving}>{saving ? "Salvando…" : canStart ? "Salvar e iniciar atendimento" : "Salvar cliente"}</Button></form></div>;
}

export function CustomerEditPage() {
  const session = useSession();
  const navigate = useNavigate(); const { customerId = "" } = useParams();
  const [name, setName] = useState(""); const [phone, setPhone] = useState(""); const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState(""); const [birthDate, setBirthDate] = useState("");
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false);
  const [error, setError] = useState(""); const [attempt, setAttempt] = useState(0); const pending = useRef(false);
  const cpfIssue = documentError(cpf); const birthDateIssue = dateInputError(birthDate, { notFuture: true });
  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    void receptionService.getCustomer(customerId)
      .then((customer) => {
        if (!active) return;
        if (!customer) { setError("Cliente não encontrado."); return; }
        setName(customer.name); setPhone(customer.phone ?? ""); setCpf(formatDocument(customer.cpf ?? "")); setEmail(customer.email ?? ""); setBirthDate(customer.birthDate ?? "");
      })
      .catch((reason) => { if (active) setError(errorMessage(reason, "Não foi possível abrir este cliente.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [customerId, attempt]);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending.current || !hasPermission(session.role, "customers.manage")) return;
    if (cpfIssue) { setError(cpfIssue); return; }
    if (birthDateIssue) { setError(birthDateIssue); return; }
    pending.current = true; setSaving(true); setError("");
    try {
      await receptionService.updateCustomer(customerId, { name, phone, cpf, email, birthDate });
      navigate(`/clientes/${customerId}`);
    } catch (reason) { setError(errorMessage(reason, "Não foi possível salvar as alterações. Tente novamente.")); }
    finally { pending.current = false; setSaving(false); }
  }
  if (loading) return <div className="page" role="status">Carregando cliente…</div>;
  return <div className="page"><p className="eyebrow">Cliente</p><h1>Editar cadastro</h1>{error && !saving && <p role="alert" className="error-text">{error} <Button type="button" onClick={() => setAttempt((value) => value + 1)}>Tentar novamente</Button></p>}<form className="settings-form" onSubmit={submit}><label>Nome completo<Input value={name} onChange={(event) => setName(event.target.value)} disabled={saving} required /></label><label>Telefone<Input value={phone} onChange={(event) => setPhone(event.target.value)} disabled={saving} /></label><label>CPF/CNPJ<DocumentInput value={cpf} onValueChange={setCpf} disabled={saving} /></label>{cpfIssue && <p className="error-text" role="alert">{cpfIssue}</p>}<label>E-mail<Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={saving} /></label><label>Data de nascimento<DateInput value={birthDate} onChange={(event) => setBirthDate(event.target.value)} disabled={saving} /></label>{birthDateIssue && <p className="error-text" role="alert">{birthDateIssue}</p>}{error && saving && <p role="alert" className="error-text">{error}</p>}<div className="form-actions"><Button type="submit" disabled={saving}>{saving ? "Salvando…" : "Salvar alterações"}</Button><Button type="button" onClick={() => navigate(`/clientes/${customerId}`)} disabled={saving}>Cancelar</Button></div></form></div>;
}
