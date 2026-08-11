export type UserRole = "umkm" | "freight_forwarder";

export type DocumentType =
  | "commercial_invoice"
  | "packing_list"
  | "certificate_of_origin"
  | "svlk"
  | "shipping_instruction"
  | "bill_of_lading";

export type DocumentStatus =
  | "uploaded"
  | "processing"
  | "draft"
  | "draft_generated"
  | "conflict"
  | "needs_information"
  | "needs_review"
  | "ready_for_verification"
  | "verified"
  | "superseded"
  | "waiting_external_data";

export type FieldValidationStatus =
  | "consistent"
  | "conflict"
  | "missing"
  | "confirmed"
  | "waiting_external_data";

export type FieldSourceType =
  | "company_profile"
  | "shipment"
  | "cargo"
  | "container_match"
  | "vessel_match"
  | "uploaded_document"
  | "generated_document"
  | "freight_forwarder"
  | "user_input";

export interface FieldSource {
  sourceType: FieldSourceType;
  label: string;
  documentId?: string;
  documentType?: DocumentType;
  fileName?: string;
  page?: number;
  rawText?: string;
  boundingBox?: number[];
}

export interface ExtractedField {
  fieldKey: string;
  label: string;
  value: string | number | null;
  normalizedValue?: string | number | null;
  confidence?: number;
  sourceDocumentId?: string;
  sourcePage?: number;
  boundingBox?: number[];
  source?: FieldSource;
  status: FieldValidationStatus;
}

export interface FieldCandidate {
  id: string;
  fieldKey: string;
  value: string | number;
  sourceDocumentId: string;
  sourceDocumentType: DocumentType;
  sourceLabel: string;
  page?: number;
  confidence?: number;
  selected?: boolean;
}

export interface CanonicalField {
  key: string;
  label: string;
  value: string | number | null;
  normalizedValue?: string | number | null;
  status: FieldValidationStatus;
  sources: FieldSource[];
  candidates?: FieldCandidate[];
  updatedAt: string;
}

export interface CanonicalShipmentData {
  shipmentId: string;
  shipmentCode: string;
  routeLabel: string;
  fields: Record<string, CanonicalField>;
  updatedAt: string;
}

export interface ExportDocumentRecord {
  id: string;
  shipmentId: string;
  type: DocumentType;
  label: string;
  fileName?: string;
  fileUrl?: string | null;
  status: DocumentStatus;
  origin: "uploaded" | "generated" | "external";
  version: number;
  extractedFields: ExtractedField[];
  createdAt: string;
  updatedAt: string;
  lastCheckedAt?: string | null;
  checkCount?: number;
}

export interface DocumentHistoryEvent {
  id: string;
  documentId: string;
  documentType: DocumentType;
  documentLabel: string;
  action: "uploaded" | "generated" | "checked";
  occurredAt: string;
  status: string;
}

export interface ShipmentDocumentHistory {
  shipmentId: string;
  documents: ExportDocumentRecord[];
  events: DocumentHistoryEvent[];
}

export interface DocumentConsistencyIssue {
  id: string;
  fieldKey: string;
  label: string;
  status: "conflict" | "missing";
  requiredFor?: DocumentType[];
  candidates: FieldCandidate[];
}

export interface DocumentCheckResult {
  shipmentId: string;
  documents: ExportDocumentRecord[];
  consistentFields: number;
  missingFields: number;
  conflicts: DocumentConsistencyIssue[];
}

export interface DocumentFieldDefinition {
  key: string;
  label: string;
  required: boolean;
  external?: boolean;
  externalMessage?: string;
}

export interface DocumentDefinition {
  type: DocumentType;
  label: string;
  category: string;
  fields: DocumentFieldDefinition[];
}

export interface DocumentGenerationPlan {
  shipment: CanonicalShipmentData;
  definition: DocumentDefinition;
  knownFields: CanonicalField[];
  missingFields: DocumentFieldDefinition[];
  conflictFields: CanonicalField[];
  waitingExternalFields: DocumentFieldDefinition[];
  readinessPercent: number;
  canGenerate: boolean;
}

export interface GeneratedDraft {
  id: string;
  shipmentId: string;
  type: DocumentType;
  label: string;
  status: "draft";
  fileName: string;
  fileUrl: string | null;
  docxFileUrl?: string | null;
  templateVersion: string;
  generatedAt: string;
  generatedBy: string;
  sources: string[];
  reusedFieldCount: number;
}

export interface ForwarderCustomer {
  shipmentId: string;
  exporter: string;
  exporterContact: string;
  origin: string;
  destination: string;
  cargoReadyDate: string;
  cargoCutoff: string;
  cbm: number;
  grossWeightKg: number;
  netWeightKg: number;
  product: string;
  hsCode: string;
  quantity: string;
  packaging: string;
  handling: string;
  consignee: string;
  paymentStatus: "fully_paid" | "deposit_paid";
  amountPaid: number;
  paymentDate: string;
  bookingReference: string;
  documentReadiness: number;
  shipmentStatus: string;
  matching: {
    originPort: string;
    destinationPort: string;
    shipmentType: "Consolidated LCL";
    estimatedDeparture: string;
    cargoCutoff: string;
    remainingCapacityCbm: number;
    freightForwarder: string;
    status: string;
  };
  documents: ExportDocumentRecord[];
}

export interface ForwarderLead {
  shipmentId: string;
  exporterDisplayName: string;
  origin: string;
  destination: string;
  productCategory: string;
  cbm: number;
  grossWeightKg: number;
  cargoReadyDate: string;
  preferredDepartureEnd: string;
  packaging: string;
  stackable: boolean;
  handlingRequirements: string;
  documentReadiness: number;
  routeMatch: "Excellent" | "Good" | "Fair";
  scheduleMatch: "Excellent" | "Good" | "Fair";
  capacityMatch: "Excellent" | "Good" | "Fair";
  compatibilityEstimate: number;
}

export interface FreightForwarderOffer {
  id: string;
  shipmentId: string;
  freightForwarderId: string;
  proposedDeparture: string;
  cargoCutoff: string;
  documentCutoff?: string;
  availableCapacityCbm: number;
  estimatedFreightCost: number;
  estimatedTransitDays?: number;
  notes?: string;
  status: "pending" | "accepted" | "rejected" | "expired";
}

export interface DocumentReview {
  documentId: string;
  action: "reviewed" | "revision_requested";
  note?: string;
  createdAt: string;
}
