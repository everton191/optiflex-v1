import { useEffect, useRef, useState } from "react";
import { errorMessage } from "../domain/errors";
import { Badge, Button, DocumentInput, EmptyState, HelpTip, Input, PageHeader, Select, Skeleton, Table } from "../design-system/components";
import { allPermissions, hasPermission, roleDefinitions } from "../domain/access";
import type { RoleKey, Store, TaxRegime, User } from "../domain/access";
import { formatCnae, taxRegimeLabels } from "../domain/organization";
import { AuditService } from "../domain/audit-service";
import { auditActions, auditActionLabels, auditEntities, auditEntityLabels, type AuditAction, type AuditEntity, type AuditEntry } from "../domain/audit";
import { useAppContext, useSession } from "./providers";
import { BackupPanel } from "./BackupPanel";
import { LocalAuditRepository, LocalSupplierRepository } from "../infrastructure/storage/local-repositories";
import { SupplierService } from "../domain/supplier-service";
import { formatDocument } from "../domain/field-rules";
import { supplierKindLabels, supplierKinds, supplierListFilter, type Supplier, type SupplierKind } from "../domain/supplier";

const auditService = new AuditService(new LocalAuditRepository());
const supplierService = new SupplierService(new LocalSupplierRepository());

const scopeLabels = { SELF: "Próprio usuário", STORE: "Loja", ORGANIZATION: "Empresa", NETWORK: "Todas as lojas" } as const;
const roleDescriptions = { OWNER: "Acesso completo a todas as lojas.", NETWORK_ADMINISTRATOR: "Administra lojas, usuários e configurações.", STORE_MANAGER: "Acompanha a operação da própria loja.", RECEPTIONIST: "Atende clientes e organiza a fila.", CLINICAL_PROFESSIONAL: "Preenche prontuários, exames e prescrições.", SELLER: "Cria orçamentos e registra vendas.", CASHIER: "Registra recebimentos e movimentações do caixa.", STOCK_MANAGER: "Controla produtos e quantidades.", FINANCE: "Acompanha cobranças e resultados financeiros.", AUDITOR: "Consulta informações e relatórios sem alterar dados." } as const;

export function SettingsPage() {
  const { settings, saveSettings } = useAppContext();
  const [draft, setDraft] = useState(settings);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaved(false); setError("");
    try { await saveSettings(draft); setSaved(true); } catch (reason) { setError(errorMessage(reason, "Não foi possível salvar as configurações.")); }
  }
  const field = (key: keyof typeof draft) => ({ value: draft[key] ?? "", onChange: (event: React.ChangeEvent<HTMLInputElement>) => { setSaved(false); setDraft({ ...draft, [key]: event.target.value }); } });
  return <div className="page"><p className="eyebrow">Administração</p><h1>Configurações da organização</h1><form className="settings-form" onSubmit={submit}>
    <label>Nome da organização<Input value={draft.organizationName} onChange={(event) => { setSaved(false); setDraft({ ...draft, organizationName: event.target.value }); }} required /></label>
    <label>Cargo exibido na área clínica<Input value={draft.clinicalProfessionalLabel} onChange={(event) => { setSaved(false); setDraft({ ...draft, clinicalProfessionalLabel: event.target.value }); }} required /></label>
    <p className="help-text">Use o nome adotado pela empresa, como Médico, Oftalmologista ou Profissional autorizado.</p>
    <h2>Dados da empresa</h2>
    <label>Razão social<Input {...field("legalName")} placeholder="Opcional" /></label>
    <label>CNPJ<DocumentInput kind="CNPJ" value={draft.cnpj ?? ""} placeholder="00.000.000/0000-00" onValueChange={(next) => { setSaved(false); setDraft({ ...draft, cnpj: next }); }} /></label>
    <label>Regime tributário<HelpTip label="Regime tributário">Define o regime da empresa (Simples Nacional, Lucro Presumido etc.). Opcional; as regras fiscais da Fase 6 vão usá-lo.</HelpTip><select aria-label="Regime tributário" value={draft.taxRegime ?? ""} onChange={(event) => { setSaved(false); setDraft({ ...draft, taxRegime: (event.target.value || undefined) as TaxRegime | undefined }); }}><option value="">Opcional</option>{(Object.keys(taxRegimeLabels) as TaxRegime[]).map((regime) => <option key={regime} value={regime}>{taxRegimeLabels[regime]}</option>)}</select></label>
    <label>Inscrição estadual (IE)<Input {...field("stateRegistration")} placeholder="Opcional ou ISENTO" onChange={(event) => { setSaved(false); setDraft({ ...draft, stateRegistration: event.target.value.toUpperCase() }); }} /></label>
    <label>Inscrição municipal (IM)<Input {...field("municipalRegistration")} placeholder="Opcional" onChange={(event) => { setSaved(false); setDraft({ ...draft, municipalRegistration: event.target.value.toUpperCase() }); }} /></label>
    <label>CNAE principal<Input {...field("cnae")} inputMode="numeric" placeholder="4773-5/02" onChange={(event) => { setSaved(false); setDraft({ ...draft, cnae: formatCnae(event.target.value) }); }} /></label>
    <label>Telefone<Input {...field("phone")} placeholder="Opcional" /></label>
    <label>E-mail<Input {...field("email")} type="email" placeholder="Opcional" /></label>
    <h2>Endereço</h2>
    <label>Rua<Input {...field("addressStreet")} placeholder="Opcional" /></label>
    <label>Número<Input {...field("addressNumber")} placeholder="Opcional" /></label>
    <label>Bairro<Input {...field("addressDistrict")} placeholder="Opcional" /></label>
    <label>Cidade<Input {...field("addressCity")} placeholder="Opcional" /></label>
    <label>UF<Input {...field("addressState")} maxLength={2} placeholder="Opcional" onChange={(event) => { setSaved(false); setDraft({ ...draft, addressState: event.target.value.toUpperCase() }); }} /></label>
    <label>CEP<Input {...field("addressZip")} inputMode="numeric" placeholder="00000-000" /></label>
    <p className="help-text">Campos opcionais: o CNPJ, e-mail e CEP são validados quando preenchidos; regime, IE, IM e CNAE alimentam documentos fiscais (Fase 6) e o endereço acima é o endereço fiscal da empresa.</p>
    <div className="form-actions"><Button type="submit">Salvar alterações</Button>{saved && <span className="success">Configuração salva.</span>}{error && <span className="error-text" role="alert">{error}</span>}</div>
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
    try { setMessage(await action()); } catch (reason) { setError(errorMessage(reason, fallback)); } finally { pending.current = false; }
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
    <PageHeader eyebrow="Administração" title="Usuários" intro="Cadastre quem usa o sistema, defina a função e as lojas em que cada pessoa pode trabalhar." actions={canManage && <Button type="button" onClick={() => resetForm(!formOpen || Boolean(editing))}>{formOpen && !editing ? "Fechar" : "Novo usuário"}</Button>} />
    {message && <p className="notice success" role="status">{message}</p>}
    {error && <p className="notice error-text" role="alert">{error}</p>}

    {canManage && formOpen && <form className="settings-form" onSubmit={saveUser}>
      <label>Nome<Input value={name} onChange={(event) => setName(event.target.value)} required /></label>
      <label>E-mail<Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
      <label>{editing ? "Nova senha (opcional)" : "Senha (opcional)"}<Input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={editing && editing.passwordHash ? "Deixe em branco para manter a atual" : "Mínimo de 8 caracteres"} /></label>
      <p className="help-text">Sem senha, o acesso só é possível pela demonstração em /login. Defina uma senha para entrar com e-mail e senha.</p>
      <Select label="Função" value={role} onChange={(event) => setRole(event.target.value as RoleKey)}>{roleDefinitions.map((definition) => <option key={definition.key} value={definition.key}>{definition.label}</option>)}</Select>
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

    <Table label="Usuários cadastrados">
      <thead><tr><th scope="col">Usuário</th><th scope="col">Função, lojas e status</th>{canManage && <th scope="col">Ações</th>}</tr></thead>
      <tbody>{users.map((user) => {
        const isSessionUser = user.name === session.userName;
        return <tr key={user.id}>
          <td><div className="cell-stack"><strong>{user.name}</strong><span className="help-text">{user.email}</span></div></td>
          <td><div className="cell-stack"><Badge>{roleDefinitions.find((definition) => definition.key === user.role)?.label}</Badge><small>{scopeLabels[user.scope]} · {user.storeIds.map(storeName).join(", ") || "—"}</small><small>{user.active ? "Ativo" : "Inativo"}{isSessionUser ? " · sessão atual" : ""}</small><small className="help-text">{user.passwordHash ? "Senha definida" : "Sem senha local"}</small></div></td>
          {canManage && <td><div className="table-actions">
            <Button type="button" onClick={() => editUser(user)}>Editar</Button>
            <Button type="button" disabled={isSessionUser && user.active} onClick={() => void toggleActive(user)}>{user.active ? "Inativar" : "Reativar"}</Button>
          </div></td>}
        </tr>;
      })}</tbody>
    </Table>
  </div>;
}

export function StoresPage() {
  const { stores, currentStoreId, createStore, updateStore, setStoreActive } = useAppContext();
  const session = useSession();
  const canManage = hasPermission(session.role, "stores.manage");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Store>();
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const pending = useRef(false);

  function resetForm(open: boolean) { setFormOpen(open); setEditing(undefined); setName(""); }
  function editStore(store: Store) { setFormOpen(true); setEditing(store); setName(store.name); }

  async function run(action: () => Promise<string>, fallback: string) {
    if (pending.current || !canManage) return;
    pending.current = true; setMessage(""); setError("");
    try { setMessage(await action()); } catch (reason) { setError(errorMessage(reason, fallback)); } finally { pending.current = false; }
  }

  async function saveStore(event: React.FormEvent) {
    event.preventDefault();
    await run(async () => {
      if (editing) { await updateStore(editing.id, { name }); resetForm(false); return "Loja atualizada."; }
      await createStore({ name }); resetForm(false); return "Filial criada e já disponível no seletor de loja.";
    }, "Não foi possível salvar a loja.");
  }

  async function toggleActive(store: Store) {
    await run(async () => { await setStoreActive(store.id, !store.active); return store.active ? "Loja inativada. Os dados permanecem no sistema." : "Loja reativada."; }, "Não foi possível alterar o status da loja.");
  }

  return <div className="page">
    <div className="page-title">
      <div><p className="eyebrow">Administração</p><h1>Lojas</h1><p className="page-intro">Cadastre filiais, renomeie ou inative sem apagar histórico: a loja inativa sai do seletor e volta intacta ao reativar.</p></div>
      {canManage && <Button type="button" onClick={() => resetForm(!formOpen || Boolean(editing))}>{formOpen && !editing ? "Fechar" : "Nova loja"}</Button>}
    </div>
    {message && <p className="notice success" role="status">{message}</p>}
    {error && <p className="notice error-text" role="alert">{error}</p>}

    {canManage && formOpen && <form className="settings-form" onSubmit={saveStore}>
      <label>Nome da loja<Input value={name} onChange={(event) => setName(event.target.value)} required /></label>
      <div className="form-actions">
        <Button type="submit">{editing ? "Salvar alterações" : "Criar filial"}</Button>
        <Button type="button" onClick={() => resetForm(false)}>Cancelar</Button>
      </div>
      <p className="help-text">{editing ? "Renomear não afeta vendas, estoque ou usuários vinculados." : "A nova loja entra no seletor do topo na hora e pode receber usuários em Usuários."}</p>
    </form>}

    <div className="list-card">{stores.map((store) => <article className="list-row" key={store.id}>
      <div><strong>{store.name}</strong><span>{store.id === currentStoreId ? "Loja atual" : store.active ? "Ativa" : "Inativa"}</span></div>
      <div><Badge tone={store.active ? "neutral" : "danger"}>{store.active ? "Ativa" : "Inativa"}</Badge>
        {canManage && <><Button type="button" onClick={() => editStore(store)}>Editar</Button>
        <Button type="button" disabled={store.id === currentStoreId && store.active} onClick={() => void toggleActive(store)}>{store.active ? "Inativar" : "Reativar"}</Button></>}
      </div>
    </article>)}</div>
    <p className="help-text">A loja atual não pode ser inativada — troque de loja antes. Inativar não apaga vendas, estoque, movimentos nem vínculos de usuários.</p>
  </div>;
}

function PermissionsMatrix() {
  return <div className="matrix-wrap"><table className="permissions-matrix"><caption className="help-text">Matriz de permissões — • = permitido para o perfil.</caption><thead><tr><th scope="col">Permissão</th>{roleDefinitions.map((role) => <th scope="col" key={role.key}>{role.label}<br /><small>{scopeLabels[role.scope]}</small></th>)}</tr></thead><tbody>{allPermissions.map((permission) => <tr key={permission}><th scope="row">{permission}</th>{roleDefinitions.map((role) => <td key={role.key}>{hasPermission(role.key, permission) ? "•" : "·"}</td>)}</tr>)}</tbody></table></div>;
}

export function ProfilesPage() {
  return <div className="page"><p className="eyebrow">Administração</p><h1>Perfis de acesso</h1><p className="page-intro">Cada perfil libera somente as áreas necessárias para o trabalho da pessoa. A troca de função/lojas de um usuário em Usuários reflete no menu e nas rotas sem recarregar.</p><div className="list-card">{roleDefinitions.map((role) => <article className="list-row role-row" key={role.key}><div><strong>{role.label}</strong><span>{roleDescriptions[role.key]}</span></div><small>{scopeLabels[role.scope]}</small></article>)}</div><h2 className="section-title">Matriz de permissões</h2><PermissionsMatrix /></div>;
}

export function AuditPage() {
  const { stores } = useAppContext();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [action, setAction] = useState("");
  const [entity, setEntity] = useState("");
  const [author, setAuthor] = useState("");
  const authorFilter = author.trim();
  const storeName = (storeId: string) => stores.find((store) => store.id === storeId)?.name ?? "Empresa (sem loja)";

  async function refresh() {
    try {
      const rows = await auditService.list({ action: (action || undefined) as AuditAction | undefined, entity: (entity || undefined) as AuditEntity | undefined, author: authorFilter || undefined, limit: 200 });
      setEntries(rows); setError("");
    } catch (reason) { setError(errorMessage(reason, "Não foi possível carregar a auditoria.")); }
    finally { setLoading(false); }
  }
  useEffect(() => { setLoading(true); void refresh(); }, [attempt, action, entity, authorFilter]);

  return <div className="page"><p className="eyebrow">Administração</p><h1>Auditoria de alterações</h1>
    <p className="page-intro">Trilha imutável de cancelamentos, ajustes de estoque e alterações de cadastro administrativo. Consulta restrita a quem gerencia a organização.</p>
    <form className="orders-form" onSubmit={(event) => event.preventDefault()}>
      <label>Ação<select value={action} onChange={(event) => setAction(event.target.value)}><option value="">Todas</option>{auditActions.map((key) => <option key={key} value={key}>{auditActionLabels[key]}</option>)}</select></label>
      <label>Registro<select value={entity} onChange={(event) => setEntity(event.target.value)}><option value="">Todos</option>{auditEntities.map((key) => <option key={key} value={key}>{auditEntityLabels[key]}</option>)}</select></label>
      <label>Autor<Input value={author} onChange={(event) => setAuthor(event.target.value)} placeholder="Nome exato" /></label>
    </form>
    {error && <p className="notice error-text" role="alert">{error} <Button type="button" onClick={() => { setAttempt((value) => value + 1); }}>Tentar novamente</Button></p>}
    {loading ? <Skeleton lines={4} label="Carregando auditoria…" /> : entries.length === 0 ? <EmptyState>Nenhum registro para os filtros atuais.</EmptyState> : <Table label="Registros de auditoria">
      <thead><tr><th scope="col">Quando</th><th scope="col">Ação</th><th scope="col">Registro</th><th scope="col">Autor</th><th scope="col">Loja</th><th scope="col">Motivo/resumo</th></tr></thead>
      <tbody>{entries.map((entry) => <tr key={entry.id}>
        <td>{new Date(entry.at).toLocaleString("pt-BR")}</td>
        <td><Badge>{auditActionLabels[entry.action]}</Badge></td>
        <td><div className="cell-stack"><strong>{auditEntityLabels[entry.entity]}</strong><span className="help-text">{entry.entityId}</span></div></td>
        <td>{entry.author}</td>
        <td>{storeName(entry.storeId)}</td>
        <td><div className="cell-stack">{entry.reason && <span>{entry.reason}</span>}{entry.summary && <span className="help-text">{entry.summary}</span>}</div></td>
      </tr>)}</tbody>
    </Table>}
  </div>;
}

export function SuppliersPage() {
  const session = useSession();
  const canManage = hasPermission(session.role, "settings.manage");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier>();
  const [kind, setKind] = useState<SupplierKind>("SUPPLIER");
  const [name, setName] = useState("");
  const [documentValue, setDocumentValue] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState("");
  const pending = useRef(false);

  async function refresh() {
    try { setSuppliers(await supplierService.list()); setError(""); }
    catch (reason) { setError(errorMessage(reason, "Não foi possível carregar os cadastros.")); }
    finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, []);

  function resetForm(open: boolean) { setFormOpen(open); setEditing(undefined); setKind("SUPPLIER"); setName(""); setDocumentValue(""); setContactName(""); setPhone(""); setEmail(""); setNotes(""); }
  function editSupplier(supplier: Supplier) {
    setFormOpen(true); setEditing(supplier); setKind(supplier.kind); setName(supplier.name); setDocumentValue(supplier.document ?? "");
    setContactName(supplier.contactName ?? ""); setPhone(supplier.phone ?? ""); setEmail(supplier.email ?? ""); setNotes(supplier.notes ?? "");
  }

  async function run(action: () => Promise<string>, fallback: string) {
    if (pending.current || !canManage) return;
    pending.current = true; setMessage(""); setError("");
    try { setMessage(await action()); } catch (reason) { setError(errorMessage(reason, fallback)); } finally { pending.current = false; }
  }

  async function saveSupplier(event: React.FormEvent) {
    event.preventDefault();
    const input = { kind, name, document: documentValue, contactName, phone, email, notes };
    await run(async () => {
      if (editing) { await supplierService.update(editing, input); await refresh(); resetForm(false); return "Cadastro atualizado."; }
      await supplierService.create(input); await refresh(); resetForm(false); return "Cadastro criado.";
    }, "Não foi possível salvar o cadastro.");
  }

  async function toggleActive(supplier: Supplier) {
    await run(async () => { await supplierService.setActive(supplier, !supplier.active); await refresh(); return supplier.active ? "Cadastro inativado." : "Cadastro reativado."; }, "Não foi possível alterar o status do cadastro.");
  }

  const visible = supplierListFilter(suppliers, query, kindFilter);

  return <div className="page">
    <PageHeader eyebrow="Administração" title="Fornecedores e laboratórios" intro="Cadastre fornecimento e laboratórios em um lugar só: documento, contato e status valem para toda a organização, sem repetir por loja." actions={canManage && <Button type="button" onClick={() => resetForm(!formOpen || Boolean(editing))}>{formOpen && !editing ? "Fechar" : "Novo cadastro"}</Button>} />
    {message && <p className="notice success" role="status">{message}</p>}
    {error && <p className="notice error-text" role="alert">{error}</p>}

    {canManage && formOpen && <form className="settings-form" onSubmit={saveSupplier}>
      <Select label="Tipo" value={kind} onChange={(event) => setKind(event.target.value as SupplierKind)}>{supplierKinds.map((key) => <option key={key} value={key}>{supplierKindLabels[key]}</option>)}</Select>
      <label>Nome<Input value={name} onChange={(event) => setName(event.target.value)} required /></label>
      <label>Documento (CPF ou CNPJ)<DocumentInput value={documentValue} placeholder="Opcional" onValueChange={setDocumentValue} /></label>
      <label>Pessoa de contato<Input value={contactName} placeholder="Opcional" onChange={(event) => setContactName(event.target.value)} /></label>
      <label>Telefone<Input value={phone} placeholder="Opcional" onChange={(event) => setPhone(event.target.value)} /></label>
      <label>E-mail<Input type="email" value={email} placeholder="Opcional" onChange={(event) => setEmail(event.target.value)} /></label>
      <label>Observações<Input value={notes} placeholder="Opcional" onChange={(event) => setNotes(event.target.value)} /></label>
      <div className="form-actions">
        <Button type="submit">{editing ? "Salvar alterações" : "Criar cadastro"}</Button>
        <Button type="button" onClick={() => resetForm(false)}>Cancelar</Button>
      </div>
      <p className="help-text">Documento e nome precisam ser únicos entre cadastros ativos e inativos; CPF/CNPJ é validado quando preenchido. Sem código de identificação fiscais (IE/IM) — entra se a Fase 6 exigir.</p>
    </form>}

    <form className="orders-form" onSubmit={(event) => event.preventDefault()}>
      <label>Buscar<Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nome, documento, contato ou telefone" /></label>
      <label>Tipo<select value={kindFilter} onChange={(event) => setKindFilter(event.target.value)}><option value="">Todos</option>{supplierKinds.map((key) => <option key={key} value={key}>{supplierKindLabels[key]}</option>)}</select></label>
    </form>

    {loading ? <Skeleton lines={4} label="Carregando cadastros…" /> : visible.length === 0 ? <EmptyState>{suppliers.length === 0 ? "Nenhum fornecedor ou laboratório cadastrado ainda." : "Nenhum cadastro corresponde aos filtros atuais."}</EmptyState> : <div className="list-card">{visible.map((supplier) => <article className="list-row" key={supplier.id}>
      <div><strong>{supplier.name}</strong><span>{[supplier.contactName, supplier.phone].filter(Boolean).join(" · ") || supplier.email || "Sem contato informado"}</span>
        <small className="help-text">{supplier.document ? formatDocument(supplier.document) : "Sem documento"}{supplier.notes ? ` · ${supplier.notes}` : ""}</small></div>
      <div><Badge>{supplierKindLabels[supplier.kind]}</Badge><Badge tone={supplier.active ? "neutral" : "danger"}>{supplier.active ? "Ativo" : "Inativo"}</Badge>
        {canManage && <><Button type="button" onClick={() => editSupplier(supplier)}>Editar</Button>
        <Button type="button" onClick={() => void toggleActive(supplier)}>{supplier.active ? "Inativar" : "Reativar"}</Button></>}
      </div>
    </article>)}</div>}
    <p className="help-text">Cadastros são da organização (valem em todas as lojas) e ficam disponíveis para a compra e para a seleção de laboratório nas ordens de serviço quando essa etapa chegar.</p>
  </div>;
}
