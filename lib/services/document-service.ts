import { api, fileUrl } from "@/lib/api";
import type {
  ApiConflictCandidate,
  ApiDocument,
  ApiDocumentAssistantOverview,
  ApiDocumentType,
  ApiUploadedDocumentValidation,
} from "@/lib/api-types";
import type {
  DocumentCheckResult,
  DocumentHistoryEvent,
  DocumentGenerationPlan,
  DocumentType,
  ExportDocumentRecord,
  ExtractedField,
  GeneratedDraft,
  ShipmentDocumentHistory,
} from "@/types/kubo";

export class AdditionalInformationRequiredError extends Error {
  constructor(
    readonly fields: Array<{ key: string; label: string }>,
  ) {
    super("Additional information is required before this draft can be generated.");
    this.name = "AdditionalInformationRequiredError";
  }
}
import { documentDefinitions, documentTypeOrder } from "./document-definitions";
import { mockForwarderCustomers } from "./mock-data";
import { shipmentService } from "./shipment-service";

const toApiType: Record<DocumentType, ApiDocumentType | "SHIPPING_INSTRUCTION"> = {
  commercial_invoice: "COMMERCIAL_INVOICE",
  packing_list: "PACKING_LIST",
  certificate_of_origin: "CERTIFICATE_OF_ORIGIN",
  svlk: "SVLK",
  shipping_instruction: "SHIPPING_INSTRUCTION",
  bill_of_lading: "BILL_OF_LADING",
};

const fromApiType: Record<string, DocumentType> = {
  COMMERCIAL_INVOICE: "commercial_invoice",
  PACKING_LIST: "packing_list",
  CERTIFICATE_OF_ORIGIN: "certificate_of_origin",
  SVLK: "svlk",
  SHIPPING_INSTRUCTION: "shipping_instruction",
  BILL_OF_LADING: "bill_of_lading",
};

function mapDocument(document: ApiDocument): ExportDocumentRecord {
  const type = fromApiType[document.type ?? ""] ?? "commercial_invoice";
  return {
    id: document.id,
    shipmentId: document.shipmentId ?? "",
    type,
    label: documentDefinitions[type].label,
    fileName: document.originalFileName ?? document.fileUrl?.split("/").at(-1),
    fileUrl: fileUrl(document.fileUrl),
    status: (document.status as ExportDocumentRecord["status"]) || "uploaded",
    origin: document.documentOrigin,
    version: document.fileVersion ?? 1,
    extractedFields: [],
    createdAt: document.createdAt,
    updatedAt: document.updatedAt ?? document.createdAt,
    lastCheckedAt: document.lastValidatedAt,
    checkCount: document.validationCount ?? 0,
  };
}

function mapCandidate(fieldKey: string, candidate: ApiConflictCandidate, index: number) {
  return {
    id: `${fieldKey}-${index}`,
    fieldKey,
    value: candidate.value,
    sourceDocumentId: candidate.source.documentId ?? `source-${index}`,
    sourceDocumentType: fromApiType[candidate.source.documentType ?? ""] ?? "commercial_invoice",
    sourceLabel: candidate.source.label,
    page: candidate.source.page,
  } as const;
}

function validationFields(validation: ApiUploadedDocumentValidation): ExtractedField[] {
  return validation.fields.map((field) => ({
    fieldKey: field.canonicalKey,
    label: field.label,
    value: field.value ?? null,
    normalizedValue: field.normalizedValue,
    confidence: field.confidence,
    sourceDocumentId: field.sources[0]?.documentId,
    sourcePage: field.sources[0]?.page,
    boundingBox: field.sources[0]?.boundingBox,
    source: field.sources[0] ? {
      sourceType: field.sources[0].sourceType,
      label: field.sources[0].label,
      documentId: field.sources[0].documentId,
      fileName: field.sources[0].fileName,
      page: field.sources[0].page,
      rawText: field.sources[0].rawText,
      boundingBox: field.sources[0].boundingBox,
    } : undefined,
    status: field.status === "conflict" ? "conflict" : field.status === "missing" ? "missing" : field.status === "waiting_external_data" ? "waiting_external_data" : field.status === "valid" ? "consistent" : "confirmed",
  }));
}

export type DocumentProcessingUpdate = {
  stage: "uploading" | "reading" | "extracting" | "checking" | "completed";
  progress: number;
  label: string;
};

export const documentService = {
  async getShipmentDocuments(shipmentId: string): Promise<ExportDocumentRecord[]> {
    try {
      const response = await api.get<{ data: ApiDocument[] }>(`/documents?shipmentId=${shipmentId}`);
      return response.data.map(mapDocument);
    } catch {
      return structuredClone(mockForwarderCustomers.find((item) => item.shipmentId === shipmentId)?.documents ?? []);
    }
  },

  async getDocumentHistory(shipmentId: string): Promise<ShipmentDocumentHistory> {
    try {
      const response = await api.get<{ data: {
        documents: Array<{
          id: string; type: string | null; label: string; origin: ExportDocumentRecord["origin"];
          status: string; fileName?: string; fileUrl?: string | null; version?: number;
          createdAt: string; generatedAt?: string | null; lastValidatedAt?: string | null; validationCount?: number;
        }>;
        events: Array<{
          id: string; documentId: string; documentType: string | null; documentLabel: string;
          action: "uploaded" | "generated" | "checked"; occurredAt: string; status: string;
        }>;
      } }>(`/shipments/${shipmentId}/document-history`);
      return {
        shipmentId,
        documents: response.data.documents.map((document) => ({
          id: document.id,
          shipmentId,
          type: fromApiType[document.type ?? ""] ?? "commercial_invoice",
          label: document.label,
          fileName: document.fileName,
          fileUrl: fileUrl(document.fileUrl),
          status: document.status as ExportDocumentRecord["status"],
          origin: document.origin,
          version: document.version ?? 1,
          extractedFields: [],
          createdAt: document.createdAt,
          updatedAt: document.generatedAt ?? document.createdAt,
          lastCheckedAt: document.lastValidatedAt,
          checkCount: document.validationCount ?? 0,
        })),
        events: response.data.events.map((event) => ({
          ...event,
          documentType: fromApiType[event.documentType ?? ""] ?? "commercial_invoice",
        })),
      };
    } catch {
      const documents = await this.getShipmentDocuments(shipmentId);
      return {
        shipmentId,
        documents,
        events: documents.flatMap((document) => {
          const events: DocumentHistoryEvent[] = [{
            id: `${document.id}:created`, documentId: document.id, documentType: document.type,
            documentLabel: document.label, action: document.origin === "generated" ? "generated" as const : "uploaded" as const,
            occurredAt: document.createdAt, status: document.status,
          }];
          if (document.lastCheckedAt) events.push({
            id: `${document.id}:checked`, documentId: document.id, documentType: document.type,
            documentLabel: document.label, action: "checked", occurredAt: document.lastCheckedAt, status: document.status,
          });
          return events;
        }).sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime()),
      };
    }
  },

  async getDocumentExtraction(shipmentId: string, documentId: string) {
    const response = await api.get<{ data: ApiUploadedDocumentValidation }>(`/shipments/${shipmentId}/documents/${documentId}/validation`);
    return validationFields(response.data);
  },

  async uploadAndExtract(
    shipmentId: string,
    input: File,
    declaredType: DocumentType | "",
    onUpdate: (update: DocumentProcessingUpdate) => void,
  ) {
    onUpdate({ stage: "uploading", progress: 15, label: "Uploading" });
    const body = new FormData();
    body.append("file", input);
    if (declaredType) body.append("declaredDocumentType", toApiType[declaredType]);
    const uploaded = await api.post<{ data: { documentId: string; processingStatus: string } }>(`/shipments/${shipmentId}/documents`, body);
    let status = uploaded.data.processingStatus;
    onUpdate({ stage: "reading", progress: 35, label: "Reading document" });
    for (let attempt = 0; attempt < 30 && !["completed", "needs_review", "failed"].includes(status); attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      const poll = await api.get<{ data: { processingStatus: string; error?: string } }>(`/documents/${uploaded.data.documentId}/status`);
      status = poll.data.processingStatus;
      if (status === "extracting" || status === "classifying") onUpdate({ stage: "extracting", progress: 65, label: "Extracting information" });
      if (status === "failed") throw new Error(poll.data.error ?? "Document processing failed.");
    }
    onUpdate({ stage: "checking", progress: 85, label: "Checking consistency" });
    const validation = await api.get<{ data: ApiUploadedDocumentValidation }>(`/shipments/${shipmentId}/documents/${uploaded.data.documentId}/validation`);
    onUpdate({ stage: "completed", progress: 100, label: "Completed" });
    return { documentId: uploaded.data.documentId, validation: validation.data, fields: validationFields(validation.data) };
  },

  async checkDocumentConsistency(shipmentId: string): Promise<DocumentCheckResult> {
    try {
      const [overviewResponse, documents] = await Promise.all([
        api.get<{ data: ApiDocumentAssistantOverview }>(`/shipments/${shipmentId}/document-assistant`),
        this.getShipmentDocuments(shipmentId),
      ]);
      const overview = overviewResponse.data;
      return {
        shipmentId,
        documents,
        consistentFields: Math.max(0, Math.round(overview.readiness.readinessPercent / 5)),
        missingFields: overview.documents.reduce((total, document) => total + document.readiness.missingFields, 0),
        conflicts: overview.crossDocumentValidation.conflicts.map((conflict, index) => ({
          id: `${conflict.field}-${index}`,
          fieldKey: conflict.field,
          label: conflict.field.replaceAll("_", " "),
          status: "conflict",
          candidates: conflict.candidates.map((candidate, candidateIndex) => mapCandidate(conflict.field, {
            value: candidate.value,
            normalizedValue: candidate.value.toLowerCase(),
            unit: candidate.unit,
            source: candidate.source,
          }, candidateIndex)),
        })),
      };
    } catch {
      const documents = await this.getShipmentDocuments(shipmentId);
      const invoice = documents.find((document) => document.type === "commercial_invoice");
      const packing = documents.find((document) => document.type === "packing_list");
      return {
        shipmentId,
        documents,
        consistentFields: 12,
        missingFields: 3,
        conflicts: invoice && packing ? [{
          id: "quantity-conflict",
          fieldKey: "quantity",
          label: "Quantity",
          status: "conflict",
          candidates: [
            { id: "quantity-invoice", fieldKey: "quantity", value: "15 unit", sourceDocumentId: invoice.id, sourceDocumentType: invoice.type, sourceLabel: "Commercial Invoice", page: 1, confidence: 0.97 },
            { id: "quantity-packing", fieldKey: "quantity", value: "12 unit", sourceDocumentId: packing.id, sourceDocumentType: packing.type, sourceLabel: "Packing List", page: 1, confidence: 0.91 },
          ],
        }] : [],
      };
    }
  },

  async resolveFieldConflict(shipmentId: string, fieldKey: string, value: string | number, sourceLabel: string) {
    return shipmentService.updateCanonicalField(shipmentId, fieldKey, value, { sourceType: "user_input", label: sourceLabel });
  },

  async prepareGeneration(shipmentId: string, type: DocumentType): Promise<DocumentGenerationPlan> {
    const shipment = await shipmentService.getCanonicalShipmentData(shipmentId);
    const rawDefinition = documentDefinitions[type];
    const definition = {
      ...rawDefinition,
      fields: Array.from(new Map(rawDefinition.fields.map((item) => [item.key, item])).values()),
    };
    const knownFields = definition.fields
      .map((definitionField) => shipment.fields[definitionField.key])
      .filter((field): field is NonNullable<typeof field> => Boolean(field && field.value !== null && field.value !== "" && field.status !== "conflict"));
    const conflictFields = definition.fields.map((item) => shipment.fields[item.key]).filter((item): item is NonNullable<typeof item> => item?.status === "conflict");
    const waitingExternalFields = definition.fields.filter((item) => item.external && !shipment.fields[item.key]?.value);
    const missingFields = definition.fields.filter((item) => item.required && !item.external && !shipment.fields[item.key]?.value);
    const required = definition.fields.filter((item) => item.required && !item.external);
    const completedRequired = required.filter((item) => Boolean(shipment.fields[item.key]?.value) && shipment.fields[item.key]?.status !== "conflict").length;
    return {
      shipment,
      definition,
      knownFields,
      missingFields,
      conflictFields,
      waitingExternalFields,
      readinessPercent: required.length ? Math.round((completedRequired / required.length) * 100) : 100,
      canGenerate: missingFields.length === 0 && conflictFields.length === 0,
    };
  },

  async getGenerationOptions(shipmentId: string) {
    return Promise.all(documentTypeOrder.map((type) => this.prepareGeneration(shipmentId, type)));
  },

  async generateDocument(shipmentId: string, type: DocumentType, additionalFields: Record<string, string | number> = {}): Promise<GeneratedDraft> {
    if (Object.keys(additionalFields).length) {
      await shipmentService.updateCanonicalFields(shipmentId, additionalFields, { sourceType: "user_input", label: "Document Generation" });
    }
    const plan = await this.prepareGeneration(shipmentId, type);
    try {
      const response = await api.post<{
        data:
          | ApiDocument
          | {
              status: "additional_information_required";
              missingFields: Array<{ key: string; label: string }>;
            };
      }>(`/shipments/${shipmentId}/document-drafts/${toApiType[type]}`, { fields: additionalFields });
      if ("missingFields" in response.data) {
        throw new AdditionalInformationRequiredError(response.data.missingFields);
      }
      return {
        id: response.data.id,
        shipmentId,
        type,
        label: plan.definition.label,
        status: "draft",
        fileName: `${plan.definition.label.replaceAll(" ", "_")}_${shipmentId}_DRAFT.pdf`,
        fileUrl: fileUrl(response.data.fileUrl),
        docxFileUrl: fileUrl(response.data.docxFileUrl),
        templateVersion: response.data.templateVersion ?? "1.0",
        generatedAt: response.data.generatedAt ?? new Date().toISOString(),
        generatedBy: response.data.generatedBy ?? "KUBO Document Assistant",
        sources: Array.isArray(response.data.generatedSources) ? response.data.generatedSources : plan.knownFields.map((item) => item.sources[0]?.label).filter(Boolean) as string[],
        reusedFieldCount: plan.knownFields.length,
      };
    } catch (error) {
      if (process.env.NEXT_PUBLIC_ENABLE_DOCUMENT_MOCKS !== "true") throw error;
      return {
        id: `draft-${Date.now()}`,
        shipmentId,
        type,
        label: plan.definition.label,
        status: "draft",
        fileName: `${plan.definition.label.replaceAll(" ", "_")}_${shipmentId}_DRAFT.pdf`,
        fileUrl: null,
        templateVersion: "mock-1.0",
        generatedAt: new Date().toISOString(),
        generatedBy: "KUBO Document Assistant",
        sources: plan.knownFields.map((item) => item.sources[0]?.label).filter(Boolean) as string[],
        reusedFieldCount: plan.knownFields.length,
      };
    }
  },
};
