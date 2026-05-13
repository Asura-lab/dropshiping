import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { apiFetch } from "../../lib/api";
import { colors, spacing, radius, fontSize } from "@dropshipping/ui";

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  totalMnt: string;
  createdAt: string;
  payment: { status: string } | null;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "Хүлээгдэж байна", color: "#a16207" },
  confirmed: { label: "Баталгаажсан", color: "#15803d" },
  processing: { label: "Боловсруулж байна", color: "#1d4ed8" },
  sourcing: { label: "Amazon захиалж байна", color: "#7c3aed" },
  arrived_warehouse: { label: "Агуулахад ирсэн", color: "#0891b2" },
  shipped: { label: "Илгээсэн", color: "#7c3aed" },
  delivered: { label: "Хүргэгдсэн", color: "#15803d" },
  cancelled: { label: "Цуцлагдсан", color: colors.mute },
};

export default function OrdersTab() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const r = await apiFetch<unknown>("/orders");
    if (r.success) {
      const d = r.data as { data: Order[] };
      setOrders(d.data ?? []);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <View style={styles.container}>
      <FlatList
        data={orders}
        keyExtractor={(o) => o.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={colors.accent}
          />
        }
        contentContainerStyle={orders.length === 0 ? styles.emptyContainer : styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {loading ? "Уншиж байна…" : "Захиалга байхгүй байна"}
            </Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const s = STATUS_MAP[item.status] ?? { label: item.status, color: colors.mute };
          return (
            <TouchableOpacity
              style={[styles.card, index === 0 && { marginTop: 0 }]}
              onPress={() => router.push(`/orders/${item.id}`)}
              activeOpacity={0.78}
            >
              <View style={styles.cardTop}>
                <Text style={styles.orderNum}>{item.orderNumber}</Text>
                <Text style={styles.date}>
                  {new Date(item.createdAt).toLocaleDateString("mn-MN")}
                </Text>
              </View>
              <View style={styles.cardBottom}>
                <View style={[styles.dot, { backgroundColor: s.color }]} />
                <Text style={[styles.status, { color: s.color }]}>{s.label}</Text>
                <Text style={styles.total}>
                  {Number(item.totalMnt).toLocaleString("en-US")}₮
                </Text>
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
  list: { padding: spacing.md, gap: spacing.sm },
  emptyContainer: { flex: 1 },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  emptyText: { fontSize: fontSize.base, color: colors.mute },
  card: {
    backgroundColor: colors.bgPaper,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  orderNum: {
    fontSize: fontSize.base,
    fontWeight: "700",
    color: colors.accent,
    fontVariant: ["tabular-nums"],
  },
  date: { fontSize: fontSize.sm, color: colors.mute2 },
  cardBottom: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, flexShrink: 0 },
  status: { fontSize: fontSize.sm, flex: 1, fontWeight: "500" },
  total: {
    fontSize: fontSize.base,
    fontWeight: "700",
    color: colors.ink,
    fontVariant: ["tabular-nums"],
  },
});
