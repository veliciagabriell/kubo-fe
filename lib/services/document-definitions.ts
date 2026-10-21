import type { DocumentDefinition, DocumentType } from "@/types/kubo";

const sharedPartyFields = [
  { key: "exporter_name", label: "Exporter", required: true },
  { key: "exporter_address", label: "Exporter Address", required: true },
  { key: "consignee_name", label: "Buyer / Consignee", required: true },
  { key: "consignee_address", label: "Consignee Address", required: true },
] as const;

export const documentDefinitions: Record<DocumentType, DocumentDefinition> = {
  commercial_invoice: {
    type: "commercial_invoice",
    label: "Commercial Invoice",
    category: "Transaction Documents",
    fields: [
      ...sharedPartyFields,
      { key: "invoice_number", label: "Invoice Number", required: true },
      { key: "invoice_date", label: "Invoice Date", required: true },
      {
        key: "product_description",
        label: "Product Description",
        required: true,
      },
      { key: "hs_code", label: "HS Code", required: true },
      { key: "quantity", label: "Quantity", required: true },
      { key: "unit", label: "Unit", required: true },
      { key: "unit_price", label: "Unit Price", required: true },
      { key: "currency", label: "Currency", required: true },
      { key: "country_of_origin", label: "Country of Origin", required: true },
      {
        key: "destination_country",
        label: "Country of Destination",
        required: true,
      },
    ],
  },
  packing_list: {
    type: "packing_list",
    label: "Packing List",
    category: "Transaction Documents",
    fields: [
      ...sharedPartyFields,
      { key: "invoice_number", label: "Invoice Number", required: false },
      {
        key: "product_description",
        label: "Product Description",
        required: true,
      },
      { key: "quantity", label: "Quantity", required: true },
      { key: "unit", label: "Unit", required: true },
      { key: "package_count", label: "Package Count", required: true },
      { key: "package_type", label: "Package Type", required: true },
      { key: "gross_weight", label: "Gross Weight (kg)", required: true },
      { key: "net_weight", label: "Net Weight (kg)", required: true },
      { key: "cbm", label: "Total Volume (CBM)", required: true },
    ],
  },
  certificate_of_origin: {
    type: "certificate_of_origin",
    label: "Certificate of Origin",
    category: "Customs Documents",
    fields: [
      ...sharedPartyFields,
      { key: "country_of_origin", label: "Country of Origin", required: true },
      {
        key: "destination_country",
        label: "Country of Destination",
        required: true,
      },
      {
        key: "product_description",
        label: "Description of Goods",
        required: true,
      },
      { key: "hs_code", label: "HS Code", required: true },
      { key: "quantity", label: "Quantity", required: true },
      { key: "gross_weight", label: "Gross Weight (kg)", required: true },
      { key: "origin_criterion", label: "Origin Criterion", required: true },
    ],
  },
  svlk: {
    type: "svlk",
    label: "Sistem Verifikasi Legalitas Kayu",
    category: "Legal Documents",
    fields: [
      { key: "exporter_name", label: "Exporter", required: true },
      { key: "exporter_address", label: "Exporter Address", required: true },
      { key: "nib", label: "NIB", required: true },
      {
        key: "product_description",
        label: "Product Description",
        required: true,
      },
      { key: "hs_code", label: "HS Code", required: true },
      { key: "svlk_number", label: "SVLK Number", required: true },
    ],
  },
  shipping_instruction: {
    type: "shipping_instruction",
    label: "Shipping Instruction",
    category: "Shipment Documents",
    fields: [
      ...sharedPartyFields,
      { key: "notify_party", label: "Notify Party", required: false },
      { key: "origin_port", label: "Port of Loading", required: true },
      { key: "destination_port", label: "Port of Discharge", required: true },
      {
        key: "product_description",
        label: "Description of Goods",
        required: true,
      },
      { key: "package_count", label: "Package Count", required: true },
      { key: "gross_weight", label: "Gross Weight (kg)", required: true },
      { key: "cbm", label: "Measurement (CBM)", required: true },
      {
        key: "booking_number",
        label: "Booking Number",
        required: false,
        external: true,
        externalMessage: "Available after booking",
      },
    ],
  },
  bill_of_lading: {
    type: "bill_of_lading",
    label: "Bill of Lading",
    category: "Shipment Documents",
    fields: [
      ...sharedPartyFields,
      { key: "notify_party", label: "Notify Party", required: false },
      { key: "origin_port", label: "Port of Loading", required: true },
      { key: "destination_port", label: "Port of Discharge", required: true },
      {
        key: "product_description",
        label: "Description of Goods",
        required: true,
      },
      { key: "package_count", label: "Number of Packages", required: true },
      { key: "gross_weight", label: "Gross Weight (kg)", required: true },
      { key: "cbm", label: "Measurement (CBM)", required: true },
      { key: "carrier_name", label: "Carrier Name", required: true },
      {
        key: "vessel_name",
        label: "Vessel Name",
        required: false,
        external: true,
        externalMessage: "Waiting for Freight Forwarder",
      },
      {
        key: "voyage_number",
        label: "Voyage Number",
        required: false,
        external: true,
        externalMessage: "Available after booking",
      },
      {
        key: "booking_number",
        label: "Booking Number",
        required: false,
        external: true,
        externalMessage: "Available after booking",
      },
      {
        key: "container_number",
        label: "Container Number",
        required: false,
        external: true,
        externalMessage: "Available after stuffing",
      },
      {
        key: "seal_number",
        label: "Seal Number",
        required: false,
        external: true,
        externalMessage: "Available after stuffing",
      },
    ],
  },
};

export const documentTypeOrder: DocumentType[] = [
  "commercial_invoice",
  "packing_list",
  "certificate_of_origin",
  "svlk",
  "shipping_instruction",
  "bill_of_lading",
];

export function labelForDocument(type: DocumentType) {
  return documentDefinitions[type].label;
}
