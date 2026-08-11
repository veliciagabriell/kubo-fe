"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  CircleAlert,
  Clock3,
  Download,
  Eye,
  FileCheck2,
  FileText,
  Info,
  PackageCheck,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError, api, fileUrl } from "@/lib/api";
import type {
  ApiConflictCandidate,
  ApiDocument,
  ApiDocumentAssistantCard,
  ApiDocumentAssistantOverview,
  ApiDocumentField,
  ApiDocumentGenerationReadiness,
  ApiDocumentType,
  ApiDocumentTypeInfo,
  ApiFieldSource,
  ApiFieldValidationStatus,
  ApiUploadedDocumentValidation,
} from "@/lib/api-types";
import { useDocumentTypes, useShipments } from "@/lib/hooks";
import { formatDate } from "@/utils/format";
import AppShell from "@/components/layout/AppShell";
import RequireAuth from "@/components/RequireAuth";
import RoleGuard from "@/components/RoleGuard";
import styles from "./document-assistant.module.css";

type ProcessingStatus =
  | "uploaded"
  | "queued"
  | "parsing"
  | "ocr_processing"
  | "classifying"
  | "extracting"
  | "completed"
  | "needs_review"
  | "failed";

interface ProcessingResult {
  documentId: string;
  fileName: string | null;
  processingStatus: ProcessingStatus | null;
  classification: {
    type: string | null;
    confidence: number | null;
    method: string | null;
  };
  pages: number | null;
  hasTextLayer: boolean | null;
  error: string | null;
}

const TERMINAL = new Set<ProcessingStatus>([
  "completed",
  "needs_review",
  "failed",
]);

const STATUS_LABELS: Record<ApiFieldValidationStatus, string> = {
  valid: "Valid",
  missing: "Missing",
  invalid: "Invalid",
  conflict: "Conflict",
  needs_confirmation: "Needs confirmation",
  waiting_external_data: "Waiting external data",
};

const DOCUMENT_STATUS_LABELS: Record<string, string> = {
  valid: "Valid",
  needs_attention: "Needs Attention",
  missing_fields: "Missing Information",
  conflict: "Conflict Found",
  ready_to_generate: "Ready to Generate",
  draft_generated: "AI Draft",
  waiting_external_data: "Waiting External Data",
  verified: "Verified",
};

const SOURCE_LABELS: Record<string, string> = {
  company_profile: "Company Profile",
  shipment: "Shipment Information",
  cargo: "Cargo Information",
  container_match: "Container Match",
  vessel_match: "Vessel Match",
  uploaded_document: "Uploaded Document",
  generated_document: "Generated Document",
  freight_forwarder: "Freight Forwarder",
};

function errorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

function useAssistantOverview(shipmentId: string, refreshToken: number) {
  const [data, setData] = useState<ApiDocumentAssistantOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!shipmentId) return;
    queueMicrotask(() => {
      if (cancelled) return;
      setLoading(true);
      setError(null);
      void api
        .get<{ data: ApiDocumentAssistantOverview }>(
          `/shipments/${shipmentId}/document-assistant`,
        )
        .then((response) => {
          if (!cancelled) setData(response.data);
        })
        .catch((reason) => {
          if (!cancelled)
            setError(errorMessage(reason, "Unable to load document readiness."));
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    });
    return () => {
      cancelled = true;
    };
  }, [shipmentId, refreshToken]);
  return { data, loading, error };
}

function StatusPill({ status }: { status: string }) {
  return (
    <span className={`${styles.status} ${styles[`status_${status}`] ?? ""}`}>
      {DOCUMENT_STATUS_LABELS[status] ?? STATUS_LABELS[status as ApiFieldValidationStatus] ?? status}
    </span>
  );
}

export function DocumentReadinessSummary({
  readiness,
}: {
  readiness: ApiDocumentAssistantOverview["readiness"];
}) {
  return (
    <section className={`${styles.card} ${styles.readinessSummary}`}>
      <div
        className={styles.readinessGauge}
        style={{
          background: `radial-gradient(circle, #fff 58%, transparent 60%), conic-gradient(#fa8615 ${readiness.readinessPercent}%, #eceaf4 0)`,
        }}
      >
        <strong>{readiness.readinessPercent}%</strong>
        <span>Export readiness</span>
      </div>
      <div className={styles.readinessCopy}>
        <p>
          KUBO combines shipment data, cargo, matched operations, and uploaded
          documents. You only need to resolve missing or conflicting values.
        </p>
        <div className={styles.summaryStats}>
          <span><Check size={15} /> {readiness.readyDocuments} Ready</span>
          <span><AlertTriangle size={15} /> {readiness.attentionDocuments} Need Attention</span>
          <span><Clock3 size={15} /> {readiness.unavailableDocuments} Waiting</span>
        </div>
      </div>
    </section>
  );
}

export function CrossDocumentValidationSummary({
  validation,
}: {
  validation: ApiDocumentAssistantOverview["crossDocumentValidation"];
}) {
  return (
    <section className={`${styles.card} ${styles.crossSummary}`}>
      <span className={validation.status === "valid" ? styles.iconGood : styles.iconWarn}>
        {validation.status === "valid" ? <ShieldCheck size={22} /> : <CircleAlert size={22} />}
      </span>
      <div>
        <h2>Cross-document validation</h2>
        <p>{validation.message}</p>
        {validation.conflicts.length > 0 && (
          <details>
            <summary>View inconsistencies</summary>
            <div className={styles.conflictList}>
              {validation.conflicts.map((conflict) => (
                <div key={conflict.field}>
                  <strong>{conflict.field.replaceAll("_", " ")}</strong>
                  <span>
                    {conflict.candidates
                      .map((candidate) => `${candidate.value} — ${candidate.source.label}`)
                      .join(" · ")}
                  </span>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </section>
  );
}

export function DocumentCard({
  document,
  shipmentId,
  onReview,
}: {
  document: ApiDocumentAssistantCard;
  shipmentId: string;
  onReview?: (documentId: string) => void;
}) {
  const action = document.primaryAction;
  const actionLabel =
    action === "generate"
      ? "Generate Draft"
      : action === "preview"
        ? "Preview Draft"
        : action === "review"
          ? "Review"
          : "Resolve";
  const actionClass = action === "generate" ? "btn btn-primary" : "btn btn-secondary";
  return (
    <article className={`${styles.card} ${styles.documentCard}`}>
      <div className={styles.documentTop}>
        <span className={styles.documentIcon}><FileText size={20} /></span>
        <StatusPill status={document.status} />
      </div>
      <h3>{document.label}</h3>
      <p className={styles.availability}>
        <strong>{document.knownFields} / {document.totalFields}</strong> data available
      </p>
      <div className={styles.miniProgress}>
        <span style={{ width: `${document.readiness.readinessPercent}%` }} />
      </div>
      <div className={styles.sourceChips}>
        {document.sources.slice(0, 4).map((source) => <span key={source}>{source}</span>)}
      </div>
      <div className={styles.documentAction}>
        {action === "preview" && document.fileUrl ? (
          <a className={actionClass} href={fileUrl(document.fileUrl) ?? "#"} target="_blank" rel="noreferrer">
            <Eye size={15} /> {actionLabel}
          </a>
        ) : action === "review" && document.documentId && onReview ? (
          <button className={actionClass} type="button" onClick={() => onReview(document.documentId!)}>
            {actionLabel}
          </button>
        ) : (
          <Link className={actionClass} href={`/documents/new/${document.type}?shipment=${encodeURIComponent(shipmentId)}`}>
            {action === "generate" && <Sparkles size={15} />} {actionLabel}
          </Link>
        )}
      </div>
    </article>
  );
}

export function FieldSourcePopover({ sources }: { sources: ApiFieldSource[] }) {
  if (!sources.length) return <span className={styles.muted}>No source yet</span>;
  return (
    <details className={styles.sourceDetails}>
      <summary>{sources[0].label}</summary>
      <div className={styles.sourcePopover}>
        {sources.map((source, index) => (
          <div key={`${source.documentId ?? source.sourceType}-${index}`}>
            <strong>{source.label}</strong>
            <span>{SOURCE_LABELS[source.sourceType] ?? source.sourceType}</span>
            {source.fileName && <span>{source.fileName}</span>}
            {source.page != null && <span>Page {source.page}</span>}
            {source.rawText && <q>{source.rawText}</q>}
          </div>
        ))}
      </div>
    </details>
  );
}

export function ConflictResolutionPanel({
  field,
  onResolve,
  resolving,
}: {
  field: ApiDocumentField;
  onResolve: (field: ApiDocumentField, candidate: ApiConflictCandidate) => void;
  resolving: boolean;
}) {
  if (!field.conflictCandidates?.length) return null;
  return (
    <div className={styles.conflictPanel}>
      <strong>{field.label} differs</strong>
      <div className={styles.candidateGrid}>
        {field.conflictCandidates.map((candidate, index) => (
          <button
            type="button"
            key={`${candidate.normalizedValue}-${index}`}
            disabled={resolving}
            onClick={() => onResolve(field, candidate)}
          >
            <span>{candidate.value}{candidate.unit ? ` ${candidate.unit}` : ""}</span>
            <small>
              {resolving
                ? "Saving your choice…"
                : `Use value from ${candidate.source.label}`}
            </small>
          </button>
        ))}
      </div>
      <p>KUBO will never choose between conflicting values without your confirmation.</p>
    </div>
  );
}

export function FieldValidationRow({
  field,
  onResolve,
  resolving,
}: {
  field: ApiDocumentField;
  onResolve?: (field: ApiDocumentField, candidate: ApiConflictCandidate) => void;
  resolving?: boolean;
}) {
  return (
    <>
      <tr>
        <td><strong>{field.label}</strong>{field.required && <span className={styles.required}>Required</span>}</td>
        <td>{field.value ? `${field.value}${field.unit ? ` ${field.unit}` : ""}` : "—"}</td>
        <td><StatusPill status={field.status} /></td>
        <td><FieldSourcePopover sources={field.sources} /></td>
      </tr>
      {field.status === "conflict" && onResolve && (
        <tr className={styles.conflictRow}>
          <td colSpan={4}>
            <ConflictResolutionPanel field={field} onResolve={onResolve} resolving={Boolean(resolving)} />
          </td>
        </tr>
      )}
    </>
  );
}

export function DocumentFieldTable({
  fields,
  onResolve,
  resolving,
}: {
  fields: ApiDocumentField[];
  onResolve?: (field: ApiDocumentField, candidate: ApiConflictCandidate) => void;
  resolving?: boolean;
}) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.fieldTable}>
        <thead><tr><th>Field</th><th>Value</th><th>Status</th><th>Source</th></tr></thead>
        <tbody>
          {fields.map((field) => (
            <FieldValidationRow key={field.key} field={field} onResolve={onResolve} resolving={resolving} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MissingFieldsPanel({
  fields,
  values,
  onChange,
}: {
  fields: ApiDocumentField[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  if (!fields.length)
    return (
      <div className={styles.allReady}>
        <Check size={20} /> All required user-provided information is available.
      </div>
    );
  return (
    <section className={`${styles.card} ${styles.missingPanel}`}>
      <h2>We still need</h2>
      <p>Only these missing or unconfirmed fields require your input.</p>
      <div className={styles.missingGrid}>
        {fields.map((field, index) => (
          <label key={field.key}>
            <span>{index + 1}. {field.label}</span>
            <input
              value={values[field.key] ?? ""}
              onChange={(event) => onChange(field.key, event.target.value)}
              placeholder={field.value ? `Confirm: ${field.value}` : "Enter missing value"}
            />
            {field.status === "needs_confirmation" && <small>Confirm or correct the existing shipment value.</small>}
          </label>
        ))}
      </div>
    </section>
  );
}

export function GeneratedDocumentPreview({ document }: { document: ApiDocument }) {
  const pdf = fileUrl(document.fileUrl);
  const docx = fileUrl(document.docxFileUrl);
  const sources = Array.isArray(document.generatedSources)
    ? document.generatedSources
    : document.generatedSources
      ? (JSON.parse(document.generatedSources) as string[])
      : [];
  return (
    <section className={`${styles.card} ${styles.previewPanel}`}>
      <div className={styles.previewHead}>
        <div>
          <span className={styles.draftBadge}>AI Draft · Not an official document</span>
          <h2>Generated draft preview</h2>
          <p>Template {document.templateVersion ?? "1.0.0"} · Generated {document.generatedAt ? formatDate(document.generatedAt) : "now"}</p>
        </div>
        <div className={styles.previewActions}>
          {pdf && <a className="btn btn-primary" href={pdf} download><Download size={16} /> Download PDF</a>}
          {docx && <a className="btn btn-secondary" href={docx} download><Download size={16} /> Download DOCX</a>}
          <Link className="btn btn-secondary" href="/support">Request Review</Link>
        </div>
      </div>
      <div className={styles.sourceChips}>{sources.map((source) => <span key={source}>{SOURCE_LABELS[source] ?? source}</span>)}</div>
      {pdf && <iframe className={styles.previewFrame} src={pdf} title="Generated document preview" />}
    </section>
  );
}

function UploadedDocumentValidation({
  validation,
  onResolve,
  resolving,
}: {
  validation: ApiUploadedDocumentValidation;
  onResolve: (field: ApiDocumentField, candidate: ApiConflictCandidate) => void;
  resolving: boolean;
}) {
  const summary = validation.readiness;
  const debugEnabled = process.env.NEXT_PUBLIC_DOCUMENT_DEBUG === "true";
  return (
    <section id="validation" className={`${styles.card} ${styles.validationPanel}`}>
      <div className={styles.validationHead}>
        <div>
          <span className={styles.eyebrow}>Uploaded Document Validation</span>
          <h2>{validation.document.label}</h2>
          <p>{validation.document.fileName} · Shipment {validation.shipment.code}</p>
        </div>
        <StatusPill status={validation.document.status} />
      </div>
      <div className={styles.validationStats}>
        <span><Check size={15} /> {summary.validFields} valid</span>
        <span><CircleAlert size={15} /> {summary.missingFields} missing</span>
        <span><AlertTriangle size={15} /> {summary.conflictFields + summary.confirmationFields} require confirmation</span>
      </div>
      <DocumentFieldTable fields={validation.fields} onResolve={onResolve} resolving={resolving} />
      {debugEnabled && (
        <details className={styles.debugPanel}>
          <summary>Developer diagnostics</summary>
          <pre>{JSON.stringify(validation.debug, null, 2)}</pre>
        </details>
      )}
    </section>
  );
}

export function DocumentAssistantPage({ catalogOnly = false }: { catalogOnly?: boolean }) {
  const { data: shipments, loading: shipmentsLoading } = useShipments();
  const { data: documentTypes } = useDocumentTypes();
  const [selectedShipmentId, setSelectedShipmentId] = useState("");
  const shipmentId = selectedShipmentId || shipments[0]?.id || "";
  const [refreshToken, setRefreshToken] = useState(0);
  const { data: overview, loading, error } = useAssistantOverview(shipmentId, refreshToken);
  const [file, setFile] = useState<File | null>(null);
  const [selectedType, setSelectedType] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [processing, setProcessing] = useState<ProcessingResult | null>(null);
  const [validation, setValidation] = useState<ApiUploadedDocumentValidation | null>(null);
  const [resolving, setResolving] = useState(false);

  const loadValidation = useCallback(async (documentId: string) => {
    if (!shipmentId) return;
    const response = await api.get<{ data: ApiUploadedDocumentValidation }>(
      `/shipments/${shipmentId}/documents/${documentId}/validation`,
    );
    setValidation(response.data);
  }, [shipmentId]);

  useEffect(() => {
    if (!processing?.documentId || !processing.processingStatus || TERMINAL.has(processing.processingStatus)) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const response = await api.get<{ data: ProcessingResult }>(`/documents/${processing.documentId}/status`);
        if (!cancelled) setProcessing(response.data);
      } catch (reason) {
        if (!cancelled) setUploadError(errorMessage(reason, "Unable to refresh document status."));
      }
    }, 1400);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [processing]);

  useEffect(() => {
    if (!processing?.documentId || !processing.processingStatus || !TERMINAL.has(processing.processingStatus) || processing.processingStatus === "failed") return;
    queueMicrotask(() => {
      void loadValidation(processing.documentId)
        .then(() => setRefreshToken((value) => value + 1))
        .catch((reason) => setUploadError(errorMessage(reason, "Unable to validate the uploaded document.")));
    });
  }, [processing?.documentId, processing?.processingStatus, loadValidation]);

  async function uploadDocument() {
    if (!file || !shipmentId) return;
    setUploading(true);
    setUploadError(null);
    setValidation(null);
    setProcessing(null);
    const body = new FormData();
    body.append("file", file);
    if (selectedType) body.append("declaredDocumentType", selectedType);
    try {
      const response = await api.post<{ data: ProcessingResult }>(`/shipments/${shipmentId}/documents`, body);
      setProcessing(response.data);
    } catch (reason) {
      setUploadError(errorMessage(reason, "Unable to upload the document."));
    } finally {
      setUploading(false);
    }
  }

  async function reviewDocument(documentId: string) {
    try {
      setUploadError(null);
      await loadValidation(documentId);
      requestAnimationFrame(() => document.getElementById("validation")?.scrollIntoView({ behavior: "smooth" }));
    } catch (reason) {
      setUploadError(errorMessage(reason, "Unable to open document validation."));
    }
  }

  async function resolveField(field: ApiDocumentField, candidate: ApiConflictCandidate) {
    if (!shipmentId) return;
    setResolving(true);
    setNotice(null);
    setUploadError(null);
    try {
      await api.post(`/shipments/${shipmentId}/document-conflicts/resolve`, {
        field: field.canonicalKey,
        value: candidate.value,
        unit: candidate.unit,
        sourceDocumentId: candidate.source.documentId,
      });
      if (validation) await loadValidation(validation.document.id);
      setRefreshToken((value) => value + 1);
      setNotice(`${field.label} updated from ${candidate.source.label}.`);
    } catch (reason) {
      setUploadError(errorMessage(reason, "Unable to save the selected value."));
    } finally {
      setResolving(false);
    }
  }

  const categories = useMemo(() => {
    const groups = new Map<string, ApiDocumentAssistantCard[]>();
    overview?.documents.forEach((document) => {
      const entries = groups.get(document.category) ?? [];
      entries.push(document);
      groups.set(document.category, entries);
    });
    return groups;
  }, [overview]);

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <span className={styles.eyebrow}>Upload once, reuse everywhere</span>
          <h1>{catalogOnly ? "Generate Export Document" : "Document Assistant"}</h1>
          <p>KUBO understands your shipment, checks inconsistencies, and prepares the next controlled draft.</p>
        </div>
        {!catalogOnly && <Link className="btn btn-primary" href="/documents/new"><Sparkles size={17} /> Generate Draft</Link>}
      </header>

      <section className={`${styles.card} ${styles.shipmentSelector}`}>
        <label>
          <span>Shipment</span>
          <select value={shipmentId} onChange={(event) => { setSelectedShipmentId(event.target.value); setValidation(null); }} disabled={shipmentsLoading}>
            {shipments.map((shipment) => <option key={shipment.id} value={shipment.id}>{shipment.id} · {shipment.originPort} → {shipment.destinationPort}</option>)}
          </select>
        </label>
        {overview && (
          <div className={styles.shipmentMeta}>
            <span>{overview.shipment.origin} → {overview.shipment.destination}</span>
            <span>Cargo Ready: {formatDate(overview.shipment.cargoReadyDate)}</span>
          </div>
        )}
      </section>

      {(loading || shipmentsLoading) && <p className={styles.loading}>Building shipment knowledge…</p>}
      {(error || uploadError) && <p className={styles.error}>{error || uploadError}</p>}
      {notice && <p className={styles.notice}><Check size={16} /> {notice}</p>}
      {overview && (
        <>
          {!catalogOnly && <DocumentReadinessSummary readiness={overview.readiness} />}
          {!catalogOnly && <CrossDocumentValidationSummary validation={overview.crossDocumentValidation} />}

          <section className={styles.documentsSection}>
            <div className={styles.sectionTitle}>
              <div><h2>Documents</h2><p>Known data is prefilled automatically. Forms appear only for missing values.</p></div>
            </div>
            <div className={styles.categoryStack}>
              <section>
                <h3>Dokumen Legalitas</h3>
                <div className={styles.documentGrid}>
                  <article className={`${styles.card} ${styles.documentCard}`}>
                    <div className={styles.documentTop}><span className={styles.documentIcon}><ShieldCheck size={20} /></span><StatusPill status={overview.company.status === "valid" ? "valid" : "missing_fields"} /></div>
                    <h3>Nomor Induk Berusaha</h3>
                    <p className={styles.availability}>{overview.company.nib ? overview.company.nib : "NIB has not been added to Company Profile"}</p>
                    <Link className="btn btn-secondary" href="/settings">Company Profile</Link>
                  </article>
                  {(categories.get("Dokumen Legalitas") ?? []).map((document) => <DocumentCard key={document.type} document={document} shipmentId={shipmentId} onReview={reviewDocument} />)}
                </div>
              </section>
              {["Dokumen Pabean", "Dokumen Transaksi", "Dokumen Pengiriman"].map((category) => (
                <section key={category}>
                  <h3>{category}</h3>
                  <div className={styles.documentGrid}>
                    {(categories.get(category) ?? []).map((document) => <DocumentCard key={document.type} document={document} shipmentId={shipmentId} onReview={reviewDocument} />)}
                  </div>
                </section>
              ))}
            </div>
          </section>
        </>
      )}

      {!catalogOnly && (
        <section className={`${styles.card} ${styles.uploadPanel}`}>
          <div className={styles.uploadIntro}>
            <span><Upload size={22} /></span>
            <div><h2>Add a document to shipment knowledge</h2><p>Upload PDF, image, DOCX, XLSX, or CSV. KUBO will extract and validate useful values.</p></div>
          </div>
          <div className={styles.uploadControls}>
            <label><span>Document type (optional)</span><select value={selectedType} onChange={(event) => setSelectedType(event.target.value)}><option value="">Detect automatically</option>{documentTypes.map((type: ApiDocumentTypeInfo) => <option key={type.type} value={type.type}>{type.label}</option>)}</select></label>
            <label className={styles.filePicker}><input type="file" accept=".pdf,.png,.jpg,.jpeg,.tif,.tiff,.docx,.xlsx,.csv" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /><FileCheck2 size={17} /> {file?.name ?? "Choose file"}</label>
            <button className="btn btn-primary" type="button" onClick={uploadDocument} disabled={!file || !shipmentId || uploading}>{uploading ? "Uploading…" : "Read & Validate"}</button>
          </div>
          {processing && !validation && (
            <div className={styles.processing}><RefreshCw className={styles.spin} size={18} /><span>{processing.processingStatus === "failed" ? processing.error : "Reading document and validating shipment fields…"}</span></div>
          )}
        </section>
      )}

      {validation && <UploadedDocumentValidation validation={validation} onResolve={resolveField} resolving={resolving} />}
    </div>
  );
}

export function DocumentAssistantCatalogPage() {
  return <DocumentAssistantPage catalogOnly />;
}

export function GenerateDraftPanel({ type }: { type: ApiDocumentType }) {
  const { data: shipments, loading: shipmentsLoading } = useShipments();
  const [selectedShipmentId, setSelectedShipmentId] = useState("");
  const shipmentId = selectedShipmentId || shipments[0]?.id || "";
  const [readiness, setReadiness] = useState<ApiDocumentGenerationReadiness | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [generated, setGenerated] = useState<ApiDocument | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resolving, setResolving] = useState(false);

  const load = useCallback(async () => {
    if (!shipmentId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<{ data: ApiDocumentGenerationReadiness }>(`/shipments/${shipmentId}/document-readiness/${type}`);
      setReadiness(response.data);
      setValues((current) => {
        const next = { ...current };
        response.data.fields
          .filter((field) => field.status === "needs_confirmation" && field.value)
          .forEach((field) => { if (!next[field.key]) next[field.key] = field.value!; });
        return next;
      });
    } catch (reason) {
      setError(errorMessage(reason, "Unable to calculate document readiness."));
    } finally {
      setLoading(false);
    }
  }, [shipmentId, type]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  async function resolveField(field: ApiDocumentField, candidate: ApiConflictCandidate) {
    setResolving(true);
    try {
      await api.post(`/shipments/${shipmentId}/document-conflicts/resolve`, {
        field: field.canonicalKey,
        value: candidate.value,
        unit: candidate.unit,
        sourceDocumentId: candidate.source.documentId,
      });
      await load();
    } catch (reason) {
      setError(errorMessage(reason, "Unable to resolve the conflict."));
    } finally {
      setResolving(false);
    }
  }

  async function generate() {
    setSubmitting(true);
    setError(null);
    try {
      const response = await api.post<{ data: ApiDocument }>(`/shipments/${shipmentId}/document-drafts/${type}`, { fields: values });
      setGenerated(response.data);
    } catch (reason) {
      setError(errorMessage(reason, "Unable to generate the draft."));
    } finally {
      setSubmitting(false);
    }
  }

  const missingFields = readiness?.fields.filter(
    (field) => field.required && field.userEditable && ["missing", "invalid", "needs_confirmation"].includes(field.status),
  ) ?? [];
  const conflicts = readiness?.fields.filter((field) => field.status === "conflict") ?? [];
  const waiting = readiness?.fields.filter((field) => field.status === "waiting_external_data") ?? [];
  const known = readiness?.fields.filter((field) => field.status === "valid") ?? [];
  const inputsComplete = missingFields.every((field) => Boolean(values[field.key]?.trim()));

  return (
    <div className={styles.page}>
      <div className={styles.breadcrumb}><Link href="/documents">Document Assistant</Link><span>›</span><Link href="/documents/new">Generate Document</Link><span>›</span><strong>{readiness?.label ?? type}</strong></div>
      <header className={styles.pageHeader}>
        <div><span className={styles.eyebrow}>Controlled template generation</span><h1>{readiness?.label ?? type}</h1><p>KUBO builds the draft from known shipment data and asks only for unresolved information.</p></div>
      </header>
      <section className={`${styles.card} ${styles.shipmentSelector}`}>
        <label><span>Shipment</span><select value={shipmentId} onChange={(event) => { setSelectedShipmentId(event.target.value); setGenerated(null); setValues({}); }} disabled={shipmentsLoading}>{shipments.map((shipment) => <option key={shipment.id} value={shipment.id}>{shipment.id} · {shipment.originPort} → {shipment.destinationPort}</option>)}</select></label>
      </section>
      {(loading || shipmentsLoading) && <p className={styles.loading}>Combining shipment knowledge…</p>}
      {error && <p className={styles.error}>{error}</p>}
      {readiness && !generated && (
        <>
          <section className={`${styles.card} ${styles.generationSummary}`}>
            <div><PackageCheck size={26} /><strong>{known.length} fields found automatically</strong><span>{readiness.readiness.readinessPercent}% ready</span></div>
            <div className={styles.sourceChips}>{readiness.sources.map((source) => <span key={source}>{source}</span>)}</div>
          </section>
          {conflicts.map((field) => <ConflictResolutionPanel key={field.key} field={field} onResolve={resolveField} resolving={resolving} />)}
          <MissingFieldsPanel fields={missingFields} values={values} onChange={(key, value) => setValues((current) => ({ ...current, [key]: value }))} />
          {waiting.length > 0 && (
            <section className={`${styles.card} ${styles.waitingPanel}`}><h2>Operational data not available yet</h2>{waiting.map((field) => <div key={field.key}><Clock3 size={16} /><span><strong>{field.label}</strong><small>{field.externalMessage}</small></span></div>)}</section>
          )}
          <details className={`${styles.card} ${styles.knownFields}`}><summary><ChevronDown size={16} /> Review automatically found fields</summary><DocumentFieldTable fields={known} /></details>
          <div className={styles.generateBar}><div><Info size={17} /><span>The output is an AI Draft, not an official government or carrier-issued document.</span></div><button className="btn btn-primary" type="button" disabled={!inputsComplete || conflicts.length > 0 || submitting} onClick={generate}><Sparkles size={17} /> {submitting ? "Generating…" : `Generate Draft ${readiness.label}`}</button></div>
        </>
      )}
      {generated && <GeneratedDocumentPreview document={generated} />}
    </div>
  );
}

export function DocumentAssistantScreen() {
  return (
    <RequireAuth>
      <RoleGuard role="umkm"><AppShell>
        <DocumentAssistantPage />
      </AppShell></RoleGuard>
    </RequireAuth>
  );
}

export function DocumentAssistantCatalogScreen() {
  return (
    <RequireAuth>
      <RoleGuard role="umkm"><AppShell>
        <DocumentAssistantCatalogPage />
      </AppShell></RoleGuard>
    </RequireAuth>
  );
}

export function DocumentGenerationScreen({ type }: { type: ApiDocumentType }) {
  return (
    <RequireAuth>
      <RoleGuard role="umkm"><AppShell>
        <GenerateDraftPanel type={type} />
      </AppShell></RoleGuard>
    </RequireAuth>
  );
}
