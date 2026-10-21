import type {
  ContainerMatch,
  ExportDocument,
  OriginPortsInfo,
  Payment,
  Shipment,
  VesselIdentity,
  Voyage,
} from "@/types";
import type {
  ApiContainer,
  ApiDocument,
  ApiDocumentTypeInfo,
  ApiOrder,
  ApiOriginPortsInfo,
  ApiScoredContainer,
  ApiShipment,
  ApiVessel,
  ApiVoyage,
} from "./api-types";

export function mapShipment(s: ApiShipment): Shipment {
  return {
    id: s.shipmentCode,
    originCity: s.originCity,
    originPort: s.originPort,
    destinationCountry: s.destinationCountry,
    destinationPort: s.destinationPort,
    cargoReadyDate: s.cargoReadyDate,
    flexibleDateEnd: s.flexibleDateEnd,
    cbm: s.cbm,
    status: s.status as Shipment["status"],
    paymentStatus: s.paymentStatus as Shipment["paymentStatus"],
    nextAction: s.nextAction,
    exporter: {
      name: s.exporterName,
      company: s.exporterCompany,
      address: s.exporterAddress,
      email: s.exporterEmail,
    },
    consignee: {
      name: s.consigneeName,
      company: s.consigneeCompany,
      address: s.consigneeAddress,
      email: s.consigneeEmail,
    },
    product: {
      description: s.productDescription,
      hsCode: s.productHsCode,
      category: s.productCategory,
      quantity: s.productQuantity,
      quantityUnit: s.productQuantityUnit,
      grossWeight: s.productGrossWeight,
      netWeight: s.productNetWeight,
      weightUnit: s.productWeightUnit,
      packaging: s.productPackaging,
      stackable: s.productStackable,
      fragile: s.productFragile,
    },
    invoiceNumber: s.invoiceNumber ?? "",
    invoiceDate: s.invoiceDate ?? "",
    countryOfOrigin: s.countryOfOrigin,
    additionalHandling: s.additionalHandling ?? "",
    orderAmountIdr: s.orderAmountIdr,
  };
}

export function mapVesselIdentity(v: ApiVessel): VesselIdentity {
  return {
    mmsi: v.mmsi,
    imo: v.imo,
    name: v.name,
    shipTypeLabel: v.shipTypeLabel,
    estimatedTeu: v.estimatedTeu,
    estimatedCapacityCbm: v.estimatedCapacityCbm,
    capacityEstimateJustification: v.capacityEstimateJustification,
    lastDraughtM: v.lastDraughtM,
    fullnessPercent: v.fullnessPercent,
    fullnessJustification: v.fullnessJustification,
    fullnessUpdatedAt: v.fullnessUpdatedAt,
    estimatedLocation: v.estimatedLocation,
    lastEtaRaw: v.lastEtaRaw,
    lastPositionAt: v.lastPositionAt,
  };
}

export function mapOriginPortsInfo(o: ApiOriginPortsInfo): OriginPortsInfo {
  return {
    jepara: o.jepara,
    distances: o.distances,
    recommended: o.recommended,
    justification: o.justification,
  };
}

export function mapVoyage(v: ApiVoyage): Voyage {
  return {
    id: v.id,
    originPort: v.originPort,
    destinationPort: v.destinationPort,
    destinationConfidence: v.destinationConfidence,
    status: v.status,
    departedAt: v.departedAt,
    arrivedAt: v.arrivedAt,
    lastSeenAt: v.lastSeenAt,
    vessel: v.vessel ? mapVesselIdentity(v.vessel) : null,
  };
}

export function mapContainerMatch(
  c: ApiContainer | ApiScoredContainer,
): ContainerMatch {
  const scored = "aiRationale" in c ? c : null;
  return {
    id: c.id,
    originPort: c.originPort,
    destinationPort: c.destinationCity,
    destinationConfidence: c.destinationConfidence,
    shipmentType: c.shipmentType,
    estimatedDeparture: c.estimatedDeparture,
    cargoCutoff: c.cargoCutoff ?? c.estimatedDeparture,
    documentCutoff: c.documentCutoff ?? c.estimatedDeparture,
    transitDays: c.transitDays,
    vessel: c.vessel ? mapVesselIdentity(c.vessel) : null,
    occupancy: c.occupancy,
    remainingCbm: c.remainingCbm,
    participants: c.participants,
    status: c.matchStatus as ContainerMatch["status"],
    freightEstimateJustification: c.freightEstimateJustification,
    originPortDistanceFromJeparaKm: c.originPortDistanceFromJeparaKm,
    originPortDistanceJustification: c.originPortDistanceJustification,
    estimatedArrivalInJapan: c.estimatedArrivalInJapan,
    estimatedArrivalJustification: c.estimatedArrivalJustification,
    departureConfirmed: c.departureConfirmed,
    departureEstimateJustification: c.departureEstimateJustification,
    daysFromPreferredDate: scored?.daysFromPreferredDate ?? null,
    aiRationale: scored?.aiRationale ?? null,
    finalScoreJustification: scored?.finalScoreJustification ?? null,
    costs: c.costs,
  };
}

export function mapDocument(
  d: ApiDocument,
  typeInfo?: ApiDocumentTypeInfo[],
): ExportDocument {
  const info = typeInfo?.find((t) => t.type === d.type);
  const type = d.type ?? "UNCLASSIFIED";
  return {
    id: d.id,
    type,
    typeLabel: info?.label ?? (d.type ? d.type : "Uploaded Document"),
    category: info?.category ?? "",
    shipmentId: d.shipmentId,
    status: d.status as ExportDocument["status"],
    updatedAt: d.createdAt,
    fileUrl: d.fileUrl,
    generatedContent: d.generatedContent,
  };
}

const PAYMENT_METHOD_LABEL: Record<ApiOrder["paymentMethod"], string> = {
  bank_transfer: "Bank Transfer",
  credit_card: "Credit / Debit Card",
  e_wallet: "E-Wallet",
};

const ORDER_STATUS_TO_PAYMENT_STATUS: Record<
  ApiOrder["status"],
  Payment["status"]
> = {
  pending: "Deposit Required",
  completed: "Fully Paid",
  refunded: "Refunded",
};

export function mapOrderToPayment(o: ApiOrder, shipmentCode?: string): Payment {
  return {
    id: o.orderId,
    shipmentId: shipmentCode ?? o.shipmentId ?? "",
    date: o.createdAt,
    amount: o.amountIdr,
    status: ORDER_STATUS_TO_PAYMENT_STATUS[o.status],
    method: PAYMENT_METHOD_LABEL[o.paymentMethod],
    description: `Export payment to ${o.destination}`,
  };
}
