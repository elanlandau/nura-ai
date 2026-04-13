import { addDays } from 'date-fns';
import { prisma } from '@/lib/db';
import { getCalendarAvailability, createCalendarEvent } from '@/lib/integrations/calendar';
import { sendMeetingProposal } from '@/lib/integrations/email';
import { listGmailMessages } from '@/lib/integrations/gmail';
import { getOAuthAccount } from '@/lib/oauth-account';
import type { TimeSlot } from '@/lib/types';

/** Merge new preference lines into stored summary; append dedupes by normalized line text. */
export function mergePreferenceSummary(
  existing: string | null | undefined,
  additions: string[],
  mode: 'append' | 'replace'
): string {
  const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
  if (mode === 'replace') {
    return additions.map((a) => a.trim()).filter(Boolean).join('\n');
  }
  const raw = existing?.trim() ? existing : '';
  const lines = raw
    ? raw
        .split('\n')
        .map((line) => line.replace(/^\s*[-*•]\s*/, '').trim())
        .filter((line) => line.length > 0)
    : [];
  const seen = new Set(lines.map(normalize));
  for (const a of additions) {
    const t = a.trim();
    if (!t) continue;
    const n = normalize(t);
    if (!seen.has(n)) {
      lines.push(t);
      seen.add(n);
    }
  }
  return lines.join('\n');
}

export async function handleFunctionCall(functionName: string, functionArgs: unknown, userId: string) {
  const args = functionArgs as Record<string, unknown>;
  switch (functionName) {
    case 'get_calendar_availability': {
      const { provider, days_ahead = 7 } = args as { provider: string; days_ahead?: number };

      const account = await getOAuthAccount(userId, provider);

      if (!account) {
        return { error: `No ${provider} account connected. Please connect your account in the Connections page.` };
      }

      const startDate = new Date();
      const endDate = addDays(startDate, days_ahead);

      const availability = await getCalendarAvailability(account, startDate, endDate);

      return { availability };
    }

    case 'propose_meeting_slots': {
      const { provider, recipient_email, recipient_name, subject, message, time_slots } = args as {
        provider: string;
        recipient_email: string;
        recipient_name: string;
        subject: string;
        message: string;
        time_slots: unknown;
      };

      const account = await getOAuthAccount(userId, provider);

      if (!account) {
        return { error: `No ${provider} account connected. Please connect your account in the Connections page.` };
      }

      const emailThreadId = await sendMeetingProposal(account, {
        recipientEmail: recipient_email,
        recipientName: recipient_name,
        subject,
        message,
        proposedSlots: time_slots as TimeSlot[],
      });

      const thread = await prisma.meetingThread.create({
        data: {
          user_id: userId,
          recipient_email,
          recipient_name: recipient_name ?? null,
          subject,
          proposed_slots: JSON.stringify(time_slots),
          status: 'proposed',
          email_thread_id: emailThreadId ?? null,
        },
      });

      return {
        success: true,
        thread_id: thread.id,
        message: `Meeting proposal sent to ${recipient_name} (${recipient_email})`,
      };
    }

    case 'confirm_meeting': {
      const { provider, thread_id, summary, description, time_slot, attendees } = args as {
        provider: string;
        thread_id?: string;
        summary: string;
        description?: string;
        time_slot: unknown;
        attendees: string[];
      };

      const account = await getOAuthAccount(userId, provider);

      if (!account) {
        return { error: `No ${provider} account connected. Please connect your account in the Connections page.` };
      }

      try {
        const eventId = await createCalendarEvent(account, {
          summary,
          description: description || '',
          start: time_slot as TimeSlot,
          attendees,
        });

        if (thread_id) {
          await prisma.meetingThread.updateMany({
            where: { id: thread_id, user_id: userId },
            data: {
              status: 'confirmed',
              selected_slot: JSON.stringify(time_slot),
              calendar_event_id: eventId,
            },
          });
        }

        return {
          success: true,
          event_id: eventId,
          message: `Meeting confirmed and calendar event created`,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const isPermission = message.includes('CALENDAR_PERMISSION_DENIED') || message.includes('403') || message.includes('Forbidden');
        if (isPermission) {
          return {
            error:
              'Calendar write permission is missing. Go to **Connections**, disconnect Google, then connect again and allow "View and manage your calendar events".',
          };
        }
        return { error: message };
      }
    }

    case 'list_messages': {
      const { provider, max_results = 20, query } = args as { provider: string; max_results?: number; query?: string };
      console.log('[NURA list_messages]', { userId, provider, max_results, query });
      if (provider !== 'google') {
        console.error('[NURA list_messages] unsupported provider:', provider);
        return { error: 'Only Google Gmail is supported for list_messages.' };
      }
      const account = await getOAuthAccount(userId, 'google');
      if (!account) {
        console.error('[NURA list_messages] no Google account for userId:', userId);
        return { error: 'No Google account connected. Please connect Gmail in the Connections page.' };
      }
      try {
        const messages = await listGmailMessages(account, {
          maxResults: max_results,
          query: query || undefined,
        });
        console.log('[NURA list_messages] OK count=', messages?.length ?? 0);
        return { messages };
      } catch (err) {
        console.error('[NURA list_messages] ERROR', err instanceof Error ? err.message : err);
        return { error: err instanceof Error ? err.message : 'Gmail request failed.' };
      }
    }

    case 'update_user_preferences': {
      const preferences_to_add = Array.isArray(args?.preferences_to_add) ? args.preferences_to_add : [];
      const mode = args?.mode === 'replace' ? 'replace' : 'append';
      const display_name_update = typeof args?.display_name_update === 'string' ? args.display_name_update.trim() : '';

      const lines = preferences_to_add
        .filter((x: unknown) => typeof x === 'string')
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0);

      if (lines.length === 0 && !display_name_update) {
        return {
          error: 'Provide at least one non-empty string in preferences_to_add and/or display_name_update.',
        };
      }

      try {
        const existing = await prisma.userChatProfile.findUnique({ where: { user_id: userId } });

        if (!existing) {
          const preferences_summary = lines.length > 0 ? mergePreferenceSummary(null, lines, mode) : null;
          await prisma.userChatProfile.create({
            data: {
              user_id: userId,
              display_name: display_name_update || null,
              preferences_summary,
            },
          });
          console.log('[chat] update_user_preferences: created profile', {
            userId: userId.slice(0, 8),
            lines: lines.length,
            display_name: Boolean(display_name_update),
          });
          return {
            success: true,
            saved_preference_lines: lines.length,
            display_name_updated: Boolean(display_name_update),
            message: 'Profile created; preferences will load in future threads.',
          };
        }

        const newSummary =
          lines.length > 0 ? mergePreferenceSummary(existing.preferences_summary, lines, mode) : existing.preferences_summary;

        await prisma.userChatProfile.update({
          where: { user_id: userId },
          data: {
            ...(lines.length > 0 ? { preferences_summary: newSummary } : {}),
            ...(display_name_update ? { display_name: display_name_update } : {}),
          },
        });

        console.log('[chat] update_user_preferences: ok', {
          userId: userId.slice(0, 8),
          added_lines: lines.length,
          mode,
          display_name: Boolean(display_name_update),
        });

        return {
          success: true,
          saved_preference_lines: lines.length,
          display_name_updated: Boolean(display_name_update),
          message: 'Profile updated for future conversations.',
        };
      } catch (err) {
        console.error('[chat] update_user_preferences', err);
        return { error: err instanceof Error ? err.message : 'Failed to update profile.' };
      }
    }

    case 'complete_onboarding': {
      try {
        await prisma.userChatProfile.upsert({
          where: { user_id: userId },
          create: {
            user_id: userId,
            onboarding_completed: true,
          },
          update: {
            onboarding_completed: true,
          },
        });
        console.log('[chat] complete_onboarding: ok', { userId: userId.slice(0, 8) });
        return { success: true, message: 'Onboarding marked complete.' };
      } catch (err) {
        console.error('[chat] complete_onboarding', err);
        return { error: err instanceof Error ? err.message : 'Failed to complete onboarding.' };
      }
    }

    default:
      return { error: 'Unknown function' };
  }
}
