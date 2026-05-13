/**
 * Offline queue for driver status updates.
 * When a PATCH fails due to network error, the update is stored locally
 * and retried on the next sync (app foreground or manual refresh).
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const QUEUE_KEY = "driver_offline_queue_v1";

export interface QueuedUpdate {
  id: string;
  deliveryId: string;
  status: "en_route" | "delivered" | "failed";
  note?: string;
  createdAt: string;
}

async function readQueue(): Promise<QueuedUpdate[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueuedUpdate[]) : [];
  } catch {
    return [];
  }
}

async function writeQueue(queue: QueuedUpdate[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function enqueueUpdate(
  update: Omit<QueuedUpdate, "id" | "createdAt">
): Promise<void> {
  const queue = await readQueue();
  // Replace any existing queued update for the same delivery
  const filtered = queue.filter((q) => q.deliveryId !== update.deliveryId);
  filtered.push({
    ...update,
    id: `${update.deliveryId}_${Date.now()}`,
    createdAt: new Date().toISOString(),
  });
  await writeQueue(filtered);
}

export async function flushQueue(
  apiFetch: (path: string, opts?: RequestInit) => Promise<{ success: boolean }>
): Promise<{ synced: number; failed: number }> {
  const queue = await readQueue();
  if (queue.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;
  const remaining: QueuedUpdate[] = [];

  for (const item of queue) {
    try {
      const r = await apiFetch(`/driver/deliveries/${item.deliveryId}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status: item.status,
          ...(item.note ? { note: item.note } : {}),
        }),
      });
      if (r.success) {
        synced++;
      } else {
        failed++;
        remaining.push(item);
      }
    } catch {
      // Still no connectivity — keep in queue
      failed++;
      remaining.push(item);
    }
  }

  await writeQueue(remaining);
  return { synced, failed };
}

export async function getPendingCount(): Promise<number> {
  const queue = await readQueue();
  return queue.length;
}
