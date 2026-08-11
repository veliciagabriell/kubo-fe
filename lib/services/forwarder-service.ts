import type { DocumentReview, FreightForwarderOffer, ForwarderCustomer, ForwarderLead } from "@/types/kubo";
import { mockForwarderCustomers, mockForwarderLeads } from "./mock-data";

const OFFER_KEY = "kubo_forwarder_offers";
const REVIEW_KEY = "kubo_forwarder_reviews";

function appendLocal<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  const current = JSON.parse(localStorage.getItem(key) ?? "[]") as T[];
  localStorage.setItem(key, JSON.stringify([...current, value]));
}

export const forwarderService = {
  async getConfirmedCustomers(): Promise<ForwarderCustomer[]> {
    return structuredClone(mockForwarderCustomers.filter((customer) =>
      customer.paymentStatus === "fully_paid" || customer.paymentStatus === "deposit_paid"));
  },

  async getCustomerShipment(shipmentId: string): Promise<ForwarderCustomer | null> {
    return structuredClone(mockForwarderCustomers.find((customer) => customer.shipmentId === shipmentId) ?? null);
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
