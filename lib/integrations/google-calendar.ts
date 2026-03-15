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

async function ensureValidToken(account: OAuthAccount): Promise<string> {
  if (!account.access_token || !account.expires_at) {
    throw new Error('No access token found');
  }

  const now = Date.now();
  const expiresAt = account.expires_at * 1000;

  if (now >= expiresAt - 60000) {
    if (!account.refresh_token) {
      throw new Error('No refresh token available');
    }

    const tokenData = await refreshGoogleAccessToken(account.refresh_token);
    return tokenData.access_token;
  }

  return account.access_token;
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
  const accessToken = await ensureValidToken(account);

  const eventData = {
    summary: event.summary,
    description: event.description,
    start: {
      dateTime: event.start.start,
      timeZone: event.start.timezone,
    },
    end: {
      dateTime: event.start.end,
      timeZone: event.start.timezone,
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

  const response = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to create calendar event: ${response.statusText}`);
  }

  const data = await response.json();
  return data.id;
}
