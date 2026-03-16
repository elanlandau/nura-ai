import { OAuthAccount, TimeSlot } from '../types';
import { addDays } from 'date-fns';

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  token_type: string;
}

export async function refreshGoogleAccessToken(refreshToken: string): Promise<GoogleTokenResponse> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh Google access token');
  }

  return response.json();
}

/**
 * Returns a valid access token. When forceRefresh is true, always refreshes using refresh_token
 * so we never use a cached/expired token (e.g. for calendar write).
 */
async function ensureValidToken(account: OAuthAccount, forceRefresh = false): Promise<string> {
  if (!account.refresh_token) {
    if (!account.access_token) throw new Error('No access token found');
    if (forceRefresh) throw new Error('No refresh token available');
    return account.access_token;
  }

  if (!forceRefresh && account.access_token && account.expires_at) {
    const now = Date.now();
    const expiresAt = account.expires_at * 1000;
    if (now < expiresAt - 60000) return account.access_token;
  }

  const tokenData = await refreshGoogleAccessToken(account.refresh_token);
  return tokenData.access_token;
}

export async function getGoogleCalendarAvailability(
  account: OAuthAccount,
  startDate: Date,
  endDate: Date
) {
  const accessToken = await ensureValidToken(account);

  const timeMin = startDate.toISOString();
  const timeMax = endDate.toISOString();

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
    new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: 'true',
      orderBy: 'startTime',
    }),
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch calendar events: ${response.statusText}`);
  }

  const data = await response.json();
  const busySlots = data.items || [];

  const availability = [];
  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0];
    const dayOfWeek = currentDate.getDay();

    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const workHours = [9, 10, 11, 14, 15, 16];
      const freeSlots: TimeSlot[] = [];

      for (const hour of workHours) {
        const slotStart = new Date(currentDate);
        slotStart.setHours(hour, 0, 0, 0);
        const slotEnd = new Date(slotStart);
        slotEnd.setHours(hour + 1, 0, 0, 0);

        const isSlotBusy = busySlots.some((event: any) => {
          const eventStart = new Date(event.start.dateTime || event.start.date);
          const eventEnd = new Date(event.end.dateTime || event.end.date);
          return (
            (slotStart >= eventStart && slotStart < eventEnd) ||
            (slotEnd > eventStart && slotEnd <= eventEnd) ||
            (slotStart <= eventStart && slotEnd >= eventEnd)
          );
        });

        if (!isSlotBusy) {
          freeSlots.push({
            start: slotStart.toISOString(),
            end: slotEnd.toISOString(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          });
        }
      }

      availability.push({
        date: dateStr,
        slots: freeSlots,
      });
    }

    currentDate = addDays(currentDate, 1);
  }

  return availability;
}

export async function createGoogleCalendarEvent(
  account: OAuthAccount,
  event: {
    summary: string;
    description: string;
    start: TimeSlot;
    attendees: string[];
  }
): Promise<string> {
  const accessToken = await ensureValidToken(account, true);

  const tz = (event.start.timezone && String(event.start.timezone).trim()) || 'UTC';
  const startDateTime = typeof event.start.start === 'string' ? event.start.start.trim() : '';
  const endDateTime = typeof event.start.end === 'string' ? event.start.end.trim() : '';
  if (!startDateTime || !endDateTime) {
    throw new Error('Calendar event start and end times are required in ISO 8601 format (e.g. 2025-02-20T10:00:00Z or 2025-02-20T12:00:00+02:00).');
  }

  const eventData = {
    summary: event.summary,
    description: event.description,
    start: {
      dateTime: startDateTime,
      timeZone: tz,
    },
    end: {
      dateTime: endDateTime,
      timeZone: tz,
    },
    attendees: event.attendees.map((email) => ({ email })),
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 },
        { method: 'popup', minutes: 30 },
      ],
    },
  };

  const bodyJson = JSON.stringify(eventData);
  console.log('[Google Calendar] POST body to https://www.googleapis.com/calendar/v3/calendars/primary/events:', bodyJson);

  const response = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: bodyJson,
    }
  );

  const responseBody = await response.text();

  if (!response.ok) {
    console.error('[Google Calendar] Error response status:', response.status, response.statusText);
    console.error('[Google Calendar] Full error body:', responseBody);
    if (response.status === 403 || response.status === 401) {
      throw new Error(
        'CALENDAR_PERMISSION_DENIED: Google Calendar does not have permission to create events. ' +
          'Please go to Connections, disconnect Google, and connect again—then allow "View and manage your calendar events" when prompted.'
      );
    }
    throw new Error(`Failed to create calendar event: ${response.statusText} — ${responseBody.slice(0, 500)}`);
  }

  const data = JSON.parse(responseBody);
  return data.id;
}

export interface CalendarEventUpcoming {
  id: string;
  summary: string;
  start: Date;
}

/**
 * List calendar events in a time window (for proactive "5 min before" alerts).
 */
export async function listGoogleCalendarEvents(
  account: OAuthAccount,
  timeMin: Date,
  timeMax: Date
): Promise<CalendarEventUpcoming[]> {
  const accessToken = await ensureValidToken(account);
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
      new URLSearchParams({
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: 'true',
        orderBy: 'startTime',
      }),
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch calendar events: ${response.statusText}`);
  }
  const data = await response.json();
  const items = (data.items || []) as Array<{
    id?: string;
    summary?: string;
    start?: { dateTime?: string; date?: string };
  }>;
  return items
    .filter((e) => e.id && (e.start?.dateTime || e.start?.date))
    .map((e) => ({
      id: e.id!,
      summary: (e.summary || 'Event').trim(),
      start: new Date(e.start!.dateTime || e.start!.date!),
    }));
}
