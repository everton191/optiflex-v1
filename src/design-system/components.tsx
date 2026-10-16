import { useId } from "react";
import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

export function Button({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className="button" {...props}>{children}</button>;
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

export function Dialog({ open, onClose, title, children, footer }: OverlayProps) {
  if (!open) return null;
  return <div className="dialog-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="dialog" role="dialog" aria-modal="true" aria-label={title} onKeyDown={(event) => { if (event.key === "Escape") onClose(); }}>
      <div className="overlay-head"><h2>{title}</h2><CloseButton onClose={onClose} /></div>
      <div className="overlay-body">{children}</div>
      {footer && <div className="overlay-foot">{footer}</div>}
    </div>
  </div>;
}

export function Drawer({ open, onClose, title, children, footer }: OverlayProps) {
  if (!open) return null;
  return <div className="drawer-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <aside className="drawer" role="dialog" aria-modal="true" aria-label={title} onKeyDown={(event) => { if (event.key === "Escape") onClose(); }}>
      <div className="overlay-head"><h2>{title}</h2><CloseButton onClose={onClose} /></div>
      <div className="overlay-body">{children}</div>
      {footer && <div className="overlay-foot">{footer}</div>}
    </aside>
  </div>;
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
