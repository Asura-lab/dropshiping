import { notFound } from "next/navigation";
import Link from "next/link";
import { AddToCartButton } from "./AddToCartButton";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";

interface Product {
  id: string;
  titleMn: string;
  titleOriginal: string;
  descriptionMn: string | null;
  priceMnt: string;
  priceOriginal: string;
  currencyOriginal: string;
  customsFee: string;
  shippingFee: string;
  images: { url: string; is_primary: boolean }[];
  sourcePlatform: string;
  sourceUrl: string;
  stockStatus: string;
  category: string | null;
}

async function getProduct(id: string): Promise<Product | null> {
  try {
    const res = await fetch(`${API}/products/${id}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data as Product;
  } catch {
    return null;
  }
}

const platformStyle: Record<string, { label: string; bg: string }> = {
  taobao: { label: "Taobao", bg: "#FBEAE0" },
  alibaba: { label: "Alibaba", bg: "#F2EBD6" },
  amazon: { label: "Amazon", bg: "#E4E7EA" },
};

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();

  const primaryImage = product.images.find((i) => i.is_primary) ?? product.images[0];
  const plat = platformStyle[product.sourcePlatform] ?? {
    label: product.sourcePlatform,
    bg: "var(--bg-cream)",
  };
  const price = Number(product.priceMnt).toLocaleString("en-US");
  const shipping = Number(product.shippingFee).toLocaleString("en-US");
  const customs = Number(product.customsFee);
  const total = Number(product.priceMnt) + Number(product.shippingFee) + customs;

  return (
    <div style={{ background: "var(--bg-paper)", minHeight: "100%" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "20px 18px" }}>
        {/* Back */}
        <Link
          href="/products"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            color: "var(--mute)",
            marginBottom: 20,
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 5l-7 7 7 7" />
          </svg>
          Буцах
        </Link>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 48,
            alignItems: "start",
          }}
          className="product-grid"
        >
          {/* Image */}
          <div
            style={{
              borderRadius: "var(--r-3)",
              overflow: "hidden",
              border: "1px solid var(--line)",
              aspectRatio: "1",
            }}
          >
            {primaryImage ? (
              <img
                src={primaryImage.url}
                alt={product.titleMn}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <div className="ph" style={{ height: "100%", aspectRatio: "1" }}>
                <span className="ph-label">{product.titleMn.toLowerCase()}</span>
              </div>
            )}
          </div>

          {/* Info */}
          <div>
            {/* Badges */}
            <div
              style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 12 }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "3px 8px",
                  borderRadius: "var(--r-1)",
                  background: plat.bg,
                  fontSize: 10.5,
                  fontWeight: 500,
                  color: "var(--ink-2)",
                }}
              >
                {plat.label}
              </span>
              {product.category && (
                <span
                  style={{
                    display: "inline-flex",
                    padding: "3px 8px",
                    borderRadius: "var(--r-1)",
                    border: "1px solid var(--line)",
                    fontSize: 10.5,
                    color: "var(--mute)",
                    textTransform: "uppercase" as const,
                    letterSpacing: "0.05em",
                  }}
                >
                  {product.category}
                </span>
              )}
            </div>

            <h1
              style={{
                fontSize: "clamp(18px, 2.5vw, 24px)",
                fontWeight: 600,
                lineHeight: 1.25,
                letterSpacing: "-0.01em",
                marginBottom: 4,
              }}
            >
              {product.titleMn}
            </h1>
            <p style={{ fontSize: 12, color: "var(--mute-2)", marginBottom: 20 }}>
              {product.titleOriginal}
            </p>

            {product.descriptionMn && (
              <p
                style={{
                  fontSize: 13,
                  color: "var(--ink-2)",
                  lineHeight: 1.6,
                  marginBottom: 22,
                }}
              >
                {product.descriptionMn}
              </p>
            )}

            {/* Price breakdown */}
            <div
              style={{
                background: "var(--bg-cream)",
                border: "1px solid var(--line)",
                borderRadius: "var(--r-2)",
                padding: "18px",
                marginBottom: 20,
              }}
            >
              <PriceLine label="Барааны үнэ" value={`${price}₮`} />
              <PriceLine label="Тээврийн зардал" value={`${shipping}₮`} />
              {customs > 0 && (
                <PriceLine
                  label="Гаалийн татвар"
                  value={`${customs.toLocaleString("en-US")}₮`}
                />
              )}
              <div
                style={{
                  borderTop: "1px solid var(--line)",
                  marginTop: 12,
                  paddingTop: 12,
                }}
              >
                <PriceLine
                  label="Нийт"
                  value={`${total.toLocaleString("en-US")}₮`}
                  bold
                />
              </div>
            </div>

            {/* CTA */}
            <AddToCartButton
              product={{
                id: product.id,
                titleMn: product.titleMn,
                priceMnt: product.priceMnt,
                stockStatus: product.stockStatus,
                ...(primaryImage?.url ? { image: primaryImage.url } : {}),
              }}
            />

            <a
              href={product.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "block",
                textAlign: "center",
                marginTop: 12,
                fontSize: 12,
                color: "var(--mute)",
              }}
            >
              Эх сурвалж харах →
            </a>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .product-grid { grid-template-columns: 1fr !important; gap: 20px !important; }
        }
      `}</style>
    </div>
  );
}

function PriceLine({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        fontSize: bold ? 14 : 13,
        fontWeight: bold ? 600 : 400,
        color: bold ? "var(--ink)" : "var(--mute)",
        marginBottom: bold ? 0 : 8,
      }}
    >
      <span>{label}</span>
      <span className="num">{value}</span>
    </div>
  );
}
