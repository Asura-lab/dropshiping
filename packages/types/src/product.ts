export type SourcePlatform = "taobao" | "alibaba" | "amazon";
export type StockStatus = "in_stock" | "out_of_stock" | "unknown";
export type ProductStatus = "active" | "inactive" | "deleted";

export interface ProductImage {
  url: string;
  is_primary: boolean;
}

export interface Product {
  id: string;
  sourcePlatform: SourcePlatform;
  sourceUrl: string;
  sourceId: string;
  titleMn: string;
  titleOriginal: string;
  descriptionMn?: string;
  priceOriginal: number;
  currencyOriginal: string;
  priceMnt: number;
  customsFee: number;
  shippingFee: number;
  images: ProductImage[];
  category?: string;
  stockStatus: StockStatus;
  status: ProductStatus;
  syncedAt: string;
  createdAt: string;
  updatedAt: string;
}
