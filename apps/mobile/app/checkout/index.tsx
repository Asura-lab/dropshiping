import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Linking,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { apiFetch } from "../../lib/api";
import { useCart } from "../../lib/cart";
import { colors, spacing, radius, fontSize } from "@dropshipping/ui";

interface Slot {
  id: string;
  type: "pickup" | "delivery";
  slotDatetime: string;
  capacity: number;
  bookedCount: number;
}

interface Address {
  id: string;
  label: string;
  street: string;
  district: string;
}

type Step = "delivery" | "slot" | "confirm";
type DeliveryType = "pickup" | "delivery";

export default function CheckoutScreen() {
  const router = useRouter();
  const { items, total, clearCart } = useCart();

  const [step, setStep] = useState<Step>("delivery");
  const [deliveryType, setDeliveryType] = useState<DeliveryType>("pickup");

  // Slot
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  // Address (for delivery)
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [newDuureg, setNewDuureg] = useState("");
  const [newKhoroo, setNewKhoroo] = useState("");
  const [newGudamj, setNewGudamj] = useState("");

  // Confirm / Payment
  const [submitting, setSubmitting] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [qpayUrls, setQpayUrls] = useState<{ name: string; link: string }[]>([]);
  const [socialPayUrl, setSocialPayUrl] = useState<string | null>(null);
  const [payLoading, setPayLoading] = useState<"qpay" | "socialpay" | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (step === "slot") loadSlots();
  }, [step, deliveryType]);

  async function loadSlots() {
    setSlotsLoading(true);
    const r = await apiFetch<{ data: Slot[] }>("/delivery-slots?active=true");
    if (r.success) {
      const all = (r.data as unknown as { data: Slot[] }).data ?? [];
      setSlots(all.filter((s) => s.type === deliveryType && s.bookedCount < s.capacity));
    }
    setSlotsLoading(false);
  }

  async function submitOrder() {
    if (!selectedSlot) return;
    if (deliveryType === "delivery" && !selectedAddress && !newDuureg.trim()) {
      setError("Хүргэлтийн хаяг оруулна уу");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      // If new address provided, create it first
      let addrId = selectedAddress;
      if (deliveryType === "delivery" && newDuureg.trim() && !addrId) {
        const ar = await apiFetch<{ id: string }>("/users/me/addresses", {
          method: "POST",
          body: JSON.stringify({
            duureg: newDuureg.trim(),
            khoroo: newKhoroo.trim() || "1-р хороо",
            gudamj: newGudamj.trim() || null,
          }),
        });
        if (!ar.success) throw new Error("Хаяг хадгалж чадсангүй");
        addrId = (ar.data as unknown as { id: string }).id;
      }

      const body: Record<string, unknown> = {
        delivery_type: deliveryType,
        slot_id: selectedSlot,
        items: items.map((i) => ({ product_id: i.productId, quantity: i.quantity })),
      };
      if (note.trim()) body.note = note.trim();
      if (deliveryType === "delivery" && addrId) body.address_id = addrId;

      const r = await apiFetch<{ id: string }>("/orders", {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!r.success) throw new Error(r.error?.message ?? "Захиалга үүсгэж чадсангүй");

      const oid = (r.data as unknown as { id: string }).id;
      setOrderId(oid);
      // Payment provider buttons will be shown — user picks QPay or SocialPay
    } catch (e) {
      setError(e instanceof Error ? e.message : "Алдаа гарлаа");
    } finally {
      setSubmitting(false);
    }
  }

  async function payWithQpay() {
    if (!orderId) return;
    setPayLoading("qpay");
    try {
      const pr = await apiFetch<unknown>("/payments/qpay", {
        method: "POST",
        body: JSON.stringify({ order_id: orderId }),
      });
      if (!pr.success) throw new Error(pr.error?.message ?? "QPay алдаа");
      const pd = pr.data as { qpay?: { urls?: { name: string; link: string }[] } };
      const urls = pd.qpay?.urls ?? [];
      setQpayUrls(urls);
      if (urls[0]) await Linking.openURL(urls[0].link);
    } catch (e) {
      Alert.alert("Алдаа", e instanceof Error ? e.message : "QPay нээж чадсангүй");
    } finally {
      setPayLoading(null);
    }
  }

  async function payWithSocialPay() {
    if (!orderId) return;
    setPayLoading("socialpay");
    try {
      const pr = await apiFetch<unknown>("/payments/socialpay", {
        method: "POST",
        body: JSON.stringify({ order_id: orderId }),
      });
      if (!pr.success) throw new Error(pr.error?.message ?? "SocialPay алдаа");
      const pd = pr.data as { socialpay?: { payment_url?: string } };
      const url = pd.socialpay?.payment_url;
      if (url) {
        setSocialPayUrl(url);
        await Linking.openURL(url);
      }
    } catch (e) {
      Alert.alert("Алдаа", e instanceof Error ? e.message : "SocialPay нээж чадсангүй");
    } finally {
      setPayLoading(null);
    }
  }

  function handleDone() {
    clearCart();
    router.replace("/(tabs)/orders");
  }

  // ── Step 1: Delivery type ──────────────────────────────────────
  if (step === "delivery") {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.stepTitle}>Хүргэлтийн хэлбэр</Text>

          <TouchableOpacity
            style={[
              styles.optionCard,
              deliveryType === "pickup" && styles.optionCardActive,
            ]}
            onPress={() => setDeliveryType("pickup")}
          >
            <Text style={styles.optionIcon}>🏪</Text>
            <View style={styles.optionBody}>
              <Text
                style={[
                  styles.optionTitle,
                  deliveryType === "pickup" && styles.optionTitleActive,
                ]}
              >
                Өөрөө авах
              </Text>
              <Text style={styles.optionSub}>Агуулахаас шууд авах · Үнэгүй</Text>
            </View>
            <View
              style={[styles.radio, deliveryType === "pickup" && styles.radioActive]}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.optionCard,
              deliveryType === "delivery" && styles.optionCardActive,
            ]}
            onPress={() => setDeliveryType("delivery")}
          >
            <Text style={styles.optionIcon}>🚚</Text>
            <View style={styles.optionBody}>
              <Text
                style={[
                  styles.optionTitle,
                  deliveryType === "delivery" && styles.optionTitleActive,
                ]}
              >
                Хүргэлт
              </Text>
              <Text style={styles.optionSub}>Хаяг руу хүргэх · +3,000₮</Text>
            </View>
            <View
              style={[styles.radio, deliveryType === "delivery" && styles.radioActive]}
            />
          </TouchableOpacity>
        </ScrollView>
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.nextBtn} onPress={() => setStep("slot")}>
            <Text style={styles.nextBtnText}>Үргэлжлүүлэх</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Step 2: Slot + address ─────────────────────────────────────
  if (step === "slot") {
    const fee = deliveryType === "delivery" ? 3000 : 0;
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.stepTitle}>Цаг сонгох</Text>

          {slotsLoading ? (
            <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
          ) : slots.length === 0 ? (
            <Text style={styles.noSlots}>Боломжит цаг байхгүй байна</Text>
          ) : (
            slots.map((s) => {
              const dt = new Date(s.slotDatetime);
              const label = dt.toLocaleString("mn-MN", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });
              const available = s.capacity - s.bookedCount;
              return (
                <TouchableOpacity
                  key={s.id}
                  style={[
                    styles.slotCard,
                    selectedSlot === s.id && styles.slotCardActive,
                  ]}
                  onPress={() => setSelectedSlot(s.id)}
                >
                  <View style={styles.slotLeft}>
                    <Text
                      style={[
                        styles.slotDate,
                        selectedSlot === s.id && styles.slotDateActive,
                      ]}
                    >
                      {label}
                    </Text>
                    <Text style={styles.slotAvail}>{available} цаг үлдсэн</Text>
                  </View>
                  <View
                    style={[styles.radio, selectedSlot === s.id && styles.radioActive]}
                  />
                </TouchableOpacity>
              );
            })
          )}

          {deliveryType === "delivery" && (
            <>
              <Text style={[styles.stepTitle, { marginTop: spacing["2xl"] }]}>
                Хүргэлтийн хаяг
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Дүүрэг (жишээ: Сүхбаатар дүүрэг) *"
                placeholderTextColor={colors.mute2}
                value={newDuureg}
                onChangeText={setNewDuureg}
              />
              <TextInput
                style={styles.input}
                placeholder="Хороо (жишээ: 8-р хороо) *"
                placeholderTextColor={colors.mute2}
                value={newKhoroo}
                onChangeText={setNewKhoroo}
              />
              <TextInput
                style={styles.input}
                placeholder="Гудамж, байр, тоот (нэмэлт)"
                placeholderTextColor={colors.mute2}
                value={newGudamj}
                onChangeText={setNewGudamj}
              />
            </>
          )}

          <Text style={styles.stepTitle}>Нэмэлт тэмдэглэл</Text>
          <TextInput
            style={styles.input}
            placeholder="Жишээ: давхар 3, зүүн үүд…"
            placeholderTextColor={colors.mute2}
            value={note}
            onChangeText={setNote}
          />

          {/* Summary */}
          <View style={styles.summary}>
            <Row label="Барааны дүн" value={`${total.toLocaleString("en-US")}₮`} />
            <Row
              label="Хүргэлтийн төлбөр"
              value={fee ? `${fee.toLocaleString("en-US")}₮` : "Үнэгүй"}
            />
            <Row label="Нийт" value={`${(total + fee).toLocaleString("en-US")}₮`} bold />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setStep("delivery")}>
            <Text style={styles.backBtnText}>← Буцах</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.nextBtn,
              { flex: 1 },
              (!selectedSlot || submitting) && styles.nextBtnDisabled,
            ]}
            onPress={async () => {
              setStep("confirm");
              await submitOrder();
            }}
            disabled={!selectedSlot || submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.nextBtnText}>Захиалах</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Step 3: Confirm + QPay ─────────────────────────────────────
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {submitting ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.accent} size="large" />
            <Text style={styles.loadingText}>Захиалга үүсгэж байна…</Text>
          </View>
        ) : error ? (
          <>
            <Text style={styles.errorLarge}>{error}</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => {
                setStep("slot");
                setError("");
              }}
            >
              <Text style={styles.retryBtnText}>Дахин оролдох</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.successIcon}>
              <Text style={{ fontSize: 48 }}>✅</Text>
            </View>
            <Text style={styles.successTitle}>Захиалга үүслээ!</Text>
            <Text style={styles.successSub}>Төлбөрийн хэрэгслээ сонгоно уу</Text>

            <View style={styles.payList}>
              <TouchableOpacity
                style={[styles.payBtn, payLoading === "qpay" && styles.payBtnDisabled]}
                onPress={payWithQpay}
                disabled={payLoading !== null}
              >
                {payLoading === "qpay" ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.payBtnText}>QPay-аар төлөх</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.payBtn,
                  styles.payBtnSecondary,
                  payLoading === "socialpay" && styles.payBtnDisabled,
                ]}
                onPress={payWithSocialPay}
                disabled={payLoading !== null}
              >
                {payLoading === "socialpay" ? (
                  <ActivityIndicator color={colors.accent} />
                ) : (
                  <Text style={[styles.payBtnText, { color: colors.accent }]}>
                    SocialPay-аар төлөх
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.doneBtn} onPress={handleDone}>
              <Text style={styles.doneBtnText}>Дараа төлөх → Захиалга харах</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <Text
        style={[styles.summaryLabel, bold && { fontWeight: "700", color: colors.ink }]}
      >
        {label}
      </Text>
      <Text
        style={[styles.summaryValue, bold && { fontWeight: "700", color: colors.accent }]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgCream },
  content: { padding: spacing["2xl"], gap: spacing.md, paddingBottom: 120 },
  stepTitle: {
    fontSize: fontSize.md,
    fontWeight: "700",
    color: colors.ink2,
    marginBottom: 4,
  },

  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.bgPaper,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.line,
    padding: spacing.md,
  },
  optionCardActive: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  optionIcon: { fontSize: 28 },
  optionBody: { flex: 1, gap: 2 },
  optionTitle: { fontSize: fontSize.md, fontWeight: "600", color: colors.ink },
  optionTitleActive: { color: colors.accent },
  optionSub: { fontSize: fontSize.sm, color: colors.mute },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.line2,
  },
  radioActive: { borderColor: colors.accent, backgroundColor: colors.accent },

  slotCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bgPaper,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.line,
    padding: spacing.md,
  },
  slotCardActive: { borderColor: colors.accent },
  slotLeft: { flex: 1 },
  slotDate: { fontSize: fontSize.md, fontWeight: "600", color: colors.ink },
  slotDateActive: { color: colors.accent },
  slotAvail: { fontSize: fontSize.sm, color: colors.mute, marginTop: 2 },
  noSlots: {
    textAlign: "center",
    color: colors.mute,
    fontSize: fontSize.base,
    marginTop: 40,
  },

  input: {
    backgroundColor: colors.bgPaper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: fontSize.base,
    color: colors.ink,
    minHeight: 44,
  },

  summary: {
    backgroundColor: colors.bgPaper,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
    gap: 6,
    marginTop: 8,
  },
  summaryRow: { flexDirection: "row", justifyContent: "space-between" },
  summaryLabel: { fontSize: fontSize.base, color: colors.mute },
  summaryValue: {
    fontSize: fontSize.base,
    color: colors.ink,
    fontVariant: ["tabular-nums"],
  },

  error: {
    fontSize: fontSize.sm,
    color: colors.error,
    backgroundColor: colors.errorBg,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  errorLarge: {
    fontSize: fontSize.lg,
    color: colors.error,
    textAlign: "center",
    marginTop: 40,
  },

  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
    paddingBottom: spacing.lg,
    backgroundColor: colors.bgPaper,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  backBtn: {
    height: 50,
    paddingHorizontal: spacing.lg,
    justifyContent: "center",
    alignItems: "center",
  },
  backBtnText: { fontSize: fontSize.md, color: colors.mute },
  nextBtn: {
    height: 50,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  nextBtnDisabled: { backgroundColor: colors.mute2 },
  nextBtnText: { color: "#fff", fontSize: fontSize.md, fontWeight: "700" },

  loadingBox: { alignItems: "center", gap: spacing.md, marginTop: 60 },
  loadingText: { fontSize: fontSize.base, color: colors.mute },
  successIcon: { alignItems: "center", marginTop: 40, marginBottom: spacing.md },
  successTitle: {
    fontSize: fontSize["2xl"],
    fontWeight: "700",
    color: colors.ink,
    textAlign: "center",
  },
  successSub: { fontSize: fontSize.base, color: colors.mute, textAlign: "center" },
  payList: { gap: spacing.sm, marginTop: spacing.lg },
  payBtn: {
    height: 50,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  payBtnSecondary: {
    backgroundColor: colors.accentSoft,
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  payBtnDisabled: { opacity: 0.6 },
  payBtnText: { color: "#fff", fontSize: fontSize.md, fontWeight: "600" },
  retryBtn: {
    alignSelf: "center",
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  retryBtnText: { fontSize: fontSize.md, color: colors.accent },
  doneBtn: {
    height: 46,
    borderWidth: 1.5,
    borderColor: colors.line2,
    borderRadius: radius.md,
    justifyContent: "center",
    alignItems: "center",
    marginTop: spacing.md,
  },
  doneBtnText: { fontSize: fontSize.sm, color: colors.mute, fontWeight: "500" },
});
