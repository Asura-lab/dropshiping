import { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { getStoredUser, logout } from "../../lib/api";
import { colors, spacing, radius, fontSize } from "@dropshipping/ui";

interface User {
  id: string;
  name: string;
  phone: string;
  role: string;
}

export default function AccountTab() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    getStoredUser().then(setUser);
  }, []);

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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Avatar */}
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {user?.name?.charAt(0).toUpperCase() ?? "?"}
        </Text>
      </View>
      <Text style={styles.name}>{user?.name ?? "Хэрэглэгч"}</Text>
      <Text style={styles.phone}>{user?.phone}</Text>

      {/* Menu */}
      <View style={styles.menu}>
        <MenuItem
          label="Захиалгуудаа харах"
          onPress={() => router.push("/(tabs)/orders")}
        />
        <MenuItem label="Хүргэлтийн хаягууд" onPress={() => {}} />
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Гарах</Text>
      </TouchableOpacity>

      <Text style={styles.version}>OmniFlow v1.0.0</Text>
    </ScrollView>
  );
}

function MenuItem({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.menuLabel}>{label}</Text>
      <Text style={{ color: colors.mute2, fontSize: 16 }}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgCream },
  content: {
    alignItems: "center",
    padding: spacing["2xl"],
    paddingTop: 40,
    gap: spacing.md,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.accentSoft,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  avatarText: { fontSize: 28, fontWeight: "700", color: colors.accent },
  name: { fontSize: 20, fontWeight: "700", color: colors.ink },
  phone: { fontSize: fontSize.base, color: colors.mute, marginBottom: 8 },
  menu: {
    width: "100%",
    backgroundColor: colors.bgPaper,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  menuLabel: { fontSize: fontSize.md, color: colors.ink },
  logoutBtn: {
    marginTop: spacing.lg,
    width: "100%",
    height: 46,
    backgroundColor: colors.bgPaper,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    justifyContent: "center",
    alignItems: "center",
  },
  logoutText: { fontSize: fontSize.md, color: colors.error, fontWeight: "500" },
  version: { fontSize: fontSize.sm, color: colors.mute2, marginTop: spacing.sm },
});
