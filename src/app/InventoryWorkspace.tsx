import { useEffect, useRef, useState } from "react";
import { errorMessage } from "../domain/errors";
import { Button, DataTable, Dialog, Drawer, ErrorState, Input, Select, Skeleton } from "../design-system/components";
import { hasPermission } from "../domain/access";
import { InventoryService } from "../domain/inventory-service";
import { AuditService } from "../domain/audit-service";
import type { InventoryItem, InventoryMovement, InventoryMovementType, ProductCategory, ProductCategoryFilter, VariantField, FiscalUnit } from "../domain/inventory";
import { availableQuantity, filterByCategory, filterByVariantField, fiscalSummary, fiscalUnitLabels, fiscalUnits, formatCest, formatNcm, hasVariantAttributes, marginCents, normalizeVariantAttributes, productCategories, productCategoryLabels, stockState, variantFieldLabels, variantFieldsByCategory, variantFieldOptions, variantSummary } from "../domain/inventory";
import { InvalidImportError, applyInventoryImport, previewInventoryImport, type ImportPreview } from "../domain/inventory-import";
import type { Transfer, TransferItem } from "../domain/transfer";
import { transferStatusLabels } from "../domain/transfer";
import { TransferService } from "../domain/transfer-service";
import { LocalAuditRepository, LocalInventoryRepository, LocalServiceCatalogRepository, LocalTransferRepository } from "../infrastructure/storage/local-repositories";
import { ServiceCatalogService } from "../domain/service-catalog-service";
import type { ServiceCatalogItem } from "../domain/service-catalog";
import { useAppContext, useSession } from "./providers";

const service = new InventoryService(new LocalInventoryRepository(), new AuditService(new LocalAuditRepository()));
const transferService = new TransferService(new LocalTransferRepository(), new LocalInventoryRepository(), new AuditService(new LocalAuditRepository()));
const serviceCatalog = new ServiceCatalogService(new LocalServiceCatalogRepository());
const importRepository = new LocalInventoryRepository();
const stateLabels = { OK: "Disponível", LOW: "Abaixo do mínimo", OUT: "Esgotado" } as const;
const stateClasses = { OK: "", LOW: "is-low", OUT: "is-out" } as const;
const movementLabels = { IN: "Entrada", OUT: "Saída", ADJUSTMENT: "Ajuste" } as const;
const movementSign = (movement: InventoryMovement) => movement.type === "OUT" ? "-" : "+";

export function InventoryPage() {
  const { currentStoreId, stores } = useAppContext();
  const session = useSession();
  const canManage = hasPermission(session.role, "inventory.manage");
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem>();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [quantity, setQuantity] = useState("");
  const [minimum, setMinimum] = useState("");
  const [defaultPrice, setDefaultPrice] = useState("");
  const [cost, setCost] = useState("");
  const [category, setCategory] = useState<ProductCategory | "">("");
  const [brand, setBrand] = useState("");
  const [material, setMaterial] = useState("");
  const [description, setDescription] = useState("");
  const [variantColor, setVariantColor] = useState("");
  const [variantSize, setVariantSize] = useState("");
  const [variantLensIndex, setVariantLensIndex] = useState("");
  const [variantTreatment, setVariantTreatment] = useState("");
  const [fiscalNcm, setFiscalNcm] = useState("");
  const [fiscalCfop, setFiscalCfop] = useState("");
  const [fiscalCest, setFiscalCest] = useState("");
  const [fiscalUnit, setFiscalUnit] = useState<FiscalUnit | "">("");
  const [attributeFilter, setAttributeFilter] = useState("");
  const [variantBase, setVariantBase] = useState<InventoryItem>();
  const [vColor, setVColor] = useState("");
  const [vSize, setVSize] = useState("");
  const [vMaterial, setVMaterial] = useState("");
  const [vLensIndex, setVLensIndex] = useState("");
  const [vTreatment, setVTreatment] = useState("");
  const [vQuantity, setVQuantity] = useState("0");
  const [vCode, setVCode] = useState("");
  const [catalogFilter, setCatalogFilter] = useState<ProductCategoryFilter>("ALL");
  const [moving, setMoving] = useState<InventoryItem>();
  const [moveType, setMoveType] = useState<InventoryMovementType>("IN");
  const [moveQuantity, setMoveQuantity] = useState("");
  const [moveReason, setMoveReason] = useState("");
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferTo, setTransferTo] = useState("");
  const [transferProductId, setTransferProductId] = useState("");
  const [transferQty, setTransferQty] = useState("1");
  const [transferNote, setTransferNote] = useState("");
  const [transferLines, setTransferLines] = useState<TransferItem[]>([]);
  const [cancelTransferId, setCancelTransferId] = useState("");
  const [cancelTransferReason, setCancelTransferReason] = useState("");
  const [services, setServices] = useState<ServiceCatalogItem[]>([]);
  const [serviceName, setServiceName] = useState("");
  const [servicePrice, setServicePrice] = useState("");
  const [serviceDescription, setServiceDescription] = useState("");
  const [editingServiceId, setEditingServiceId] = useState("");
  const [importPreview, setImportPreview] = useState<ImportPreview>();
  const [importFileName, setImportFileName] = useState("");
  const [importUpdateExisting, setImportUpdateExisting] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);
  const pending = useRef(false);

  async function refresh() {
    try {
      const [loadedItems, loadedMovements, loadedTransfers, loadedServices] = await Promise.all([service.list(currentStoreId), service.history(currentStoreId), transferService.list(currentStoreId), canManage ? serviceCatalog.list(currentStoreId) : Promise.resolve([])]);
      setItems(loadedItems); setMovements(loadedMovements); setTransfers(loadedTransfers); setServices(loadedServices); setError("");
    } catch (reason) { setError(errorMessage(reason, "Não foi possível carregar o estoque desta loja.")); }
    finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, [currentStoreId, attempt]);
  function retry() { setLoading(true); setAttempt((value) => value + 1); }

  async function run(action: () => Promise<string>, fallback: string) {
    if (pending.current || !canManage) return;
    pending.current = true; setMessage(""); setError("");
    try { setMessage(await action()); await refresh(); } catch (reason) { setError(errorMessage(reason, fallback)); } finally { pending.current = false; }
  }
  function resetProductForm(open: boolean) { setFormOpen(open); setEditing(undefined); setName(""); setCode(""); setQuantity(""); setMinimum(""); setDefaultPrice(""); setCost(""); setCategory(""); setBrand(""); setMaterial(""); setDescription(""); setVariantColor(""); setVariantSize(""); setVariantLensIndex(""); setVariantTreatment(""); setFiscalNcm(""); setFiscalCfop(""); setFiscalCest(""); setFiscalUnit(""); }
  function editProduct(item: InventoryItem) { setMoving(undefined); setFormOpen(true); setEditing(item); setName(item.name); setCode(item.code ?? ""); setQuantity(String(item.quantity)); setMinimum(String(item.minimumQuantity)); setDefaultPrice(item.defaultPrice !== undefined ? String(item.defaultPrice) : ""); setCost(item.cost !== undefined ? String(item.cost) : ""); setCategory(item.category ?? ""); setBrand(item.brand ?? ""); setMaterial(item.material ?? ""); setDescription(item.description ?? ""); setVariantColor(item.variantAttributes?.color ?? ""); setVariantSize(item.variantAttributes?.size ?? ""); setVariantLensIndex(item.variantAttributes?.lensIndex ?? ""); setVariantTreatment(item.variantAttributes?.treatment ?? ""); setFiscalNcm(item.fiscal?.ncm ?? ""); setFiscalCfop(item.fiscal?.cfop ?? ""); setFiscalCest(item.fiscal?.cest ?? ""); setFiscalUnit(item.fiscal?.unit ?? ""); }
  function resetMovement() { setMoving(undefined); setMoveType("IN"); setMoveQuantity(""); setMoveReason(""); }
  function resetVariantForm() { setVariantBase(undefined); setVColor(""); setVSize(""); setVMaterial(""); setVLensIndex(""); setVTreatment(""); setVQuantity("0"); setVCode(""); }
  function openVariantForm(item: InventoryItem) { resetProductForm(false); resetMovement(); setVariantBase(item); }

  async function saveProduct(event: React.FormEvent) {
    event.preventDefault();
    const prices = { defaultPrice: defaultPrice.trim() ? Number(defaultPrice) : undefined, cost: cost.trim() ? Number(cost) : undefined };
    const sheet = { category: category as ProductCategory, brand, material, description };
    const fiscal = { ncm: fiscalNcm, cfop: fiscalCfop, cest: fiscalCest, unit: fiscalUnit || undefined };
    await run(async () => {
      if (editing) {
        await service.update(editing, { name, code, minimumQuantity: Number(minimum), ...prices, ...sheet, variantAttributes: { color: variantColor, size: variantSize, material, lensIndex: variantLensIndex, treatment: variantTreatment }, fiscal });
        resetProductForm(false);
        return "Produto atualizado.";
      }
      await service.create(currentStoreId, { name, code, quantity: Number(quantity || 0), minimumQuantity: Number(minimum || 0), ...prices, ...sheet, variantAttributes: { color: variantColor, size: variantSize, material, lensIndex: variantLensIndex, treatment: variantTreatment }, fiscal }, session.userName);
      resetProductForm(false);
      return "Produto cadastrado.";
    }, "Não foi possível salvar o produto.");
  }

  async function saveVariant(event: React.FormEvent) {
    event.preventDefault();
    const base = variantBase;
    if (!base) return;
    await run(async () => {
      await service.createVariant(base, { attributes: { color: vColor, size: vSize, material: vMaterial, lensIndex: vLensIndex, treatment: vTreatment }, quantity: Number(vQuantity || 0), code: vCode || undefined }, session.userName);
      resetVariantForm();
      return `Variante de "${base.name}" cadastrada com saldo próprio.`;
    }, "Não foi possível criar a variante.");
  }

  async function applyMovement(event: React.FormEvent) {
    event.preventDefault();
    if (!moving) return;
    const item = moving;
    await run(async () => {
      await service.adjust(item, moveType, Number(moveQuantity), moveReason, session.userName);
      resetMovement();
      return "Movimentação registrada.";
    }, "Não foi possível registrar a movimentação.");
  }

  function resetTransferForm() { setTransferOpen(false); setTransferTo(""); setTransferProductId(""); setTransferQty("1"); setTransferNote(""); setTransferLines([]); }
  function addTransferLine(event: React.FormEvent) {
    event.preventDefault();
    const product = items.find((entry) => entry.id === transferProductId);
    if (!product) { setError("Selecione o produto."); return; }
    const quantityValue = Number(transferQty);
    if (!Number.isInteger(quantityValue) || quantityValue <= 0) { setError("Informe uma quantidade inteira maior que zero."); return; }
    if (transferLines.some((line) => line.inventoryItemId === product.id)) { setError("Produto já adicionado à transferência."); return; }
    const free = availableQuantity(product) - transferLines.filter((line) => line.inventoryItemId === product.id).reduce((sum, line) => sum + line.quantity, 0);
    if (quantityValue > free) { setError(`Saldo disponível insuficiente de "${product.name}" (disponível: ${free}).`); return; }
    setTransferLines([...transferLines, { inventoryItemId: product.id, name: product.name, quantity: quantityValue }]);
    setTransferProductId(""); setTransferQty("1"); setError("");
  }
  async function requestTransfer() {
    await run(async () => {
      const created = await transferService.request(currentStoreId, transferTo, transferLines, session.userName, transferNote);
      resetTransferForm();
      return `Transferência solicitada para ${transferStoreName(transferTo)}.`;
    }, "Não foi possível solicitar a transferência.");
  }
  async function advance(transfer: Transfer, action: "separate" | "transit" | "receive") {
    await run(async () => {
      if (action === "separate") await transferService.separate(transfer.id, session.userName);
      if (action === "transit") await transferService.markInTransit(transfer.id, session.userName);
      if (action === "receive") await transferService.receive(transfer.id, session.userName);
      return action === "separate" ? "Transferência separada: saldo de origem baixado." : action === "transit" ? "Transferência saiu para trânsito." : "Transferência recebida: saldo creditado no destino.";
    }, "Não foi possível atualizar a transferência.");
  }
  async function cancelTransfer(transfer: Transfer) {
    await run(async () => {
      await transferService.cancel(transfer.id, session.userName, cancelTransferReason);
      setCancelTransferId(""); setCancelTransferReason("");
      return transfer.status === "SEPARATED" ? "Transferência cancelada e saldo devolvido à origem." : "Transferência cancelada.";
    }, "Não foi possível cancelar a transferência.");
  }
  const transferStoreName = (id: string) => stores.find((store) => store.id === id)?.name ?? id;

  function resetServiceForm() { setServiceName(""); setServicePrice(""); setServiceDescription(""); setEditingServiceId(""); }
  async function saveService(event: React.FormEvent) {
    event.preventDefault();
    await run(async () => {
      const input = { name: serviceName, defaultPrice: Number(servicePrice), description: serviceDescription };
      if (editingServiceId) {
        const target = services.find((entry) => entry.id === editingServiceId);
        if (!target) throw new Error("Serviço não encontrado.");
        await serviceCatalog.update(target, input);
        resetServiceForm();
        return "Serviço atualizado.";
      }
      const created = await serviceCatalog.create(currentStoreId, input);
      resetServiceForm();
      return `Serviço "${created.name}" cadastrado.`;
    }, "Não foi possível salvar o serviço.");
  }
  async function removeService(entry: ServiceCatalogItem) {
    await run(async () => {
      await serviceCatalog.remove(entry);
      return `Serviço "${entry.name}" removido do catálogo.`;
    }, "Não foi possível remover o serviço.");
  }

  const importStatusLabels = { READY: "Pronto", ERROR: "Erro", EXISTS: "Já existe", DUPLICATE_IN_FILE: "Repetido" } as const;
  const importAppliable = (importPreview?.readyCount ?? 0) + (importUpdateExisting ? (importPreview?.updateCount ?? 0) : 0);

  async function readImportFile(file: File) {
    setImportFileName(file.name); setImportPreview(undefined);
    try {
      const text = await file.text();
      setImportPreview(previewInventoryImport(text, items));
    } catch (reason) {
      setError(reason instanceof InvalidImportError ? `Importação rejeitada: ${reason.message}` : errorMessage(reason, "Não foi possível ler o arquivo."));
    }
  }

  function closeImportDialog() { setImportPreview(undefined); setImportFileName(""); setImportUpdateExisting(false); if (importFileRef.current) importFileRef.current.value = ""; }

  async function confirmImport() {
    if (!importPreview) return;
    await run(async () => {
      const result = await applyInventoryImport(importRepository, currentStoreId, importPreview, { updateExisting: importUpdateExisting, author: session.userName });
      closeImportDialog();
      return `Importação concluída: ${result.created} criado(s), ${result.updated} atualizado(s), ${result.skipped} ignorado(s).`;
    }, "Não foi possível concluir a importação.");
  }

  const alerts = items.filter((item) => stockState(item) !== "OK");
  const categoryItems = filterByCategory(items, catalogFilter);
  const [filterFieldRaw, filterValue] = attributeFilter.split(":");
  const filterField = (variantFieldLabels[filterFieldRaw as VariantField] ? filterFieldRaw : "") as "" | VariantField;
  const visibleItems = filterField && filterValue ? filterByVariantField(categoryItems, filterField, filterValue) : categoryItems;
  const filterOptions = (Object.keys(variantFieldLabels) as VariantField[]).flatMap((field) => variantFieldOptions(categoryItems, field).map((value) => ({ field, value, label: `${variantFieldLabels[field]}: ${value}` })));
  const itemName = (id: string) => items.find((item) => item.id === id)?.name ?? "Produto removido";
  return <div className="page inventory-page">
    <div className="page-title">
      <div><p className="eyebrow">Operação</p><h1>Estoque</h1><p className="page-intro">Cadastre produtos, movimente saldos e acompanhe o histórico desta loja.</p></div>
      {canManage && <Button type="button" onClick={() => { resetMovement(); resetProductForm(!formOpen || Boolean(editing)); }}>{formOpen && !editing ? "Fechar" : "Novo produto"}</Button>}
    </div>
    {message && <p className="notice success" role="status">{message}</p>}
    {error && <p className="notice error-text" role="alert">{error} <Button type="button" onClick={retry}>Tentar novamente</Button></p>}
    {alerts.length > 0 && <p className="notice error-text" role="status">{alerts.length} {alerts.length === 1 ? "produto está" : "produtos estão"} no limite mínimo ou esgotado{alerts.length === 1 ? "" : "s"}.</p>}

    {canManage && <Dialog open={Boolean(importPreview)} onClose={closeImportDialog} title={`Prévia da importação${importFileName ? ` — ${importFileName}` : ""}`}>
      {importPreview && <>
        <p role="status">{importPreview.rows.length} linha(s) lida(s): {importPreview.readyCount} pronta(s) · {importPreview.updateCount} já existente(s) · {importPreview.errorCount} com erro · {importPreview.duplicateCount} repetida(s).</p>
        {importPreview.errorCount > 0 && <p className="notice error-text">Linhas com erro serão ignoradas: {importPreview.rows.filter((row) => row.status === "ERROR").slice(0, 5).map((row) => `linha ${row.line} (${row.messages[0]})`).join("; ")}{importPreview.errorCount > 5 ? ` e mais ${importPreview.errorCount - 5}` : ""}.</p>}
        <div className="list-card compact-list import-preview-list">{importPreview.rows.slice(0, 30).map((row) => <article className="list-row" key={`${row.line}-${row.code}`}>
          <div><strong>{row.name || "— sem nome —"}</strong><span>Linha {row.line} · {row.code || "— sem código —"} · {row.category ? productCategoryLabels[row.category] : "—"} · saldo {row.quantity}</span>{row.messages.length > 0 && <span className="help-text">{row.messages.join(" ")}</span>}</div>
          <div><span className={`badge${row.status === "ERROR" ? " is-out" : row.status === "READY" ? "" : " is-low"}`}>{importStatusLabels[row.status]}</span></div>
        </article>)}</div>
        {importPreview.rows.length > 30 && <p className="help-text">Mostrando as primeiras 30 de {importPreview.rows.length} linhas.</p>}
        <label className="check-label"><input type="checkbox" checked={importUpdateExisting} onChange={(event) => setImportUpdateExisting(event.target.checked)} /> Atualizar produtos já existentes pelo código (cadastro e preços; o saldo atual não é alterado)</label>
        <div className="form-actions">
          <Button type="button" onClick={() => void confirmImport()} disabled={importAppliable === 0}>Importar {importAppliable} produto(s)</Button>
          <Button type="button" onClick={closeImportDialog}>Cancelar</Button>
        </div>
      </>}
    </Dialog>}

    {canManage && formOpen && <form className="inventory-form" onSubmit={saveProduct}>
      <label>Produto<Input value={name} onChange={(event) => setName(event.target.value)} required /></label>
      <label>Código<Input value={code} onChange={(event) => setCode(event.target.value)} placeholder="Barras ou interno" required /></label>
      <Select label="Categoria" aria-label="Categoria do produto" value={category} onChange={(event) => setCategory(event.target.value as ProductCategory)} required><option value="">Selecione</option>{productCategories.map((value) => <option key={value} value={value}>{productCategoryLabels[value]}</option>)}</Select>
      {!editing && <label>Saldo inicial<Input type="number" min="0" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder="0" /></label>}
      <label>Estoque mínimo<Input type="number" min="0" step="1" value={minimum} onChange={(event) => setMinimum(event.target.value)} placeholder="0" /></label>
      <label>Preço padrão (R$)<Input type="number" min="0" step="0.01" value={defaultPrice} onChange={(event) => setDefaultPrice(event.target.value)} placeholder="Opcional" /></label>
      <label>Custo (R$)<Input type="number" min="0" step="0.01" value={cost} onChange={(event) => setCost(event.target.value)} placeholder="Opcional" /></label>
      <label>Marca<Input value={brand} onChange={(event) => setBrand(event.target.value)} placeholder="Opcional" /></label>
      <label>Material<Input value={material} onChange={(event) => setMaterial(event.target.value)} placeholder="Opcional" /></label>
      {category === "FRAME" && <>
        <label>Cor<Input value={variantColor} onChange={(event) => setVariantColor(event.target.value)} placeholder="Opcional (ex.: preta, dourada)" /></label>
        <label>Tamanho<Input value={variantSize} onChange={(event) => setVariantSize(event.target.value)} placeholder="Opcional (ex.: 52, infantil)" /></label>
      </>}
      {category === "LENS" && <>
        <label>Índice<Input value={variantLensIndex} onChange={(event) => setVariantLensIndex(event.target.value)} placeholder="Opcional (ex.: 1.60)" /></label>
        <label>Tratamento<Input value={variantTreatment} onChange={(event) => setVariantTreatment(event.target.value)} placeholder="Opcional (ex.: antirreflexo)" /></label>
      </>}
      {category === "ACCESSORY" && <label>Cor<Input value={variantColor} onChange={(event) => setVariantColor(event.target.value)} placeholder="Opcional" /></label>}
      <fieldset className="form-fieldset"><legend>Dados fiscais (opcional — preparação para NF-e)</legend>
        <label>NCM<Input inputMode="numeric" value={fiscalNcm ? formatNcm(fiscalNcm) : ""} onChange={(event) => setFiscalNcm(event.target.value.replace(/\D/g, "").slice(0, 8))} placeholder="0000.00.00" /></label>
        <label>CFOP<Input inputMode="numeric" value={fiscalCfop} onChange={(event) => setFiscalCfop(event.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="Ex.: 5102" /></label>
        <label>CEST<Input inputMode="numeric" value={fiscalCest ? formatCest(fiscalCest) : ""} onChange={(event) => setFiscalCest(event.target.value.replace(/\D/g, "").slice(0, 7))} placeholder="00.000.00" /></label>
        <Select label="Unidade fiscal" aria-label="Unidade fiscal" value={fiscalUnit} onChange={(event) => setFiscalUnit(event.target.value as FiscalUnit | "")}><option value="">—</option>{fiscalUnits.map((value) => <option key={value} value={value}>{fiscalUnitLabels[value]}</option>)}</Select>
      </fieldset>
      <label>Descrição<Input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Opcional (ficha: grau, curvatura, etc.)" /></label>
      <div className="form-actions">
        <Button type="submit">{editing ? "Salvar alterações" : "Cadastrar produto"}</Button>
        <Button type="button" onClick={() => resetProductForm(false)}>Cancelar</Button>
      </div>
      {editing && <p className="help-text">O saldo não é editado aqui: use Movimentar para registrar entrada, saída ou ajuste com motivo.</p>}
    </form>}

    {canManage && <Drawer open={Boolean(variantBase)} onClose={resetVariantForm} title={variantBase ? `Criar variante de ${variantBase.name}` : "Criar variante"}>{variantBase && variantBase.category && <form className="inventory-form" onSubmit={saveVariant}>
      <p className="help-text inventory-moving">A variante vira um item de estoque <strong>próprio</strong>, com saldo, código e movimentações separados de <strong>{variantBase.name}</strong>.</p>
      {variantFieldsByCategory[variantBase.category].map((field) => <label key={field}>{variantFieldLabels[field]}{field === "material" ? <Input value={vMaterial} onChange={(event) => setVMaterial(event.target.value)} placeholder={`Herdado: ${variantBase.material ?? "—"}`} /> : field === "color" ? <Input value={vColor} onChange={(event) => setVColor(event.target.value)} required /> : field === "size" ? <Input value={vSize} onChange={(event) => setVSize(event.target.value)} required /> : field === "lensIndex" ? <Input value={vLensIndex} onChange={(event) => setVLensIndex(event.target.value)} required /> : <Input value={vTreatment} onChange={(event) => setVTreatment(event.target.value)} required />}</label>)}
      <label>Saldo inicial<Input type="number" min="0" step="1" value={vQuantity} onChange={(event) => setVQuantity(event.target.value)} required /></label>
      <label>Código<Input value={vCode} onChange={(event) => setVCode(event.target.value)} placeholder={`Opcional — padrão ${variantBase.code ?? "VAR"}-ATRIBUTO`} /></label>
      <div className="form-actions"><Button type="submit">Criar variante</Button><Button type="button" onClick={resetVariantForm}>Cancelar</Button></div>
    </form>}</Drawer>}

    {canManage && <Drawer open={Boolean(moving)} onClose={resetMovement} title={moving ? `Movimentar ${moving.name}` : "Movimentar produto"}>{moving && <form className="inventory-form" onSubmit={applyMovement}>
      <p className="help-text inventory-moving">Movimentando <strong>{moving.name}</strong> · saldo atual {moving.quantity}</p>
      <Select label="Tipo" aria-label="Tipo de movimentação" value={moveType} onChange={(event) => setMoveType(event.target.value as InventoryMovementType)}><option value="IN">Entrada</option><option value="OUT">Saída</option><option value="ADJUSTMENT">Ajuste (com sinal)</option></Select>
      <label>Quantidade<Input type="number" step="1" value={moveQuantity} onChange={(event) => setMoveQuantity(event.target.value)} required /></label>
      <label>Motivo<Input value={moveReason} onChange={(event) => setMoveReason(event.target.value)} placeholder="Ex.: compra, venda, conferência" required /></label>
      <div className="form-actions">
        <Button type="submit">Registrar movimentação</Button>
        <Button type="button" onClick={resetMovement}>Cancelar</Button>
      </div>
    </form>}</Drawer>}

    <div className="inventory-section-head">
      <h2 className="section-title">Produtos</h2>
      {canManage && <Button type="button" onClick={() => { closeImportDialog(); importFileRef.current?.click(); }}>Importar CSV</Button>}
      <input ref={importFileRef} type="file" accept=".csv,text/csv" hidden aria-label="Arquivo CSV de produtos" onChange={(event) => { const file = event.target.files?.[0]; if (file) void readImportFile(file); }} />
    </div>
    <div className="status-filters" role="tablist" aria-label="Filtrar produtos por categoria">
      <button type="button" role="tab" aria-selected={catalogFilter === "ALL"} className={catalogFilter === "ALL" ? "active" : ""} onClick={() => { setCatalogFilter("ALL"); setAttributeFilter(""); }}>Todas <span>{items.length}</span></button>
      {productCategories.map((value) => <button type="button" role="tab" key={value} aria-selected={catalogFilter === value} className={catalogFilter === value ? "active" : ""} onClick={() => { setCatalogFilter(value); setAttributeFilter(""); }}>{productCategoryLabels[value]} <span>{items.filter((item) => item.category === value).length}</span></button>)}
    </div>
    {filterOptions.length > 0 && <div className="status-filters" role="group" aria-label="Filtrar produtos por atributo de variante"><button type="button" aria-pressed={!attributeFilter} className={attributeFilter === "" ? "active" : ""} onClick={() => setAttributeFilter("")}>Sem filtro de atributo</button>{filterOptions.map((option) => { const key = `${option.field}:${option.value}`; return <button type="button" key={key} aria-pressed={attributeFilter === key} className={attributeFilter === key ? "active" : ""} onClick={() => setAttributeFilter(key)}>{option.label}</button>; })}</div>}
    {loading ? <Skeleton lines={4} label="Carregando estoque…" /> : !error && <DataTable label="Lista de produtos" rows={visibleItems} columns={[
      { key: "name", label: "Produto", value: (item) => item.name },
      { key: "category", label: "Categoria", value: (item) => item.category ? productCategoryLabels[item.category] : "" },
      { key: "attributes", label: "Atributos", value: (item) => variantSummary(item.variantAttributes) },
      { key: "quantity", label: "Saldo", value: (item) => item.quantity, align: "right" },
      { key: "price", label: "Preço", value: (item) => item.defaultPrice ?? -1, align: "right" },
      { key: "actions", label: "Ações", value: () => "", sortable: false }
    ]} rowKey={(item) => item.id} pageSize={10} emptyMessage={items.length ? "Nenhum produto com este filtro." : "Nenhum produto cadastrado nesta loja."} renderRow={(item) => {
      const state = stockState(item);
      const margin = item.defaultPrice !== undefined && item.cost !== undefined ? marginCents(item.defaultPrice, item.cost) : undefined;
      return <>
        <td><div className="cell-stack"><strong>{item.category ? `${productCategoryLabels[item.category]} · ` : ""}{item.name}</strong><span>{item.brand ? `Marca ${item.brand} · ` : ""}{item.material ? `${item.material} · ` : ""}{item.code ? `Código ${item.code} · ` : ""}Mínimo {item.minimumQuantity}</span>{item.fiscal && <span className="help-text">{fiscalSummary(item.fiscal)}</span>}{item.description && <span className="help-text">{item.description}</span>}</div></td>
        <td>{item.category ? productCategoryLabels[item.category] : "—"}</td>
        <td>{hasVariantAttributes(item.variantAttributes) ? <span className="badge">{variantSummary(item.variantAttributes)}</span> : "—"}</td>
        <td style={{ textAlign: "right" }}><span className={`badge ${stateClasses[state]}`}>{item.quantity} · {stateLabels[state]}</span></td>
        <td style={{ textAlign: "right" }}>{item.defaultPrice !== undefined ? `R$ ${item.defaultPrice.toFixed(2)}` : "—"}{canManage && item.cost !== undefined ? <div className="help-text">Custo R$ {item.cost.toFixed(2)}{margin !== undefined ? ` · Margem R$ ${(margin / 100).toFixed(2)}` : ""}</div> : null}</td>
        <td><div className="table-actions">{canManage && <Button type="button" onClick={() => { resetProductForm(false); setEditing(undefined); setMoving(item); setMoveType("IN"); setMoveQuantity(""); setMoveReason(""); }}>Movimentar</Button>}{canManage && item.category && <Button type="button" onClick={() => openVariantForm(item)}>Variante</Button>}{canManage && <Button type="button" onClick={() => { resetMovement(); editProduct(item); }}>Editar</Button>}</div></td>
      </>;
    }} />}

    <div className="page-title">
      <div><h2 className="section-title">Transferências entre filiais</h2><p className="page-intro">Solicite, separe, despache e receba produtos de outra loja: o saldo sai da origem na separação e entra no destino no recebimento, uma única vez.</p></div>
      {canManage && stores.filter((store) => store.active && store.id !== currentStoreId).length > 0 && <Button type="button" onClick={() => { resetTransferForm(); setTransferOpen(!transferOpen); }}>{transferOpen ? "Fechar" : "Nova transferência"}</Button>}
    </div>
    {canManage && transferOpen && <form className="inventory-form" onSubmit={addTransferLine}>
      <Select label="Loja de destino" aria-label="Loja de destino da transferência" value={transferTo} onChange={(event) => setTransferTo(event.target.value)} required><option value="">Selecione</option>{stores.filter((store) => store.active && store.id !== currentStoreId).map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}</Select>
      <Select label="Produto" aria-label="Produto da transferência" value={transferProductId} onChange={(event) => setTransferProductId(event.target.value)} required><option value="">Selecione</option>{items.filter((item) => availableQuantity(item) > 0).map((item) => <option key={item.id} value={item.id}>{item.name} · disponível {availableQuantity(item)}</option>)}</Select>
      <label>Quantidade<Input type="number" min="1" step="1" value={transferQty} onChange={(event) => setTransferQty(event.target.value)} required /></label>
      <Button type="submit">Adicionar item</Button>
      {transferLines.length > 0 && <ul className="sale-items-list">{transferLines.map((line) => <li key={line.inventoryItemId}><span>{line.name} × {line.quantity}</span><Button type="button" onClick={() => setTransferLines(transferLines.filter((entry) => entry.inventoryItemId !== line.inventoryItemId))}>Remover</Button></li>)}</ul>}
      <label>Observação<Input value={transferNote} onChange={(event) => setTransferNote(event.target.value)} placeholder="Opcional" /></label>
      <div className="form-actions">
        <Button type="button" onClick={() => void requestTransfer()} disabled={!transferTo || transferLines.length === 0}>Solicitar transferência</Button>
        <Button type="button" onClick={resetTransferForm}>Cancelar</Button>
      </div>
    </form>}
    <div className="list-card compact-list">{transfers.length ? transfers.map((transfer) => <article className="list-row" key={transfer.id}>
      <div>
        <strong>{transfer.fromStoreId === currentStoreId ? `→ ${transferStoreName(transfer.toStoreId)}` : `← ${transferStoreName(transfer.fromStoreId)}`}</strong>
        <span>{transferStatusLabels[transfer.status]} · {transfer.items.map((line) => `${line.name} × ${line.quantity}`).join(" · ")}</span>
        <span className="help-text">Solicitada em {new Date(transfer.createdAt).toLocaleString("pt-BR")} por {transfer.createdBy}{transfer.receivedAt ? ` · recebida em ${new Date(transfer.receivedAt).toLocaleString("pt-BR")} por ${transfer.receivedBy}` : ""}{transfer.cancelReason ? ` · motivo: ${transfer.cancelReason}` : ""}</span>
      </div>
      <div>
        {canManage && transfer.fromStoreId === currentStoreId && transfer.status === "REQUESTED" && <Button type="button" onClick={() => void advance(transfer, "separate")}>Separar</Button>}
        {canManage && transfer.fromStoreId === currentStoreId && transfer.status === "SEPARATED" && <Button type="button" onClick={() => void advance(transfer, "transit")}>Em trânsito</Button>}
        {canManage && transfer.toStoreId === currentStoreId && transfer.status === "IN_TRANSIT" && <Button type="button" onClick={() => void advance(transfer, "receive")}>Receber</Button>}
        {canManage && transfer.fromStoreId === currentStoreId && (transfer.status === "REQUESTED" || transfer.status === "SEPARATED") && <Button type="button" onClick={() => { setCancelTransferId(transfer.id); setCancelTransferReason(""); }}>Cancelar</Button>}
      </div>
      <Dialog open={cancelTransferId === transfer.id} onClose={() => { setCancelTransferId(""); setCancelTransferReason(""); }} title="Cancelar transferência">
        <form className="commerce-form" onSubmit={(event) => { event.preventDefault(); void cancelTransfer(transfer); }}>
          <label>Motivo<Input autoFocus aria-label="Motivo do cancelamento da transferência" value={cancelTransferReason} onChange={(event) => setCancelTransferReason(event.target.value)} required /></label>
          {transfer.status === "SEPARATED" && <p className="help-text">O saldo já separado será devolvido à loja de origem.</p>}
          <div className="form-actions"><Button type="submit" className="button-danger">Confirmar cancelamento</Button><Button type="button" onClick={() => { setCancelTransferId(""); setCancelTransferReason(""); }}>Voltar</Button></div>
        </form>
      </Dialog>
    </article>) : <p className="empty-state">Nenhuma transferência nesta loja.</p>}</div>

    <div className="page-title">
      <div><h2 className="section-title">Serviços</h2><p className="page-intro">Catálogo de serviços (montagem, ajuste, exame particular) com preço padrão, selecionável no Caixa como tratamento — sem movimento de estoque.</p></div>
      {canManage && <Button type="button" onClick={() => { resetServiceForm(); }}>{editingServiceId ? "Cancelar edição" : "Novo serviço"}</Button>}
    </div>
    {canManage && <form className="inventory-form" onSubmit={saveService}>
      <label>Nome<Input value={serviceName} onChange={(event) => setServiceName(event.target.value)} placeholder="Ex.: Montagem padrão" required /></label>
      <label>Preço padrão (R$)<Input type="number" min="0" step="0.01" value={servicePrice} onChange={(event) => setServicePrice(event.target.value)} required /></label>
      <label>Descrição<Input value={serviceDescription} onChange={(event) => setServiceDescription(event.target.value)} placeholder="Opcional" /></label>
      <div className="form-actions"><Button type="submit">{editingServiceId ? "Salvar serviço" : "Cadastrar serviço"}</Button></div>
    </form>}
    <div className="list-card compact-list">{services.length ? services.map((entry) => <article className="list-row" key={entry.id}>
      <div>
        <strong>{entry.name}</strong>
        <span>R$ {entry.defaultPrice.toFixed(2)}{entry.description ? ` · ${entry.description}` : ""}</span>
      </div>
      <div>
        {canManage && <Button type="button" onClick={() => { setEditingServiceId(entry.id); setServiceName(entry.name); setServicePrice(String(entry.defaultPrice)); setServiceDescription(entry.description ?? ""); }}>Editar</Button>}
        {canManage && <Button type="button" onClick={() => void removeService(entry)}>Remover</Button>}
      </div>
    </article>) : <p className="empty-state">Nenhum serviço cadastrado nesta loja.</p>}</div>

    <h2 className="section-title">Histórico de movimentações</h2>
    <div className="list-card compact-list">{movements.length ? movements.map((movement) => <article className="list-row" key={movement.id}>
      <div><strong>{itemName(movement.itemId)}</strong><span>{movementLabels[movement.type]} · {movement.reason} · {new Date(movement.createdAt).toLocaleString("pt-BR")}{movement.author ? ` · ${movement.author}` : ""}</span></div>
      <div><span className="badge">{movementSign(movement)}{movement.quantity}</span></div>
    </article>) : <p className="empty-state">Nenhuma movimentação registrada nesta loja.</p>}</div>
  </div>;
}
