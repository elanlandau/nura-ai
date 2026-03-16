/**
 * WhatsApp integration placeholder. When WhatsApp is connected, incoming messages
 * can be passed here; urgent messages will trigger a push notification.
 */

import { sendPushToUser } from '@/lib/push-server';

export interface WhatsAppMessagePayload {
  userId: string;
  from?: string;
  body: string;
  isUrgent?: boolean;
}

/**
 * Placeholder: call this when we receive a WhatsApp message. When WhatsApp is connected,
 * use it to send a push for urgent messages so Nura can "talk" outside the chat box.
 */
export async function onWhatsAppMessage(payload: WhatsAppMessagePayload): Promise<void> {
  const { userId, from, body, isUrgent } = payload;
  if (!isUrgent) return;
  const title = 'NURA – WhatsApp';
  const message = from ? `${from}: ${body}` : body;
  await sendPushToUser(userId, {
    title,
    body: message.slice(0, 200),
    url: '/inbox',
    tag: 'whatsapp-urgent',
  });
}
