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

export interface ApiContainer {
  id: string;
  destinationCountry: string;
  destinationCity: string;
  originPort: string;
  containerType: string;
  totalCapacityCbm: number;
  currentUsedCbm: number;
  departureDate: string;
  status: string;
  umkmCount: number;
  costPerCbm: number;
  shipmentType: "Consolidated LCL";
  estimatedDeparture: string;
  cargoCutoff: string | null;
  documentCutoff: string | null;
  transitDays: number;
  occupancy: number;
  remainingCbm: number;
  participants: number;
  matchStatus: string;
  forwarder: {
    name: string;
    verified: boolean;
    rating: number;
    completedShipments: number;
  };
  costs: ApiCostBreakdown;
}

export interface ApiScoredContainer extends ApiContainer {
  availableCbm: number;
  utilizationPercent: number;
  matchScore: number;
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
