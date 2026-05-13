import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { apiFetch, logout } from "../../lib/api";
import { flushQueue, getPendingCount } from "../../lib/offline-queue";

interface Address {
  duureg: string;
  khoroo: string;
  bair: string | null;
  toot: string | null;
  gudamj: string | null;
}

interface Delivery {
  id: string;
  status: "scheduled" | "en_route" | "delivered" | "failed";
  order: {
    orderNumber: string;
    user: { name: string; phone: string };
    address: Address | null;
    items: { product: { titleMn: string } }[];
  };
  slot: { slotDatetime: string };
}

const STATUS_MAP: Record<string, { label: string; bg: string; color: string }> = {
  scheduled: { label: "Хүлээгдэж байна", bg: "#fef9c3", color: "#a16207" },
  en_route: { label: "Хүргэж байна", bg: "#dbeafe", color: "#1d4ed8" },
  delivered: { label: "Хүргэгдсэн", bg: "#dcfce7", color: "#15803d" },
  failed: { label: "Амжилтгүй", bg: "#fee2e2", color: "#b91c1c" },
};

export default function DeliveriesScreen() {
  const router = useRouter();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [pendingSync, setPendingSync] = useState(0);

  const load = useCallback(async () => {
    // Try to flush offline queue first
    const { synced } = await flushQueue(apiFetch);
    if (synced > 0) {
      Alert.alert("Синк", `${synced} офлайн өөрчлөлт илгээгдлээ.`);
    }
    const pending = await getPendingCount();
    setPendingSync(pending);

    const r = await apiFetch<Delivery[]>("/driver/deliveries");
    if (r.success) setDeliveries(r.data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function onRefresh() {
    setRefreshing(true);
    load();
  }

  async function handleLogout() {
    Alert.alert("Гарах", "Та гарахдаа итгэлтэй байна уу?", [
      { text: "Болих", style: "cancel" },
      {
        text: "Гарах",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/login");
        },
      },
    ]);
  }

  const done = deliveries.filter((d) => d.status === "delivered").length;
  const pending = deliveries.filter(
    (d) => d.status !== "delivered" && d.status !== "failed"
  ).length;

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Уншиж байна…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Offline sync banner */}
      {pendingSync > 0 && (
        <View style={styles.syncBanner}>
          <Text style={styles.syncBannerText}>
            ⚠ {pendingSync} өөрчлөлт офлайн хадгалагдсан — интернет орсны дараа илгээгдэнэ
          </Text>
        </View>
      )}
      {/* Summary bar */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNum}>{deliveries.length}</Text>
          <Text style={styles.summaryLabel}>Нийт</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNum, { color: "#1d4ed8" }]}>{pending}</Text>
          <Text style={styles.summaryLabel}>Хүлээгдэж байна</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNum, { color: "#15803d" }]}>{done}</Text>
          <Text style={styles.summaryLabel}>Хүргэгдсэн</Text>
        </View>
      </View>

      <FlatList
        data={deliveries}
        keyExtractor={(d) => d.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#b84a30"
          />
        }
        contentContainerStyle={
          deliveries.length === 0 ? styles.emptyContainer : styles.listContent
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Өнөөдөр хүргэлт байхгүй байна</Text>
          </View>
        }
        ListFooterComponent={
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>Гарах</Text>
          </TouchableOpacity>
        }
        renderItem={({ item }) => {
          const s = STATUS_MAP[item.status] ?? STATUS_MAP.scheduled;
          const addr = item.order.address;
          const addrStr = addr
            ? [
                addr.duureg,
                addr.khoroo,
                addr.gudamj,
                addr.bair && `${addr.bair} байр`,
                addr.toot && `${addr.toot} тоот`,
              ]
                .filter(Boolean)
                .join(", ")
            : "Хаяг байхгүй";
          const slotTime = new Date(item.slot.slotDatetime).toLocaleTimeString("mn-MN", {
            hour: "2-digit",
            minute: "2-digit",
          });
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/deliveries/${item.id}`)}
              activeOpacity={0.75}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.orderNum}>{item.order.orderNumber}</Text>
                <View style={[styles.badge, { backgroundColor: s.bg }]}>
                  <Text style={[styles.badgeText, { color: s.color }]}>{s.label}</Text>
                </View>
              </View>
              <Text style={styles.customerName}>{item.order.user.name}</Text>
              <Text style={styles.addr} numberOfLines={1}>
                {addrStr}
              </Text>
              <View style={styles.cardFooter}>
                <Text style={styles.slotTime}>⏰ {slotTime}</Text>
                <Text style={styles.itemCount}>{item.order.items.length} бараа →</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f4f0" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { fontSize: 14, color: "#6b6b67" },
  syncBanner: {
    backgroundColor: "#fef9c3",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#fde68a",
  },
  syncBannerText: { fontSize: 12, color: "#a16207", textAlign: "center" },
  summaryBar: {
    flexDirection: "row",
    backgroundColor: "#fafaf8",
    borderBottomWidth: 1,
    borderBottomColor: "#e2dfd8",
    paddingVertical: 14,
  },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryNum: { fontSize: 22, fontWeight: "700", color: "#1c1c1a" },
  summaryLabel: { fontSize: 11, color: "#6b6b67", marginTop: 2 },
  summaryDivider: { width: 1, backgroundColor: "#e2dfd8", marginVertical: 4 },
  listContent: { padding: 14, gap: 10 },
  emptyContainer: { flex: 1 },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  emptyText: { fontSize: 14, color: "#6b6b67", textAlign: "center" },
  card: {
    backgroundColor: "#fafaf8",
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2dfd8",
    marginBottom: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  orderNum: {
    fontSize: 13,
    fontWeight: "700",
    color: "#b84a30",
    fontVariant: ["tabular-nums"],
  },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 },
  badgeText: { fontSize: 11, fontWeight: "600" },
  customerName: { fontSize: 15, fontWeight: "600", color: "#1c1c1a", marginBottom: 4 },
  addr: { fontSize: 13, color: "#6b6b67", marginBottom: 10 },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  slotTime: { fontSize: 13, color: "#3a3a37", fontWeight: "500" },
  itemCount: { fontSize: 12, color: "#b84a30", fontWeight: "500" },
  logoutBtn: { margin: 14, padding: 14, alignItems: "center" },
  logoutText: { fontSize: 13, color: "#9a9a95" },
});
