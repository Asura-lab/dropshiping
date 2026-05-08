import { notFound } from "next/navigation";
import Link from "next/link";

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
  const res = await fetch(`${API}/products/${id}`, { next: { revalidate: 60 } });
  if (!res.ok) return null;
  const data = await res.json();
  return data.data as Product;
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();

  const primaryImage = product.images.find((i) => i.is_primary) ?? product.images[0];
  const price = Number(product.priceMnt).toLocaleString("mn-MN");
  const shipping = Number(product.shippingFee).toLocaleString("mn-MN");
  const customs = Number(product.customsFee);
  const total = Number(product.priceMnt) + Number(product.shippingFee) + customs;

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "32px 24px" }}>
      <Link
        href="/products"
        style={{
          fontSize: "14px",
          color: "var(--color-text-secondary)",
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          marginBottom: "24px",
        }}
      >
        ← Буцах
      </Link>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "48px",
          alignItems: "start",
        }}
      >
        {/* Image */}
        <div
          style={{
            background: "var(--color-bg-muted)",
            borderRadius: "var(--radius-lg)",
            overflow: "hidden",
            aspectRatio: "1",
          }}
        >
          {primaryImage && (
            <img
              src={primaryImage.url}
              alt={product.titleMn}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          )}
        </div>

        {/* Info */}
        <div>
          {product.category && (
            <span
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--color-text-hint)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                display: "block",
                marginBottom: "8px",
              }}
            >
              {product.category}
            </span>
          )}

          <h1
            style={{
              fontSize: "24px",
              fontWeight: 700,
              lineHeight: 1.3,
              marginBottom: "6px",
            }}
          >
            {product.titleMn}
          </h1>
          <p
            style={{
              fontSize: "13px",
              color: "var(--color-text-hint)",
              marginBottom: "24px",
            }}
          >
            {product.titleOriginal}
          </p>

          {product.descriptionMn && (
            <p
              style={{
                fontSize: "14px",
                color: "var(--color-text-secondary)",
                lineHeight: 1.6,
                marginBottom: "24px",
              }}
            >
              {product.descriptionMn}
            </p>
          )}

          {/* Pricing breakdown */}
          <div
            style={{
              background: "var(--color-bg-soft)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              padding: "20px",
              marginBottom: "24px",
            }}
          >
            <PriceLine label="Барааны үнэ" value={`${price}₮`} />
            <PriceLine label="Тээврийн зардал" value={`${shipping}₮`} />
            {customs > 0 && (
              <PriceLine
                label="Гаалийн татвар"
                value={`${customs.toLocaleString("mn-MN")}₮`}
              />
            )}
            <div
              style={{
                borderTop: "1px solid var(--color-border)",
                marginTop: "12px",
                paddingTop: "12px",
              }}
            >
              <PriceLine label="Нийт" value={`${total.toLocaleString("mn-MN")}₮`} bold />
            </div>
          </div>

          {product.stockStatus === "out_of_stock" ? (
            <div
              style={{
                padding: "14px 20px",
                background: "var(--color-bg-muted)",
                borderRadius: "var(--radius-md)",
                textAlign: "center",
                fontSize: "14px",
                color: "var(--color-text-hint)",
                fontWeight: 500,
              }}
            >
              Дууссан
            </div>
          ) : (
            <Link
              href="/auth"
              style={{
                display: "block",
                padding: "14px 20px",
                background: "var(--color-accent)",
                color: "#fff",
                borderRadius: "var(--radius-md)",
                textAlign: "center",
                fontSize: "15px",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Захиалах
            </Link>
          )}

          <a
            href={product.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "block",
              textAlign: "center",
              marginTop: "12px",
              fontSize: "13px",
              color: "var(--color-text-hint)",
            }}
          >
            Эх эх сурвалж харах
          </a>
        </div>
      </div>
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
        fontSize: bold ? "15px" : "14px",
        fontWeight: bold ? 700 : 400,
        color: bold ? "var(--color-text-primary)" : "var(--color-text-secondary)",
        marginBottom: bold ? 0 : "8px",
      }}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
