/**
 * NURA – Decide if an email is "important" for push notifications.
 * Uses: specific clients (from), keywords (deadline, urgent, invoice, meeting), and LLM (meeting_request, urgent).
 */

import { classifyEmailWithLLM } from '@/lib/nura-pulse';

const IMPORTANT_KEYWORDS = [
  'invoice',
  'urgent',
  'meeting',
  'deadline',
  'asap',
  'important',
  'action required',
  'reply requested',
  'confirm',
  'approval',
  'signed',
  'contract',
];

function keywordMatch(subject: string, snippet: string): boolean {
  const text = `${(subject || '').toLowerCase()} ${(snippet || '').toLowerCase()}`;
  return IMPORTANT_KEYWORDS.some((kw) => text.includes(kw));
}

/** Parse email address from "Name <email>" or return full string lowercased. */
function extractEmail(from: string): string {
  const s = (from || '').trim();
  const match = s.match(/<([^>]+)>/);
  return (match ? match[1] : s).toLowerCase().trim();
}

/** Check if sender is in IMPORTANT_SENDER_EMAILS or IMPORTANT_SENDER_DOMAINS (comma-separated env). */
function isFromImportantSender(from: string): boolean {
  const email = extractEmail(from);
  const domain = email.includes('@') ? email.split('@')[1] : '';
  const emails = (process.env.IMPORTANT_SENDER_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  const domains = (process.env.IMPORTANT_SENDER_DOMAINS || '').split(',').map((d) => d.trim().toLowerCase()).filter(Boolean);
  if (emails.some((e) => email === e)) return true;
  if (domain && domains.some((d) => domain === d || domain.endsWith('.' + d))) return true;
  return false;
}

/**
 * Returns true if the email should trigger a push: from a specific client, mentions deadlines/urgent, or keywords.
 * Uses: important sender list (env), keyword check, then LLM for meeting_request / urgent.
 */
export async function isImportantEmail(
  subject: string,
  snippet: string,
  options?: { from?: string }
): Promise<boolean> {
  if (options?.from && isFromImportantSender(options.from)) return true;
  if (keywordMatch(subject, snippet)) return true;
  const result = await classifyEmailWithLLM(subject, snippet);
  return result.type === 'meeting_request' || result.type === 'urgent';
}

/** Parse sender display name from "Name <email>" or return full string. */
export function senderDisplayName(from: string): string {
  const s = (from || '').trim();
  const lt = s.indexOf('<');
  if (lt > 0) return s.slice(0, lt).replace(/^["']|["']$/g, '').trim();
  return s || 'Unknown';
}
