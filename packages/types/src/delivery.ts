export type SlotType = "pickup" | "delivery";
export type DeliveryStatus =
  | "scheduled"
  | "en_route"
  | "delivered"
  | "picked_up"
  | "failed";

export interface DeliverySlot {
  id: string;
  type: SlotType;
  slotDatetime: string;
  capacity: number;
  bookedCount: number;
  isActive: boolean;
  availableCount?: number;
}

export interface Delivery {
  id: string;
  orderId: string;
  slotId: string;
  driverId?: string;
  status: DeliveryStatus;
  trackingCode?: string;
  note?: string;
  deliveredAt?: string;
  createdAt: string;
  updatedAt: string;
}
