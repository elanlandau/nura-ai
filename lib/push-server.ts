import webpush from 'web-push';
import { prisma } from '@/lib/db';

let vapidSet = false;

function setVapidOnce() {
  if (vapidSet) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (publicKey && privateKey) {
    webpush.setVapidDetails(
      process.env.NEXT_PUBLIC_APP_URL || 'https://nurapersonal.com',
      publicKey,
      privateKey
    );
    vapidSet = true;
  }
}

export interface PushPayload {
  title?: string;
  body?: string;
  url?: string;
  tag?: string;
}

/**
 * Send a push notification to all subscriptions for a user (e.g. when tab is closed).
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<{ sent: number; failed: number }> {
  setVapidOnce();
  if (!process.env.VAPID_PRIVATE_KEY) return { sent: 0, failed: 0 };

  const subs = await prisma.pushSubscription.findMany({
    where: { user_id: userId },
  });
  if (subs.length === 0) return { sent: 0, failed: 0 };

  const body = JSON.stringify({
    title: payload.title ?? 'NURA',
    body: payload.body ?? '',
    url: payload.url ?? '/chat',
    tag: payload.tag ?? 'nura-default',
  });

  let sent = 0;
  let failed = 0;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        body
      );
      sent++;
    } catch (e) {
      failed++;
      // Remove invalid subscriptions (410 Gone, 404 Not Found)
      const status = (e as { statusCode?: number })?.statusCode;
      if (status === 410 || status === 404) {
        await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
      }
    }
  }
  return { sent, failed };
}
