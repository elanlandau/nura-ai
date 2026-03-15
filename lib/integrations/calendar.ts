import { OAuthAccount, TimeSlot, CalendarAvailability } from '../types';
import { getGoogleCalendarAvailability, createGoogleCalendarEvent } from './google-calendar';
import { getMicrosoftCalendarAvailability, createMicrosoftCalendarEvent } from './microsoft-calendar';

export async function getCalendarAvailability(
  account: OAuthAccount,
  startDate: Date,
  endDate: Date
): Promise<CalendarAvailability[]> {
  if (account.provider === 'google') {
    return getGoogleCalendarAvailability(account, startDate, endDate);
  } else if (account.provider === 'microsoft') {
    return getMicrosoftCalendarAvailability(account, startDate, endDate);
  }
  throw new Error('Unsupported provider');
}

export async function createCalendarEvent(
  account: OAuthAccount,
  params: {
    summary: string;
    description: string;
    start: TimeSlot;
    attendees: string[];
  }
): Promise<string> {
  if (account.provider === 'google') {
    return createGoogleCalendarEvent(account, params);
  } else if (account.provider === 'microsoft') {
    return createMicrosoftCalendarEvent(account, params);
  }
  throw new Error('Unsupported provider');
}
