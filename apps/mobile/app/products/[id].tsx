import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Dimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { apiFetch } from "../../lib/api";
import { useCart } from "../../lib/cart";
import { colors, spacing, radius, fontSize } from "@dropshipping/ui";

interface ProductImage {
  url: string;
  is_primary: boolean;
}
interface Product {
  id: string;
  titleMn: string;
  descriptionMn: string | null;
  priceMnt: string;
  stockStatus: string;
  category: string | null;
  images: ProductImage[];
  asin: string | null;
  sourceUrl: string | null;
}

const { width } = Dimensions.get("window");

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { addItem, itemCount } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!id) return;
    apiFetch<Product>(`/products/${id}`).then((r) => {
      if (r.success) setProduct(r.data);
      setLoading(false);
    });
  }, [id]);

  const handleAdd = useCallback(() => {
    if (!product) return;
    const img = product.images.find((x) => x.is_primary) ?? product.images[0];
    addItem({
      productId: product.id,
      titleMn: product.titleMn,
      priceMnt: Number(product.priceMnt),
      image: img?.url,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }, [product, addItem]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.mute }}>Бараа олдсонгүй</Text>
      </View>
    );
  }

  const inStock = product.stockStatus === "in_stock";
  const imgs = product.images.length > 0 ? product.images : [];

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image gallery */}
        <View style={styles.gallery}>
          {imgs.length > 0 ? (
            <>
              <FlatList
                data={imgs}
                keyExtractor={(_, i) => String(i)}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => {
                  setActiveImg(Math.round(e.nativeEvent.contentOffset.x / width));
                }}
                renderItem={({ item }) => (
                  <Image
                    source={{ uri: item.url }}
                    style={styles.mainImg}
                    resizeMode="contain"
                  />
                )}
              />
              {imgs.length > 1 && (
                <View style={styles.dots}>
                  {imgs.map((_, i) => (
                    <View
                      key={i}
                      style={[styles.dot, i === activeImg && styles.dotActive]}
                    />
                  ))}
                </View>
              )}
            </>
          ) : (
            <View style={[styles.mainImg, { backgroundColor: colors.bgStone }]} />
          )}
        </View>

        <View style={styles.body}>
          {/* Category */}
          {product.category && <Text style={styles.category}>{product.category}</Text>}

          {/* Title */}
          <Text style={styles.title}>{product.titleMn}</Text>

          {/* Price row */}
          <View style={styles.priceRow}>
            <Text style={styles.price}>
              {Number(product.priceMnt).toLocaleString("en-US")}₮
            </Text>
            {!inStock && (
              <View style={styles.outBadge}>
                <Text style={styles.outBadgeText}>Дууссан</Text>
              </View>
            )}
          </View>

          {/* Description */}
          {product.descriptionMn ? (
            <>
              <Text style={styles.sectionLabel}>Тайлбар</Text>
              <Text style={styles.description}>{product.descriptionMn}</Text>
            </>
          ) : null}

          {/* ASIN */}
          {product.asin && <Text style={styles.asin}>ASIN: {product.asin}</Text>}
        </View>
      </ScrollView>

      {/* Bottom bar */}
      <View style={styles.bottomBar}>
        {itemCount > 0 && (
          <TouchableOpacity style={styles.cartBtn} onPress={() => router.push("/cart")}>
            <Text style={styles.cartBtnText}>🛒 {itemCount}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.addBtn, (!inStock || added) && styles.addBtnDisabled]}
          onPress={handleAdd}
          disabled={!inStock || added}
        >
          <Text style={styles.addBtnText}>
            {added ? "Нэмэгдлээ ✓" : inStock ? "Сагсанд нэмэх" : "Дууссан"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgCream },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  gallery: {
    backgroundColor: colors.bgPaper,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  mainImg: { width, height: width, backgroundColor: colors.bgPaper },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    paddingVertical: spacing.sm,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.line2 },
  dotActive: { backgroundColor: colors.accent },
  body: { padding: spacing["2xl"], gap: spacing.md },
  category: {
    fontSize: fontSize.sm,
    color: colors.mute2,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  title: { fontSize: fontSize.xl, fontWeight: "700", color: colors.ink, lineHeight: 26 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  price: {
    fontSize: fontSize["2xl"],
    fontWeight: "700",
    color: colors.accent,
    fontVariant: ["tabular-nums"],
  },
  outBadge: {
    backgroundColor: colors.bgStone,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  outBadgeText: { fontSize: fontSize.sm, color: colors.mute, fontWeight: "600" },
  sectionLabel: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.mute2,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  description: { fontSize: fontSize.base, color: colors.ink2, lineHeight: 20 },
  asin: { fontSize: fontSize.sm, color: colors.mute2, fontFamily: "monospace" },
  bottomBar: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
    paddingBottom: spacing.lg,
    backgroundColor: colors.bgPaper,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  cartBtn: {
    height: 46,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  cartBtnText: { fontSize: fontSize.md, color: colors.accent, fontWeight: "600" },
  addBtn: {
    flex: 1,
    height: 46,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  addBtnDisabled: { backgroundColor: colors.mute2 },
  addBtnText: { fontSize: fontSize.md, color: "#fff", fontWeight: "600" },
});
