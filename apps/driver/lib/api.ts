import { storage } from "./storage";

const BASE = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000/v1";

export async function apiFetch<T = unknown>(
  path: string,
  opts: RequestInit = {}
): Promise<{
  success: boolean;
  data: T;
  error?: { code: string; message: string };
}> {
  const token = await storage.get("access_token");
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers as Record<string, string> | undefined),
    },
  });
  return res.json() as Promise<{
    success: boolean;
    data: T;
    error?: { code: string; message: string };
  }>;
}

export async function logout(): Promise<void> {
  await storage.remove("access_token");
  await storage.remove("refresh_token");
  await storage.remove("user");
}
