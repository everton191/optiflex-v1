import { useState } from "react";
import { useAppContext } from "./providers";
import { Button, Card, Input } from "../design-system/components";

export function DashboardPage() {
  const { settings, session } = useAppContext();
  return <div className="page"><p className="eyebrow">Fundação</p><h1>Olá, {session.userName}</h1><p className="page-intro">A base do {settings.organizationName} está pronta para receber os próximos módulos.</p><div className="card-grid"><Card><h2>Arquitetura</h2><p>Telas acessam serviços e repositórios, nunca o IndexedDB diretamente.</p></Card><Card><h2>Perfil clínico</h2><p>Permissão técnica: <code>CLINICAL_PROFESSIONAL</code>. Cargo exibido: {settings.clinicalProfessionalLabel}.</p></Card><Card><h2>Próxima fase</h2><p>Cliente e Atendimento permanecem fora desta entrega.</p></Card></div></div>;
}

export function SettingsPage() {
  const { settings, saveSettings } = useAppContext();
  const [draft, setDraft] = useState(settings);
  const [saved, setSaved] = useState(false);
  async function submit(event: React.FormEvent) { event.preventDefault(); await saveSettings(draft); setSaved(true); }
  return <div className="page"><p className="eyebrow">Administração</p><h1>Configurações da organização</h1><form className="settings-form" onSubmit={submit}>
    <label>Nome da organização<Input value={draft.organizationName} onChange={(event) => setDraft({ ...draft, organizationName: event.target.value })} required /></label>
    <label>Cargo clínico exibido<Input value={draft.clinicalProfessionalLabel} onChange={(event) => setDraft({ ...draft, clinicalProfessionalLabel: event.target.value })} required /></label>
    <p className="help-text">Este rótulo não altera permissões. O perfil interno permanece <code>CLINICAL_PROFESSIONAL</code>.</p>
    <Button type="submit">Salvar localmente</Button>{saved && <span className="success">Configuração salva neste dispositivo.</span>}
  </form></div>;
}

export function ForbiddenPage() { return <div className="page"><h1>Acesso não permitido</h1><p>Seu perfil atual não possui esta permissão.</p></div>; }
