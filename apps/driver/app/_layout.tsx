import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#fafaf8" },
          headerTintColor: "#1c1c1a",
          headerTitleStyle: { fontWeight: "600", fontSize: 16 },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: "#f5f4f0" },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen
          name="deliveries/index"
          options={{ title: "Өнөөдрийн хүргэлтүүд" }}
        />
        <Stack.Screen
          name="deliveries/[id]"
          options={{ title: "Хүргэлтийн дэлгэрэнгүй" }}
        />
      </Stack>
    </>
  );
}
