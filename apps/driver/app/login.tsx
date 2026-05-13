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
} from "react-native";
import { useRouter } from "expo-router";
import { storage } from "../lib/storage";

const API = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000/v1";

export default function LoginScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      const data = await res.json();
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
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message ?? "Код буруу байна");
      const { access_token, refresh_token, user } = data.data as {
        access_token: string;
        refresh_token: string;
        user: { role: string };
      };
      if (user.role !== "driver" && user.role !== "admin") {
        throw new Error("Жолоочийн эрх байхгүй байна");
      }
      await storage.set("access_token", access_token);
      await storage.set("refresh_token", refresh_token);
      await storage.set("user", JSON.stringify(user));
      router.replace("/deliveries");
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
      <View style={styles.card}>
        <Text style={styles.brand}>OmniFlow</Text>
        <Text style={styles.title}>Жолоочийн нэвтрэх</Text>

        {step === "phone" ? (
          <>
            <Text style={styles.label}>Утасны дугаар</Text>
            <TextInput
              style={styles.input}
              placeholder="99001234"
              placeholderTextColor="#9a9a95"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              maxLength={12}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={sendOtp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fafaf8" />
              ) : (
                <Text style={styles.btnText}>OTP авах</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.hint}>{phone} дугаарт 4 оронтой код илгээлээ</Text>
            <Text style={styles.label}>Баталгаажуулах код</Text>
            <TextInput
              style={[styles.input, styles.otpInput]}
              placeholder="• • • •"
              placeholderTextColor="#9a9a95"
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
                <ActivityIndicator color="#fafaf8" />
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
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f4f0",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#fafaf8",
    borderRadius: 12,
    padding: 28,
    borderWidth: 1,
    borderColor: "#e2dfd8",
  },
  brand: {
    fontSize: 10,
    letterSpacing: 1.5,
    color: "#9a9a95",
    textTransform: "uppercase",
    textAlign: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1c1c1a",
    textAlign: "center",
    marginBottom: 24,
  },
  hint: {
    fontSize: 13,
    color: "#6b6b67",
    textAlign: "center",
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    color: "#6b6b67",
    marginBottom: 6,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: "#e2dfd8",
    borderRadius: 6,
    paddingHorizontal: 12,
    fontSize: 15,
    color: "#1c1c1a",
    backgroundColor: "#fafaf8",
    marginBottom: 14,
  },
  otpInput: {
    fontSize: 22,
    textAlign: "center",
    letterSpacing: 8,
  },
  error: {
    fontSize: 12,
    color: "#dc2626",
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
  },
  btn: {
    height: 46,
    backgroundColor: "#b84a30",
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fafaf8", fontSize: 15, fontWeight: "600" },
  backBtn: { marginTop: 14, alignItems: "center" },
  backText: { fontSize: 13, color: "#6b6b67" },
});
