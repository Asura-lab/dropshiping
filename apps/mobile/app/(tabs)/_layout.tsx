import { useEffect } from "react";
import { Tabs } from "expo-router";
import { View, Text, StyleSheet } from "react-native";
import { useCart } from "../../lib/cart";
import { registerPushNotifications } from "../../lib/notifications";
import { colors } from "@dropshipping/ui";

function CartBadge() {
  const { itemCount } = useCart();
  if (itemCount === 0) return null;
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{itemCount > 9 ? "9+" : itemCount}</Text>
    </View>
  );
}

export default function TabLayout() {
  useEffect(() => {
    registerPushNotifications().catch(() => {});
  }, []);

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: colors.bgPaper,
          borderTopColor: colors.line,
          borderTopWidth: 1,
          height: 56,
          paddingBottom: 6,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.mute,
        tabBarLabelStyle: { fontSize: 10, fontWeight: "500" },
        headerStyle: { backgroundColor: colors.bgPaper },
        headerTintColor: colors.ink,
        headerTitleStyle: { fontWeight: "600", fontSize: 16 },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Бараа",
          tabBarIcon: ({ color }) => <TabIcon color={color} icon="shop" />,
          headerTitle: "OmniFlow",
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Захиалга",
          tabBarIcon: ({ color }) => <TabIcon color={color} icon="orders" />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Бүртгэл",
          tabBarIcon: ({ color }) => <TabIcon color={color} icon="account" />,
        }}
      />
    </Tabs>
  );
}

function TabIcon({
  color,
  icon,
}: {
  color: string;
  icon: "shop" | "orders" | "account";
}) {
  const paths: Record<string, string> = {
    shop: "M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z",
    orders:
      "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
    account: "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z",
  };
  // Simple colored square placeholder — replace with actual SVG icons when assets ready
  return (
    <View
      style={{ width: 22, height: 22, alignItems: "center", justifyContent: "center" }}
    >
      <View
        style={{
          width: 18,
          height: 18,
          borderRadius: 4,
          borderWidth: 1.5,
          borderColor: color,
          opacity: 0.9,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    top: -4,
    right: -8,
    backgroundColor: colors.accent,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
});
