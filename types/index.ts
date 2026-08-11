export type ShipmentStatus = "Draft" | "Awaiting Match" | "Matched" | "Documents Incomplete" | "Awaiting Verification" | "Awaiting Booking" | "Booked" | "Cargo Ready" | "Cargo Received" | "In Transit" | "Customs Processing" | "Delivered" | "Cancelled";
export type PaymentStatus = "Unpaid" | "Deposit Required" | "Deposit Paid" | "Fully Paid" | "Payment Failed" | "Refund Processing" | "Refunded";

export interface ExportParty { name: string; company: string; address: string; email: string; }
export interface ShipmentProduct { description: string; hsCode: string; category: string; quantity: number; quantityUnit: string; grossWeight: number; netWeight: number; weightUnit: string; packaging: string; stackable: boolean; fragile: boolean; }
export interface Shipment {
  id: string; originCity: string; originPort: string; destinationCountry: string; destinationPort: string; cargoReadyDate: string; flexibleDateEnd: string; cbm: number; status: ShipmentStatus; paymentStatus: PaymentStatus; nextAction: string; exporter: ExportParty; consignee: ExportParty; product: ShipmentProduct; invoiceNumber: string; invoiceDate: string; countryOfOrigin: string; additionalHandling: string; orderAmountIdr: number | null;
}
export interface EstimatedLocation {
  city: string;
  country: string;
  approxDistanceKm: number;
  justification: string;
}
export interface VesselIdentity {
  mmsi: string;
  imo: string | null;
  name: string | null;
  shipTypeLabel: string | null;
  estimatedTeu: number | null;
  estimatedCapacityCbm: number | null;
  capacityEstimateJustification: string | null;
  lastDraughtM: number | null;
  fullnessPercent: number | null;
  fullnessJustification: string | null;
  fullnessUpdatedAt: string | null;
  estimatedLocation: EstimatedLocation | null;
  lastEtaRaw: string | null;
  lastPositionAt: string | null;
}
export interface OriginPortDistance { portId: string; label: string; distanceFromJeparaKm: number; }
export interface OriginPortsInfo { jepara: { lat: number; lon: number }; distances: OriginPortDistance[]; recommended: OriginPortDistance; justification: string; }
export interface Voyage {
  id: string;
  originPort: string;
  destinationPort: string | null;
  destinationConfidence: "guessed_from_ais_text" | "confirmed_by_geofence" | null;
  status: "AWAITING_DEPARTURE" | "DEPARTED" | "ARRIVED" | "STALE";
  departedAt: string | null;
  arrivedAt: string | null;
  lastSeenAt: string;
  vessel: VesselIdentity | null;
}
export interface CostBreakdown { freight: number; platformFee: number; documentAssistance: number; handling: number; insurance: number; taxes: number; subscription: number; total: number; }
export interface ContainerMatch { id: string; originPort: string; destinationPort: string; destinationConfidence: "guessed_from_ais_text" | "confirmed_by_geofence" | null; shipmentType: "Consolidated LCL"; estimatedDeparture: string; cargoCutoff: string; documentCutoff: string; transitDays: number | null; vessel: VesselIdentity | null; occupancy: number; remainingCbm: number; participants: number; status: "Awaiting Minimum Occupancy" | "Slot Confirmed by Freight Forwarder" | "Ready for Booking" | "Limited Capacity" | "Documents Required" | "Pelayaran Selesai"; freightEstimateJustification: string | null; originPortDistanceFromJeparaKm: number | null; originPortDistanceJustification: string | null; estimatedArrivalInJapan: string | null; estimatedArrivalJustification: string | null; departureConfirmed: boolean; departureEstimateJustification: string | null; daysFromPreferredDate: number | null; aiRationale: string | null; finalScoreJustification: string | null; costs: CostBreakdown; }
export interface ExportDocument { id: string; type: string; typeLabel: string; category: string; shipmentId: string | null; status: "draft" | "generated" | "draft_generated" | "uploaded" | "needs_review" | "conflict" | "verified"; updatedAt: string; fileUrl: string | null; generatedContent: string | null; }
export interface Payment { id: string; shipmentId: string; date: string; amount: number; status: PaymentStatus; method: string; description: string; }
export interface UserTask { id: string; title: string; description: string; dueLabel: string; priority: "high" | "medium" | "low"; href: string; }
