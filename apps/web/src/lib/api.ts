const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

export async function apiFetch<T = unknown>(
  path: string,
  opts: RequestInit = {}
): Promise<{
  success: boolean;
  data: T;
  meta?: unknown;
  error?: { code: string; message: string };
}> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers as Record<string, string> | undefined),
    },
  });
  return res.json();
}

export function getUser(): {
  id: string;
  name: string;
  phone: string;
  role: string;
} | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function logout() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("user");
}
