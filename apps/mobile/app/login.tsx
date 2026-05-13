import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { storage } from "../lib/storage";
import { colors, spacing, radius, fontSize } from "@dropshipping/ui";

const API = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000/v1";

export default function LoginScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [step, setStep] = useState<"phone" | "otp" | "name">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isNew, setIsNew] = useState(false);

  async function sendOtp() {
    if (phone.length < 8) {
      setError("Утасны дугаар буруу байна");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = (await res.json()) as {
        success: boolean;
        error?: { message: string };
      };
      if (!data.success) throw new Error(data.error?.message ?? "OTP илгээж чадсангүй");
      setStep("otp");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Алдаа гарлаа");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    if (code.length !== 4) {
      setError("4 оронтой код оруулна уу");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp: code }),
      });
      const data = (await res.json()) as {
        success: boolean;
        data: {
          access_token: string;
          refresh_token: string;
          user: { name: string | null; role: string };
          is_new: boolean;
        };
        error?: { message: string };
      };
      if (!data.success) throw new Error(data.error?.message ?? "Код буруу байна");

      await storage.set("access_token", data.data.access_token);
      await storage.set("refresh_token", data.data.refresh_token);
      await storage.set("user", JSON.stringify(data.data.user));

      if (data.data.is_new || !data.data.user.name) {
        setIsNew(true);
        setStep("name");
      } else {
        router.replace("/(tabs)");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Алдаа гарлаа");
    } finally {
      setLoading(false);
    }
  }

  async function saveName() {
    if (!name.trim()) {
      setError("Нэрээ оруулна уу");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const token = await storage.get("access_token");
      const res = await fetch(`${API}/users/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = (await res.json()) as {
        success: boolean;
        error?: { message: string };
      };
      if (!data.success) throw new Error(data.error?.message);
      router.replace("/(tabs)");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Алдаа гарлаа");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.brand}>OmniFlow</Text>
          <Text style={styles.title}>
            {step === "name" ? "Нэрээ оруулна уу" : "Нэвтрэх"}
          </Text>

          {step === "phone" && (
            <>
              <Text style={styles.label}>Утасны дугаар</Text>
              <TextInput
                style={styles.input}
                placeholder="99001234"
                placeholderTextColor={colors.mute2}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                maxLength={12}
                autoFocus
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <TouchableOpacity
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={sendOtp}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.bgPaper} />
                ) : (
                  <Text style={styles.btnText}>OTP авах</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {step === "otp" && (
            <>
              <Text style={styles.hint}>{phone} дугаарт 4 оронтой код илгээлээ</Text>
              <Text style={styles.label}>Баталгаажуулах код</Text>
              <TextInput
                style={[styles.input, styles.otpInput]}
                placeholder="· · · ·"
                placeholderTextColor={colors.mute2}
                keyboardType="number-pad"
                value={code}
                onChangeText={setCode}
                maxLength={4}
                autoFocus
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <TouchableOpacity
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={verifyOtp}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.bgPaper} />
                ) : (
                  <Text style={styles.btnText}>Нэвтрэх</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setStep("phone");
                  setCode("");
                  setError("");
                }}
                style={styles.backBtn}
              >
                <Text style={styles.backText}>← Утас өөрчлөх</Text>
              </TouchableOpacity>
            </>
          )}

          {step === "name" && (
            <>
              <Text style={styles.hint}>Таныг хэрхэн дуудах вэ?</Text>
              <Text style={styles.label}>Нэр</Text>
              <TextInput
                style={styles.input}
                placeholder="Дорж"
                placeholderTextColor={colors.mute2}
                value={name}
                onChangeText={setName}
                autoFocus
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <TouchableOpacity
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={saveName}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.bgPaper} />
                ) : (
                  <Text style={styles.btnText}>Үргэлжлүүлэх</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgCream },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing["2xl"],
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: colors.bgPaper,
    borderRadius: radius.xl,
    padding: 28,
    borderWidth: 1,
    borderColor: colors.line,
  },
  brand: {
    fontSize: fontSize.xs,
    letterSpacing: 1.5,
    color: colors.mute2,
    textTransform: "uppercase",
    textAlign: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.ink,
    textAlign: "center",
    marginBottom: 24,
  },
  hint: {
    fontSize: fontSize.base,
    color: colors.mute,
    textAlign: "center",
    marginBottom: 16,
  },
  label: { fontSize: fontSize.sm, color: colors.mute, marginBottom: 6 },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: 15,
    color: colors.ink,
    backgroundColor: colors.bgPaper,
    marginBottom: 14,
  },
  otpInput: { fontSize: 24, textAlign: "center", letterSpacing: 10 },
  error: {
    fontSize: fontSize.sm,
    color: colors.error,
    backgroundColor: colors.errorBg,
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    marginBottom: spacing.md,
  },
  btn: {
    height: 46,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: colors.bgPaper, fontSize: 15, fontWeight: "600" },
  backBtn: { marginTop: 14, alignItems: "center" },
  backText: { fontSize: fontSize.base, color: colors.mute },
});
