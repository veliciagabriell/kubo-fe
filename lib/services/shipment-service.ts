import { api } from "@/lib/api";
import type { ApiShipment } from "@/lib/api-types";
import type {
  CanonicalField,
  CanonicalShipmentData,
  FieldSource,
} from "@/types/kubo";
import { cloneCanonical } from "./mock-data";

const STORAGE_PREFIX = "kubo_canonical_";

function storageKey(shipmentId: string) {
  return `${STORAGE_PREFIX}${shipmentId}`;
}

function readLocal(shipmentId: string): CanonicalShipmentData | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(storageKey(shipmentId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CanonicalShipmentData;
  } catch {
    return null;
  }
}

function writeLocal(data: CanonicalShipmentData) {
  if (typeof window !== "undefined")
    localStorage.setItem(storageKey(data.shipmentId), JSON.stringify(data));
}

function field(
  key: string,
  label: string,
  value: string | number | null,
  source: FieldSource,
): CanonicalField {
  return {
    key,
    label,
    value,
    normalizedValue:
      typeof value === "string" ? value.trim().toLowerCase() : value,
    status: value === null || value === "" ? "missing" : "confirmed",
    sources: [source],
    updatedAt: new Date().toISOString(),
  };
}

function fromApiShipment(shipment: ApiShipment): CanonicalShipmentData {
  const shipmentSource: FieldSource = {
    sourceType: "shipment",
    label: "Shipment Information",
  };
  const cargoSource: FieldSource = {
    sourceType: "cargo",
    label: "Cargo Information",
  };
  const companySource: FieldSource = {
    sourceType: "company_profile",
    label: "Company Profile",
  };
  return {
    shipmentId: shipment.shipmentCode,
    shipmentCode: shipment.shipmentCode,
    routeLabel: `${shipment.originCity} → ${shipment.destinationPort}`,
    updatedAt: shipment.updatedAt,
    fields: {
      exporter_name: field(
        "exporter_name",
        "Exporter",
        shipment.exporterCompany || shipment.exporterName,
        companySource,
      ),
      exporter_address: field(
        "exporter_address",
        "Exporter Address",
        shipment.exporterAddress,
        companySource,
      ),
      consignee_name: field(
        "consignee_name",
        "Buyer / Consignee",
        shipment.consigneeCompany || shipment.consigneeName,
        shipmentSource,
      ),
      consignee_address: field(
        "consignee_address",
        "Consignee Address",
        shipment.consigneeAddress,
        shipmentSource,
      ),
      product_description: field(
        "product_description",
        "Product Description",
        shipment.productDescription,
        cargoSource,
      ),
      hs_code: field("hs_code", "HS Code", shipment.productHsCode, cargoSource),
      quantity: field(
        "quantity",
        "Quantity",
        shipment.productQuantity,
        cargoSource,
      ),
      unit: field("unit", "Unit", shipment.productQuantityUnit, cargoSource),
      gross_weight: field(
        "gross_weight",
        "Gross Weight",
        shipment.productGrossWeight,
        cargoSource,
      ),
      net_weight: field(
        "net_weight",
        "Net Weight",
        shipment.productNetWeight,
        cargoSource,
      ),
      cbm: field("cbm", "CBM", shipment.cbm, cargoSource),
      package_type: field(
        "package_type",
        "Package Type",
        shipment.productPackaging,
        cargoSource,
      ),
      origin_port: field(
        "origin_port",
        "Port of Loading",
        shipment.originPort,
        shipmentSource,
      ),
      destination_port: field(
        "destination_port",
        "Port of Discharge",
        shipment.destinationPort,
        shipmentSource,
      ),
      destination_country: field(
        "destination_country",
        "Country of Destination",
        shipment.destinationCountry,
        shipmentSource,
      ),
      country_of_origin: field(
        "country_of_origin",
        "Country of Origin",
        shipment.countryOfOrigin,
        shipmentSource,
      ),
      invoice_number: field(
        "invoice_number",
        "Invoice Number",
        shipment.invoiceNumber,
        shipmentSource,
      ),
      invoice_date: field(
        "invoice_date",
        "Invoice Date",
        shipment.invoiceDate,
        shipmentSource,
      ),
    },
  };
}

function mergeCanonical(
  base: CanonicalShipmentData,
  local: CanonicalShipmentData | null,
) {
  if (!local) return base;
  return { ...base, ...local, fields: { ...base.fields, ...local.fields } };
}

export const shipmentService = {
  async getCanonicalShipmentData(
    shipmentId: string,
  ): Promise<CanonicalShipmentData> {
    const local = readLocal(shipmentId);
    try {
      const response = await api.get<{ data: ApiShipment }>(
        `/shipments/${shipmentId}`,
      );
      return mergeCanonical(fromApiShipment(response.data), local);
    } catch {
      return mergeCanonical(cloneCanonical(shipmentId), local);
    }
  },

  async updateCanonicalField(
    shipmentId: string,
    key: string,
    value: string | number,
    source: FieldSource = {
      sourceType: "user_input",
      label: "User Confirmed Value",
    },
  ): Promise<CanonicalShipmentData> {
    const data = await this.getCanonicalShipmentData(shipmentId);
    data.fields[key] = {
      key,
      label: data.fields[key]?.label ?? key.replaceAll("_", " "),
      value,
      normalizedValue:
        typeof value === "string" ? value.trim().toLowerCase() : value,
      status: "confirmed",
      sources: [source, ...(data.fields[key]?.sources ?? [])],
      updatedAt: new Date().toISOString(),
    };
    data.updatedAt = new Date().toISOString();
    writeLocal(data);
    try {
      await api.post(`/shipments/${shipmentId}/document-conflicts/resolve`, {
        field: key,
        value,
      });
    } catch {
      // The local adapter remains usable until the canonical-field endpoint is deployed.
    }
    return data;
  },

  async updateCanonicalFields(
    shipmentId: string,
    values: Record<string, string | number>,
    source: FieldSource = {
      sourceType: "user_input",
      label: "User Confirmed Value",
    },
  ) {
    let data = await this.getCanonicalShipmentData(shipmentId);
    for (const [key, value] of Object.entries(values)) {
      data = await this.updateCanonicalField(shipmentId, key, value, source);
    }
    return data;
  },
};
