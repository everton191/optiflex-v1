import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, Input } from "../design-system/components";
import { hasPermission } from "../domain/access";
import { buildAccessContext } from "../domain/access-context";
import { AuditService } from "../domain/audit-service";
import {
  customerSearchEntries,
  globalSearchResults,
  globalSearchSeeds,
  orderSearchEntries,
  productSearchEntries,
  saleSearchEntries,
  type GlobalSearchEntry,
  type GlobalSearchKind
} from "../domain/global-search";
import { InventoryService } from "../domain/inventory-service";
import { ReceptionService } from "../domain/reception-service";
import { SalesService } from "../domain/sales-service";
import { WorkOrderService } from "../domain/work-order-service";
import { LocalAttendanceRepository, LocalAuditRepository, LocalCustomerRepository, LocalInventoryRepository, LocalPrescriptionRepository, LocalSaleRepository, LocalWorkOrderRepository } from "../infrastructure/storage/local-repositories";
import { useAppContext, useSession } from "./providers";

const receptionService = new ReceptionService(new LocalCustomerRepository(), new LocalAttendanceRepository());
const inventoryService = new InventoryService(new LocalInventoryRepository());
const salesService = new SalesService(new LocalSaleRepository(), new LocalPrescriptionRepository(), new AuditService(new LocalAuditRepository()), new LocalInventoryRepository());
const workOrderService = new WorkOrderService(new LocalWorkOrderRepository());

const kindLabels: Record<GlobalSearchKind, string> = { page: "Página", action: "Ação", customer: "Cliente", product: "Produto", sale: "Venda", order: "OS" };

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { currentStoreId, users } = useAppContext();
  const session = useSession();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [records, setRecords] = useState<GlobalSearchEntry[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const context = useMemo(() => buildAccessContext(session, users, currentStoreId), [session, users, currentStoreId]);
  useEffect(() => {
    if (!open) return;
    setQuery(""); setActiveIndex(0); setRecords([]);
    let active = true;
    void (async () => {
      try {
        const [customers, products, sales, orders] = await Promise.all([
          hasPermission(session.role, "customers.read") ? receptionService.listCustomers() : Promise.resolve([]),
          hasPermission(session.role, "inventory.read") ? inventoryService.list(currentStoreId) : Promise.resolve([]),
          hasPermission(session.role, "sales.read") ? salesService.list(currentStoreId) : Promise.resolve([]),
          hasPermission(session.role, "sales.read") ? workOrderService.list(currentStoreId) : Promise.resolve([])
        ]);
        if (!active) return;
        const names = new Map(customers.map((customer) => [customer.id, customer.name]));
        setRecords([...customerSearchEntries(customers), ...productSearchEntries(products), ...saleSearchEntries(sales, names), ...orderSearchEntries(orders, names)]);
      } catch {
        if (active) setRecords([]);
      }
    })();
    return () => { active = false; };
  }, [open, session.role, currentStoreId]);
  const results = useMemo(() => globalSearchResults(query, [...globalSearchSeeds, ...records], context), [query, records, context]);
  const activeIndexSafe = Math.min(activeIndex, Math.max(0, results.length - 1));
  const active = results[activeIndexSafe];
  function go(entry: GlobalSearchEntry | undefined) {
    if (!entry) return;
    navigate(entry.to);
    onClose();
  }
  function onInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") { event.preventDefault(); if (results.length) setActiveIndex((index) => (index + 1) % results.length); }
    else if (event.key === "ArrowUp") { event.preventDefault(); if (results.length) setActiveIndex((index) => (index - 1 + results.length) % results.length); }
    else if (event.key === "Enter") { event.preventDefault(); go(active); }
  }
  return <Dialog open={open} onClose={onClose} title="Busca global">
    <Input value={query} onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }} placeholder="Buscar páginas, clientes, produtos, vendas…" role="combobox" aria-expanded aria-controls="global-search-results" aria-activedescendant={active ? `global-search-option-${activeIndexSafe}` : undefined} aria-autocomplete="list" onKeyDown={onInputKeyDown} />
    {results.length > 0 && <ul className="palette-results" id="global-search-results" role="listbox" aria-label="Resultados da busca global">
      {results.map((entry, index) => <li key={entry.id} id={`global-search-option-${index}`} role="option" aria-selected={index === activeIndexSafe} className="palette-item" onMouseEnter={() => setActiveIndex(index)} onClick={() => go(entry)}>
        <span><strong>{entry.label}</strong>{entry.detail && <small>{entry.detail}</small>}</span>
        <span className="palette-kind">{kindLabels[entry.kind]}</span>
      </li>)}
    </ul>}
    {results.length === 0 && <p className="empty-state palette-empty">{query ? "Nenhum resultado para esta busca." : "Nenhuma página ou ação disponível para o seu perfil."}</p>}
    <p className="help-text palette-hint">↑↓ navegar · Enter abrir · Esc fechar</p>
  </Dialog>;
}
