import { useRef, useState } from "react";
import { errorMessage } from "../domain/errors";
import { Badge, Button, Input, PageHeader, Select, Table } from "../design-system/components";
import { allPermissions, hasPermission, roleDefinitions } from "../domain/access";
import type { RoleKey, Store, User } from "../domain/access";
import { useAppContext, useSession } from "./providers";
import { BackupPanel } from "./BackupPanel";

const scopeLabels = { SELF: "Próprio usuário", STORE: "Loja", ORGANIZATION: "Empresa", NETWORK: "Todas as lojas" } as const;
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
