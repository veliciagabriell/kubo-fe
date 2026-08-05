export interface ApiUser {
  id: string;
  name: string;
  email: string;
  businessName: string;
  businessType: string;
  ownerAddress: string;
  businessAddress: string;
  umkmCertificateUrl: string | null;
  nib: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiShipment {
  id: string;
  shipmentCode: string;
  userId: string;
  originCity: string;
  originPort: string;
  destinationCountry: string;
  destinationPort: string;
  cargoReadyDate: string;
  flexibleDateEnd: string;
  cbm: number;
  status: string;
  paymentStatus: string;
  nextAction: string;
  containerId: string | null;
  orderAmountIdr: number | null;
  exporterName: string;
  exporterCompany: string;
  exporterAddress: string;
  exporterEmail: string;
  consigneeName: string;
  consigneeCompany: string;
  consigneeAddress: string;
  consigneeEmail: string;
  productDescription: string;
  productHsCode: string;
  productCategory: string;
  productQuantity: number;
  productQuantityUnit: string;
  productGrossWeight: number;
  productNetWeight: number;
  productWeightUnit: string;
  productPackaging: string;
  productStackable: boolean;
  productFragile: boolean;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  countryOfOrigin: string;
  additionalHandling: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiCostBreakdown {
  freight: number;
  platformFee: number;
  documentAssistance: number;
  handling: number;
  insurance: number;
  taxes: number;
  subscription: number;
  total: number;
}

export interface ApiEstimatedLocation {
  city: string;
  country: string;
  approxDistanceKm: number;
  justification: string;
}

export interface ApiVessel {
  mmsi: string;
  imo: string | null;
  name: string | null;
  callsign?: string | null;
  shipTypeLabel: string | null;
  lengthM?: number | null;
  beamM?: number | null;
  estimatedTeu: number | null;
  estimatedCapacityCbm: number | null;
  capacityEstimateJustification: string | null;
  lastDraughtM: number | null;
  fullnessPercent: number | null;
  fullnessJustification: string | null;
  fullnessUpdatedAt: string | null;
  lastDestinationRaw?: string | null;
  lastEtaRaw: string | null;
  estimatedLocation: ApiEstimatedLocation | null;
  lastSpeedKn?: number | null;
  lastCourseDeg?: number | null;
  lastPositionAt: string | null;
}

export interface ApiVoyage {
  id: string;
  originPort: string;
  destinationPort: string | null;
  destinationConfidence: "guessed_from_ais_text" | "confirmed_by_geofence" | null;
  status: "AWAITING_DEPARTURE" | "DEPARTED" | "ARRIVED" | "STALE";
  departedAt: string | null;
  arrivedAt: string | null;
  lastSeenAt: string;
  vessel: ApiVessel | null;
}

export interface ApiContainer {
  id: string;
  voyageId: string;
  vesselMmsi: string;
  destinationCountry: string;
  destinationCity: string;
  destinationConfidence: "guessed_from_ais_text" | "confirmed_by_geofence" | null;
  originPort: string;
  containerType: string;
  totalCapacityCbm: number;
  currentUsedCbm: number;
  departureDate: string;
  status: string;
  umkmCount: number;
  costPerCbm: number;
  freightEstimateJustification: string | null;
  shipmentType: "Consolidated LCL";
  estimatedDeparture: string;
  cargoCutoff: string | null;
  documentCutoff: string | null;
  transitDays: number | null;
  occupancy: number;
  remainingCbm: number;
  participants: number;
  matchStatus: string;
  vessel: ApiVessel | null;
  originPortDistanceFromJeparaKm: number | null;
  originPortDistanceJustification: string | null;
  estimatedArrivalInJapan: string | null;
  estimatedArrivalJustification: string | null;
  departureConfirmed: boolean;
  departureEstimateJustification: string | null;
  costs: ApiCostBreakdown;
}

export interface ApiScoredContainer extends ApiContainer {
  availableCbm: number;
  utilizationPercent: number;
  matchScore: number;
  daysFromPreferredDate: number;
  aiScore: number | null;
  aiRationale: string | null;
  finalScore: number;
  finalScoreJustification: string;
}

export interface ApiOriginPortDistance {
  portId: string;
  label: string;
  distanceFromJeparaKm: number;
}

export interface ApiOriginPortsInfo {
  jepara: { lat: number; lon: number };
  distances: ApiOriginPortDistance[];
  recommended: ApiOriginPortDistance;
  justification: string;
}

export type ApiDocumentType =
  | "SVLK"
  | "PEB"
  | "CERTIFICATE_OF_ORIGIN"
  | "COMMERCIAL_INVOICE"
  | "PACKING_LIST"
  | "BILL_OF_LADING";

export interface ApiDocumentTypeInfo {
  type: ApiDocumentType;
  label: string;
  category: string;
}

export interface ApiFieldDef {
  key: string;
  label: string;
  required: boolean;
}

export interface ApiDocumentSchema {
  type: ApiDocumentType;
  label: string;
  category: string;
  fields: ApiFieldDef[];
  itemsSchema?: { label: string; columns: ApiFieldDef[] };
}

export interface ApiDocument {
  id: string;
  userId: string;
  shipmentId: string | null;
  type: ApiDocumentType;
  fields: Record<string, string>;
  items: Record<string, string>[] | null;
  generatedContent: string | null;
  fileUrl: string | null;
  status: string;
  createdAt: string;
}

export interface ApiOrder {
  id: string;
  orderId: string;
  userId: string;
  containerId: string;
  shipmentId: string | null;
  volumeCbm: number;
  destination: string;
  departureDate: string;
  paymentMethod: "bank_transfer" | "credit_card" | "e_wallet";
  cbmRate: number;
  subscriptionFee: number;
  paymentFee: number;
  amountIdr: number;
  status: "pending" | "completed" | "refunded";
  createdAt: string;
  updatedAt: string;
}
