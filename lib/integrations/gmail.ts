import { OAuthAccount, TimeSlot } from '../types';
import { format } from 'date-fns';
import { refreshGoogleAccessToken } from './google-calendar';

async function ensureValidToken(account: OAuthAccount): Promise<string> {
  if (!account.access_token || !account.expires_at) {
    console.error('[Gmail] No access token or expires_at');
    throw new Error('No access token found');
  }

  const now = Date.now();
  const expiresAt = account.expires_at * 1000;

  if (now >= expiresAt - 60000) {
    if (!account.refresh_token) {
      console.error('[Gmail] Token expired and no refresh token');
      throw new Error('No refresh token available');
    }
    console.log('[Gmail] Refreshing access token');
    const tokenData = await refreshGoogleAccessToken(account.refresh_token);
    return tokenData.access_token;
  }

  return account.access_token;
}

/** True if string contains Hebrew (or RTL) characters */
function hasRtl(str: string): boolean {
  return /[\u0590-\u05FF\u0600-\u06FF]/.test(str);
}

/** Remove control chars and trim; keep subject clean for MIME */
function cleanSubject(subject: string): string {
  return subject
    .replace(/[\x00-\x1F\x7F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Encode subject for MIME (RFC 2047) so Hebrew/non-ASCII display correctly */
function encodeSubjectUtf8(subject: string): string {
  const cleaned = cleanSubject(subject);
  const needsEncoding = /[^\x20-\x7E]/.test(cleaned);
  if (!needsEncoding) return cleaned;
  const base64 = Buffer.from(cleaned, 'utf8').toString('base64');
  return `=?UTF-8?B?${base64}?=`;
}

function createEmailContent(params: {
  recipientEmail: string;
  recipientName: string;
  subject: string;
  message: string;
  proposedSlots: TimeSlot[];
}): string {
  const slotsHtml = params.proposedSlots
    .map((slot, index) => {
      const start = new Date(slot.start);
      const end = new Date(slot.end);
      const line = `${index + 1}. ${format(start, 'EEEE, MMMM d, yyyy')} at ${format(start, 'h:mm a')} – ${format(end, 'h:mm a')} ${slot.timezone || ''}`;
      return escapeHtml(line);
    })
    .join('<br>\n');

  const messageWithBreaks = params.message
    .split(/\r?\n/)
    .map((line) => escapeHtml(line.trim()))
    .filter(Boolean)
    .join('<br>\n');

  const rtl = hasRtl(params.message) || hasRtl(params.recipientName);
  const dir = rtl ? 'rtl' : 'ltr';

  return `<!DOCTYPE html>
<html lang="${rtl ? 'he' : 'en'}" dir="${dir}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #1a1a2e; margin: 0; padding: 24px; }
    p { margin: 0 0 1em 0; }
    .slots { margin: 16px 0; padding: 16px; background: #f7f8fa; border-radius: 8px; }
    .sign-off { margin-top: 24px; }
  </style>
</head>
<body dir="${dir}">
  <p>Hi ${escapeHtml(params.recipientName)},</p>
  <p>${messageWithBreaks || '&nbsp;'}</p>
  <p>Here are some time slots that work for me:</p>
  <div class="slots">${slotsHtml}</div>
  <p>Please let me know which time works best for you, and I'll send a calendar invite.</p>
  <p class="sign-off">Best regards</p>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function createRawEmail(
  to: string,
  from: string,
  subject: string,
  htmlBody: string
): string {
  const encodedSubject = encodeSubjectUtf8(subject);
  const email = [
    `To: ${to}`,
    `From: ${from}`,
    `Subject: ${encodedSubject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    '',
    htmlBody,
  ].join('\r\n');

  return Buffer.from(email, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function sendGmailMessage(
  account: OAuthAccount,
  params: {
    recipientEmail: string;
    recipientName: string;
    subject: string;
    message: string;
    proposedSlots: TimeSlot[];
  }
): Promise<string> {
  const accessToken = await ensureValidToken(account);

  const emailBody = createEmailContent(params);
  const raw = createRawEmail(
    params.recipientEmail,
    account.email || 'me',
    params.subject,
    emailBody
  );

  const response = await fetch(
    'https://www.googleapis.com/gmail/v1/users/me/messages/send',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send email: ${response.statusText} - ${error}`);
  }

  const data = await response.json();
  return data.threadId;
}

export interface GmailMessageSummary {
  id: string;
  threadId: string;
  snippet: string;
  subject: string;
  from: string;
  date: string;
}

export async function listGmailMessages(
  account: OAuthAccount,
  params: { maxResults?: number; query?: string } = {}
): Promise<GmailMessageSummary[]> {
  const accessToken = await ensureValidToken(account);
  const { maxResults = 20, query = '' } = params;
  const qs = new URLSearchParams({
    maxResults: String(maxResults),
    ...(query ? { q: query } : {}),
  });
  const listRes = await fetch(
    `https://www.googleapis.com/gmail/v1/users/me/messages?${qs}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  if (!listRes.ok) {
    const err = await listRes.text();
    console.error('[Gmail list_messages] API error', listRes.status, listRes.statusText, err);
    throw new Error(`Gmail list failed: ${listRes.statusText} - ${err}`);
  }
  const listData = await listRes.json();
  const messageIds: string[] = (listData.messages || []).map((m: { id: string }) => m.id);
  const results: GmailMessageSummary[] = [];
  for (const id of messageIds.slice(0, 20)) {
    try {
      const msgRes = await fetch(
        `https://www.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!msgRes.ok) continue;
      const msg = await msgRes.json();
      const headers = (msg.payload?.headers || []) as { name: string; value: string }[];
      const get = (name: string) => headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? '';
      results.push({
        id: msg.id,
        threadId: msg.threadId || '',
        snippet: msg.snippet || '',
        subject: get('Subject'),
        from: get('From'),
        date: get('Date'),
      });
    } catch {
      // skip single message fetch errors
    }
  }
  return results;
}
