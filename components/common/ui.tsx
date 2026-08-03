import type { LucideIcon } from "lucide-react";
import type { PaymentStatus, ShipmentStatus } from "@/types";

export function StatusBadge({ status }: { status: string }) {
  const success = ["Delivered","Fully Paid","Verified","Ready for Booking","Slot Confirmed by Freight Forwarder","Booked","Cargo Ready"];
  const danger = ["Cancelled","Payment Failed","Revision required"];
  const warning = ["Documents Incomplete","Deposit Required","Limited Capacity","Documents Required","Unpaid"];
  const cls = success.includes(status) ? "success" : danger.includes(status) ? "danger" : warning.includes(status) ? "warning" : status.includes("Awaiting") || status === "In Transit" ? "info" : "neutral";
  return <span className={`badge ${cls}`}>{status}</span>;
}
export function MetricCard({ label, value, hint, icon: Icon }: { label: string; value: string; hint: string; icon: LucideIcon }) { return <article className="card metric"><div className="metric-top"><span>{label}</span><Icon size={20}/></div><div className="metric-value">{value}</div><div className="metric-hint">{hint}</div></article>; }
export function CapacityProgress({ occupancy }: { occupancy: number }) { return <div><div className="progress-label"><span>Kapasitas terisi</span><span>{occupancy}%</span></div><div className="progress" role="progressbar" aria-valuenow={occupancy} aria-valuemin={0} aria-valuemax={100}><span style={{width:`${occupancy}%`}}/></div></div>; }
export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description: string; action?: React.ReactNode }) { return <div className="empty"><div className="empty-icon"><Icon/></div><h3>{title}</h3><p>{description}</p>{action}</div>; }
export function PageHeader({ eyebrow, title, subtitle, actions }: { eyebrow?: string; title: string; subtitle: string; actions?: React.ReactNode }) { return <header className="page-header"><div>{eyebrow&&<div className="eyebrow">{eyebrow}</div>}<h1 className="page-title">{title}</h1><p className="page-subtitle">{subtitle}</p></div>{actions&&<div className="page-actions">{actions}</div>}</header>; }
export function ConfirmationModal({ title, description, confirmLabel, onConfirm, onClose }: { title:string; description:string; confirmLabel:string; onConfirm:()=>void; onClose:()=>void }) { return <div className="overlay" role="presentation" onMouseDown={onClose}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onMouseDown={e=>e.stopPropagation()}><h2 id="modal-title">{title}</h2><p>{description}</p><div className="modal-actions"><button type="button" className="btn btn-ghost" onClick={onClose}>Batal</button><button type="button" className="btn btn-primary" onClick={onConfirm}>{confirmLabel}</button></div></div></div>; }
export function Toast({ message }: { message:string }) { return <div className="toast" role="status" aria-live="polite">✓ {message}</div>; }
export function Modal({ title, onClose, children }: { title:string; onClose:()=>void; children:React.ReactNode }) { return <div className="overlay" role="presentation" onMouseDown={onClose}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onMouseDown={e=>e.stopPropagation()}><h2 id="modal-title">{title}</h2>{children}</div></div>; }
export type AnyStatus = ShipmentStatus | PaymentStatus;
