import { api, fileUrl } from "@/lib/api";
import type { ApiForwarderCustomer } from "@/lib/api-types";
import type {
  DocumentReview,
  DocumentType,
  ExportDocumentRecord,
  FreightForwarderOffer,
  ForwarderCustomer,
  ForwarderLead,
} from "@/types/kubo";
import { mockForwarderLeads } from "./mock-data";

const OFFER_KEY = "kubo_forwarder_offers";
const REVIEW_KEY = "kubo_forwarder_reviews";

function appendLocal<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  const current = JSON.parse(localStorage.getItem(key) ?? "[]") as T[];
  localStorage.setItem(key, JSON.stringify([...current, value]));
}

const supportedDocumentTypes = new Set<DocumentType>([
  "commercial_invoice",
  "packing_list",
  "certificate_of_origin",
  "svlk",
  "shipping_instruction",
  "bill_of_lading",
]);

function mapCustomer(customer: ApiForwarderCustomer): ForwarderCustomer {
  const documents = customer.documents.flatMap((document) => {
    if (!supportedDocumentTypes.has(document.type as DocumentType)) return [];
    return [{
      ...document,
      type: document.type as DocumentType,
      status: document.status as ExportDocumentRecord["status"],
      fileUrl: fileUrl(document.fileUrl),
    } satisfies ExportDocumentRecord];
  });
  return { ...customer, documents };
}

export const forwarderService = {
  async getConfirmedCustomers(): Promise<ForwarderCustomer[]> {
    const response = await api.get<{ data: ApiForwarderCustomer[] }>("/forwarder/customers");
    return response.data.map(mapCustomer);
  },

  async getCustomerShipment(shipmentId: string): Promise<ForwarderCustomer | null> {
    const response = await api.get<{ data: ApiForwarderCustomer }>(
      `/forwarder/customers/${encodeURIComponent(shipmentId)}`,
    );
    return mapCustomer(response.data);
  },

  async getPotentialLeads(): Promise<ForwarderLead[]> {
    return structuredClone(mockForwarderLeads);
  },

  async getNotifications() {
    return [
      { id: "notice-1", title: "Packing List requires review", description: "KUB-24081 has one quantity conflict.", createdAt: "2026-08-12T07:30:00.000Z", unread: true },
      { id: "notice-2", title: "Deposit received", description: "KUB-24086 is now available in Confirmed Customers.", createdAt: "2026-08-11T13:15:00.000Z", unread: true },
      { id: "notice-3", title: "Cargo cut-off approaching", description: "KUB-24081 cargo cut-off is 22 Aug 2026.", createdAt: "2026-08-10T09:00:00.000Z", unread: false },
    ];
  },

  async getLeadDetail(shipmentId: string): Promise<ForwarderLead | null> {
    return structuredClone(mockForwarderLeads.find((lead) => lead.shipmentId === shipmentId) ?? null);
  },

  async createOffer(input: Omit<FreightForwarderOffer, "id" | "status">): Promise<FreightForwarderOffer> {
    const offer: FreightForwarderOffer = {
      ...input,
      id: `offer-${Date.now()}`,
      status: "pending",
    };
    appendLocal(OFFER_KEY, offer);
    return offer;
  },

  async reviewDocument(documentId: string, note?: string): Promise<DocumentReview> {
    const review: DocumentReview = { documentId, action: "reviewed", note, createdAt: new Date().toISOString() };
    appendLocal(REVIEW_KEY, review);
    return review;
  },

  async requestDocumentRevision(documentId: string, note: string): Promise<DocumentReview> {
    const review: DocumentReview = { documentId, action: "revision_requested", note, createdAt: new Date().toISOString() };
    appendLocal(REVIEW_KEY, review);
    return review;
  },
};
