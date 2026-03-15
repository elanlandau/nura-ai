/**
 * NURA Pulse: classify emails as meeting request, urgent, or neither.
 * Uses an LLM for intelligent classification based on subject and body.
 */

import { Configuration, OpenAIApi } from 'openai-edge';

export type NotificationType = 'meeting_request' | 'urgent' | null;

export interface ClassifyResult {
  type: NotificationType;
  reason?: string;
}

const systemPrompt = `You classify emails for a personal assistant. Given the email subject and a short snippet (preview), respond with exactly one of: meeting_request | urgent | none.

- meeting_request: The email is asking to schedule a meeting, call, or calendar event; or confirms/cancels one; or discusses availability.
- urgent: The email needs a quick response, has a deadline, is marked important/ASAP, or the sender explicitly asks for prompt action.
- none: Does not clearly fit the above (newsletters, marketing, general updates, or low-priority).

Respond in JSON only: {"type":"meeting_request"|"urgent"|"none","reason":"one short phrase"}`;

export async function classifyEmailWithLLM(
  subject: string,
  snippet: string,
  options?: { openaiApiKey?: string }
): Promise<ClassifyResult> {
  const apiKey = options?.openaiApiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === 'mock-key' || apiKey.startsWith('sk-placeholder')) {
    return { type: null };
  }

  const config = new Configuration({ apiKey });
  const openai = new OpenAIApi(config);

  const text = `Subject: ${(subject || '').slice(0, 200)}\nSnippet: ${(snippet || '').slice(0, 500)}`;

  try {
    const res = await openai.createChatCompletion({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text },
      ],
      max_tokens: 80,
      temperature: 0,
    });

    if (!res.ok) return { type: null };
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return { type: null };

    const parsed = JSON.parse(content) as { type?: string; reason?: string };
    const t = parsed.type;
    if (t === 'meeting_request') return { type: 'meeting_request', reason: parsed.reason };
    if (t === 'urgent') return { type: 'urgent', reason: parsed.reason };
    return { type: null, reason: parsed.reason };
  } catch {
    return { type: null };
  }
}

/** @deprecated Use classifyEmailWithLLM for intelligent classification. */
export function classifyEmail(_subject: string, _snippet: string): NotificationType {
  return null;
}
