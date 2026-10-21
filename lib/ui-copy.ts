export const uiCopy = {
  common: {
    view: "View",
    viewDetails: "View Details",
    edit: "Edit",
    save: "Save",
    cancel: "Cancel",
    continue: "Continue",
    back: "Back",
    confirm: "Confirm",
    submit: "Submit",
    upload: "Upload",
    download: "Download",
    generate: "Generate",
    review: "Review",
    verify: "Verify",
    retry: "Retry",
    delete: "Delete",
    close: "Close",
    search: "Search",
    filter: "Filter",
    apply: "Apply",
    reset: "Reset",
  },
  navigation: {
    dashboard: "Dashboard",
    shipments: "Shipments",
    matching: "Matching",
    documents: "Documents",
    payments: "Payments",
    support: "Support",
    settings: "Settings",
    notifications: "Notifications",
    confirmedCustomers: "Confirmed Customers",
    potentialLeads: "Potential Leads",
  },
  terminology: {
    exporter: "Exporter / MSME",
    freightForwarder: "Freight Forwarder",
    shipment: "Shipment",
    containerMatch: "Container Match",
    document: "Document",
    payment: "Payment",
    lead: "Lead",
    customer: "Customer",
    consignee: "Consignee",
    cargo: "Cargo",
  },
} as const;

export const shipmentStatusLabels: Record<string, string> = {
  Draft: "Draft",
  "Awaiting Match": "Awaiting Match",
  Matched: "Matched",
  "Documents Incomplete": "Documents Incomplete",
  "Awaiting Verification": "Awaiting Verification",
  "Awaiting Booking": "Awaiting Booking",
  Booked: "Booked",
  "Cargo Ready": "Cargo Ready",
  "Cargo Received": "Cargo Received",
  "In Transit": "In Transit",
  "Customs Processing": "Customs Processing",
  Delivered: "Delivered",
  Cancelled: "Cancelled",
};

export const paymentStatusLabels: Record<string, string> = {
  Unpaid: "Unpaid",
  "Deposit Required": "Deposit Required",
  "Deposit Paid": "Deposit Paid",
  "Fully Paid": "Fully Paid",
  "Payment Failed": "Payment Failed",
  "Refund Processing": "Refund Processing",
  Refunded: "Refunded",
};

export const documentStatusLabels: Record<string, string> = {
  uploaded: "Uploaded",
  processing: "Processing",
  draft: "Draft",
  generated: "Generated",
  draft_generated: "Draft Available",
  conflict: "Conflict Found",
  needs_information: "Additional Information Required",
  missing_fields: "Additional Information Required",
  needs_review: "Needs Review",
  ready_for_verification: "Ready for Verification",
  verified: "Verified",
  superseded: "Superseded",
  waiting_external_data: "Waiting for External Data",
};

export const matchingStatusLabels: Record<string, string> = {
  "Awaiting Minimum Occupancy": "Awaiting Minimum Occupancy",
  "Slot Confirmed by Freight Forwarder": "Slot Confirmed by Freight Forwarder",
  "Ready for Booking": "Ready for Booking",
  "Limited Capacity": "Limited Capacity",
  "Documents Required": "Documents Required",
  "Pelayaran Selesai": "Voyage Completed",
};

export function statusLabel(status: string): string {
  return (
    shipmentStatusLabels[status] ??
    paymentStatusLabels[status] ??
    documentStatusLabels[status] ??
    matchingStatusLabels[status] ??
    status
  );
}

const shipmentNextActionLabels: Record<string, string> = {
  "Cari container match": "Find Container Matches",
  "Lengkapi dokumen": "Complete Documents",
  "Menunggu verifikasi": "Await Verification",
  "Selesaikan pembayaran": "Complete Payment",
  "Bayar deposit": "Pay Deposit",
  "Lanjutkan booking": "Continue Booking",
  "Pantau pengiriman": "Track Shipment",
};

export function nextActionLabel(value: string): string {
  return shipmentNextActionLabels[value] ?? value;
}

const documentCategoryLabels: Record<string, string> = {
  "Dokumen Legalitas": "Legal Documents",
  "Dokumen Pabean": "Customs Documents",
  "Dokumen Transaksi": "Transaction Documents",
  "Dokumen Pengiriman": "Shipment Documents",
  "Legal Documents": "Legal Documents",
  "Customs Documents": "Customs Documents",
  "Transaction Documents": "Transaction Documents",
  "Shipment Documents": "Shipment Documents",
};

export function documentCategoryLabel(value: string): string {
  return documentCategoryLabels[value] ?? value;
}

const apiMessageLabels: Record<string, string> = {
  "File wajib diunggah": "A file must be uploaded.",
  "Informasi kargo hanya dapat diubah sebelum shipment mendapatkan match":
    "Cargo information can only be edited before the shipment is matched.",
  "Cargo Ready Date tidak boleh melewati batas fleksibel keberangkatan":
    "Cargo Ready Date cannot be later than the flexible departure end date.",
  "Berat bersih tidak boleh lebih besar dari berat kotor":
    "Net weight cannot exceed gross weight.",
  "Dokumen berhasil dibuat.": "Document generated successfully.",
};

export function localizeApiMessage(message: string): string {
  if (apiMessageLabels[message]) return apiMessageLabels[message];
  const missingFields = message.match(/^Field wajib belum diisi: (.+)$/i);
  if (missingFields) return `Required fields are missing: ${missingFields[1]}`;
  const incompleteRow = message.match(
    /^Baris (\d+) pada "(.+)" belum lengkap: (.+)$/i,
  );
  if (incompleteRow) {
    return `Row ${incompleteRow[1]} in “${incompleteRow[2]}” is incomplete: ${incompleteRow[3]}`;
  }
  const requiredItems = message.match(
    /^Field "items" wajib diisi minimal 1 baris untuk dokumen (.+)$/i,
  );
  if (requiredItems) {
    return `At least one item row is required for ${requiredItems[1]}.`;
  }
  if (/Document parser gagal/i.test(message)) {
    return message.replace(/Document parser gagal/i, "Document parser failed");
  }
  if (/PDF tidak memiliki text layer/i.test(message)) {
    return "The PDF has no readable text layer. OCR processing is required.";
  }
  return message;
}

const indonesianCopyPattern =
  /\b(anda|belum|berangkat|biaya|dari|dengan|diestimasi|diperbarui|gagal|hari|jepang|kapal|kargo|muatan|pelabuhan|pengiriman|posisi|sudah|tiba|tujuan|untuk)\b/i;

export function englishExplanation(
  value: string | null | undefined,
  fallback = "This explanation is based on available shipment, operational, and live data.",
): string {
  if (!value || indonesianCopyPattern.test(value)) return fallback;
  return value;
}
