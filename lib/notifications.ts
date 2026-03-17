/**
 * NURA – Web Push (Pop) helpers
 * Permission, local notifications, service worker registration, push subscription.
 */

const SW_URL = '/sw.js';

export type PermissionState = 'default' | 'granted' | 'denied';

export function isSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
}

export function permissionState(): PermissionState {
  if (!isSupported()) return 'denied';
  return Notification.permission as PermissionState;
}

export async function requestPermission(): Promise<PermissionState> {
  if (!isSupported()) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  const result = await Notification.requestPermission();
  return result as PermissionState;
}

/** Show a local notification (works when tab is open). */
export async function showLocalNotification(title: string, options?: { body?: string; tag?: string }): Promise<void> {
  if (!isSupported()) return;
  const perm = await requestPermission();
  if (perm !== 'granted') return;
  const opts: NotificationOptions = {
    body: options?.body ?? '',
    tag: options?.tag ?? 'nura-local',
  };
  new Notification(title, opts);
}

/** Register the service worker for push (background) notifications. */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.register(SW_URL, { scope: '/' });
    await reg.update();
    return reg;
  } catch {
    return null;
  }
}

/** Subscribe for push (needs VAPID public key). Call after permission granted and SW registered. */
export async function subscribePush(vapidPublicKey: string): Promise<PushSubscription | null> {
  if (!isSupported() || !vapidPublicKey) return null;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as unknown as BufferSource,
    });
    return sub;
  } catch {
    return null;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i);
  return output;
}

/** Serialize subscription for sending to API. */
export function serializeSubscription(sub: PushSubscription): { endpoint: string; keys: { p256dh: string; auth: string } } {
  const keys = sub.getKey('p256dh');
  const auth = sub.getKey('auth');
  return {
    endpoint: sub.endpoint,
    keys: {
      p256dh: keys ? arrayBufferToBase64(keys) : '',
      auth: auth ? arrayBufferToBase64(auth) : '',
    },
  };
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

/** Next.js inlines NEXT_PUBLIC_* at build time in the client bundle. */
export function getVapidPublicKey(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? undefined;
}

/** Subscribe for push and save to backend so Nura can send when tab is closed. */
export async function subscribeAndSave(userId: string): Promise<boolean> {
  const vapid = getVapidPublicKey();
  if (!vapid) return false;
  const sub = await subscribePush(vapid);
  if (!sub) return false;
  const payload = serializeSubscription(sub);
  try {
    const res = await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, subscription: payload }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
