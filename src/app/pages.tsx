import { useRef, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { useAppContext, useSession } from "./providers";
import { Button, Input } from "../design-system/components";
import { roleDefinitions, sessionUserState } from "../domain/access";
export { ClinicalWorkspacePage } from "./ClinicalWorkspace";
export { DashboardPage } from "./DashboardWorkspace";
export { SettingsPage, UsersPage, StoresPage, ProfilesPage } from "./AdminWorkspace";
export { AttendancePage, AgendaPage, AttendanceNewPage, AttendanceDetailPage, ClinicalQueuePage } from "./ReceptionWorkspace";
export { CustomersPage, CustomerProfilePage, CustomerNewPage, CustomerEditPage } from "./CustomersWorkspace";
export { InventoryPage } from "./InventoryWorkspace";
export { WorkOrdersPage, WorkOrderDetailPage } from "./WorkOrdersWorkspace";
export { CashDeskPage } from "./CashWorkspace";

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
