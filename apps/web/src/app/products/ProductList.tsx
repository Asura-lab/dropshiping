import { ProductsClient } from "./ProductsClient";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";

interface Product {
  id: string;
  titleMn: string;
  priceMnt: string;
  images: { url: string; is_primary: boolean }[];
  sourcePlatform: string;
  stockStatus: string;
  category: string | null;
}

async function getProducts(): Promise<Product[]> {
  try {
    const res = await fetch(`${API}/products?limit=100`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const data = await res.json();
    return data.data as Product[];
  } catch {
    return [];
  }
}

export default async function ProductList() {
  const products = await getProducts();
  return <ProductsClient products={products} />;
}
