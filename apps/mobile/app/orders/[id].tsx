import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { apiFetch } from "../../lib/api";
import { colors, spacing, radius, fontSize } from "@dropshipping/ui";

interface StatusLog {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  note: string | null;
  createdAt: string;
}

interface OrderItem {
  id: string;
  quantity: number;
  unitPriceMnt: string;
  product: { id: string; titleMn: string };
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  deliveryType: "pickup" | "delivery";
  subtotalMnt: string;
  deliveryFee: number;
  totalMnt: string;
  note: string | null;
  createdAt: string;
  items: OrderItem[];
  payment: { status: string; provider: string; paidAt: string | null } | null;
  delivery: {
    status: string;
    slot: { slotDatetime: string; type: string } | null;
    driver: { name: string; phone: string } | null;
  } | null;
  statusLogs: StatusLog[];
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

const STATUS_ORDER = [
  "pending",
  "confirmed",
  "processing",
  "sourcing",
  "arrived_warehouse",
  "shipped",
  "delivered",
];

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<"qpay" | "socialpay" | null>(null);

  useEffect(() => {
    if (!id) return;
    apiFetch<Order>(`/orders/${id}`).then((r) => {
      if (r.success) setOrder(r.data as unknown as Order);
      setLoading(false);
    });
  }, [id]);

  async function handlePay(provider: "qpay" | "socialpay") {
    if (!order) return;
    setPaying(provider);
    try {
      const r = await apiFetch<unknown>(`/payments/${provider}`, {
        method: "POST",
        body: JSON.stringify({ order_id: order.id }),
      });
      if (!r.success) throw new Error(r.error?.message ?? "Төлбөр үүсгэж чадсангүй");

      let url: string | undefined;
      if (provider === "qpay") {
        const pd = r.data as { qpay?: { urls?: { name: string; link: string }[] } };
        url = pd.qpay?.urls?.[0]?.link;
      } else {
        const pd = r.data as { socialpay?: { payment_url?: string } };
        url = pd.socialpay?.payment_url;
      }

      if (url) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Мэдэгдэл", "Төлбөр баталгаажлаа");
      }
    } catch (e) {
      Alert.alert("Алдаа", e instanceof Error ? e.message : "Алдаа гарлаа");
    } finally {
      setPaying(null);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }
  if (!order) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.mute }}>Захиалга олдсонгүй</Text>
      </View>
    );
  }

  const s = STATUS_MAP[order.status] ?? { label: order.status, color: colors.mute };
  const currentIdx = STATUS_ORDER.indexOf(order.status);
  const isPending = order.status === "pending";
  const isPaid = order.payment?.status === "paid";
  const slotDt = order.delivery?.slot?.slotDatetime
    ? new Date(order.delivery.slot.slotDatetime).toLocaleString("mn-MN", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header card */}
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <Text style={styles.orderNum}>{order.orderNumber}</Text>
          <Text style={styles.date}>
            {new Date(order.createdAt).toLocaleDateString("mn-MN")}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: s.color + "22" }]}>
          <View style={[styles.statusDot, { backgroundColor: s.color }]} />
          <Text style={[styles.statusLabel, { color: s.color }]}>{s.label}</Text>
        </View>
      </View>

      {/* Status timeline */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Статусын явц</Text>
        {STATUS_ORDER.map((st, i) => {
          const past = i < currentIdx;
          const active = i === currentIdx;
          const info = STATUS_MAP[st];
          return (
            <View key={st} style={styles.timelineRow}>
              <View style={styles.timelineLeft}>
                <View
                  style={[
                    styles.timelineDot,
                    past && styles.timelineDotDone,
                    active && styles.timelineDotActive,
                  ]}
                />
                {i < STATUS_ORDER.length - 1 && (
                  <View style={[styles.timelineLine, past && styles.timelineLineDone]} />
                )}
              </View>
              <Text
                style={[
                  styles.timelineLabel,
                  past && styles.timelineLabelDone,
                  active && { color: s.color, fontWeight: "700" },
                ]}
              >
                {info?.label ?? st}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Items */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Захиалсан барааг</Text>
        {order.items.map((item) => (
          <View key={item.id} style={styles.itemRow}>
            <Text style={styles.itemName} numberOfLines={1}>
              {item.product.titleMn}
            </Text>
            <Text style={styles.itemQty}>×{item.quantity}</Text>
            <Text style={styles.itemPrice}>
              {(Number(item.unitPriceMnt) * item.quantity).toLocaleString("en-US")}₮
            </Text>
          </View>
        ))}
      </View>

      {/* Delivery info */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Хүргэлтийн мэдээлэл</Text>
        <InfoRow
          label="Хэлбэр"
          value={order.deliveryType === "pickup" ? "Өөрөө авах" : "Хүргэлт"}
        />
        {slotDt && <InfoRow label="Цаг" value={slotDt} />}
        {order.delivery?.driver && (
          <>
            <InfoRow label="Жолооч" value={order.delivery.driver.name} />
            <TouchableOpacity
              onPress={() => Linking.openURL(`tel:${order.delivery!.driver!.phone}`)}
            >
              <Text style={styles.callDriver}>
                📞 {order.delivery.driver.phone} руу залгах
              </Text>
            </TouchableOpacity>
          </>
        )}
        {order.note && <InfoRow label="Тэмдэглэл" value={order.note} />}
      </View>

      {/* Payment */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Төлбөр</Text>
        <InfoRow
          label="Барааны дүн"
          value={`${Number(order.subtotalMnt).toLocaleString("en-US")}₮`}
        />
        <InfoRow
          label="Хүргэлт"
          value={
            order.deliveryFee ? `${order.deliveryFee.toLocaleString("en-US")}₮` : "Үнэгүй"
          }
        />
        <View style={[styles.infoRow, { marginTop: 4 }]}>
          <Text style={[styles.infoLabel, { fontWeight: "700", color: colors.ink }]}>
            Нийт дүн
          </Text>
          <Text style={[styles.infoValue, { fontWeight: "700", color: colors.accent }]}>
            {Number(order.totalMnt).toLocaleString("en-US")}₮
          </Text>
        </View>
        <InfoRow
          label="Төлбөрийн статус"
          value={isPaid ? "Төлөгдсөн ✓" : "Хүлээгдэж байна"}
        />
      </View>

      {/* Pay button */}
      {isPending && !isPaid && (
        <View style={styles.payRow}>
          <TouchableOpacity
            style={[styles.payBtn, { flex: 1 }, paying && styles.payBtnDisabled]}
            onPress={() => handlePay("qpay")}
            disabled={paying !== null}
          >
            {paying === "qpay" ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.payBtnText}>QPay</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.payBtn,
              styles.payBtnAlt,
              { flex: 1 },
              paying && styles.payBtnDisabled,
            ]}
            onPress={() => handlePay("socialpay")}
            disabled={paying !== null}
          >
            {paying === "socialpay" ? (
              <ActivityIndicator color={colors.accent} />
            ) : (
              <Text style={[styles.payBtnText, { color: colors.accent }]}>SocialPay</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      <View style={{ height: spacing["2xl"] }} />
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgCream },
  content: { padding: spacing.md, gap: spacing.sm },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  card: {
    backgroundColor: colors.bgPaper,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
    gap: 10,
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  orderNum: { fontSize: fontSize.lg, fontWeight: "700", color: colors.accent },
  date: { fontSize: fontSize.sm, color: colors.mute2 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusLabel: { fontSize: fontSize.sm, fontWeight: "600" },

  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: "700",
    color: colors.mute2,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 2,
  },

  timelineRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  timelineLeft: { alignItems: "center", width: 18 },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.line2,
    borderWidth: 1.5,
    borderColor: colors.line2,
    marginTop: 2,
  },
  timelineDotDone: { backgroundColor: colors.success, borderColor: colors.success },
  timelineDotActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 1,
  },
  timelineLine: { width: 2, height: 18, backgroundColor: colors.line2, marginTop: 2 },
  timelineLineDone: { backgroundColor: colors.success },
  timelineLabel: { fontSize: fontSize.sm, color: colors.mute2, paddingTop: 1, flex: 1 },
  timelineLabelDone: { color: colors.success },

  itemRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  itemName: { flex: 1, fontSize: fontSize.sm, color: colors.ink },
  itemQty: { fontSize: fontSize.sm, color: colors.mute2 },
  itemPrice: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.ink,
    fontVariant: ["tabular-nums"],
  },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  infoLabel: { fontSize: fontSize.sm, color: colors.mute, flex: 1 },
  infoValue: {
    fontSize: fontSize.sm,
    color: colors.ink,
    fontWeight: "500",
    flex: 2,
    textAlign: "right",
  },

  callDriver: {
    fontSize: fontSize.sm,
    color: colors.accent,
    fontWeight: "500",
    marginTop: 2,
  },

  payRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  payBtn: {
    height: 50,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  payBtnAlt: {
    backgroundColor: colors.accentSoft,
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  payBtnDisabled: { opacity: 0.6 },
  payBtnText: { color: "#fff", fontSize: fontSize.md, fontWeight: "700" },
});
