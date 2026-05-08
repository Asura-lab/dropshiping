export type PaymentProvider = "qpay" | "socialpay";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export interface Payment {
  id: string;
  orderId: string;
  provider: PaymentProvider;
  externalId?: string;
  amountMnt: number;
  status: PaymentStatus;
  paidAt?: string;
  createdAt: string;
}
