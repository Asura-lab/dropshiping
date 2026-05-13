import { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { apiFetch } from "../../lib/api";
import { useCart } from "../../lib/cart";
import { colors, spacing, radius, fontSize } from "@dropshipping/ui";

interface Product {
  id: string;
  titleMn: string;
  priceMnt: string;
  stockStatus: string;
  category: string | null;
  images: { url: string; is_primary: boolean }[];
}

const PAGE_SIZE = 20;

export default function ProductsTab() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { addItem, itemCount } = useCart();

  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const nextCursorRef = useRef<string | null>(null);
  const hasNextPageRef = useRef(true);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeQueryRef = useRef("");

  async function fetchPage(
    cursor: string | null,
    currentQuery: string,
    replace: boolean
  ) {
    const qs = new URLSearchParams({ limit: String(PAGE_SIZE) });
    if (cursor) qs.set("cursor", cursor);
    if (currentQuery) qs.set("q", currentQuery);

    const r = await apiFetch<unknown>(`/products?${qs}`);
    if (!r.success) return;

    const payload = r.data as {
      data: Product[];
      meta: { nextCursor: string | null; hasNextPage: boolean };
    };
    const items = payload.data ?? [];
    const meta = payload.meta;

    nextCursorRef.current = meta.nextCursor;
    hasNextPageRef.current = meta.hasNextPage;

    if (replace) {
      setProducts(items);
    } else {
      setProducts((prev) => [...prev, ...items]);
    }
  }

  const load = useCallback(async (q: string) => {
    setLoading(true);
    nextCursorRef.current = null;
    hasNextPageRef.current = true;
    await fetchPage(null, q, true);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    activeQueryRef.current = "";
    load("");
  }, [load]);

  function onSearchChange(text: string) {
    setQuery(text);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      activeQueryRef.current = text;
      load(text);
    }, 400);
  }

  async function onRefresh() {
    setRefreshing(true);
    await load(activeQueryRef.current);
  }

  async function onEndReached() {
    if (loadingMore || !hasNextPageRef.current || !nextCursorRef.current) return;
    setLoadingMore(true);
    await fetchPage(nextCursorRef.current, activeQueryRef.current, false);
    setLoadingMore(false);
  }

  const numCols = width >= 600 ? 3 : 2;
  const cardWidth = (width - spacing["2xl"] * 2 - spacing.md * (numCols - 1)) / numCols;

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Бараа хайх…"
          placeholderTextColor={colors.mute2}
          value={query}
          onChangeText={onSearchChange}
          returnKeyType="search"
        />
        {itemCount > 0 && (
          <TouchableOpacity style={styles.cartBtn} onPress={() => router.push("/cart")}>
            <Text style={styles.cartBtnText}>🛒 {itemCount}</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={products}
        keyExtractor={(p) => p.id}
        numColumns={numCols}
        key={numCols}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
        contentContainerStyle={styles.grid}
        columnWrapperStyle={numCols > 1 ? styles.row : undefined}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : (
            <View style={styles.loading}>
              <Text style={{ color: colors.mute, fontSize: fontSize.base }}>
                Бараа олдсонгүй
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => {
          const img = item.images.find((x) => x.is_primary) ?? item.images[0];
          const inStock = item.stockStatus === "in_stock";
          return (
            <TouchableOpacity
              style={[styles.card, { width: cardWidth }]}
              onPress={() => router.push(`/products/${item.id}`)}
              activeOpacity={0.8}
            >
              <View style={styles.imgBox}>
                {img ? (
                  <Image
                    source={{ uri: img.url }}
                    style={styles.img}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.img, { backgroundColor: colors.bgStone }]} />
                )}
                {!inStock && (
                  <View style={styles.outOfStock}>
                    <Text style={styles.outOfStockText}>Дууссан</Text>
                  </View>
                )}
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.title} numberOfLines={2}>
                  {item.titleMn}
                </Text>
                <View style={styles.priceRow}>
                  <Text style={styles.price}>
                    {Number(item.priceMnt).toLocaleString("en-US")}₮
                  </Text>
                  {inStock && (
                    <TouchableOpacity
                      style={styles.addBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        addItem({
                          productId: item.id,
                          titleMn: item.titleMn,
                          priceMnt: Number(item.priceMnt),
                          image: img?.url,
                        });
                      }}
                    >
                      <Text style={styles.addBtnText}>+</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgCream },
  searchRow: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.bgPaper,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  searchInput: {
    flex: 1,
    height: 38,
    backgroundColor: colors.bgCream,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.base,
    color: colors.ink,
  },
  cartBtn: {
    height: 38,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.full,
    justifyContent: "center",
    alignItems: "center",
  },
  cartBtnText: { fontSize: fontSize.base, color: colors.accent, fontWeight: "600" },
  grid: { padding: spacing["2xl"], gap: spacing.md },
  row: { gap: spacing.md },
  loading: { flex: 1, alignItems: "center", paddingTop: 60 },
  footerLoader: { paddingVertical: spacing.lg, alignItems: "center" },
  card: {
    backgroundColor: colors.bgPaper,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: "hidden",
  },
  imgBox: { position: "relative", aspectRatio: 1 },
  img: { width: "100%", height: "100%" },
  outOfStock: {
    position: "absolute",
    inset: 0,
    backgroundColor: "rgba(255,255,255,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  outOfStockText: { fontSize: fontSize.sm, color: colors.mute, fontWeight: "600" },
  cardBody: { padding: spacing.sm + 2, gap: 6 },
  title: { fontSize: fontSize.sm, color: colors.ink, lineHeight: 16, fontWeight: "500" },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  price: { fontSize: fontSize.md, fontWeight: "700", color: colors.accent },
  addBtn: {
    width: 26,
    height: 26,
    backgroundColor: colors.accent,
    borderRadius: radius.full,
    justifyContent: "center",
    alignItems: "center",
  },
  addBtnText: { color: "#fff", fontSize: 18, fontWeight: "600", lineHeight: 22 },
});
