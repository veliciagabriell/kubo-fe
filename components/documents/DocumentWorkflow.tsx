"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  Database,
  Download,
  Eye,
  FileCheck2,
  FilePlus2,
  FileSearch,
  FileText,
  Info,
  PackageCheck,
  RefreshCw,
  Sparkles,
  Upload,
} from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import RequireAuth from "@/components/RequireAuth";
import RoleGuard from "@/components/RoleGuard";
import { EmptyState, StatusBadge } from "@/components/common/ui";
import { useShipments } from "@/lib/hooks";
import {
  documentDefinitions,
  documentTypeOrder,
} from "@/lib/services/document-definitions";
import {
  AdditionalInformationRequiredError,
  documentService,
  type DocumentProcessingUpdate,
} from "@/lib/services/document-service";
import type {
  DocumentCheckResult,
  DocumentGenerationPlan,
  DocumentType,
  ExportDocumentRecord,
  ExtractedField,
  FieldCandidate,
  GeneratedDraft,
  ShipmentDocumentHistory,
} from "@/types/kubo";
import { formatDate } from "@/utils/format";
import styles from "./document-workflow.module.css";

function DocumentLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <RoleGuard role="umkm">
        <AppShell>{children}</AppShell>
      </RoleGuard>
    </RequireAuth>
  );
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    uploaded: "Uploaded",
    processing: "Processing",
    draft: "Draft Available",
    conflict: "Conflict Found",
    needs_information: "Needs Information",
    needs_review: "Needs Review",
    ready_for_verification: "Ready for Verification",
    verified: "Verified",
    superseded: "Superseded",
    waiting_external_data: "Waiting for Freight Forwarder",
  };
  return labels[status] ?? status.replaceAll("_", " ");
}

function useShipmentDocuments(shipmentIds: string[]) {
  const [data, setData] = useState<Record<string, ShipmentDocumentHistory>>({});
  const [loading, setLoading] = useState(true);
  const key = shipmentIds.join("|");
  useEffect(() => {
    let active = true;
    const ids = key ? key.split("|") : [];
    if (!ids.length) {
      queueMicrotask(() => setLoading(false));
      return () => {
        active = false;
      };
    }
    Promise.all(
      ids.map(
        async (id) =>
          [id, await documentService.getDocumentHistory(id)] as const,
      ),
    )
      .then((entries) => {
        if (active) setData(Object.fromEntries(entries));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [key]);
  return { data, loading };
}

function ReadinessRing({ value }: { value: number }) {
  return (
    <div
      className={styles.readinessRing}
      style={{ "--readiness": `${value * 3.6}deg` } as React.CSSProperties}
    >
      <span>{value}%</span>
      <small>Ready</small>
    </div>
  );
}

export function DocumentsOverviewPage() {
  const { data: shipments, loading: shipmentLoading } = useShipments();
  const ids = shipments.map((shipment) => shipment.id);
  const { data: documentsByShipment, loading: documentLoading } =
    useShipmentDocuments(ids);
  return (
    <div className={styles.page}>
      <header className="page-header">
        <div>
          <span className="eyebrow">Upload once, reuse everywhere</span>
          <h1 className="page-title">Document Intelligence</h1>
          <p className="page-subtitle">
            Documents are grouped by shipment. All extracted fields are stored
            as Shipment Master Data and reused for future documents.
          </p>
        </div>
        <div className="page-actions">
          <Link className="btn btn-ghost" href="/documents/generate/existing">
            <Upload size={16} />
            Upload Document
          </Link>
          <Link className="btn btn-primary" href="/documents/generate">
            <Sparkles size={16} />
            Generate Document
          </Link>
        </div>
      </header>
      {shipmentLoading || documentLoading ? (
        <p className={styles.loading}>Building shipment document overview…</p>
      ) : shipments.length ? (
        <div className={styles.shipmentStack}>
          {shipments.map((shipment) => {
            const history = documentsByShipment[shipment.id];
            const documents = history?.documents ?? [];
            const readiness = documents.length
              ? Math.round(
                  documents.reduce(
                    (sum, item) =>
                      sum +
                      (item.status === "verified"
                        ? 100
                        : item.status === "draft"
                          ? 75
                          : item.status === "needs_review"
                            ? 55
                            : 35),
                    0,
                  ) / documents.length,
                )
              : 0;
            return (
              <section className={styles.shipmentCard} key={shipment.id}>
                <div className={styles.shipmentHeading}>
                  <div>
                    <span className={styles.reference}>Shipment</span>
                    <h2>{shipment.id}</h2>
                    <p>
                      {shipment.originCity} → {shipment.destinationPort},{" "}
                      {shipment.destinationCountry}
                    </p>
                  </div>
                  <div className={styles.shipmentHeadingActions}>
                    <Link
                      className="btn btn-ghost"
                      href={`/documents/check/${shipment.id}`}
                    >
                      <FileSearch size={15} />
                      Check Documents
                    </Link>
                    <ReadinessRing value={readiness} />
                  </div>
                </div>
                <div className={styles.documentRows}>
                  {documents.length ? (
                    documents.map((document) => (
                      <article key={document.id}>
                        <span className={styles.documentIcon}>
                          <FileText size={18} />
                        </span>
                        <span>
                          <strong>{document.label}</strong>
                          <small>
                            {document.origin === "generated"
                              ? `Generated by KUBO · ${formatDate(document.createdAt)}`
                              : document.origin === "external"
                                ? "External / official source"
                                : `Uploaded · Version ${document.version}`}
                            {document.lastCheckedAt
                              ? ` · Checked ${formatDate(document.lastCheckedAt)}${document.checkCount ? ` (${document.checkCount}×)` : ""}`
                              : ""}
                          </small>
                        </span>
                        <StatusBadge status={statusLabel(document.status)} />
                      </article>
                    ))
                  ) : (
                    <p className={styles.emptyInline}>
                      No documents yet. Shipment and cargo data are already
                      available as master data.
                    </p>
                  )}
                </div>
                {history?.events.length ? (
                  <details className={styles.historyPanel}>
                    <summary>
                      Document activity history{" "}
                      <span>{history.events.length} activities</span>
                    </summary>
                    <ol>
                      {history.events.map((event) => (
                        <li key={event.id}>
                          <span className={styles.historyDot}>
                            {event.action === "checked" ? (
                              <FileSearch size={14} />
                            ) : event.action === "generated" ? (
                              <Sparkles size={14} />
                            ) : (
                              <Upload size={14} />
                            )}
                          </span>
                          <span>
                            <strong>
                              {event.documentLabel} {event.action}
                            </strong>
                            <small>{statusLabel(event.status)}</small>
                          </span>
                          <time dateTime={event.occurredAt}>
                            {formatDate(event.occurredAt)}
                          </time>
                        </li>
                      ))}
                    </ol>
                  </details>
                ) : null}
              </section>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={FileText}
          title="Create a shipment first"
          description="Shipment Master Data starts when a shipment is created."
          action={
            <Link className="btn btn-primary" href="/shipments/new">
              Create Shipment
            </Link>
          }
        />
      )}
    </div>
  );
}

export function DocumentGenerationEntryPage() {
  return (
    <div className={styles.page}>
      <div className={styles.breadcrumb}>
        <Link href="/documents">Document Intelligence</Link>
        <ChevronRight size={15} />
        <strong>Generate Document</strong>
      </div>
      <header className="page-header">
        <div>
          <span className="eyebrow">One master data, two starting points</span>
          <h1 className="page-title">Generate Document</h1>
          <p className="page-subtitle">
            Use existing shipment data or start from scratch. Both paths update
            the same Shipment Master Data.
          </p>
        </div>
      </header>
      <section className={styles.canonicalBanner}>
        <Database size={24} />
        <div>
          <strong>Shipment Master Data is the center</strong>
          <p>
            Upload extraction and manual input converge here. KUBO reuses known
            values and only asks for missing document-specific information.
          </p>
        </div>
      </section>
      <div className={styles.entryGrid}>
        <article>
          <span className={styles.entryIcon}>
            <FileSearch size={30} />
          </span>
          <span className={styles.optionLabel}>Option A</span>
          <h2>Generate from Existing Documents</h2>
          <p>
            Upload documents you already have. KUBO extracts reusable
            information, compares values, and stores confirmed fields in master
            data.
          </p>
          <ul>
            <li>AI extraction and provenance</li>
            <li>Cross-document conflict checking</li>
            <li>Reuse data for another draft</li>
          </ul>
          <Link className="btn btn-primary" href="/documents/generate/existing">
            Use Existing Documents <ArrowRight size={16} />
          </Link>
        </article>
        <article>
          <span className={styles.entryIcon}>
            <FilePlus2 size={30} />
          </span>
          <span className={styles.optionLabel}>Option B</span>
          <h2>Generate from Scratch</h2>
          <p>
            Start by completing one document. Its reusable information is stored
            as master data and becomes available for future documents.
          </p>
          <ul>
            <li>Smart prefill from shipment</li>
            <li>Only missing fields are shown</li>
            <li>Reusable for every next draft</li>
          </ul>
          <Link
            className="btn btn-secondary"
            href="/documents/generate/scratch"
          >
            Start from Scratch <ArrowRight size={16} />
          </Link>
        </article>
      </div>
    </div>
  );
}

function ShipmentAndTypeSelector({
  shipmentId,
  type,
  onShipment,
  onType,
  types = documentTypeOrder,
}: {
  shipmentId: string;
  type: DocumentType;
  onShipment: (value: string) => void;
  onType: (value: DocumentType) => void;
  types?: DocumentType[];
}) {
  const { data: shipments, loading } = useShipments();
  useEffect(() => {
    if (!shipmentId && shipments[0]) onShipment(shipments[0].id);
  }, [onShipment, shipmentId, shipments]);
  return (
    <section className={styles.selectorCard}>
      <label>
        <span>Shipment</span>
        <select
          value={shipmentId}
          disabled={loading}
          onChange={(event) => onShipment(event.target.value)}
        >
          {shipments.map((shipment) => (
            <option key={shipment.id} value={shipment.id}>
              {shipment.id} · {shipment.originCity} → {shipment.destinationPort}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Document to generate</span>
        <select
          value={type}
          onChange={(event) => onType(event.target.value as DocumentType)}
        >
          {types.map((item) => (
            <option key={item} value={item}>
              {documentDefinitions[item].label}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}

function SourceChip({ field }: { field: ExtractedField }) {
  return (
    <details className={styles.sourceChip}>
      <summary>
        {field.source?.fileName ??
          field.source?.label ??
          "Shipment Master Data"}
      </summary>
      <div>
        <strong>Page {field.sourcePage ?? field.source?.page ?? 1}</strong>
        {field.source?.rawText && <q>{field.source.rawText}</q>}
        {field.confidence !== undefined && (
          <small>
            Extraction confidence {Math.round(field.confidence * 100)}%
          </small>
        )}
      </div>
    </details>
  );
}

function ExtractionReview({
  fields,
  shipmentId,
}: {
  fields: ExtractedField[];
  shipmentId: string;
}) {
  const groups = useMemo(
    () =>
      Array.from(
        fields
          .reduce((result, field) => {
            const current = result.get(field.fieldKey) ?? [];
            current.push(field);
            result.set(field.fieldKey, current);
            return result;
          }, new Map<string, ExtractedField[]>())
          .entries(),
      ).map(([fieldKey, candidates]) => ({ fieldKey, candidates })),
    [fields],
  );
  const [selectedByField, setSelectedByField] = useState<
    Record<string, number>
  >({});
  const [savingField, setSavingField] = useState("");
  const [choiceError, setChoiceError] = useState("");
  const valid = groups.filter(
    ({ candidates }) =>
      candidates.length === 1 &&
      (candidates[0].status === "consistent" ||
        candidates[0].status === "confirmed"),
  ).length;
  const conflicts = groups.filter(
    ({ candidates }) =>
      candidates.length > 1 ||
      candidates.some((field) => field.status === "conflict"),
  ).length;

  async function chooseCandidate(
    fieldKey: string,
    candidates: ExtractedField[],
    index: number,
  ) {
    const candidate = candidates[index];
    if (!candidate || candidate.value === null) return;
    setSavingField(fieldKey);
    setChoiceError("");
    try {
      await documentService.resolveFieldConflict(
        shipmentId,
        fieldKey,
        candidate.value,
        candidate.source?.label ??
          candidate.source?.fileName ??
          "Uploaded Document",
      );
      setSelectedByField((current) => ({ ...current, [fieldKey]: index }));
    } catch {
      setChoiceError(
        `Unable to save the selected value for ${candidate.label}.`,
      );
    } finally {
      setSavingField("");
    }
  }

  return (
    <section className={styles.reviewCard}>
      <div className={styles.sectionHead}>
        <div>
          <h2>Review Extracted Information</h2>
          <p>
            Fields with the same canonical key are combined. Select which source
            value is correct.
          </p>
        </div>
        <div className={styles.summaryPills}>
          <span>
            <Check size={14} />
            {valid} found
          </span>
          {conflicts > 0 && (
            <span className={styles.danger}>
              <AlertTriangle size={14} />
              {conflicts} require choice
            </span>
          )}
        </div>
      </div>
      {choiceError && <p className={styles.error}>{choiceError}</p>}
      <div className={styles.fieldTable}>
        <div className={styles.fieldTableHead}>
          <span>Field</span>
          <span>Value</span>
          <span>Status</span>
          <span>Source</span>
        </div>
        {groups.map(({ fieldKey, candidates }) => {
          const selectedIndex = selectedByField[fieldKey] ?? 0;
          const selected = candidates[selectedIndex] ?? candidates[0];
          const requiresChoice = candidates.length > 1;
          return (
            <div className={styles.fieldTableRow} key={fieldKey}>
              <strong>{selected.label}</strong>
              {requiresChoice ? (
                <label className={styles.candidateSelect}>
                  <span className="sr-only">
                    Choose value for {selected.label}
                  </span>
                  <select
                    value={selectedIndex}
                    disabled={savingField === fieldKey}
                    onChange={(event) =>
                      void chooseCandidate(
                        fieldKey,
                        candidates,
                        Number(event.target.value),
                      )
                    }
                  >
                    {candidates.map((candidate, index) => (
                      <option
                        value={index}
                        key={`${fieldKey}-${candidate.sourceDocumentId ?? candidate.source?.documentId ?? "source"}-${index}`}
                      >
                        {candidate.value ?? "—"} ·{" "}
                        {candidate.source?.label ??
                          candidate.source?.fileName ??
                          `Source ${index + 1}`}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <span>{selected.value ?? "—"}</span>
              )}
              <StatusBadge
                status={
                  requiresChoice && selectedByField[fieldKey] === undefined
                    ? "needs confirmation"
                    : selectedByField[fieldKey] !== undefined
                      ? "confirmed"
                      : selected.status
                }
              />
              <SourceChip field={selected} />
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ProcessingCard({
  update,
  fileName,
}: {
  update: DocumentProcessingUpdate;
  fileName: string;
}) {
  const stages = [
    "Uploading",
    "Reading document",
    "Extracting information",
    "Checking consistency",
    "Completed",
  ];
  const activeIndex =
    update.stage === "uploading"
      ? 0
      : update.stage === "reading"
        ? 1
        : update.stage === "extracting"
          ? 2
          : update.stage === "checking"
            ? 3
            : 4;
  return (
    <section className={styles.processingCard}>
      <div className={styles.processingTitle}>
        <RefreshCw
          className={update.progress < 100 ? styles.spin : ""}
          size={20}
        />
        <span>
          <strong>Document processing</strong>
          <small>{fileName}</small>
        </span>
        <b>{update.progress}%</b>
      </div>
      <div className={styles.progressTrack}>
        <span style={{ width: `${update.progress}%` }} />
      </div>
      <ol>
        {stages.map((stage, index) => (
          <li
            className={
              index < activeIndex
                ? styles.done
                : index === activeIndex
                  ? styles.active
                  : ""
            }
            key={stage}
          >
            {index < activeIndex ? (
              <Check size={13} />
            ) : (
              <span>{index + 1}</span>
            )}
            {stage}
          </li>
        ))}
      </ol>
    </section>
  );
}

function GeneratedDraftCard({ draft }: { draft: GeneratedDraft }) {
  return (
    <section className={styles.generatedCard}>
      <span className={styles.generatedIcon}>
        <FileCheck2 size={28} />
      </span>
      <div>
        <span className="badge warning">
          AI Draft · Not an official document
        </span>
        <h2>{draft.fileName}</h2>
        <p>
          Generated from {draft.sources.join(", ") || "Shipment Master Data"}.{" "}
          {draft.reusedFieldCount} fields reused. This draft is now recorded in
          Document Intelligence.
        </p>
        <dl>
          <div>
            <dt>Template</dt>
            <dd>{draft.templateVersion}</dd>
          </div>
          <div>
            <dt>Generated</dt>
            <dd>{formatDate(draft.generatedAt)}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>Needs User Review</dd>
          </div>
        </dl>
      </div>
      <div className={styles.generatedActions}>
        {draft.fileUrl ? (
          <>
            <a
              className="btn btn-ghost"
              href={draft.fileUrl}
              target="_blank"
              rel="noreferrer"
            >
              <Eye size={15} />
              Preview
            </a>
            <a
              className="btn btn-primary"
              href={draft.fileUrl}
              download={draft.fileName}
            >
              <Download size={15} />
              Download Draft
            </a>
          </>
        ) : (
          <button
            className="btn btn-primary"
            type="button"
            disabled
            title="Connect the document generation API to download the PDF"
          >
            <Download size={15} />
            PDF waiting for API
          </button>
        )}
        <Link className="btn btn-secondary" href="/documents">
          <FileText size={15} />
          View in Document Intelligence
        </Link>
      </div>
    </section>
  );
}

function GenerationPlanner({
  shipmentId,
  type,
  mode,
  onGenerated,
}: {
  shipmentId: string;
  type: DocumentType;
  mode: "existing" | "scratch";
  onGenerated?: (draft: GeneratedDraft) => void;
}) {
  const [plan, setPlan] = useState<DocumentGenerationPlan | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [draft, setDraft] = useState<GeneratedDraft | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(() => {
    if (!shipmentId) return;
    setLoading(true);
    setDraft(null);
    setValues({});
    documentService
      .prepareGeneration(shipmentId, type)
      .then(setPlan)
      .catch(() => setError("Unable to build document readiness."))
      .finally(() => setLoading(false));
  }, [shipmentId, type]);
  useEffect(() => {
    queueMicrotask(load);
  }, [load]);
  async function generate() {
    setGenerating(true);
    setError("");
    try {
      const result = await documentService.generateDocument(
        shipmentId,
        type,
        values,
      );
      setDraft(result);
      setPlan(await documentService.prepareGeneration(shipmentId, type));
      onGenerated?.(result);
    } catch (cause) {
      if (cause instanceof AdditionalInformationRequiredError) {
        setPlan((current) => {
          if (!current) return current;
          const missing = new Map(
            current.missingFields.map((field) => [field.key, field]),
          );
          cause.fields.forEach((field) =>
            missing.set(field.key, {
              ...field,
              required: true,
            }),
          );
          return {
            ...current,
            missingFields: [...missing.values()],
            canGenerate: false,
          };
        });
        setError(
          "Complete the additional template fields shown below, then generate again.",
        );
      } else {
        setError(
          "Draft generation failed. Please review the required information and try again.",
        );
      }
    } finally {
      setGenerating(false);
    }
  }
  if (loading)
    return <p className={styles.loading}>Combining Shipment Master Data…</p>;
  if (!plan) return null;
  const inputsComplete = plan.missingFields.every((field) =>
    values[field.key]?.trim(),
  );
  if (draft) return <GeneratedDraftCard draft={draft} />;
  return (
    <div className={styles.plannerStack}>
      <section className={styles.knowledgeSummary}>
        <PackageCheck size={25} />
        <div>
          <strong>{plan.knownFields.length} fields found automatically</strong>
          <p>
            {mode === "existing"
              ? "From uploaded documents and existing shipment data."
              : "Prefilled from the same Shipment Master Data used by uploaded documents."}
          </p>
        </div>
        <ReadinessRing value={plan.readinessPercent} />
      </section>
      {plan.conflictFields.length > 0 && (
        <section className={styles.conflictNotice}>
          <AlertTriangle size={20} />
          <div>
            <strong>
              {plan.conflictFields.length} conflicts must be confirmed
            </strong>
            <p>
              Open Check Documents. KUBO will never choose between conflicting
              values automatically.
            </p>
          </div>
          <Link
            className="btn btn-secondary"
            href={`/documents/check/${shipmentId}`}
          >
            Resolve Conflicts
          </Link>
        </section>
      )}
      <section className={styles.reviewCard}>
        <div className={styles.sectionHead}>
          <div>
            <h2>Already available from Shipment Master Data</h2>
            <p>
              These values will be reused; you do not need to type them again.
            </p>
          </div>
          <span className={styles.summaryPills}>
            <span>
              <Database size={14} />
              {plan.knownFields.length} reusable
            </span>
          </span>
        </div>
        <div className={styles.knownGrid}>
          {plan.knownFields.map((field) => (
            <div key={field.key}>
              <span>
                <CheckCircle2 size={15} />
                <strong>{field.label}</strong>
              </span>
              <b>{field.value}</b>
              <small>
                Source: {field.sources[0]?.label ?? "Shipment Master Data"}
              </small>
            </div>
          ))}
        </div>
      </section>
      {plan.missingFields.length > 0 ? (
        <section className={styles.missingCard}>
          <div className={styles.sectionHead}>
            <div>
              <h2>Additional Information Required</h2>
              <p>Only fields that are genuinely missing are shown.</p>
            </div>
            <span>{plan.missingFields.length} fields</span>
          </div>
          <div className={styles.inputGrid}>
            {plan.missingFields.map((field) => (
              <label key={field.key}>
                <span>
                  {field.label}
                  {field.required && " *"}
                </span>
                <input
                  value={values[field.key] ?? ""}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      [field.key]: event.target.value,
                    }))
                  }
                  required
                />
              </label>
            ))}
          </div>
        </section>
      ) : (
        <section className={styles.allReady}>
          <CheckCircle2 size={22} />
          <span>
            <strong>All required information is available.</strong>
            <small>KUBO can generate this controlled draft immediately.</small>
          </span>
        </section>
      )}
      {plan.waitingExternalFields.length > 0 && (
        <section className={styles.waitingCard}>
          <h2>Operational data not available yet</h2>
          {plan.waitingExternalFields.map((field) => (
            <div key={field.key}>
              <Clock3 size={16} />
              <span>
                <strong>{field.label}</strong>
                <small>{field.externalMessage}</small>
              </span>
            </div>
          ))}
        </section>
      )}
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.generateBar}>
        <span>
          <Info size={16} />
          Generated output remains a draft until reviewed or officially issued.
        </span>
        <button
          className="btn btn-primary"
          type="button"
          disabled={
            !inputsComplete || plan.conflictFields.length > 0 || generating
          }
          onClick={generate}
        >
          <Sparkles size={16} />
          {generating
            ? "Generating…"
            : `Generate Draft ${plan.definition.label}`}
        </button>
      </div>
    </div>
  );
}

export function GenerateFromExistingPage() {
  const [shipmentId, setShipmentId] = useState("");
  const [type, setType] = useState<DocumentType>("commercial_invoice");
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState<DocumentProcessingUpdate | null>(
    null,
  );
  const [fields, setFields] = useState<ExtractedField[]>([]);
  const [uploaded, setUploaded] = useState(false);
  const [error, setError] = useState("");
  const [target, setTarget] = useState<DocumentType | null>(null);
  async function process() {
    if (!file || !shipmentId) return;
    setError("");
    setFields([]);
    setTarget(null);
    try {
      const result = await documentService.uploadAndExtract(
        shipmentId,
        file,
        type,
        setProcessing,
      );
      setFields(result.fields);
      setUploaded(true);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Document processing failed.",
      );
    }
  }
  return (
    <div className={styles.page}>
      <div className={styles.breadcrumb}>
        <Link href="/documents/generate">Generate Document</Link>
        <ChevronRight size={15} />
        <strong>From Existing Documents</strong>
      </div>
      <header className="page-header">
        <div>
          <span className="eyebrow">
            Existing Documents → Master Data → Generation
          </span>
          <h1 className="page-title">Generate from Existing Documents</h1>
          <p className="page-subtitle">
            Upload once. KUBO extracts reusable values, checks consistency, and
            prepares another draft from the same master data.
          </p>
        </div>
      </header>
      <ShipmentAndTypeSelector
        shipmentId={shipmentId}
        type={type}
        onShipment={setShipmentId}
        onType={setType}
      />
      <section className={styles.uploadCard}>
        <span className={styles.uploadIcon}>
          <Upload size={25} />
        </span>
        <div>
          <h2>Upload Existing Document</h2>
          <p>
            PDF, image, DOCX, XLSX, or CSV. Technical parser details are hidden
            from the normal workflow.
          </p>
        </div>
        <label className={styles.filePicker}>
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx,.csv"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          <FileCheck2 size={16} />
          {file?.name ?? "Choose file"}
        </label>
        <button
          className="btn btn-primary"
          type="button"
          disabled={
            !file ||
            !shipmentId ||
            ((processing?.progress ?? 0) < 100 && Boolean(processing))
          }
          onClick={process}
        >
          Read & Check
        </button>
      </section>
      {processing && (
        <ProcessingCard
          update={processing}
          fileName={file?.name ?? "Document"}
        />
      )}{" "}
      {error && <p className={styles.error}>{error}</p>}
      {fields.length > 0 && (
        <ExtractionReview fields={fields} shipmentId={shipmentId} />
      )}
      {uploaded && (
        <section className={styles.chooseTarget}>
          <div>
            <span className="eyebrow">Next step</span>
            <h2>Choose a document to generate</h2>
            <p>
              Every option below reads the same updated Shipment Master Data.
            </p>
          </div>
          <div className={styles.targetGrid}>
            {documentTypeOrder.map((item) => (
              <button
                type="button"
                className={target === item ? styles.selectedTarget : ""}
                onClick={() => setTarget(item)}
                key={item}
              >
                <FileText size={18} />
                <span>
                  <strong>{documentDefinitions[item].label}</strong>
                  <small>
                    {item === type
                      ? "Uploaded document available"
                      : "Prepare from known data"}
                  </small>
                </span>
                <ChevronRight size={16} />
              </button>
            ))}
          </div>
        </section>
      )}
      {target && (
        <GenerationPlanner
          shipmentId={shipmentId}
          type={target}
          mode="existing"
        />
      )}
    </div>
  );
}

export function GenerateFromScratchPage() {
  const [shipmentId, setShipmentId] = useState("");
  const [type, setType] = useState<DocumentType>("commercial_invoice");
  const [created, setCreated] = useState<GeneratedDraft | null>(null);
  const [options, setOptions] = useState<DocumentGenerationPlan[]>([]);
  useEffect(() => {
    if (created)
      documentService.getGenerationOptions(shipmentId).then(setOptions);
  }, [created, shipmentId]);
  return (
    <div className={styles.page}>
      <div className={styles.breadcrumb}>
        <Link href="/documents/generate">Generate Document</Link>
        <ChevronRight size={15} />
        <strong>From Scratch</strong>
      </div>
      <header className="page-header">
        <div>
          <span className="eyebrow">
            Manual input → Master Data → Generation
          </span>
          <h1 className="page-title">Generate from Scratch</h1>
          <p className="page-subtitle">
            Select the first document. Known shipment values are prefilled; only
            missing fields appear and become reusable data.
          </p>
        </div>
      </header>
      <section className={styles.canonicalBanner}>
        <Database size={24} />
        <div>
          <strong>Not a separate form system</strong>
          <p>
            Values entered here are written to the same canonical layer used by
            AI extraction and conflict resolution.
          </p>
        </div>
      </section>
      <ShipmentAndTypeSelector
        shipmentId={shipmentId}
        type={type}
        onShipment={setShipmentId}
        onType={setType}
      />
      {shipmentId && (
        <GenerationPlanner
          shipmentId={shipmentId}
          type={type}
          mode="scratch"
          onGenerated={setCreated}
        />
      )}
      {created && options.length > 0 && (
        <section className={styles.reusePanel}>
          <div>
            <span className="eyebrow">Document Created</span>
            <h2>We found {created.reusedFieldCount} reusable fields</h2>
            <p>These fields can now help prepare the next document.</p>
          </div>
          <div className={styles.reuseGrid}>
            {options
              .filter((option) => option.definition.type !== type)
              .slice(0, 4)
              .map((option) => (
                <Link
                  href={`/documents/new/${option.definition.type.toUpperCase()}`}
                  key={option.definition.type}
                >
                  <strong>{option.definition.label}</strong>
                  <span>
                    {option.knownFields.length}/
                    {option.definition.fields.length} fields already available
                  </span>
                </Link>
              ))}
          </div>
        </section>
      )}
    </div>
  );
}

function DocumentPreview({
  document,
  fields,
  activePage,
}: {
  document: ExportDocumentRecord | null;
  fields: ExtractedField[];
  activePage: number;
}) {
  return (
    <section className={styles.previewPane}>
      <div className={styles.previewHead}>
        <div>
          <strong>{document?.label ?? "Select a document"}</strong>
          <small>{document?.fileName ?? "No source selected"}</small>
        </div>
        {document && <StatusBadge status={statusLabel(document.status)} />}
      </div>
      <div className={styles.previewBody}>
        {document?.fileUrl ? (
          <iframe
            src={`${document.fileUrl}#page=${activePage}`}
            title={`${document.label} preview`}
          />
        ) : (
          <EmptyState
            icon={FileSearch}
            title="Preview unavailable in mock mode"
            description="When the backend returns a file URL, the PDF opens here on the source page."
          />
        )}
        {fields.find(
          (field) => field.sourcePage === activePage && field.boundingBox,
        ) && (
          <span
            className={styles.boundingHighlight}
            aria-label="Highlighted source region"
          />
        )}
      </div>
    </section>
  );
}

function ConflictIssue({
  issue,
  shipmentId,
  onResolved,
  onSource,
}: {
  issue: DocumentCheckResult["conflicts"][number];
  shipmentId: string;
  onResolved: () => void;
  onSource: (candidate: FieldCandidate) => void;
}) {
  const [manual, setManual] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  async function resolve(candidateValue: string | number, label: string) {
    setSaving(true);
    await documentService.resolveFieldConflict(
      shipmentId,
      issue.fieldKey,
      candidateValue,
      label,
    );
    setSaving(false);
    onResolved();
  }
  return (
    <article className={styles.issueCard}>
      <div className={styles.issueTitle}>
        <span>
          <AlertTriangle size={17} />
        </span>
        <div>
          <small>Conflict</small>
          <h3>{issue.label}</h3>
        </div>
      </div>
      <p>Which information is correct? KUBO will not decide silently.</p>
      <div className={styles.candidateStack}>
        {issue.candidates.map((candidate) => (
          <div key={candidate.id}>
            <button
              type="button"
              disabled={saving}
              onClick={() => resolve(candidate.value, candidate.sourceLabel)}
            >
              <strong>{candidate.value}</strong>
              <small>Use value from {candidate.sourceLabel}</small>
            </button>
            <button
              type="button"
              className={styles.sourceButton}
              onClick={() => onSource(candidate)}
            >
              <Eye size={14} />
              View source
            </button>
          </div>
        ))}
      </div>
      {manual ? (
        <div className={styles.manualRow}>
          <label>
            <span className="sr-only">Manual value for {issue.label}</span>
            <input
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder="Enter the confirmed value"
            />
          </label>
          <button
            className="btn btn-primary"
            type="button"
            disabled={!value.trim() || saving}
            onClick={() => resolve(value, "User Confirmed Value")}
          >
            Confirm
          </button>
        </div>
      ) : (
        <button
          className="btn btn-ghost"
          type="button"
          onClick={() => setManual(true)}
        >
          Enter Manually
        </button>
      )}
    </article>
  );
}

export function DocumentCheckPage({ shipmentId }: { shipmentId: string }) {
  const [result, setResult] = useState<DocumentCheckResult | null>(null);
  const [selected, setSelected] = useState<ExportDocumentRecord | null>(null);
  const [fields, setFields] = useState<ExtractedField[]>([]);
  const [activePage, setActivePage] = useState(1);
  const [loading, setLoading] = useState(true);
  const load = useCallback(() => {
    setLoading(true);
    documentService
      .checkDocumentConsistency(shipmentId)
      .then((data) => {
        setResult(data);
        setSelected((current) => current ?? data.documents[0] ?? null);
      })
      .finally(() => setLoading(false));
  }, [shipmentId]);
  useEffect(() => {
    queueMicrotask(load);
  }, [load]);
  useEffect(() => {
    if (!selected) return;
    if (selected.extractedFields.length) {
      queueMicrotask(() => setFields(selected.extractedFields));
      return;
    }
    documentService
      .getDocumentExtraction(shipmentId, selected.id)
      .then(setFields)
      .catch(() => setFields([]));
  }, [selected, shipmentId]);
  function viewSource(candidate: FieldCandidate) {
    const document = result?.documents.find(
      (item) => item.id === candidate.sourceDocumentId,
    );
    if (document) setSelected(document);
    setActivePage(candidate.page ?? 1);
  }
  if (loading || !result)
    return <p className={styles.loading}>Analyzing shipment documents…</p>;
  return (
    <div className={styles.checkPage}>
      <header className="page-header">
        <div>
          <span className="eyebrow">Document Check</span>
          <h1 className="page-title">{shipmentId}</h1>
          <p className="page-subtitle">
            {result.documents.length} documents analyzed ·{" "}
            {result.consistentFields} fields consistent ·{" "}
            {result.conflicts.length} conflicts · {result.missingFields} missing
          </p>
        </div>
        <Link
          className="btn btn-primary"
          href={`/documents/generate?shipment=${shipmentId}`}
        >
          <Sparkles size={15} />
          Generate Document
        </Link>
      </header>
      <div className={styles.checkLayout}>
        <aside className={styles.documentRail}>
          <h2>Documents</h2>
          {result.documents.map((document) => (
            <button
              type="button"
              className={
                selected?.id === document.id ? styles.activeDocument : ""
              }
              onClick={() => {
                setSelected(document);
                setActivePage(1);
              }}
              key={document.id}
            >
              <FileText size={17} />
              <span>
                <strong>{document.label}</strong>
                <small>{statusLabel(document.status)}</small>
              </span>
            </button>
          ))}
        </aside>
        <DocumentPreview
          document={selected}
          fields={fields}
          activePage={activePage}
        />
        <aside className={styles.issuesPanel}>
          <div className={styles.issueSummary}>
            <strong>Validation</strong>
            <span
              className={
                result.conflicts.length ? styles.blocking : styles.clear
              }
            >
              {result.conflicts.length ? (
                <>
                  <CircleAlert size={14} />
                  {result.conflicts.length} issues
                </>
              ) : (
                <>
                  <Check size={14} />
                  Consistent
                </>
              )}
            </span>
          </div>
          {result.conflicts.length ? (
            result.conflicts.map((issue) => (
              <ConflictIssue
                key={issue.id}
                issue={issue}
                shipmentId={shipmentId}
                onResolved={load}
                onSource={viewSource}
              />
            ))
          ) : (
            <EmptyState
              icon={CheckCircle2}
              title="All primary data is consistent"
              description="No conflict requires confirmation."
            />
          )}
          <section className={styles.provenance}>
            <h3>Selected document fields</h3>
            {fields.map((field) => (
              <button
                type="button"
                key={field.fieldKey}
                onClick={() => setActivePage(field.sourcePage ?? 1)}
              >
                <span>
                  <strong>{field.label}</strong>
                  <small>
                    {field.source?.fileName ?? selected?.fileName} · Page{" "}
                    {field.sourcePage ?? 1}
                  </small>
                </span>
                <b>{field.value ?? "—"}</b>
              </button>
            ))}
          </section>
        </aside>
      </div>
    </div>
  );
}

export function DocumentsOverviewScreen() {
  return (
    <DocumentLayout>
      <DocumentsOverviewPage />
    </DocumentLayout>
  );
}
export function DocumentGenerationEntryScreen() {
  return (
    <DocumentLayout>
      <DocumentGenerationEntryPage />
    </DocumentLayout>
  );
}
export function GenerateFromExistingScreen() {
  return (
    <DocumentLayout>
      <GenerateFromExistingPage />
    </DocumentLayout>
  );
}
export function GenerateFromScratchScreen() {
  return (
    <DocumentLayout>
      <GenerateFromScratchPage />
    </DocumentLayout>
  );
}
export function DocumentCheckScreen({ shipmentId }: { shipmentId: string }) {
  return (
    <DocumentLayout>
      <DocumentCheckPage shipmentId={shipmentId} />
    </DocumentLayout>
  );
}
