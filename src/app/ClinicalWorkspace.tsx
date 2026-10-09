import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useBlocker, useParams } from "react-router-dom";
import { Button, Card, Input } from "../design-system/components";
import { ClinicalService } from "../domain/clinical-service";
import { ATTACHMENT_MAX_BYTES, ATTACHMENT_TYPE_LABEL, attachmentCategoryKeys, clinicalAttachmentCategoryLabels, type ClinicalAttachment, type ClinicalAttachmentCategory, type ClinicalVersion } from "../domain/clinical";
import type { Customer } from "../domain/customer";
import { base64ToBlob, fileToBase64 } from "../infrastructure/storage/attachment-codec";
import { LocalClinicalRepository } from "../infrastructure/storage/local-repositories";
import { ClinicalDraft } from "./clinical-draft";
import { useAppContext, useSession } from "./providers";

const service = new ClinicalService(new LocalClinicalRepository());
const fields = [["anamnesis", "Anamnese"], ["examination", "Exame"], ["requests", "Solicitações"], ["prescription", "Prescrição"]] as const;
const formatAttachmentSize = (size: number) => size >= 1024 * 1024 ? `${(size / (1024 * 1024)).toFixed(1)} MB` : size >= 1024 ? `${Math.round(size / 1024)} KB` : `${size} B`;

export function ClinicalWorkspacePage() {
  const { attendanceId = "" } = useParams();
  const { currentStoreId } = useAppContext();
  return <ClinicalWorkspace key={`${currentStoreId}:${attendanceId}`} attendanceId={attendanceId} />;
}

function ClinicalWorkspace({ attendanceId }: { attendanceId: string }) {
  const { currentStoreId, settings, setNavigationLocked } = useAppContext();
  const session = useSession();
  const [draft, setDraft] = useState<ClinicalDraft>();
  const [customer, setCustomer] = useState<Customer>();
  const [versions, setVersions] = useState<ClinicalVersion[]>([]);
  const [error, setError] = useState(""); const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false); const [confirm, setConfirm] = useState(false); const [reason, setReason] = useState("");
  const [file, setFile] = useState<File>(); const [category, setCategory] = useState<ClinicalAttachmentCategory>("EXAM"); const [attachmentError, setAttachmentError] = useState("");
  const [, render] = useState(0); const alive = useRef(true); const pending = useRef(false); const fileInput = useRef<HTMLInputElement>(null);
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
  async function attach(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft || !file || pending.current) return;
    pending.current = true; setBusy(true); setAttachmentError("");
    try {
      if (draft.record.finalizedAt) throw new Error("Documento finalizado: crie uma correção para adicionar anexos.");
      const content = await fileToBase64(file);
      const attachment = await service.storeAttachment({ name: file.name, mimeType: file.type, size: file.size, content }, category, context);
      await draft.attach(attachment);
      setFile(undefined);
      if (fileInput.current) fileInput.current.value = "";
    } catch (failure) { setAttachmentError(failure instanceof Error ? failure.message : "Não foi possível anexar o arquivo."); }
    finally { pending.current = false; setBusy(false); }
  }
  async function openAttachment(attachment: ClinicalAttachment) {
    if (pending.current) return;
    setAttachmentError("");
    try {
      const content = await service.readAttachmentContent(attachment.id, context);
      if (!content) throw new Error("O conteúdo deste anexo não está mais neste dispositivo.");
      const url = URL.createObjectURL(base64ToBlob(content, attachment.mimeType));
      const anchor = document.createElement("a");
      anchor.href = url; anchor.target = "_blank"; anchor.rel = "noopener";
      document.body.appendChild(anchor); anchor.click(); anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (failure) { setAttachmentError(failure instanceof Error ? failure.message : "Não foi possível abrir o anexo."); }
  }
  async function removeAttachment(attachment: ClinicalAttachment) {
    if (!draft || pending.current || draft.record.finalizedAt) return;
    if (!window.confirm(`Excluir o anexo "${attachment.name}"? Esta ação não pode ser desfeita.`)) return;
    pending.current = true; setBusy(true); setAttachmentError("");
    try {
      await draft.detach(attachment.id);
      const stillReferenced = versions.some((version) => version.attachments.some((item) => item.id === attachment.id));
      if (!stillReferenced) await service.dropAttachmentContent(attachment.id, context);
    } catch (failure) { setAttachmentError(failure instanceof Error ? failure.message : "Não foi possível excluir o anexo."); }
    finally { pending.current = false; setBusy(false); }
  }
  if (!draft || !customer) return <div className="page"><h1>Abrindo consulta</h1>{error ? <><p role="alert">{error}</p><Button onClick={() => setAttempt((value) => value + 1)}>Tentar novamente</Button><Link to="/clinico">Voltar à fila</Link></> : <p role="status">Carregando os dados…</p>}</div>;
  const record = draft.record;
  return <div className="page clinical-workspace"><div className="page-title"><div><p className="eyebrow">{settings.clinicalProfessionalLabel || "Área clínica"}</p><h1>{customer.name}</h1><p>Consulta · versão {record.version ?? 1}{record.amendmentReason ? " · correção" : ""}</p></div><Link className="button" to={`/clientes/${customer.id}`}>Histórico do cliente</Link></div>
    <p role="status">{record.finalizedAt ? "Documento finalizado — somente leitura" : draft.error ? "Alterações ainda não salvas" : draft.dirty ? "Salvando…" : record.updatedAt ? "Salvo neste dispositivo" : "As alterações serão salvas automaticamente"}</p>
    {(error || draft.error) && <p role="alert" className="notice error-text">{error || draft.error}</p>}
    {blocker.state === "blocked" && <Card><p>Há alterações pendentes. Salve antes de sair.</p><div className="form-actions"><Button onClick={() => { void draft.flush().then(() => blocker.proceed()).catch(() => {}); }} disabled={busy}>Salvar e sair</Button><Button onClick={() => blocker.reset()}>Continuar na consulta</Button></div></Card>}
    <div className="settings-form clinical-form">{fields.map(([field, label]) => <label key={field}>{label}<textarea value={record[field]} readOnly={Boolean(record.finalizedAt)} disabled={busy || confirm} onChange={(event) => draft.change(field, event.target.value)} /></label>)}
      {!record.finalizedAt && <div className="form-actions"><Button disabled={busy} onClick={() => void run("save")}>Salvar agora</Button><Button disabled={busy || Boolean(draft.error)} onClick={() => setConfirm(true)}>Revisar e finalizar</Button></div>}
      {confirm && <Card><h2>Confirmar finalização</h2><p>Confira os campos acima. A versão será preservada e o atendimento será concluído. Alterações posteriores exigirão uma correção.</p><div className="form-actions"><Button disabled={busy} onClick={() => void run("finalize")}>Confirmar finalização</Button><Button disabled={busy} onClick={() => setConfirm(false)}>Voltar à revisão</Button></div></Card>}
      {record.finalizedAt && <Card><h2>Corrigir documento</h2><p>O original continuará no histórico. Uma nova versão será aberta para correção.</p><label>Motivo da correção<Input value={reason} disabled={busy} onChange={(event) => setReason(event.target.value)} /></label><Button disabled={busy || !reason.trim()} onClick={() => void run("amend")}>Criar nova versão</Button></Card>}
    </div>
    <section className="clinical-attachments">
      <h2 className="section-title">Anexos</h2>
      <div className="list-card compact-list">
        {record.attachments.length ? record.attachments.map((attachment) => <article className="list-row" key={attachment.id}>
          <div><strong>{attachment.name}</strong><span>{clinicalAttachmentCategoryLabels[attachment.category ?? "DOCUMENT"]} · {formatAttachmentSize(attachment.size)} · {new Date(attachment.createdAt).toLocaleString("pt-BR")}</span></div>
          <div><Button type="button" disabled={busy} onClick={() => void openAttachment(attachment)}>Prévia</Button>{!record.finalizedAt && <Button type="button" disabled={busy} onClick={() => void removeAttachment(attachment)}>Excluir</Button>}</div>
        </article>) : <p className="empty-state">Nenhum anexo enviado.</p>}
      </div>
      {!record.finalizedAt && <form className="settings-form" onSubmit={(event) => void attach(event)}>
        <label>Arquivo<input ref={fileInput} type="file" accept="application/pdf,image/jpeg,image/png" disabled={busy || confirm} onChange={(event) => setFile(event.target.files?.[0])} /></label>
        <label>Categoria<select value={category} disabled={busy || confirm} onChange={(event) => setCategory(event.target.value as ClinicalAttachmentCategory)}>{attachmentCategoryKeys.map((key) => <option key={key} value={key}>{clinicalAttachmentCategoryLabels[key]}</option>)}</select></label>
        <div className="form-actions"><Button type="submit" disabled={busy || confirm || !file}>Anexar arquivo</Button></div>
        <p className="help-text">Formatos aceitos: {ATTACHMENT_TYPE_LABEL} de até {ATTACHMENT_MAX_BYTES / (1024 * 1024)} MB por arquivo.</p>
      </form>}
      {attachmentError && <p role="alert" className="notice error-text">{attachmentError}</p>}
    </section>
    <h2>Versões finalizadas</h2>{versions.length ? versions.map((version) => <details className="clinical-version" key={version.id}><summary>Versão {version.version ?? 1} · {new Date(version.finalizedAt).toLocaleString("pt-BR")} · {version.author || "Registro anterior"}</summary>{version.amendmentReason && <p>Motivo: {version.amendmentReason}</p>}{fields.map(([field, label]) => <section key={field}><h3>{label}</h3><p className="preserved-text">{version[field] || "Não informado"}</p></section>)}</details>) : <p>Nenhuma versão finalizada.</p>}
  </div>;
}
