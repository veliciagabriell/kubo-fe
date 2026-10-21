import { Info, type LucideIcon } from "lucide-react";
import type { PaymentStatus, ShipmentStatus } from "@/types";
import { englishExplanation, statusLabel, uiCopy } from "@/lib/ui-copy";

export function StatusBadge({ status }: { status: string }) {
  const displayStatus = statusLabel(status);
  const success = [
    "Delivered",
    "Fully Paid",
    "Verified",
    "Ready for Booking",
    "Slot Confirmed by Freight Forwarder",
    "Booked",
    "Cargo Ready",
    "ARRIVED",
  ];
  const danger = ["Cancelled", "Payment Failed", "Revision required", "STALE"];
  const warning = [
    "Documents Incomplete",
    "Deposit Required",
    "Limited Capacity",
    "Documents Required",
    "Unpaid",
  ];
  const cls = success.includes(displayStatus)
    ? "success"
    : danger.includes(displayStatus)
      ? "danger"
      : warning.includes(displayStatus)
        ? "warning"
        : displayStatus.includes("Awaiting") ||
            displayStatus === "In Transit" ||
            status === "DEPARTED" ||
            status === "AWAITING_DEPARTURE" ||
            displayStatus === "Voyage Completed"
          ? "info"
          : "neutral";
  return <span className={`badge ${cls}`}>{displayStatus}</span>;
}
export function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
}) {
  return (
    <article className="card metric">
      <div className="metric-top">
        <span>{label}</span>
        <Icon size={20} />
      </div>
      <div className="metric-value">{value}</div>
      <div className="metric-hint">{hint}</div>
    </article>
  );
}
export function CapacityProgress({
  occupancy,
  label = "Capacity Used",
}: {
  occupancy: number;
  label?: string;
}) {
  return (
    <div>
      <div className="progress-label">
        <span>{label}</span>
        <span>{occupancy}%</span>
      </div>
      <div
        className="progress"
        role="progressbar"
        aria-valuenow={occupancy}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span style={{ width: `${occupancy}%` }} />
      </div>
    </div>
  );
}
/** ⓘ affordance for a *Justification string from the API - estimated numbers are never shown bare. */
export function InfoTooltip({ text }: { text: string }) {
  const displayText = englishExplanation(text);
  return (
    <span
      className="info-tip"
      tabIndex={0}
      role="note"
      aria-label={displayText}
      title={displayText}
    >
      <Info size={12} />
    </span>
  );
}
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Icon />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string;
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1 className="page-title">{title}</h1>
        <p className="page-subtitle">{subtitle}</p>
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}
export function ConfirmationModal({
  title,
  description,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div className="overlay" role="presentation" onMouseDown={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 id="modal-title">{title}</h2>
        <p>{description}</p>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {uiCopy.common.cancel}
          </button>
          <button type="button" className="btn btn-primary" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
export function Toast({ message }: { message: string }) {
  return (
    <div className="toast" role="status" aria-live="polite">
      ✓ {message}
    </div>
  );
}
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="overlay" role="presentation" onMouseDown={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 id="modal-title">{title}</h2>
        {children}
      </div>
    </div>
  );
}
export type AnyStatus = ShipmentStatus | PaymentStatus;
