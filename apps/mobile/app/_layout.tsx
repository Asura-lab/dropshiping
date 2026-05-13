import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { CartProvider } from "../lib/cart";
import { colors } from "@dropshipping/ui";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <CartProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.bgPaper },
            headerTintColor: colors.ink,
            headerTitleStyle: { fontWeight: "600", fontSize: 16 },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: colors.bgCream },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="products/[id]" options={{ title: "Бараа" }} />
          <Stack.Screen name="cart" options={{ title: "Сагс" }} />
          <Stack.Screen
            name="checkout/index"
            options={{ title: "Захиалах", headerBackTitle: "" }}
          />
          <Stack.Screen
            name="orders/[id]"
            options={{ title: "Захиалга", headerBackTitle: "" }}
          />
        </Stack>
      </CartProvider>
    </SafeAreaProvider>
  );
}
