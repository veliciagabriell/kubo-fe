"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Eye,
  FileText,
  MapPin,
  MessageSquareText,
  PackageOpen,
  Send,
  Ship,
  Users,
  X,
} from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import RequireAuth from "@/components/RequireAuth";
import RoleGuard from "@/components/RoleGuard";
import { EmptyState, MetricCard, StatusBadge } from "@/components/common/ui";
import { forwarderService } from "@/lib/services/forwarder-service";
import type {
  ExportDocumentRecord,
  ForwarderCustomer,
  ForwarderLead,
} from "@/types/kubo";
import { formatDate, formatRupiah } from "@/utils/format";
import styles from "./forwarder.module.css";

type ForwarderPage =
  "dashboard" | "customers" | "shipments" | "documents" | "notifications";

function useForwarderResources() {
  const [customers, setCustomers] = useState<ForwarderCustomer[]>([]);
  const [leads, setLeads] = useState<ForwarderLead[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    Promise.all([
      forwarderService.getConfirmedCustomers(),
      forwarderService.getPotentialLeads(),
    ])
      .then(([customerData, leadData]) => {
        if (active) {
          setCustomers(customerData);
          setLeads(leadData);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  return { customers, leads, loading };
}

function ForwarderLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <RoleGuard role="freight_forwarder">
        <AppShell>{children}</AppShell>
      </RoleGuard>
    </RequireAuth>
  );
}

function PaymentLabel({
  status,
}: {
  status: ForwarderCustomer["paymentStatus"];
}) {
  return (
    <span className={`${styles.status} ${styles.success}`}>
      <CheckCircle2 size={14} />
      {status === "fully_paid" ? "Fully Paid" : "Deposit Paid"}
    </span>
  );
}

function CustomerCard({
  customer,
  compact = false,
}: {
  customer: ForwarderCustomer;
  compact?: boolean;
}) {
  return (
    <article className={styles.customerCard}>
      <div className={styles.cardHead}>
        <div>
          <span className={styles.reference}>{customer.shipmentId}</span>
          <h3>{customer.exporter}</h3>
        </div>
        <PaymentLabel status={customer.paymentStatus} />
      </div>
      <p className={styles.route}>
        <MapPin size={15} />
        {customer.origin} → {customer.destination}
      </p>
      <div className={styles.compactGrid}>
        <span>
          <small>Volume</small>
          <strong>{customer.cbm} CBM</strong>
        </span>
        <span>
          <small>Cargo ready</small>
          <strong>{formatDate(customer.cargoReadyDate)}</strong>
        </span>
        <span>
          <small>Documents</small>
          <strong>{customer.documentReadiness}% ready</strong>
        </span>
        {!compact && (
          <span>
            <small>Status</small>
            <strong>{customer.shipmentStatus}</strong>
          </span>
        )}
      </div>
      <Link
        className="btn btn-secondary"
        href={`/forwarder/customers/${customer.shipmentId}`}
      >
        View Shipment <ArrowRight size={15} />
      </Link>
    </article>
  );
}

function Dashboard() {
  const { customers, leads, loading } = useForwarderResources();
  const documentsAttention = customers
    .flatMap((customer) => customer.documents)
    .filter(
      (document) =>
        document.status === "needs_review" || document.status === "conflict",
    ).length;
  return (
    <div className={styles.page}>
      <header className="page-header">
        <div>
          <span className="eyebrow">Freight Forwarder Workspace</span>
          <h1 className="page-title">Operational Dashboard</h1>
          <p className="page-subtitle">
            Prioritize shipments and customers that are ready for processing.
          </p>
        </div>
      </header>
      <section className="grid metrics" aria-label="Operational summary">
        <MetricCard
          label="Customers ready"
          value={String(customers.length)}
          hint="Payment requirement completed"
          icon={Users}
        />
        <MetricCard
          label="Potential leads"
          value={String(leads.length)}
          hint="Compatible cargo opportunities"
          icon={PackageOpen}
        />
        <MetricCard
          label="Active shipments"
          value={String(
            customers.filter((item) => item.shipmentStatus !== "Delivered")
              .length,
          )}
          hint="Operational follow-up"
          icon={Ship}
        />
        <MetricCard
          label="Documents to review"
          value={String(documentsAttention)}
          hint="Review without overwriting UMKM data"
          icon={FileText}
        />
      </section>
      {loading ? (
        <p className={styles.loading}>Loading operational workspace…</p>
      ) : (
        <>
          <section className={styles.twoColumn}>
            <div className={styles.panel}>
              <div className={styles.sectionHead}>
                <div>
                  <h2>Customers Ready to Process</h2>
                  <p>Only paid or required-deposit shipments appear here.</p>
                </div>
                <Link href="/forwarder/customers">View all</Link>
              </div>
              <div className={styles.stack}>
                {customers.slice(0, 2).map((customer) => (
                  <CustomerCard
                    customer={customer}
                    compact
                    key={customer.shipmentId}
                  />
                ))}
              </div>
            </div>
            <div className={styles.panel}>
              <div className={styles.sectionHead}>
                <div>
                  <h2>Potential Leads</h2>
                  <p>Cargo that fits your active routes and capacity.</p>
                </div>
                <Link href="/forwarder/leads">View all</Link>
              </div>
              <div className={styles.stack}>
                {leads.slice(0, 2).map((lead) => (
                  <LeadCompact lead={lead} key={lead.shipmentId} />
                ))}
              </div>
            </div>
          </section>
          <section className={styles.twoColumn}>
            <div className={styles.panel}>
              <div className={styles.sectionHead}>
                <div>
                  <h2>Upcoming Cargo Cut-offs</h2>
                  <p>Shipments that need operational coordination.</p>
                </div>
              </div>
              {customers.map((customer) => (
                <div className={styles.listRow} key={customer.shipmentId}>
                  <span className={styles.iconBox}>
                    <CalendarDays size={18} />
                  </span>
                  <span>
                    <strong>
                      {customer.shipmentId} · {customer.exporter}
                    </strong>
                    <small>
                      {customer.matching.originPort} →{" "}
                      {customer.matching.destinationPort}
                    </small>
                  </span>
                  <time dateTime={customer.cargoCutoff}>
                    {formatDate(customer.cargoCutoff)}
                  </time>
                </div>
              ))}
            </div>
            <div className={styles.panel}>
              <div className={styles.sectionHead}>
                <div>
                  <h2>Documents Requiring Attention</h2>
                  <p>Read, review, or request revision.</p>
                </div>
              </div>
              {documentsAttention ? (
                customers
                  .flatMap((customer) =>
                    customer.documents.map((document) => ({
                      customer,
                      document,
                    })),
                  )
                  .filter(
                    ({ document }) =>
                      document.status === "needs_review" ||
                      document.status === "conflict",
                  )
                  .map(({ customer, document }) => (
                    <div className={styles.listRow} key={document.id}>
                      <span className={styles.iconBox}>
                        <AlertTriangle size={18} />
                      </span>
                      <span>
                        <strong>{document.label}</strong>
                        <small>
                          {customer.shipmentId} · {customer.exporter}
                        </small>
                      </span>
                      <Link
                        href={`/forwarder/customers/${customer.shipmentId}`}
                      >
                        Review
                      </Link>
                    </div>
                  ))
              ) : (
                <EmptyState
                  icon={Check}
                  title="All reviewed"
                  description="No document currently requires attention."
                />
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Customers({ shipmentsOnly = false }: { shipmentsOnly?: boolean }) {
  const { customers, loading } = useForwarderResources();
  const [query, setQuery] = useState("");
  const filtered = customers.filter((item) =>
    `${item.shipmentId} ${item.exporter} ${item.destination}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <div className={styles.page}>
      <header className="page-header">
        <div>
          <span className="eyebrow">Operations</span>
          <h1 className="page-title">
            {shipmentsOnly ? "Active Shipments" : "Confirmed Customers"}
          </h1>
          <p className="page-subtitle">
            {shipmentsOnly
              ? "Monitor shipments that have entered operational handling."
              : "UMKM shipments that passed the required payment stage."}
          </p>
        </div>
      </header>
      <div className={styles.toolbar}>
        <label className="search">
          <span className="sr-only">Search customers</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search shipment, exporter, destination…"
          />
        </label>
        <span>{filtered.length} shipments</span>
      </div>
      {loading ? (
        <p className={styles.loading}>Loading customers…</p>
      ) : (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Shipment</th>
                  <th>Exporter</th>
                  <th>Route</th>
                  <th>Cargo ready</th>
                  <th>CBM / weight</th>
                  <th>Payment</th>
                  <th>Documents</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((customer) => (
                  <tr key={customer.shipmentId}>
                    <td>
                      <strong>{customer.shipmentId}</strong>
                    </td>
                    <td>
                      {customer.exporter}
                      <small>{customer.product}</small>
                    </td>
                    <td>
                      {customer.origin} → {customer.destination}
                    </td>
                    <td>{formatDate(customer.cargoReadyDate)}</td>
                    <td>
                      {customer.cbm} CBM
                      <small>{customer.grossWeightKg} kg</small>
                    </td>
                    <td>
                      <PaymentLabel status={customer.paymentStatus} />
                    </td>
                    <td>
                      <span className={styles.progressLabel}>
                        {customer.documentReadiness}%
                      </span>
                    </td>
                    <td>
                      <Link
                        className="btn btn-secondary"
                        href={`/forwarder/customers/${customer.shipmentId}`}
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.mobileList}>
            {filtered.map((customer) => (
              <CustomerCard customer={customer} key={customer.shipmentId} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function LeadCompact({ lead }: { lead: ForwarderLead }) {
  return (
    <div className={styles.leadCompact}>
      <span className={styles.score}>{lead.compatibilityEstimate}%</span>
      <span>
        <strong>{lead.exporterDisplayName}</strong>
        <small>
          {lead.origin} → {lead.destination} · {lead.cbm} CBM
        </small>
      </span>
      <Link href="/forwarder/leads">Open</Link>
    </div>
  );
}

function OfferDialog({
  lead,
  onClose,
}: {
  lead: ForwarderLead;
  onClose: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    const values = new FormData(event.currentTarget);
    await forwarderService.createOffer({
      shipmentId: lead.shipmentId,
      freightForwarderId: "current-forwarder",
      proposedDeparture: String(values.get("departure")),
      cargoCutoff: String(values.get("cargoCutoff")),
      documentCutoff: String(values.get("documentCutoff")),
      availableCapacityCbm: Number(values.get("capacity")),
      estimatedFreightCost: Number(values.get("cost")),
      estimatedTransitDays: Number(values.get("transit")),
      notes: String(values.get("notes") ?? ""),
    });
    setSubmitting(false);
    setSent(true);
  }
  return (
    <div className={styles.overlay} role="presentation" onMouseDown={onClose}>
      <section
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="offer-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          className={styles.close}
          type="button"
          onClick={onClose}
          aria-label="Close offer dialog"
        >
          <X size={20} />
        </button>
        {sent ? (
          <div className={styles.dialogSuccess}>
            <CheckCircle2 size={42} />
            <h2 id="offer-title">Offer Sent</h2>
            <p>The UMKM can review this offer from their Matching page.</p>
            <button className="btn btn-primary" type="button" onClick={onClose}>
              Done
            </button>
          </div>
        ) : (
          <>
            <div>
              <span className="eyebrow">
                Compatibility {lead.compatibilityEstimate}%
              </span>
              <h2 id="offer-title">Express Interest</h2>
              <p>
                {lead.exporterDisplayName} · {lead.origin} → {lead.destination}
              </p>
            </div>
            <form className={styles.offerForm} onSubmit={submit}>
              <label>
                Proposed Departure
                <input
                  name="departure"
                  type="date"
                  defaultValue="2026-08-27"
                  required
                />
              </label>
              <label>
                Available Capacity (CBM)
                <input
                  name="capacity"
                  type="number"
                  min="0.1"
                  step="0.1"
                  defaultValue="18"
                  required
                />
              </label>
              <label>
                Estimated Freight Cost (IDR)
                <input
                  name="cost"
                  type="number"
                  min="0"
                  defaultValue="12000000"
                  required
                />
              </label>
              <label>
                Cargo Cut-off
                <input
                  name="cargoCutoff"
                  type="date"
                  defaultValue="2026-08-22"
                  required
                />
              </label>
              <label>
                Document Cut-off
                <input
                  name="documentCutoff"
                  type="date"
                  defaultValue="2026-08-21"
                />
              </label>
              <label>
                Estimated Transit (days)
                <input name="transit" type="number" min="1" defaultValue="18" />
              </label>
              <label className={styles.full}>
                Notes
                <textarea
                  name="notes"
                  placeholder="Operational notes for the exporter"
                />
              </label>
              <div className={`${styles.dialogActions} ${styles.full}`}>
                <button
                  className="btn btn-ghost"
                  type="button"
                  onClick={onClose}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={submitting}
                >
                  <Send size={16} />
                  {submitting ? "Sending…" : "Send Offer"}
                </button>
              </div>
            </form>
          </>
        )}
      </section>
    </div>
  );
}

export function ForwarderLeadsPage() {
  const { leads, loading } = useForwarderResources();
  const [selected, setSelected] = useState<ForwarderLead | null>(null);
  return (
    <ForwarderLayout>
      <div className={styles.page}>
        <header className="page-header">
          <div>
            <span className="eyebrow">Reverse Matching</span>
            <h1 className="page-title">Potential Leads</h1>
            <p className="page-subtitle">
              Cargo opportunities that may fit your route, schedule, capacity,
              and handling profile.
            </p>
          </div>
        </header>
        {loading ? (
          <p className={styles.loading}>Calculating compatibility…</p>
        ) : (
          <div className={styles.leadGrid}>
            {leads.map((lead) => (
              <article className={styles.leadCard} key={lead.shipmentId}>
                <div className={styles.cardHead}>
                  <div>
                    <span className={styles.reference}>{lead.shipmentId}</span>
                    <h2>{lead.exporterDisplayName}</h2>
                  </div>
                  <span className={styles.scoreLarge}>
                    {lead.compatibilityEstimate}%<small>Match Score</small>
                  </span>
                </div>
                <p className={styles.route}>
                  <MapPin size={16} />
                  {lead.origin} → {lead.destination}
                </p>
                <p className={styles.product}>
                  {lead.productCategory} · {lead.cbm} CBM · {lead.grossWeightKg}{" "}
                  kg
                </p>
                <dl className={styles.matchBreakdown}>
                  <div>
                    <dt>Route Match</dt>
                    <dd>{lead.routeMatch}</dd>
                  </div>
                  <div>
                    <dt>Schedule Match</dt>
                    <dd>{lead.scheduleMatch}</dd>
                  </div>
                  <div>
                    <dt>Capacity Match</dt>
                    <dd>{lead.capacityMatch}</dd>
                  </div>
                  <div>
                    <dt>Document Ready</dt>
                    <dd>{lead.documentReadiness}%</dd>
                  </div>
                </dl>
                <div className={styles.dateBand}>
                  <Clock3 size={16} />
                  <span>
                    Cargo ready {formatDate(lead.cargoReadyDate)}
                    <small>
                      Flexible until {formatDate(lead.preferredDepartureEnd)}
                    </small>
                  </span>
                </div>
                <div className={styles.cardActions}>
                  <button
                    className="btn btn-ghost"
                    type="button"
                    onClick={() => setSelected(lead)}
                  >
                    <Eye size={15} />
                    View Lead
                  </button>
                  <button
                    className="btn btn-primary"
                    type="button"
                    onClick={() => setSelected(lead)}
                  >
                    Express Interest
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
        {selected && (
          <OfferDialog lead={selected} onClose={() => setSelected(null)} />
        )}
      </div>
    </ForwarderLayout>
  );
}

function DocumentPreviewDialog({
  document,
  shipmentId,
  onClose,
}: {
  document: ExportDocumentRecord;
  shipmentId: string;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"view" | "revision">("view");
  const [note, setNote] = useState("");
  const [notice, setNotice] = useState("");
  async function review(action: "reviewed" | "revision") {
    if (action === "revision")
      await forwarderService.requestDocumentRevision(document.id, note);
    else await forwarderService.reviewDocument(document.id, note);
    setNotice(
      action === "revision"
        ? "Revision request sent to the UMKM."
        : "Document marked as reviewed.",
    );
  }
  return (
    <div className={styles.overlay} role="presentation" onMouseDown={onClose}>
      <section
        className={`${styles.dialog} ${styles.previewDialog}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="preview-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          className={styles.close}
          type="button"
          onClick={onClose}
          aria-label="Close preview"
        >
          <X size={20} />
        </button>
        <header>
          <span className="eyebrow">
            {shipmentId} · Version {document.version}
          </span>
          <h2 id="preview-title">{document.label}</h2>
          <p>{document.fileName ?? "External document is not available yet"}</p>
        </header>
        <div className={styles.previewGrid}>
          <div className={styles.pdfPreview}>
            {document.fileUrl ? (
              <iframe
                src={`${document.fileUrl}#page=1`}
                title={`${document.label} PDF preview`}
              />
            ) : (
              <EmptyState
                icon={FileText}
                title="Preview waiting for API"
                description="The typed mock contains document metadata and extracted fields; binary preview will use the backend file URL."
              />
            )}
          </div>
          <aside className={styles.validationPanel}>
            <h3>Extracted information</h3>
            {document.extractedFields.length ? (
              document.extractedFields.map((field) => (
                <div className={styles.fieldRow} key={field.fieldKey}>
                  <span>
                    <strong>{field.label}</strong>
                    <small>
                      {field.source?.fileName ?? document.fileName} · Page{" "}
                      {field.sourcePage ?? 1}
                    </small>
                  </span>
                  <span>{field.value ?? "—"}</span>
                </div>
              ))
            ) : (
              <p>No extracted fields are available for this mock document.</p>
            )}
            <div className={styles.reviewBoundary}>
              <strong>Forwarder permissions</strong>
              <p>
                You can review or request a revision. Canonical UMKM data cannot
                be overwritten.
              </p>
            </div>
          </aside>
        </div>
        {notice && (
          <p className={styles.notice}>
            <Check size={15} />
            {notice}
          </p>
        )}
        {mode === "revision" && (
          <label className={styles.noteField}>
            Revision note
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Describe what the UMKM needs to revise"
            />
          </label>
        )}
        <div className={styles.dialogActions}>
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => setMode("revision")}
          >
            <MessageSquareText size={15} />
            Request Revision
          </button>
          <button
            className="btn btn-primary"
            type="button"
            disabled={mode === "revision" && !note.trim()}
            onClick={() =>
              review(mode === "revision" ? "revision" : "reviewed")
            }
          >
            <Check size={15} />
            {mode === "revision" ? "Send Request" : "Confirm Reviewed"}
          </button>
        </div>
      </section>
    </div>
  );
}

export function ForwarderCustomerDetailPage({
  shipmentId,
}: {
  shipmentId: string;
}) {
  const [customer, setCustomer] = useState<ForwarderCustomer | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] =
    useState<ExportDocumentRecord | null>(null);
  useEffect(() => {
    let active = true;
    forwarderService
      .getCustomerShipment(shipmentId)
      .then((data) => {
        if (active) setCustomer(data);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [shipmentId]);
  if (loading)
    return (
      <ForwarderLayout>
        <p className={styles.loading}>Loading customer workspace…</p>
      </ForwarderLayout>
    );
  if (!customer)
    return (
      <ForwarderLayout>
        <EmptyState
          icon={Users}
          title="Shipment not found"
          description="This shipment is not available to the current freight forwarder."
          action={
            <Link className="btn btn-secondary" href="/forwarder/customers">
              Back to customers
            </Link>
          }
        />
      </ForwarderLayout>
    );
  const info = [
    ["Exporter", customer.exporter],
    ["Consignee", customer.consignee],
    ["Product", customer.product],
    ["HS Code", customer.hsCode],
    ["Quantity", customer.quantity],
    [
      "Gross / Net Weight",
      `${customer.grossWeightKg} / ${customer.netWeightKg} kg`,
    ],
    ["Final CBM", `${customer.cbm} CBM`],
    ["Packaging", customer.packaging],
    ["Handling", customer.handling],
    ["Cargo Ready", formatDate(customer.cargoReadyDate)],
  ];
  return (
    <ForwarderLayout>
      <div className={styles.page}>
        <header className="page-header">
          <div>
            <span className="eyebrow">Customer Operational Workspace</span>
            <h1 className="page-title">{customer.shipmentId}</h1>
            <p className="page-subtitle">
              {customer.exporter} · {customer.origin} → {customer.destination}
            </p>
          </div>
          <PaymentLabel status={customer.paymentStatus} />
        </header>
        <section className={styles.detailGrid}>
          <article className={styles.panel}>
            <div className={styles.sectionHead}>
              <div>
                <h2>Shipment Information</h2>
                <p>Submitted by the UMKM.</p>
              </div>
            </div>
            <dl className={styles.definitionGrid}>
              {info.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </article>
          <article className={styles.panel}>
            <div className={styles.sectionHead}>
              <div>
                <h2>Matching Information</h2>
                <p>Consolidated capacity and schedule.</p>
              </div>
            </div>
            <dl className={styles.definitionGrid}>
              {[
                [
                  "Route",
                  `${customer.matching.originPort} → ${customer.matching.destinationPort}`,
                ],
                ["Shipment Type", customer.matching.shipmentType],
                [
                  "Estimated Departure",
                  formatDate(customer.matching.estimatedDeparture),
                ],
                ["Cargo Cut-off", formatDate(customer.matching.cargoCutoff)],
                [
                  "Remaining Capacity",
                  `${customer.matching.remainingCapacityCbm} CBM`,
                ],
                ["Forwarder", customer.matching.freightForwarder],
                ["Matching Status", customer.matching.status],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </article>
        </section>
        <section className={styles.panel}>
          <div className={styles.sectionHead}>
            <div>
              <h2>Payment</h2>
              <p>The shipment is shown because the payment gate has passed.</p>
            </div>
          </div>
          <dl className={styles.paymentGrid}>
            <div>
              <dt>Status</dt>
              <dd>
                <PaymentLabel status={customer.paymentStatus} />
              </dd>
            </div>
            <div>
              <dt>Amount Paid</dt>
              <dd>{formatRupiah(customer.amountPaid)}</dd>
            </div>
            <div>
              <dt>Payment Date</dt>
              <dd>{formatDate(customer.paymentDate)}</dd>
            </div>
            <div>
              <dt>Booking Reference</dt>
              <dd>{customer.bookingReference}</dd>
            </div>
          </dl>
        </section>
        <section className={styles.panel}>
          <div className={styles.sectionHead}>
            <div>
              <h2>Submitted Documents</h2>
              <p>Read-only access with review and revision actions.</p>
            </div>
            <span className={styles.readiness}>
              {customer.documentReadiness}% ready
            </span>
          </div>
          {customer.documents.length ? (
            <div className={styles.documentList}>
              {customer.documents.map((document) => (
                <article key={document.id}>
                  <span className={styles.iconBox}>
                    <FileText size={18} />
                  </span>
                  <span>
                    <strong>{document.label}</strong>
                    <small>
                      {document.origin.toUpperCase()} · Version{" "}
                      {document.version}
                    </small>
                  </span>
                  <StatusBadge status={document.status.replaceAll("_", " ")} />
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={() => setSelectedDocument(document)}
                  >
                    <Eye size={15} />
                    View
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={FileText}
              title="No documents yet"
              description="The customer has not submitted documents for this shipment."
            />
          )}
        </section>
        {selectedDocument && (
          <DocumentPreviewDialog
            document={selectedDocument}
            shipmentId={customer.shipmentId}
            onClose={() => setSelectedDocument(null)}
          />
        )}
      </div>
    </ForwarderLayout>
  );
}

function Documents() {
  const { customers, loading } = useForwarderResources();
  const [selected, setSelected] = useState<{
    document: ExportDocumentRecord;
    shipmentId: string;
  } | null>(null);
  const documents = useMemo(
    () =>
      customers.flatMap((customer) =>
        customer.documents.map((document) => ({
          document,
          shipmentId: customer.shipmentId,
          exporter: customer.exporter,
        })),
      ),
    [customers],
  );
  return (
    <div className={styles.page}>
      <header className="page-header">
        <div>
          <span className="eyebrow">Read-only review</span>
          <h1 className="page-title">Customer Documents</h1>
          <p className="page-subtitle">
            Uploaded documents and generated drafts shared by confirmed
            customers.
          </p>
        </div>
      </header>
      {loading ? (
        <p className={styles.loading}>Loading documents…</p>
      ) : (
        <div className={styles.panel}>
          <div className={styles.documentList}>
            {documents.map(({ document, shipmentId, exporter }) => (
              <article key={document.id}>
                <span className={styles.iconBox}>
                  <FileText size={18} />
                </span>
                <span>
                  <strong>{document.label}</strong>
                  <small>
                    {shipmentId} · {exporter} · Version {document.version}
                  </small>
                </span>
                <StatusBadge status={document.status.replaceAll("_", " ")} />
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={() => setSelected({ document, shipmentId })}
                >
                  <Eye size={15} />
                  View
                </button>
              </article>
            ))}
          </div>
        </div>
      )}
      {selected && (
        <DocumentPreviewDialog
          document={selected.document}
          shipmentId={selected.shipmentId}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function Notifications() {
  const [items, setItems] = useState<
    Awaited<ReturnType<typeof forwarderService.getNotifications>>
  >([]);
  useEffect(() => {
    forwarderService.getNotifications().then(setItems);
  }, []);
  return (
    <div className={styles.page}>
      <header className="page-header">
        <div>
          <span className="eyebrow">Updates</span>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">
            Payment, document, cut-off, and matching events that require
            attention.
          </p>
        </div>
      </header>
      <section className={styles.panel}>
        {items.map((item) => (
          <div
            className={`${styles.notification} ${item.unread ? styles.unread : ""}`}
            key={item.id}
          >
            <span className={styles.iconBox}>
              <Bell size={18} />
            </span>
            <span>
              <strong>{item.title}</strong>
              <small>{item.description}</small>
            </span>
            <time>{formatDate(item.createdAt)}</time>
          </div>
        ))}
      </section>
    </div>
  );
}

export default function ForwarderWorkspace({ page }: { page: ForwarderPage }) {
  return (
    <ForwarderLayout>
      {page === "dashboard" ? (
        <Dashboard />
      ) : page === "customers" ? (
        <Customers />
      ) : page === "shipments" ? (
        <Customers shipmentsOnly />
      ) : page === "documents" ? (
        <Documents />
      ) : (
        <Notifications />
      )}
    </ForwarderLayout>
  );
}
