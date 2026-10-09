import { useEffect, useRef, useState } from "react";
import { useBlocker } from "react-router-dom";
import { Button, Card, Input } from "../design-system/components";
import { BackupService, backupTables, type BackupSnapshot } from "../domain/backup";
import { LocalBackupRepository } from "../infrastructure/storage/local-backup";
import { EncryptedBackupCodec } from "../infrastructure/storage/backup-codec";
import { useAppContext, useSession } from "./providers";

const service = new BackupService(new LocalBackupRepository(), new EncryptedBackupCodec());
function download(content: string, name: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "application/octet-stream" }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = name; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
export function BackupPanel() {
  const { setNavigationLocked } = useAppContext();
  const session = useSession();
  const [password, setPassword] = useState(""); const [repeat, setRepeat] = useState("");
  const [file, setFile] = useState<File>(); const [preview, setPreview] = useState<BackupSnapshot>();
  const [confirmation, setConfirmation] = useState(""); const [safetySaved, setSafetySaved] = useState(false);
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState(""); const [error, setError] = useState(""); const pending = useRef(false);
  const blocker = useBlocker(busy);
  useEffect(() => { setNavigationLocked(busy); return () => setNavigationLocked(false); }, [busy, setNavigationLocked]);
  useEffect(() => { if (!busy && blocker.state === "blocked") blocker.proceed(); }, [busy, blocker]);
  useEffect(() => {
    const preventLoss = (event: BeforeUnloadEvent) => { if (pending.current) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", preventLoss);
    return () => window.removeEventListener("beforeunload", preventLoss);
  }, []);
  if (session.role !== "OWNER") return null;
  async function perform(action: "export" | "inspect" | "restore") {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError(""); setMessage("");
    try {
      if (action === "export") {
        if (password !== repeat) throw new Error("As senhas precisam ser iguais.");
        download(await service.create(password, session.role), `opticore-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.opticore`);
        setMessage("Download solicitado. Confira se o arquivo foi salvo e guarde a senha separadamente.");
      } else if (action === "inspect") {
        setPreview(undefined); setConfirmation(""); setSafetySaved(false);
        if (!file || file.size > 40 * 1024 * 1024) throw new Error("Selecione um backup de até 40 MB.");
        setPreview(await service.inspect(await file.text(), password, session.role));
      } else {
        if (!preview || !safetySaved) throw new Error("Guarde um backup atual antes de restaurar.");
        await service.restore(preview, confirmation, session.role);
        pending.current = false;
        window.location.reload();
      }
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Não foi possível concluir a operação."); }
    finally { pending.current = false; setBusy(false); }
  }
  return <section className="backup-panel"><h2>Backup e restauração</h2><p>Protegido por senha. Inclui os registros de todas as lojas e as versões clínicas. Não há recuperação da senha. O sistema ainda não armazena o conteúdo de anexos.</p>
    <div className="settings-form"><label>Senha do backup<Input type="password" autoComplete="new-password" value={password} disabled={busy} onChange={(event) => { setPassword(event.target.value); setPreview(undefined); }} /></label><label>Repita a senha para criar um backup<Input type="password" autoComplete="new-password" value={repeat} disabled={busy} onChange={(event) => setRepeat(event.target.value)} /></label><p className="help-text">Para criar: pelo menos 12 caracteres. Guarde uma cópia fora deste dispositivo.</p><Button disabled={busy || password.length < 12 || password !== repeat} onClick={() => void perform("export")}>Criar backup</Button>
    <label>Arquivo para restaurar<Input type="file" accept=".opticore" disabled={busy} onChange={(event) => { setFile(event.target.files?.[0]); setPreview(undefined); }} /></label><Button disabled={busy || !file || !password} onClick={() => void perform("inspect")}>Conferir backup</Button></div>
    {preview && <Card><h3>Prévia da restauração</h3><p>Criado em {new Date(preview.createdAt).toLocaleString("pt-BR")}. Clientes: {preview.tables.customers.length}; atendimentos: {preview.tables.attendances.length}; versões clínicas: {preview.tables.clinicalVersions.length}; total: {backupTables.reduce((sum, table) => sum + preview.tables[table].length, 0)} registros.</p><p role="alert">A restauração substitui os dados locais de todas as lojas. Feche outras abas e pare as operações antes de continuar. A sessão atual não será importada do arquivo.</p><label className="check-label"><input type="checkbox" checked={safetySaved} disabled={busy} onChange={(event) => setSafetySaved(event.target.checked)} />Guardei um backup dos dados atuais e fechei as outras abas.</label><label>Digite RESTAURAR<Input value={confirmation} disabled={busy} onChange={(event) => setConfirmation(event.target.value)} /></label><Button disabled={busy || !safetySaved || confirmation !== "RESTAURAR"} onClick={() => void perform("restore")}>Substituir dados pelo backup</Button></Card>}
    {busy && <p role="status">Processando… mantenha esta página aberta.</p>}{message && <p role="status">{message}</p>}{error && <p role="alert" className="error-text">{error}</p>}
  </section>;
}
