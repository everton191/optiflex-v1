import { useEffect, useId, useRef, useState } from "react";
import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, KeyboardEvent, ReactNode, SelectHTMLAttributes } from "react";
import { filterRows, pageCount, paginateRows, sortRows, toggleSort, type DataTableColumn, type SortState } from "./data-table";

export function Button({ children, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`button ${className}`.trim()} {...props}>{children}</button>;
}

export function Card({ children }: { children: ReactNode }) {
  return <section className="card">{children}</section>;
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className="input" {...props} />;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
}

export function Select({ label, children, ...props }: SelectProps) {
  return <label className="select-field">{label}<select className="select" {...props}>{children}</select></label>;
}

export type BadgeTone = "neutral" | "success" | "warning" | "danger";

const badgeToneClasses: Record<BadgeTone, string> = { neutral: "", success: "is-success", warning: "is-low", danger: "is-out" };

export function Badge({ tone = "neutral", className = "", children, ...props }: { tone?: BadgeTone } & HTMLAttributes<HTMLSpanElement>) {
  return <span className={`badge ${badgeToneClasses[tone]} ${className}`.trim()} {...props}>{children}</span>;
}

export interface TabItem {
  id: string;
  label: ReactNode;
}

export function Tabs({ items, value, onChange, label, className = "" }: { items: readonly TabItem[]; value: string; onChange: (id: string) => void; label: string; className?: string }) {
  return <div className={`tabs ${className}`.trim()} role="tablist" aria-label={label}>{items.map((item) => <button key={item.id} type="button" role="tab" aria-selected={value === item.id} className={value === item.id ? "active" : ""} onClick={() => onChange(item.id)}>{item.label}</button>)}</div>;
}

export function Table({ label, children }: { label: string; children: ReactNode }) {
  return <div className="table-wrap"><table className="data-table" aria-label={label}>{children}</table></div>;
}

export interface DataTableProps<T> {
  label: string;
  rows: readonly T[];
  columns: readonly DataTableColumn<T>[];
  rowKey: (row: T) => string;
  renderRow?: (row: T) => ReactNode;
  pageSize?: number;
  searchPlaceholder?: string;
  searchLabel?: string;
  match?: (row: T, needle: string) => boolean;
  emptyMessage?: string;
}

export function DataTable<T>({ label, rows, columns, rowKey, renderRow, pageSize, searchPlaceholder, searchLabel, match, emptyMessage = "Nenhum registro encontrado." }: DataTableProps<T>) {
  const [sort, setSort] = useState<SortState>();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const sortColumn = columns.find((column) => column.key === sort?.key);
  const filtered = match ? filterRows(rows, query, match) : rows;
  const sorted = sortColumn ? sortRows(filtered, sortColumn, sort?.direction ?? "asc") : filtered;
  const size = Math.max(1, pageSize ?? 10);
  const pages = pageCount(sorted.length, size);
  const safePage = Math.min(page, pages - 1);
  const visible = paginateRows(sorted, safePage, size);
  const searchId = useId();
  return <div className="table-wrap">
    {match && <div className="table-filter"><Search id={searchId} aria-label={searchLabel ?? "Filtrar registros"} placeholder={searchPlaceholder} value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); }} /></div>}
    <table className="data-table" aria-label={label}>
      <thead><tr>{columns.map((column) => {
        const active = sort?.key === column.key;
        const ariaSort = active ? (sort?.direction === "asc" ? "ascending" : "descending") : "none";
        return <th key={column.key} scope="col" aria-sort={column.sortable === false ? undefined : ariaSort} style={column.align === "right" ? { textAlign: "right" } : undefined}>
          {column.sortable === false ? column.label : <button type="button" className="table-sort" aria-label={`Ordenar por ${column.label}`} onClick={() => { setSort(toggleSort(sort, column.key)); setPage(0); }}>{column.label}{active && <span aria-hidden="true">{sort?.direction === "asc" ? " ▲" : " ▼"}</span>}</button>}
        </th>;
      })}</tr></thead>
      <tbody>{visible.length ? visible.map((row) => renderRow ? <tr key={rowKey(row)}>{renderRow(row)}</tr> : <tr key={rowKey(row)}>{columns.map((column) => <td key={column.key} style={column.align === "right" ? { textAlign: "right" } : undefined}>{column.value(row)}</td>)}</tr>) : <tr><td colSpan={columns.length} className="empty-state">{emptyMessage}</td></tr>}</tbody>
    </table>
    {sorted.length > size && <div className="table-pagination" role="navigation" aria-label="Paginação da tabela">
      <Button type="button" onClick={() => setPage(safePage - 1)} disabled={safePage === 0} aria-label="Página anterior">Anterior</Button>
      <span aria-live="polite">Página {safePage + 1} de {pages} · {sorted.length} {sorted.length === 1 ? "registro" : "registros"}</span>
      <Button type="button" onClick={() => setPage(safePage + 1)} disabled={safePage >= pages - 1} aria-label="Próxima página">Próxima</Button>
    </div>}
  </div>;
}

function CloseButton({ onClose }: { onClose: () => void }) {
  return <button type="button" className="overlay-close" aria-label="Fechar" onClick={onClose}>×</button>;
}

export interface OverlayProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

const FOCUSABLE = "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";

function useOverlayFocus(open: boolean, onClose: () => void) {
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!open) return;
    triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel)?.focus();
    return () => { triggerRef.current?.focus(); };
  }, [open]);
  function trapTab(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== "Tab") return;
    const panel = panelRef.current;
    if (!panel) return;
    const focusables = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (!focusables.length) { event.preventDefault(); return; }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    else if (!panel.contains(document.activeElement)) { event.preventDefault(); first.focus(); }
  }
  return { panelRef, trapTab, onClose };
}

export function Dialog({ open, onClose, title, children, footer }: OverlayProps) {
  const { panelRef, trapTab } = useOverlayFocus(open, onClose);
  if (!open) return null;
  return <div className="dialog-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div ref={panelRef} className="dialog" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} onKeyDown={(event) => { if (event.key === "Escape") onClose(); trapTab(event); }}>
      <div className="overlay-head"><h2>{title}</h2><CloseButton onClose={onClose} /></div>
      <div className="overlay-body">{children}</div>
      {footer && <div className="overlay-foot">{footer}</div>}
    </div>
  </div>;
}

export function Drawer({ open, onClose, title, children, footer }: OverlayProps) {
  const { panelRef, trapTab } = useOverlayFocus(open, onClose);
  if (!open) return null;
  return <div className="drawer-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <aside ref={panelRef} className="drawer" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} onKeyDown={(event) => { if (event.key === "Escape") onClose(); trapTab(event); }}>
      <div className="overlay-head"><h2>{title}</h2><CloseButton onClose={onClose} /></div>
      <div className="overlay-body">{children}</div>
      {footer && <div className="overlay-foot">{footer}</div>}
    </aside>
  </div>;
}

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, message, confirmLabel = "Confirmar", cancelLabel = "Voltar", destructive = false, onConfirm, onCancel }: ConfirmDialogProps) {
  return <Dialog open={open} onClose={onCancel} title={title} footer={<div className="form-actions"><Button type="button" className={destructive ? "button-danger" : ""} onClick={onConfirm}>{confirmLabel}</Button><Button type="button" onClick={onCancel}>{cancelLabel}</Button></div>}><p>{message}</p></Dialog>;
}

export function Toast({ tone = "success", onClose, children }: { tone?: "success" | "error"; onClose?: () => void; children: ReactNode }) {
  return <div className={`toast toast-${tone}`} role={tone === "error" ? "alert" : "status"}><span>{children}</span>{onClose && <button type="button" className="toast-close" aria-label="Dispensar aviso" onClick={onClose}>×</button>}</div>;
}

export function Tooltip({ text, children }: { text: string; children: ReactNode }) {
  const id = useId();
  return <span className="tooltip"><span className="tooltip-trigger" tabIndex={0} aria-describedby={id}>{children}</span><span className="tooltip-bubble" role="tooltip" id={id}>{text}</span></span>;
}

export function Search(props: InputHTMLAttributes<HTMLInputElement>) {
  return <div className="search-field"><input type="search" className="input" {...props} /></div>;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="empty-state">{children}</p>;
}

export function Skeleton({ lines = 3, label = "Carregando…" }: { lines?: number; label?: string }) {
  return <div className="skeleton" role="status" aria-busy="true" aria-label={label}>{Array.from({ length: lines }, (_, index) => <span className="skeleton-line" key={index} />)}</div>;
}

export function ErrorState({ message, onRetry, retryLabel = "Tentar novamente" }: { message: string; onRetry?: () => void; retryLabel?: string }) {
  return <div className="error-state" role="alert"><p>{message}</p>{onRetry && <Button type="button" onClick={onRetry}>{retryLabel}</Button>}</div>;
}

export function PageHeader({ eyebrow, title, intro, actions }: { eyebrow?: string; title: string; intro?: string; actions?: ReactNode }) {
  return <>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<div className="page-title"><div><h1>{title}</h1>{intro && <p className="page-intro">{intro}</p>}</div>{actions && <div className="page-title-actions">{actions}</div>}</div></>;
}

export interface PrintLayoutProps {
  title: string;
  meta?: string;
  brand?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function PrintLayout({ title, meta, brand = "Opticore", actions, children }: PrintLayoutProps) {
  return <div className="page print-layout">
    <div className="print-toolbar no-print">{actions}<Button type="button" onClick={() => window.print()}>Imprimir</Button></div>
    <article className="print-sheet">
      <header className="print-sheet-header">
        <p className="print-brand">{brand}</p>
        <h1 className="print-title">{title}</h1>
        {meta && <p className="print-meta">{meta}</p>}
      </header>
      <div className="print-body">{children}</div>
    </article>
  </div>;
}
