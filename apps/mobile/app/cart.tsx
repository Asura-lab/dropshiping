import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useCart } from "../lib/cart";
import { colors, spacing, radius, fontSize } from "@dropshipping/ui";

export default function CartScreen() {
  const router = useRouter();
  const { items, total, removeItem, updateQuantity, clearCart } = useCart();

  if (items.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>🛒</Text>
        <Text style={styles.emptyTitle}>Сагс хоосон байна</Text>
        <TouchableOpacity
          style={styles.shopBtn}
          onPress={() => router.replace("/(tabs)")}
        >
          <Text style={styles.shopBtnText}>Бараа үзэх</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(i) => i.productId}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            {item.image ? (
              <Image source={{ uri: item.image }} style={styles.img} resizeMode="cover" />
            ) : (
              <View style={[styles.img, { backgroundColor: colors.bgStone }]} />
            )}
            <View style={styles.info}>
              <Text style={styles.name} numberOfLines={2}>
                {item.titleMn}
              </Text>
              <Text style={styles.unitPrice}>
                {item.priceMnt.toLocaleString("en-US")}₮
              </Text>
              <View style={styles.qtyRow}>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => updateQuantity(item.productId, item.quantity - 1)}
                >
                  <Text style={styles.qtyBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.qty}>{item.quantity}</Text>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => updateQuantity(item.productId, item.quantity + 1)}
                >
                  <Text style={styles.qtyBtnText}>+</Text>
                </TouchableOpacity>
                <Text style={styles.lineTotal}>
                  = {(item.priceMnt * item.quantity).toLocaleString("en-US")}₮
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => removeItem(item.productId)}
            >
              <Text style={styles.removeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
        ListFooterComponent={
          <TouchableOpacity style={styles.clearBtn} onPress={clearCart}>
            <Text style={styles.clearBtnText}>Сагс цэвэрлэх</Text>
          </TouchableOpacity>
        }
      />

      <View style={styles.footer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Нийт дүн</Text>
          <Text style={styles.totalAmount}>{total.toLocaleString("en-US")}₮</Text>
        </View>
        <TouchableOpacity
          style={styles.checkoutBtn}
          onPress={() => router.push("/checkout")}
        >
          <Text style={styles.checkoutBtnText}>Захиалах</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgCream },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing["2xl"],
  },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: fontSize.lg, color: colors.mute, fontWeight: "500" },
  shopBtn: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing["2xl"],
    height: 44,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    justifyContent: "center",
  },
  shopBtnText: { color: "#fff", fontSize: fontSize.md, fontWeight: "600" },
  list: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing["3xl"] },
  card: {
    flexDirection: "row",
    backgroundColor: colors.bgPaper,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  img: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
    backgroundColor: colors.bgStone,
  },
  info: { flex: 1, gap: 4 },
  name: { fontSize: fontSize.sm, color: colors.ink, fontWeight: "500", lineHeight: 16 },
  unitPrice: { fontSize: fontSize.sm, color: colors.mute },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: 2 },
  qtyBtn: {
    width: 28,
    height: 28,
    backgroundColor: colors.bgStone,
    borderRadius: radius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  qtyBtnText: { fontSize: 16, color: colors.ink, fontWeight: "600", lineHeight: 20 },
  qty: {
    fontSize: fontSize.md,
    fontWeight: "700",
    color: colors.ink,
    minWidth: 20,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
  lineTotal: {
    fontSize: fontSize.sm,
    color: colors.accent,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
    marginLeft: "auto",
  },
  removeBtn: { padding: spacing.xs, alignSelf: "flex-start" },
  removeBtnText: { fontSize: 12, color: colors.mute2 },
  clearBtn: {
    alignSelf: "center",
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  clearBtnText: { fontSize: fontSize.sm, color: colors.error },
  footer: {
    backgroundColor: colors.bgPaper,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    padding: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: { fontSize: fontSize.md, color: colors.mute, fontWeight: "500" },
  totalAmount: {
    fontSize: fontSize.xl,
    fontWeight: "700",
    color: colors.ink,
    fontVariant: ["tabular-nums"],
  },
  checkoutBtn: {
    height: 50,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  checkoutBtnText: { color: "#fff", fontSize: fontSize.lg, fontWeight: "700" },
});
