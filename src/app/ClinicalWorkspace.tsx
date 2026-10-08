import { useEffect, useRef, useState } from "react";
import { Link, useBlocker, useParams } from "react-router-dom";
import { Button, Card, Input } from "../design-system/components";
import { ClinicalService } from "../domain/clinical-service";
import type { ClinicalVersion } from "../domain/clinical";
import type { Customer } from "../domain/customer";
import { LocalClinicalRepository } from "../infrastructure/storage/local-repositories";
import { ClinicalDraft } from "./clinical-draft";
import { useAppContext } from "./providers";

const service = new ClinicalService(new LocalClinicalRepository());
const fields = [["anamnesis", "Anamnese"], ["examination", "Exame"], ["requests", "Solicitações"], ["prescription", "Prescrição"]] as const;

export function ClinicalWorkspacePage() {
  const { attendanceId = "" } = useParams();
  const { currentStoreId } = useAppContext();
  return <ClinicalWorkspace key={`${currentStoreId}:${attendanceId}`} attendanceId={attendanceId} />;
}

function ClinicalWorkspace({ attendanceId }: { attendanceId: string }) {
  const { currentStoreId, session, settings, setNavigationLocked } = useAppContext();
  const [draft, setDraft] = useState<ClinicalDraft>();
  const [customer, setCustomer] = useState<Customer>();
  const [versions, setVersions] = useState<ClinicalVersion[]>([]);
  const [error, setError] = useState(""); const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false); const [confirm, setConfirm] = useState(false); const [reason, setReason] = useState("");
  const [, render] = useState(0); const alive = useRef(true); const pending = useRef(false);
  const context = { storeId: currentStoreId, session };
  const blocker = useBlocker(Boolean(draft?.dirty || busy));
  function wrap(record: ClinicalDraft["record"]) {
    return new ClinicalDraft(record, (next) => service.save(next, context), () => { if (alive.current) render((value) => value + 1); });
  }
  useEffect(() => {
    alive.current = true; let active = true;
    void Promise.all([service.load(attendanceId, context), service.history(attendanceId, context)])
      .then(([loaded, history]) => { if (active) { setDraft(wrap(loaded.record)); setCustomer(loaded.customer); setVersions(history); setError(""); } })
      .catch((failure) => { if (active) setError(failure instanceof Error ? failure.message : "Não foi possível abrir a consulta."); });
    return () => { active = false; alive.current = false; };
  }, [attendanceId, currentStoreId, session.role, session.userName, attempt]);
  const locked = Boolean(draft?.dirty || busy);
  useEffect(() => { setNavigationLocked(locked); return () => setNavigationLocked(false); }, [locked, setNavigationLocked]);
  useEffect(() => {
    const preventLoss = (event: BeforeUnloadEvent) => { if (draft?.dirty || pending.current) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", preventLoss);
    return () => window.removeEventListener("beforeunload", preventLoss);
  }, [draft]);
  async function run(action: "save" | "finalize" | "amend") {
    if (!draft || pending.current) return;
    pending.current = true; setBusy(true); setError("");
    try {
      await draft.flush();
      if (action !== "save") {
        const record = action === "finalize" ? await service.finalize(draft.record, context) : await service.amend(draft.record, reason, context);
        setDraft(wrap(record)); setConfirm(false); setReason("");
        setVersions(await service.history(attendanceId, context));
      }
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Não foi possível concluir. Tente novamente."); }
    finally { pending.current = false; setBusy(false); }
  }
  if (!draft || !customer) return <div className="page"><h1>Abrindo consulta</h1>{error ? <><p role="alert">{error}</p><Button onClick={() => setAttempt((value) => value + 1)}>Tentar novamente</Button><Link to="/clinico">Voltar à fila</Link></> : <p role="status">Carregando os dados…</p>}</div>;
  const record = draft.record;
  return <div className="page clinical-workspace"><div className="page-title"><div><p className="eyebrow">{settings.clinicalProfessionalLabel || "Área clínica"}</p><h1>{customer.name}</h1><p>Consulta · versão {record.version ?? 1}{record.amendmentReason ? " · correção" : ""}</p></div><Link className="button" to={`/clientes/${customer.id}`}>Histórico do cliente</Link></div>
    <p role="status">{record.finalizedAt ? "Documento finalizado — somente leitura" : draft.error ? "Alterações ainda não salvas" : draft.dirty ? "Salvando…" : record.updatedAt ? "Salvo neste dispositivo" : "As alterações serão salvas automaticamente"}</p>
    {(error || draft.error) && <p role="alert" className="notice error-text">{error || draft.error}</p>}
    {blocker.state === "blocked" && <Card><p>Há alterações pendentes. Salve antes de sair.</p><div className="form-actions"><Button onClick={() => { void draft.flush().then(() => blocker.proceed()).catch(() => {}); }} disabled={busy}>Salvar e sair</Button><Button onClick={() => blocker.reset()}>Continuar na consulta</Button></div></Card>}
    <div className="settings-form clinical-form">{fields.map(([field, label]) => <label key={field}>{label}<textarea value={record[field]} readOnly={Boolean(record.finalizedAt)} disabled={busy || confirm} onChange={(event) => draft.change(field, event.target.value)} /></label>)}
      <p className="help-text">Anexos registrados: {record.attachments.length}. Envio de arquivos será disponibilizado em uma próxima etapa.</p>
      {!record.finalizedAt && <div className="form-actions"><Button disabled={busy} onClick={() => void run("save")}>Salvar agora</Button><Button disabled={busy || Boolean(draft.error)} onClick={() => setConfirm(true)}>Revisar e finalizar</Button></div>}
      {confirm && <Card><h2>Confirmar finalização</h2><p>Confira os campos acima. A versão será preservada e o atendimento será concluído. Alterações posteriores exigirão uma correção.</p><div className="form-actions"><Button disabled={busy} onClick={() => void run("finalize")}>Confirmar finalização</Button><Button disabled={busy} onClick={() => setConfirm(false)}>Voltar à revisão</Button></div></Card>}
      {record.finalizedAt && <Card><h2>Corrigir documento</h2><p>O original continuará no histórico. Uma nova versão será aberta para correção.</p><label>Motivo da correção<Input value={reason} disabled={busy} onChange={(event) => setReason(event.target.value)} /></label><Button disabled={busy || !reason.trim()} onClick={() => void run("amend")}>Criar nova versão</Button></Card>}
    </div>
    <h2>Versões finalizadas</h2>{versions.length ? versions.map((version) => <details className="clinical-version" key={version.id}><summary>Versão {version.version ?? 1} · {new Date(version.finalizedAt).toLocaleString("pt-BR")} · {version.author || "Registro anterior"}</summary>{version.amendmentReason && <p>Motivo: {version.amendmentReason}</p>}{fields.map(([field, label]) => <section key={field}><h3>{label}</h3><p className="preserved-text">{version[field] || "Não informado"}</p></section>)}</details>) : <p>Nenhuma versão finalizada.</p>}
  </div>;
}
