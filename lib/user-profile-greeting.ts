/**
 * Builds NURA's first chat bubble from UserChatProfile.preferences_summary text.
 * Supports current onboarding format (name, goals, tone, language).
 */
export function buildGreetingFromPreferencesSummary(
  summary: string | null | undefined,
  displayNameFallback: string
): string {
  const fallback = displayNameFallback.trim() || 'there';
  if (!summary?.trim()) {
    return `Hi ${fallback}, I'm NURA. How can I help you today?`;
  }

  let name = fallback;
  let goals = 'your priorities';
  let tone = 'professional';
  let defaultLang = '';

  for (const raw of summary.split('\n')) {
    const line = raw.trim();
    if (/^Preferred name:\s*/i.test(line)) {
      name = line.replace(/^Preferred name:\s*/i, '').trim() || name;
      continue;
    }
    if (/^Main goals?:\s*/i.test(line)) {
      goals = line.replace(/^Main goals?:\s*/i, '').trim() || goals;
      continue;
    }
    if (/^Main goal with NURA:\s*/i.test(line)) {
      goals = line.replace(/^Main goal with NURA:\s*/i, '').trim() || goals;
      continue;
    }
    if (/^Tone preference:\s*/i.test(line)) {
      tone = line.replace(/^Tone preference:\s*/i, '').trim().toLowerCase() || tone;
      continue;
    }
    if (/^Default response language:\s*/i.test(line)) {
      defaultLang = line.replace(/^Default response language:\s*/i, '').trim();
      continue;
    }
    if (/^Preferred language:\s*/i.test(line)) {
      defaultLang = line.replace(/^Preferred language:\s*/i, '').trim();
      continue;
    }
  }

  const toneLower = tone.toLowerCase();
  const manner =
    toneLower.includes('witty') || toneLower === 'witty'
      ? 'witty, playful manner'
      : toneLower.includes('casual') || toneLower === 'casual'
        ? 'casual, relaxed manner'
        : 'professional manner';

  const langBit = defaultLang ? ` I'll default to ${defaultLang} unless you prefer otherwise.` : '';

  return `Hi ${name}, I'm ready to help you with ${goals} in a ${manner}.${langBit} What would you like to do first?`;
}
