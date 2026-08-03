import type { ContainerMatch, ExportDocument, Payment, Shipment } from "@/types";
import type {
  ApiContainer,
  ApiDocument,
  ApiDocumentTypeInfo,
  ApiOrder,
  ApiShipment,
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

export function mapContainerMatch(c: ApiContainer): ContainerMatch {
  return {
    id: c.id,
    originPort: c.originPort,
    destinationPort: c.destinationCity,
    shipmentType: c.shipmentType,
    estimatedDeparture: c.estimatedDeparture,
    cargoCutoff: c.cargoCutoff ?? c.estimatedDeparture,
    documentCutoff: c.documentCutoff ?? c.estimatedDeparture,
    transitDays: c.transitDays,
    forwarder: c.forwarder,
    occupancy: c.occupancy,
    remainingCbm: c.remainingCbm,
    participants: c.participants,
    status: c.matchStatus as ContainerMatch["status"],
    costs: c.costs,
  };
}

export function mapDocument(d: ApiDocument, typeInfo?: ApiDocumentTypeInfo[]): ExportDocument {
  const info = typeInfo?.find((t) => t.type === d.type);
  return {
    id: d.id,
    type: d.type,
    typeLabel: info?.label ?? d.type,
    category: info?.category ?? "",
    shipmentId: d.shipmentId,
    status: d.status as ExportDocument["status"],
    updatedAt: d.createdAt,
    fileUrl: d.fileUrl,
    generatedContent: d.generatedContent,
  };
}

const PAYMENT_METHOD_LABEL: Record<ApiOrder["paymentMethod"], string> = {
  bank_transfer: "Transfer Bank",
  credit_card: "Kartu Kredit / Debit",
  e_wallet: "E-Wallet",
};

const ORDER_STATUS_TO_PAYMENT_STATUS: Record<ApiOrder["status"], Payment["status"]> = {
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
    description: `Pembayaran ekspor ke ${o.destination}`,
  };
}
