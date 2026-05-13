import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { apiFetch } from "./api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerPushNotifications(): Promise<void> {
  // Expo push tokens only work on physical devices
  if (!Constants.isDevice) return;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") return;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "OmniFlow",
      importance: Notifications.AndroidImportance.MAX,
      sound: "default",
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  const { data: token } = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined
  );

  await apiFetch("/users/me/push-token", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

export function useNotificationListener(
  onNotification: (n: Notifications.Notification) => void
) {
  return Notifications.addNotificationReceivedListener(onNotification);
}

export function useNotificationResponseListener(
  onResponse: (r: Notifications.NotificationResponse) => void
) {
  return Notifications.addNotificationResponseReceivedListener(onResponse);
}
