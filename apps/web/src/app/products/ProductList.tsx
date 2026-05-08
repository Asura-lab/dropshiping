import Link from "next/link";

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
  const res = await fetch(`${API}/products?limit=40`, { next: { revalidate: 60 } });
  if (!res.ok) return [];
  const data = await res.json();
  return data.data as Product[];
}

const platformLabel: Record<string, string> = {
  taobao: "Taobao",
  alibaba: "Alibaba",
  amazon: "Amazon",
};

export default async function ProductList() {
  const products = await getProducts();

  if (products.length === 0) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "80px 0",
          color: "var(--color-text-hint)",
        }}
      >
        Бараа олдсонгүй
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
        gap: "20px",
      }}
    >
      {products.map((p) => {
        const image = p.images.find((i) => i.is_primary) ?? p.images[0];
        const price = Number(p.priceMnt).toLocaleString("mn-MN");

        return (
          <Link
            key={p.id}
            href={`/products/${p.id}`}
            style={{ textDecoration: "none", display: "block" }}
          >
            <div
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-lg)",
                overflow: "hidden",
                transition: "box-shadow 0.15s, transform 0.15s",
              }}
            >
              <div
                style={{
                  height: "200px",
                  background: "var(--color-bg-muted)",
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                {image && (
                  <img
                    src={image.url}
                    alt={p.titleMn}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                )}
                <span
                  style={{
                    position: "absolute",
                    top: "8px",
                    left: "8px",
                    background: "rgba(255,255,255,0.9)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "11px",
                    fontWeight: 600,
                    padding: "2px 8px",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  {platformLabel[p.sourcePlatform] ?? p.sourcePlatform}
                </span>
                {p.stockStatus === "out_of_stock" && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "rgba(255,255,255,0.7)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "var(--color-text-hint)",
                    }}
                  >
                    Дууссан
                  </div>
                )}
              </div>

              <div style={{ padding: "14px 16px" }}>
                <p
                  style={{
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "var(--color-text-primary)",
                    marginBottom: "8px",
                    lineHeight: 1.4,
                    overflow: "hidden",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical" as const,
                  }}
                >
                  {p.titleMn}
                </p>
                <p
                  style={{
                    fontSize: "16px",
                    fontWeight: 700,
                    color: "var(--color-accent)",
                  }}
                >
                  {price}₮
                </p>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
