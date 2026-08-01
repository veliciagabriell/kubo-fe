export type ShipmentStatus = "Draft" | "Awaiting Match" | "Matched" | "Documents Incomplete" | "Awaiting Verification" | "Awaiting Booking" | "Booked" | "Cargo Ready" | "Cargo Received" | "In Transit" | "Customs Processing" | "Delivered" | "Cancelled";
export type PaymentStatus = "Unpaid" | "Deposit Required" | "Deposit Paid" | "Fully Paid" | "Payment Failed" | "Refund Processing" | "Refunded";
export type ExportDocumentStatus = "Information collected" | "Draft generated" | "Awaiting user review" | "Submitted for verification" | "Revision required" | "Ready for submission" | "Verified";

export interface ExportParty { name: string; company: string; address: string; email: string; }
export interface ShipmentProduct { description: string; hsCode: string; category: string; quantity: number; quantityUnit: string; grossWeight: number; netWeight: number; weightUnit: string; packaging: string; stackable: boolean; fragile: boolean; }
export interface Shipment {
  id: string; originCity: string; originPort: string; destinationCountry: string; destinationPort: string; cargoReadyDate: string; flexibleDateEnd: string; cbm: number; status: ShipmentStatus; paymentStatus: PaymentStatus; nextAction: string; exporter: ExportParty; consignee: ExportParty; product: ShipmentProduct; invoiceNumber: string; invoiceDate: string; countryOfOrigin: string; additionalHandling: string;
}
export interface FreightForwarder { name: string; verified: boolean; rating: number; completedShipments: number; }
export interface CostBreakdown { freight: number; platformFee: number; documentAssistance: number; handling: number; insurance: number; taxes: number; subscription: number; total: number; }
export interface ContainerMatch { id: string; originPort: string; destinationPort: string; shipmentType: "Consolidated LCL"; estimatedDeparture: string; cargoCutoff: string; documentCutoff: string; transitDays: number; forwarder: FreightForwarder; occupancy: number; remainingCbm: number; participants: number; status: "Awaiting Minimum Occupancy" | "Slot Confirmed by Freight Forwarder" | "Ready for Booking" | "Limited Capacity" | "Documents Required"; costs: CostBreakdown; }
export interface ExportDocument { id: string; type: "SKA / Certificate of Origin" | "PEB / Export Declaration" | "Packing List" | "Commercial Invoice"; shipmentId: string; status: ExportDocumentStatus; updatedAt: string; required: boolean; }
export interface Payment { id: string; shipmentId: string; date: string; amount: number; status: PaymentStatus; method: string; description: string; }
export interface UserTask { id: string; title: string; description: string; dueLabel: string; priority: "high" | "medium" | "low"; href: string; }
