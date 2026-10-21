import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { errorMessage } from "../domain/errors";
import { Button, DocumentInput, Input, MoneyInput, PageHeader, Select, Skeleton } from "../design-system/components";
import { hasPermission } from "../domain/access";
import type { OrganizationSettings } from "../domain/access";
import { parseMoneyInput } from "../domain/field-rules";
import { ONBOARDING_PROGRESS_KEY, buildOnboardingSummary, nextOnboardingStep, onboardingSteps, previousOnboardingStep, sanitizeOnboardingProgress, type OnboardingStepId } from "../domain/onboarding";
import { productCategories, productCategoryLabels, type ProductCategory } from "../domain/inventory";
import { InventoryService } from "../domain/inventory-service";
import { AuditService } from "../domain/audit-service";
import { LocalAuditRepository, LocalInventoryRepository } from "../infrastructure/storage/local-repositories";
import { useAppContext, useSession } from "./providers";

const inventoryService = new InventoryService(new LocalInventoryRepository(), new AuditService(new LocalAuditRepository()));

interface ProductDraft { name: string; code: string; category: ProductCategory; quantity: string; minimum: string; price: string }

const emptyProduct: ProductDraft = { name: "", code: "", category: "FRAME", quantity: "0", minimum: "1", price: "" };

export function OnboardingPage() {
  const navigate = useNavigate();
  const session = useSession();
  const { settings, currentStoreId, saveSettings, createStore, createUser, stores, isReady } = useAppContext();
  const [step, setStep] = useState<OnboardingStepId>("organization");
  const [skipped, setSkipped] = useState<OnboardingStepId[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [organizationName, setOrganizationName] = useState(settings.organizationName);
  const [clinicalProfessionalLabel, setClinicalProfessionalLabel] = useState(settings.clinicalProfessionalLabel);
  const [legalName, setLegalName] = useState(settings.legalName ?? "");
  const [cnpj, setCnpj] = useState(settings.cnpj ?? "");
  const [storeName, setStoreName] = useState("");
  const [createdStoreId, setCreatedStoreId] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [product, setProduct] = useState<ProductDraft>(emptyProduct);
  const [productNames, setProductNames] = useState<string[]>([]);
  const [savedSettings, setSavedSettings] = useState<OrganizationSettings>();
  const [resumed, setResumed] = useState(false);
  const hydrated = useRef(false);
  const progressActive = useRef(false);

  useEffect(() => {
    if (!isReady || hydrated.current) return;
    hydrated.current = true;
    let raw: string | null = null;
    try { raw = localStorage.getItem(ONBOARDING_PROGRESS_KEY); } catch { return; }
    if (!raw) return;
    try {
      const progress = sanitizeOnboardingProgress(JSON.parse(raw) as Record<string, unknown>);
      setStep(progress.step);
      setSkipped(progress.skipped);
      if (progress.organizationName !== undefined) setOrganizationName(progress.organizationName);
      if (progress.clinicalProfessionalLabel !== undefined) setClinicalProfessionalLabel(progress.clinicalProfessionalLabel);
      if (progress.legalName !== undefined) setLegalName(progress.legalName);
      if (progress.cnpj !== undefined) setCnpj(progress.cnpj);
      if (progress.storeName !== undefined) setStoreName(progress.storeName);
      if (progress.createdStoreId !== undefined) setCreatedStoreId(progress.createdStoreId);
      if (progress.ownerName !== undefined) setOwnerName(progress.ownerName);
      if (progress.ownerEmail !== undefined) setOwnerEmail(progress.ownerEmail);
      setProductNames([...progress.productNames]);
      progressActive.current = true;
      setResumed(true);
    } catch { try { localStorage.removeItem(ONBOARDING_PROGRESS_KEY); } catch { /* sem armazenamento */ } }
  }, [isReady]);

  useEffect(() => {
    if (!progressActive.current) return;
    persistProgress();
  });

  if (!hasPermission(session.role, "settings.manage")) return <div className="page"><h1>Acesso não permitido</h1><p>O assistente de configuração exige permissão de ajustes.</p></div>;
  if (!isReady) return <Skeleton label="Preparando o assistente…" />;

  const storeIdForProducts = createdStoreId || currentStoreId;
  const currentIndex = onboardingSteps.findIndex((entry) => entry.id === step);

  function persistProgress() {
    try {
      localStorage.setItem(ONBOARDING_PROGRESS_KEY, JSON.stringify(sanitizeOnboardingProgress({
        step, skipped, organizationName, clinicalProfessionalLabel, legalName, cnpj, storeName, createdStoreId, ownerName, ownerEmail, productNames
      })));
    } catch { /* armazenamento indisponível: o assistente segue em memória */ }
  }

  function clearProgress() {
    try { localStorage.removeItem(ONBOARDING_PROGRESS_KEY); } catch { /* sem armazenamento */ }
    progressActive.current = false;
  }

  function skipStep() {
    setError("");
    setSkipped((current) => current.includes(step) ? current : [...current, step]);
    advance();
  }

  function advance() {
    progressActive.current = true;
    const next = nextOnboardingStep(step, skipped);
    if (next === "done") { clearProgress(); navigate("/"); return; }
    setStep(next);
  }

  function goBack() {
    setError("");
    progressActive.current = true;
    const previous = previousOnboardingStep(step, skipped);
    if (previous) setStep(previous);
  }

  function jumpTo(entry: OnboardingStepId) {
    setError("");
    progressActive.current = true;
    setStep(entry);
  }

  function exitForLater() {
    progressActive.current = true;
    persistProgress();
    navigate("/");
  }

  function restartFromScratch() {
    clearProgress();
    setResumed(false);
    setError("");
    setStep("organization");
    setSkipped([]);
    setOrganizationName(settings.organizationName);
    setClinicalProfessionalLabel(settings.clinicalProfessionalLabel);
    setLegalName(settings.legalName ?? "");
    setCnpj(settings.cnpj ?? "");
    setStoreName("");
    setCreatedStoreId("");
    setOwnerName("");
    setOwnerEmail("");
    setOwnerPassword("");
    setProduct(emptyProduct);
    setProductNames([]);
    setSavedSettings(undefined);
  }

  async function run(action: () => Promise<void>) {
    setError(""); setBusy(true);
    try { await action(); }
    catch (failure) { setError(errorMessage(failure, "Não foi possível salvar esta etapa.")); }
    finally { setBusy(false); }
  }

  async function saveOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await run(async () => {
      await saveSettings({ ...settings, organizationName, clinicalProfessionalLabel, legalName, cnpj: cnpj || undefined });
      setSavedSettings({ ...settings, organizationName, clinicalProfessionalLabel, legalName, cnpj: cnpj || undefined });
      advance();
    });
  }

  async function saveStore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await run(async () => {
      const store = await createStore({ name: storeName });
      setCreatedStoreId(store.id);
      advance();
    });
  }

  async function saveOwner(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await run(async () => {
      await createUser({ name: ownerName, email: ownerEmail, role: "OWNER", storeIds: createdStoreId ? [createdStoreId] : stores.filter((store) => store.active).map((store) => store.id), password: ownerPassword });
      advance();
    });
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await run(async () => {
      await inventoryService.create(storeIdForProducts, { name: product.name, code: product.code || undefined, category: product.category, quantity: Number(product.quantity) || 0, minimumQuantity: Number(product.minimum) || 0, defaultPrice: parseMoneyInput(product.price) }, session.userName);
      setProductNames((current) => [...current, product.name.trim()]);
      setProduct(emptyProduct);
    });
  }

  const summary = buildOnboardingSummary({ settings: savedSettings ?? settings, storeName: storeName || stores.find((store) => store.id === createdStoreId)?.name, ownerName, productNames, skipped });

  return <div className="page onboarding-page">
    <PageHeader eyebrow="Primeira configuração" title="Assistente de cadastro inicial" intro="Configure organização, loja, usuário e produtos iniciais. Cada etapa é salva imediatamente; você pode sair e continuar depois — o assistente retoma de onde parou." />
    <ol className="onboarding-steps" aria-label="Progresso do assistente">{onboardingSteps.map((entry, index) => {
      const done = index < currentIndex;
      const active = entry.id === step;
      const content = <><span className="step-number" aria-hidden="true">{index + 1}</span><strong>{entry.label}</strong>{entry.optional && <small>opcional</small>}</>;
      return <li key={entry.id} aria-current={active ? "step" : undefined} className={active ? "active" : done ? "done clickable" : ""}>
        {done ? <button type="button" className="step-link" title={`Revisar ${entry.label}`} onClick={() => jumpTo(entry.id)}>{content}</button> : content}
      </li>;
    })}</ol>
    {resumed && <p className="notice" role="status">Retomamos o assistente na etapa <strong>{onboardingSteps[currentIndex].label}</strong>. O que já foi salvo permanece; recomeçar limpa apenas o progresso deste assistente. <Button type="button" onClick={restartFromScratch} disabled={busy}>Recomeçar do zero</Button></p>}
    {error && <p role="alert" className="notice error-text">{error} <Button type="button" onClick={() => setError("")}>Fechar aviso</Button></p>}

    {step === "organization" && <form className="settings-form" onSubmit={(event) => void saveOrganization(event)}>
      <h2>Organização</h2>
      <label>Nome da organização<Input value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} required disabled={busy} /></label>
      <label>Cargo exibido na área clínica<Input value={clinicalProfessionalLabel} onChange={(event) => setClinicalProfessionalLabel(event.target.value)} required disabled={busy} /></label>
      <label>Razão social<Input value={legalName} onChange={(event) => setLegalName(event.target.value)} placeholder="Opcional" disabled={busy} /></label>
      <label>CNPJ<DocumentInput kind="CNPJ" value={cnpj} placeholder="00.000.000/0000-00" onValueChange={setCnpj} disabled={busy} /></label>
      <div className="form-actions"><Button type="submit" disabled={busy}>Salvar e continuar</Button><Button type="button" onClick={exitForLater} disabled={busy}>Sair e continuar depois</Button></div>
    </form>}

    {step === "store" && <form className="settings-form" onSubmit={(event) => void saveStore(event)}>
      <h2>Primeira loja</h2>
      <label>Nome da loja<Input value={storeName} onChange={(event) => setStoreName(event.target.value)} required disabled={busy} /></label>
      <p className="help-text">Lojas já cadastradas ({stores.length}) continuam disponíveis; esta entra como mais uma da rede.</p>
      <div className="form-actions"><Button type="submit" disabled={busy || !storeName.trim()}>Salvar e continuar</Button><Button type="button" onClick={skipStep} disabled={busy}>Pular esta etapa</Button><Button type="button" onClick={exitForLater} disabled={busy}>Sair e continuar depois</Button></div>
    </form>}

    {step === "user" && <form className="settings-form" onSubmit={(event) => void saveOwner(event)}>
      <h2>Usuário inicial</h2>
      <label>Nome<Input value={ownerName} onChange={(event) => setOwnerName(event.target.value)} required disabled={busy} /></label>
      <label>E-mail<Input type="email" value={ownerEmail} onChange={(event) => setOwnerEmail(event.target.value)} required disabled={busy} /></label>
      <label>Senha<Input type="password" value={ownerPassword} onChange={(event) => setOwnerPassword(event.target.value)} required disabled={busy} /></label>
      <p className="help-text">O usuário é criado com a função OWNER (administrador da rede) e recebe todas as lojas ativas{createdStoreId ? ", incluindo a loja criada agora" : ""}. A senha nunca é guardada no progresso do assistente.</p>
      <div className="form-actions"><Button type="submit" disabled={busy || !ownerName.trim() || !ownerEmail.trim() || !ownerPassword}>Salvar e continuar</Button><Button type="button" onClick={skipStep} disabled={busy}>Pular esta etapa</Button><Button type="button" onClick={exitForLater} disabled={busy}>Sair e continuar depois</Button></div>
    </form>}

    {step === "products" && <form className="settings-form" onSubmit={(event) => void saveProduct(event)}>
      <h2>Produtos iniciais</h2>
      <label>Produto<Input value={product.name} onChange={(event) => setProduct({ ...product, name: event.target.value })} required disabled={busy} /></label>
      <label>Código<Input value={product.code} onChange={(event) => setProduct({ ...product, code: event.target.value })} placeholder="Opcional" disabled={busy} /></label>
      <Select label="Categoria" aria-label="Categoria do produto" value={product.category} onChange={(event) => setProduct({ ...product, category: event.target.value as ProductCategory })} disabled={busy}>{productCategories.map((value) => <option key={value} value={value}>{productCategoryLabels[value]}</option>)}</Select>
      <label>Saldo inicial<Input type="number" min="0" step="1" value={product.quantity} onChange={(event) => setProduct({ ...product, quantity: event.target.value })} disabled={busy} /></label>
      <label>Estoque mínimo<Input type="number" min="0" step="1" value={product.minimum} onChange={(event) => setProduct({ ...product, minimum: event.target.value })} disabled={busy} /></label>
      <label>Preço padrão (R$)<MoneyInput value={product.price} onChange={(event) => setProduct({ ...product, price: event.target.value })} placeholder="Opcional" disabled={busy} /></label>
      {productNames.length > 0 && <p className="success" role="status">{productNames.length} {productNames.length === 1 ? "produto cadastrado" : "produtos cadastrados"}: {productNames.join(", ")}</p>}
      <div className="form-actions"><Button type="submit" disabled={busy || !product.name.trim()}>Adicionar produto</Button><Button type="button" onClick={advance} disabled={busy}>Concluir produtos</Button><Button type="button" onClick={skipStep} disabled={busy}>Pular esta etapa</Button><Button type="button" onClick={exitForLater} disabled={busy}>Sair e continuar depois</Button></div>
    </form>}

    {step === "review" && <section className="settings-form">
      <h2>Revisão final</h2>
      <dl className="onboarding-review">
        <div><dt>Organização</dt><dd>{summary.organizationName}</dd></div>
        <div><dt>Loja</dt><dd>{summary.storeName ?? "— pulada —"}</dd></div>
        <div><dt>Usuário inicial</dt><dd>{summary.ownerName ?? "— pulado —"}</dd></div>
        <div><dt>Produtos</dt><dd>{summary.productNames.length ? `${summary.productNames.length}: ${summary.productNames.join(", ")}` : "— nenhum —"}</dd></div>
      </dl>
      <p className="help-text">Etapas: {onboardingSteps.filter((entry) => entry.id !== "review").map((entry) => `${entry.label}: ${summary.skipped.includes(entry.id) ? "pulada" : "concluída"}`).join(" · ")} · Revisão: em andamento.</p>
      {summary.skipped.length > 0 && <p className="help-text">Etapas puladas: {summary.skipped.map((id) => onboardingSteps.find((entry) => entry.id === id)?.label ?? id).join(", ")}. Você pode refazer o assistente a qualquer momento.</p>}
      <div className="form-actions"><Button type="button" onClick={() => { clearProgress(); navigate("/"); }}>Concluir e ir para o dashboard</Button><Button type="button" onClick={goBack} disabled={busy}>Voltar</Button></div>
    </section>}
  </div>;
}
