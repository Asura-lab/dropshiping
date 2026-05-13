import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Linking,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { apiFetch } from "../../lib/api";
import { enqueueUpdate, flushQueue } from "../../lib/offline-queue";

interface DeliveryDetail {
  id: string;
  status: "scheduled" | "en_route" | "delivered" | "failed";
  note: string | null;
  deliveredAt: string | null;
  order: {
    orderNumber: string;
    totalMnt: string;
    user: { name: string; phone: string };
    address: {
      duureg: string;
      khoroo: string;
      bair: string | null;
      toot: string | null;
      gudamj: string | null;
    } | null;
    items: {
      id: string;
      quantity: number;
      unitPriceMnt: string;
      product: { titleMn: string };
    }[];
  };
  slot: { slotDatetime: string; type: string };
}

const STATUS_MAP: Record<string, { label: string; bg: string; color: string }> = {
  scheduled: { label: "Хүлээгдэж байна", bg: "#fef9c3", color: "#a16207" },
  en_route: { label: "Хүргэж байна", bg: "#dbeafe", color: "#1d4ed8" },
  delivered: { label: "Хүргэгдсэн", bg: "#dcfce7", color: "#15803d" },
  failed: { label: "Амжилтгүй", bg: "#fee2e2", color: "#b91c1c" },
};

export default function DeliveryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [delivery, setDelivery] = useState<DeliveryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    apiFetch<DeliveryDetail>(`/driver/deliveries`).then((r) => {
      if (r.success) {
        const found = (r.data as unknown as DeliveryDetail[]).find((d) => d.id === id);
        setDelivery(found ?? null);
      }
      setLoading(false);
    });
  }, [id]);

  async function updateStatus(
    status: "en_route" | "delivered" | "failed",
    note?: string
  ) {
    if (!delivery) return;
    setUpdating(true);

    // First try to flush any queued updates
    await flushQueue(apiFetch);

    let success = false;
    try {
      const r = await apiFetch(`/driver/deliveries/${delivery.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, ...(note ? { note } : {}) }),
      });
      success = r.success;
      if (!r.success) {
        throw new Error((r.error as { message?: string })?.message ?? "Алдаа гарлаа");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Алдаа гарлаа";
      const isNetworkError = message.includes("Network") || message.includes("fetch");

      if (isNetworkError) {
        // Queue for later sync
        await enqueueUpdate({ deliveryId: delivery.id, status, note });
        // Optimistic update
        setDelivery((d) => (d ? { ...d, status } : d));
        Alert.alert(
          "Офлайн горим",
          "Интернет холболт байхгүй тул өөрчлөлтийг хадгаллаа. Интернет орсны дараа автоматаар илгээнэ.",
          [{ text: "OK" }]
        );
        setUpdating(false);
        return;
      }

      Alert.alert("Алдаа", message);
      setUpdating(false);
      return;
    }

    setUpdating(false);
    if (success) {
      setDelivery((d) => (d ? { ...d, status } : d));
      if (status === "delivered") {
        Alert.alert("✓ Амжилттай", "Хүргэлт баталгаажлаа!", [
          { text: "OK", onPress: () => router.back() },
        ]);
      }
    }
  }

  function confirmStatus(status: "en_route" | "delivered" | "failed") {
    const messages: Record<string, string> = {
      en_route: "Хүргэж эхлэхийг баталгаажуулах уу?",
      delivered: "Хүргэлт амжилттай гэж тэмдэглэх үү?",
      failed: "Хүргэлт амжилтгүй болсон гэж тэмдэглэх үү?",
    };
    Alert.alert(
      "Баталгаажуулах",
      messages[status],
      status === "failed"
        ? [
            { text: "Болих", style: "cancel" },
            {
              text: "Амжилтгүй",
              style: "destructive",
              onPress: () => {
                Alert.prompt("Шалтгаан", "Хүргэж чадаагүй шалтгаанаа бичнэ үү", [
                  { text: "Болих", style: "cancel" },
                  {
                    text: "Баталгаажуулах",
                    onPress: (note) => updateStatus("failed", note),
                  },
                ]);
              },
            },
          ]
        : [
            { text: "Болих", style: "cancel" },
            { text: "Тийм", onPress: () => updateStatus(status) },
          ]
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#b84a30" />
      </View>
    );
  }

  if (!delivery) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Хүргэлт олдсонгүй</Text>
      </View>
    );
  }

  const s = STATUS_MAP[delivery.status] ?? STATUS_MAP.scheduled;
  const addr = delivery.order.address;
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

  const ALLOWED_NEXT: Record<string, ("en_route" | "delivered" | "failed")[]> = {
    scheduled: ["en_route"],
    en_route: ["delivered", "failed"],
  };
  const nextActions = ALLOWED_NEXT[delivery.status] ?? [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Status badge */}
      <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
        <Text style={[styles.statusText, { color: s.color }]}>{s.label}</Text>
      </View>

      {/* Order info */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>ЗАХИАЛГА</Text>
        <Row label="Дугаар" value={delivery.order.orderNumber} accent />
        <Row
          label="Цаг"
          value={new Date(delivery.slot.slotDatetime).toLocaleString("mn-MN", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        />
        <Row
          label="Нийт дүн"
          value={`${Number(delivery.order.totalMnt).toLocaleString("en-US")}₮`}
        />
      </View>

      {/* Customer */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>ХЭРЭГЛЭГЧ</Text>
        <Row label="Нэр" value={delivery.order.user.name} />
        <Row label="Утас" value={delivery.order.user.phone} />
        <TouchableOpacity
          style={styles.callBtn}
          onPress={() => Linking.openURL(`tel:${delivery.order.user.phone}`)}
        >
          <Text style={styles.callBtnText}>📞 Залгах</Text>
        </TouchableOpacity>
      </View>

      {/* Address */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>ХАЯГ</Text>
        <Text style={styles.addrText}>{addrStr}</Text>
      </View>

      {/* Items */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>БАРААНУУД</Text>
        {delivery.order.items.map((item, i) => (
          <View
            key={item.id}
            style={[
              styles.itemRow,
              i < delivery.order.items.length - 1 && styles.itemBorder,
            ]}
          >
            <Text style={styles.itemName} numberOfLines={2}>
              {item.product.titleMn}
            </Text>
            <Text style={styles.itemMeta}>
              {Number(item.unitPriceMnt).toLocaleString("en-US")}₮ × {item.quantity}
            </Text>
          </View>
        ))}
      </View>

      {/* Action buttons */}
      {nextActions.length > 0 && !updating && (
        <View style={styles.actions}>
          {nextActions.includes("en_route") && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.btnBlue]}
              onPress={() => confirmStatus("en_route")}
            >
              <Text style={styles.actionBtnText}>🚗 Хүргэж эхлэх</Text>
            </TouchableOpacity>
          )}
          {nextActions.includes("delivered") && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.btnGreen]}
              onPress={() => confirmStatus("delivered")}
            >
              <Text style={styles.actionBtnText}>✓ Хүргэгдсэн</Text>
            </TouchableOpacity>
          )}
          {nextActions.includes("failed") && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.btnRed]}
              onPress={() => confirmStatus("failed")}
            >
              <Text style={styles.actionBtnText}>✕ Хүргэж чадсангүй</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {updating && (
        <View style={styles.center}>
          <ActivityIndicator color="#b84a30" />
        </View>
      )}

      {delivery.status === "delivered" && delivery.deliveredAt && (
        <Text style={styles.deliveredAt}>
          ✓ {new Date(delivery.deliveredAt).toLocaleString("mn-MN")} хүргэгдсэн
        </Text>
      )}
    </ScrollView>
  );
}

function Row({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, accent && styles.accent]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f4f0" },
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  errorText: { fontSize: 14, color: "#6b6b67" },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 99,
    marginBottom: 4,
  },
  statusText: { fontSize: 13, fontWeight: "700" },
  card: {
    backgroundColor: "#fafaf8",
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2dfd8",
    gap: 10,
  },
  cardTitle: {
    fontSize: 10,
    fontWeight: "700",
    color: "#9a9a95",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  rowLabel: { fontSize: 13, color: "#6b6b67", flex: 1 },
  rowValue: {
    fontSize: 13,
    fontWeight: "500",
    color: "#1c1c1a",
    flex: 2,
    textAlign: "right",
  },
  accent: { color: "#b84a30" },
  addrText: { fontSize: 14, color: "#1c1c1a", lineHeight: 20 },
  callBtn: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 4,
  },
  callBtnText: { fontSize: 14, color: "#15803d", fontWeight: "600" },
  itemRow: { paddingVertical: 8 },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: "#e2dfd8" },
  itemName: { fontSize: 13, color: "#1c1c1a", fontWeight: "500", marginBottom: 3 },
  itemMeta: { fontSize: 12, color: "#6b6b67" },
  actions: { gap: 10 },
  actionBtn: {
    height: 52,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  btnBlue: { backgroundColor: "#1d4ed8" },
  btnGreen: { backgroundColor: "#15803d" },
  btnRed: { backgroundColor: "#dc2626" },
  actionBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  deliveredAt: { fontSize: 13, color: "#15803d", textAlign: "center", marginTop: 8 },
});
