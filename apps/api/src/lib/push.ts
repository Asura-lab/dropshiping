const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default";
  badge?: number;
}

export async function sendPush(messages: PushMessage | PushMessage[]): Promise<void> {
  const payload = Array.isArray(messages) ? messages : [messages];
  const validTokens = payload.filter((m) => m.to.startsWith("ExponentPushToken["));
  if (validTokens.length === 0) return;

  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(validTokens),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error(`[Push] Expo API error ${res.status}: ${text}`);
    }
  } catch (err) {
    console.error("[Push] Failed to send:", err);
  }
}

export async function sendPushToToken(
  token: string | null | undefined,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  if (!token) return;
  await sendPush({ to: token, title, body, data, sound: "default" });
}
