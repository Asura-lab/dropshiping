export type OrderStatus =
  | "pending"
  | "paid"
  | "sourcing"
  | "shipped_international"
  | "customs"
  | "arrived_warehouse"
  | "out_for_delivery"
  | "ready_for_pickup"
  | "delivered"
  | "picked_up"
  | "completed"
  | "cancelled"
  | "refunded";

export type DeliveryType = "pickup" | "delivery";

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitPriceMnt: number;
  sourceOrderId?: string;
  sourceStatus?: string;
  createdAt: string;
}

export interface Order {
  id: string;
  userId: string;
  addressId?: string;
  orderNumber: string;
  status: OrderStatus;
  deliveryType: DeliveryType;
  note?: string;
  subtotalMnt: number;
  deliveryFee: number;
  discountMnt: number;
  totalMnt: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderInput {
  items: Array<{ product_id: string; quantity: number }>;
  delivery_type: DeliveryType;
  address_id?: string;
  note?: string;
}

export type SourceOrderStatus =
  | "queued"
  | "placing"
  | "placed"
  | "paid"
  | "shipped"
  | "arrived_border"
  | "customs"
  | "arrived_wh"
  | "failed"
  | "cancelled";
